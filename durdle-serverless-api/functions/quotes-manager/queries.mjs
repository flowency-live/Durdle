import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { buildTenantPK } from '/opt/nodejs/tenant.mjs';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-west-2' }));

// Single-table design - quotes stored in main table
const TABLE_NAME = process.env.TABLE_NAME || 'durdle-main-table-dev';
const GSI_NAME = 'GSI1'; // Existing GSI with GSI1PK (status) and GSI1SK (createdAt)

// Query quotes with filters, pagination, and sorting
export async function queryQuotes(filters, logger, tenantId) {
  const {
    status,
    dateFrom,
    dateTo,
    priceMin,
    priceMax,
    search,
    sortBy,
    sortOrder,
    limit,
    cursor,
  } = filters;

  logger.info(
    {
      event: 'quotes_query_start',
      tenantId,
      filters: {
        status,
        dateFrom,
        dateTo,
        priceMin,
        priceMax,
        hasSearch: !!search,
        sortBy,
        sortOrder,
        limit,
        hasCursor: !!cursor,
      },
    },
    'Starting quotes query'
  );

  let items = [];
  let lastEvaluatedKey = null;

  // Decode cursor if provided
  const exclusiveStartKey = cursor ? decodeCursor(cursor) : undefined;

  // Strategy 1: Use GSI1 if filtering by specific status
  if (status !== 'all') {
    const result = await queryByStatus(status, dateFrom, dateTo, limit, exclusiveStartKey, logger, tenantId);
    items = result.items;
    lastEvaluatedKey = result.lastEvaluatedKey;
  }
  // Strategy 2: Scan for quotes if status is 'all'
  else {
    const result = await scanQuotes(dateFrom, dateTo, limit, exclusiveStartKey, logger, tenantId);
    items = result.items;
    lastEvaluatedKey = result.lastEvaluatedKey;
  }

  // Extract quote data from items (quotes are stored in Data field)
  let quotes = items.map(item => {
    const quoteData = item.Data || item;
    // Add quoteId from PK if not in Data (handle both old and tenant-prefixed PKs)
    if (!quoteData.quoteId && item.PK) {
      quoteData.quoteId = extractQuoteIdFromPK(item.PK);
    }
    // Map status from GSI1PK if needed (valid -> active)
    if (!quoteData.status && item.GSI1PK) {
      const gsiStatus = item.GSI1PK.replace('STATUS#', '');
      quoteData.status = gsiStatus === 'valid' ? 'active' : gsiStatus;
    }
    return quoteData;
  });

  // Apply additional filters (price, search)
  if (priceMin !== undefined || priceMax !== undefined) {
    quotes = quotes.filter(quote => {
      const price = quote.pricing?.breakdown?.total || quote.totalPrice || 0;
      if (priceMin !== undefined && price < priceMin * 100) return false; // Convert to pence
      if (priceMax !== undefined && price > priceMax * 100) return false;
      return true;
    });
  }

  if (search) {
    const searchLower = search.toLowerCase();
    quotes = quotes.filter(quote => {
      const quoteId = (quote.quoteId || '').toLowerCase();
      const pickupAddress = (quote.pickupLocation?.address || '').toLowerCase();
      const dropoffAddress = (quote.dropoffLocation?.address || '').toLowerCase();
      const customerEmail = (quote.customerEmail || '').toLowerCase();

      return (
        quoteId.includes(searchLower) ||
        pickupAddress.includes(searchLower) ||
        dropoffAddress.includes(searchLower) ||
        customerEmail.includes(searchLower)
      );
    });
  }

  // Sort results
  const sortedQuotes = sortQuotes(quotes, sortBy, sortOrder);

  // Calculate pagination
  const paginationCursor = lastEvaluatedKey ? encodeCursor(lastEvaluatedKey) : null;

  logger.info(
    {
      event: 'quotes_query_complete',
      resultCount: sortedQuotes.length,
      hasMoreResults: !!paginationCursor,
    },
    'Quotes query completed'
  );

  return {
    quotes: sortedQuotes.map(normalizeQuoteForApi),
    pagination: {
      total: sortedQuotes.length,
      limit,
      cursor: paginationCursor,
    },
  };
}

// Query quotes by status using GSI1
async function queryByStatus(status, dateFrom, dateTo, limit, exclusiveStartKey, logger, tenantId) {
  // Map API status to DynamoDB status
  const dbStatus = status === 'active' ? 'valid' : status;

  const params = {
    TableName: TABLE_NAME,
    IndexName: GSI_NAME,
    KeyConditionExpression: 'GSI1PK = :status',
    // Filter by tenant: support both old (no tenantId) and new (with tenantId) records
    FilterExpression: 'attribute_not_exists(tenantId) OR tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':status': `STATUS#${dbStatus}`,
      ':tenantId': tenantId,
    },
    Limit: limit,
    ScanIndexForward: false, // Sort descending by default (newest first)
  };

  // Add date range filter using GSI1SK (CREATED#timestamp format)
  if (dateFrom && dateTo) {
    params.KeyConditionExpression += ' AND GSI1SK BETWEEN :dateFrom AND :dateTo';
    params.ExpressionAttributeValues[':dateFrom'] = `CREATED#${dateFrom}`;
    params.ExpressionAttributeValues[':dateTo'] = `CREATED#${dateTo}`;
  } else if (dateFrom) {
    params.KeyConditionExpression += ' AND GSI1SK >= :dateFrom';
    params.ExpressionAttributeValues[':dateFrom'] = `CREATED#${dateFrom}`;
  } else if (dateTo) {
    params.KeyConditionExpression += ' AND GSI1SK <= :dateTo';
    params.ExpressionAttributeValues[':dateTo'] = `CREATED#${dateTo}`;
  }

  if (exclusiveStartKey) {
    params.ExclusiveStartKey = exclusiveStartKey;
  }

  logger.info({ event: 'dynamodb_query', indexName: GSI_NAME, status: dbStatus, tenantId }, 'Querying DynamoDB by status');

  const result = await client.send(new QueryCommand(params));

  return {
    items: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

// Scan for all quotes (when status is 'all')
async function scanQuotes(dateFrom, dateTo, limit, exclusiveStartKey, logger, tenantId) {
  // Dual-format filter: supports both old (QUOTE#id) and new (TENANT#001#QUOTE#id) PK formats
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: '(begins_with(PK, :tenantPrefix) OR begins_with(PK, :quotePrefix)) AND SK = :metadata AND (attribute_not_exists(tenantId) OR tenantId = :tenantId)',
    ExpressionAttributeValues: {
      ':tenantPrefix': `${tenantId}#QUOTE#`,
      ':quotePrefix': 'QUOTE#',
      ':metadata': 'METADATA',
      ':tenantId': tenantId,
    },
    Limit: limit * 3, // Fetch more since we're filtering
  };

  // Add date filter if provided
  if (dateFrom || dateTo) {
    if (dateFrom && dateTo) {
      params.FilterExpression += ' AND GSI1SK BETWEEN :dateFrom AND :dateTo';
      params.ExpressionAttributeValues[':dateFrom'] = `CREATED#${dateFrom}`;
      params.ExpressionAttributeValues[':dateTo'] = `CREATED#${dateTo}`;
    } else if (dateFrom) {
      params.FilterExpression += ' AND GSI1SK >= :dateFrom';
      params.ExpressionAttributeValues[':dateFrom'] = `CREATED#${dateFrom}`;
    } else if (dateTo) {
      params.FilterExpression += ' AND GSI1SK <= :dateTo';
      params.ExpressionAttributeValues[':dateTo'] = `CREATED#${dateTo}`;
    }
  }

  if (exclusiveStartKey) {
    params.ExclusiveStartKey = exclusiveStartKey;
  }

  logger.info({ event: 'dynamodb_scan', hasDateFilter: !!(dateFrom || dateTo), tenantId }, 'Scanning DynamoDB for all quotes');

  const result = await client.send(new ScanCommand(params));

  return {
    items: (result.Items || []).slice(0, limit),
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

// Get single quote by ID
export async function getQuoteById(quoteId, logger, tenantId) {
  logger.info({ event: 'quote_detail_fetch_start', quoteId, tenantId }, 'Fetching quote details');

  // Clean quoteId (remove any existing prefixes)
  const cleanQuoteId = quoteId.replace(/^(TENANT#\d+#)?QUOTE#/, '');

  // Try tenant-prefixed PK first
  const tenantPK = buildTenantPK(tenantId, 'QUOTE', cleanQuoteId);
  let result = await client.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: tenantPK,
      SK: 'METADATA'
    },
  }));

  // Fallback to old PK format if not found
  if (!result.Item) {
    const oldPK = `QUOTE#${cleanQuoteId}`;
    result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: oldPK,
        SK: 'METADATA'
      },
    }));
  }

  if (!result.Item) {
    logger.warn({ event: 'quote_not_found', quoteId, tenantId }, 'Quote not found');
    return null;
  }

  logger.info({ event: 'quote_detail_fetched', quoteId, tenantId }, 'Quote details retrieved');

  // Extract and normalize quote data
  const quoteData = result.Item.Data || result.Item;
  if (!quoteData.quoteId) {
    quoteData.quoteId = cleanQuoteId;
  }

  return normalizeQuoteForApi(quoteData);
}

// Normalize quote data for API response
function normalizeQuoteForApi(quote) {
  // Map internal status to API status
  let status = quote.status;
  if (status === 'valid') {
    // Check if expired based on expiresAt
    if (quote.expiresAt && new Date(quote.expiresAt) < new Date()) {
      status = 'expired';
    } else {
      status = 'active';
    }
  }

  // Extract total price from pricing breakdown
  const totalPrice = quote.pricing?.breakdown?.total || quote.totalPrice || 0;

  return {
    quoteId: quote.quoteId,
    createdAt: quote.createdAt,
    expiresAt: quote.expiresAt,
    status,
    pickupLocation: quote.pickupLocation,
    dropoffLocation: quote.dropoffLocation,
    waypoints: quote.waypoints,
    pickupTime: quote.pickupTime,
    totalPrice: totalPrice / 100, // Convert pence to pounds
    vehicleType: quote.vehicleType,
    pricingBreakdown: quote.pricing?.breakdown ? {
      baseFare: (quote.pricing.breakdown.baseFare || 0) / 100,
      distanceCost: (quote.pricing.breakdown.distanceCharge || 0) / 100,
      waypointCost: (quote.pricing.breakdown.waitTimeCharge || 0) / 100,
    } : quote.pricingBreakdown,
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone,
    bookingId: quote.bookingId,
    journey: quote.journey,
    passengers: quote.passengers,
    luggage: quote.luggage,
  };
}

// Sort quotes by specified field
function sortQuotes(quotes, sortBy, sortOrder) {
  const sorted = [...quotes];

  sorted.sort((a, b) => {
    let compareValue = 0;

    if (sortBy === 'date') {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      compareValue = dateA - dateB;
    } else if (sortBy === 'price') {
      const priceA = a.pricing?.breakdown?.total || a.totalPrice || 0;
      const priceB = b.pricing?.breakdown?.total || b.totalPrice || 0;
      compareValue = priceA - priceB;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return sorted;
}

// Encode pagination cursor to base64
function encodeCursor(lastEvaluatedKey) {
  const json = JSON.stringify(lastEvaluatedKey);
  return Buffer.from(json).toString('base64');
}

// Decode pagination cursor from base64
function decodeCursor(cursor) {
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid pagination cursor');
  }
}

// Extract quote ID from PK (handles both old and tenant-prefixed formats)
// Old format: QUOTE#DTC-Q091225XX -> DTC-Q091225XX
// New format: TENANT#001#QUOTE#DTC-Q091225XX -> DTC-Q091225XX
function extractQuoteIdFromPK(pk) {
  // Handle tenant-prefixed format: TENANT#001#QUOTE#id
  if (pk.startsWith('TENANT#')) {
    const match = pk.match(/^TENANT#\d+#QUOTE#(.+)$/);
    return match ? match[1] : pk;
  }
  // Handle old format: QUOTE#id
  return pk.replace('QUOTE#', '');
}

// Get all quotes for export (no pagination, respects filters)
export async function getAllQuotesForExport(filters, logger, tenantId) {
  const { status, dateFrom, dateTo, priceMin, priceMax, search } = filters;

  logger.info(
    {
      event: 'quotes_export_start',
      tenantId,
      filters: { status, dateFrom, dateTo, priceMin, priceMax, hasSearch: !!search },
    },
    'Starting quotes export'
  );

  let allItems = [];
  let lastEvaluatedKey = null;

  // Fetch all items (no limit, paginate through all results)
  do {
    let result;

    if (status !== 'all') {
      result = await queryByStatus(status, dateFrom, dateTo, 1000, lastEvaluatedKey, logger, tenantId);
    } else {
      result = await scanQuotes(dateFrom, dateTo, 1000, lastEvaluatedKey, logger, tenantId);
    }

    allItems = allItems.concat(result.items);
    lastEvaluatedKey = result.lastEvaluatedKey;
  } while (lastEvaluatedKey);

  // Extract and normalize quotes
  let quotes = allItems.map(item => {
    const quoteData = item.Data || item;
    if (!quoteData.quoteId && item.PK) {
      quoteData.quoteId = extractQuoteIdFromPK(item.PK);
    }
    return quoteData;
  });

  // Apply filters
  if (priceMin !== undefined || priceMax !== undefined) {
    quotes = quotes.filter(quote => {
      const price = quote.pricing?.breakdown?.total || quote.totalPrice || 0;
      if (priceMin !== undefined && price < priceMin * 100) return false;
      if (priceMax !== undefined && price > priceMax * 100) return false;
      return true;
    });
  }

  if (search) {
    const searchLower = search.toLowerCase();
    quotes = quotes.filter(quote => {
      const quoteId = (quote.quoteId || '').toLowerCase();
      const pickupAddress = (quote.pickupLocation?.address || '').toLowerCase();
      const dropoffAddress = (quote.dropoffLocation?.address || '').toLowerCase();
      const customerEmail = (quote.customerEmail || '').toLowerCase();

      return (
        quoteId.includes(searchLower) ||
        pickupAddress.includes(searchLower) ||
        dropoffAddress.includes(searchLower) ||
        customerEmail.includes(searchLower)
      );
    });
  }

  logger.info(
    {
      event: 'quotes_export_complete',
      totalQuotes: quotes.length,
    },
    'Quotes export data prepared'
  );

  return quotes.map(normalizeQuoteForApi);
}
