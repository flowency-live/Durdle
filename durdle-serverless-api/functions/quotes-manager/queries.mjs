import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-west-2' }));

const TABLE_NAME = 'durdle-quotes-dev';
const GSI_NAME = 'status-createdAt-index';

// Query quotes with filters, pagination, and sorting
export async function queryQuotes(filters, logger) {
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

  // Strategy 1: Use GSI if filtering by specific status
  if (status !== 'all') {
    const result = await queryByStatus(status, dateFrom, dateTo, limit, exclusiveStartKey, logger);
    items = result.items;
    lastEvaluatedKey = result.lastEvaluatedKey;
  }
  // Strategy 2: Scan table if status is 'all'
  else {
    const result = await scanQuotes(dateFrom, dateTo, limit, exclusiveStartKey, logger);
    items = result.items;
    lastEvaluatedKey = result.lastEvaluatedKey;
  }

  // Apply additional filters (price, search)
  let filteredItems = items;

  if (priceMin !== undefined || priceMax !== undefined) {
    filteredItems = filteredItems.filter(item => {
      const price = item.totalPrice || 0;
      if (priceMin !== undefined && price < priceMin) return false;
      if (priceMax !== undefined && price > priceMax) return false;
      return true;
    });
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredItems = filteredItems.filter(item => {
      const quoteId = (item.quoteId || '').toLowerCase();
      const pickupAddress = (item.pickupLocation?.address || '').toLowerCase();
      const dropoffAddress = (item.dropoffLocation?.address || '').toLowerCase();
      const customerEmail = (item.customerEmail || '').toLowerCase();

      return (
        quoteId.includes(searchLower) ||
        pickupAddress.includes(searchLower) ||
        dropoffAddress.includes(searchLower) ||
        customerEmail.includes(searchLower)
      );
    });
  }

  // Sort results
  const sortedItems = sortQuotes(filteredItems, sortBy, sortOrder);

  // Calculate pagination
  const paginationCursor = lastEvaluatedKey ? encodeCursor(lastEvaluatedKey) : null;

  logger.info(
    {
      event: 'quotes_query_complete',
      resultCount: sortedItems.length,
      hasMoreResults: !!paginationCursor,
    },
    'Quotes query completed'
  );

  return {
    quotes: sortedItems,
    pagination: {
      total: sortedItems.length,
      limit,
      cursor: paginationCursor,
    },
  };
}

// Query quotes by status using GSI
async function queryByStatus(status, dateFrom, dateTo, limit, exclusiveStartKey, logger) {
  const params = {
    TableName: TABLE_NAME,
    IndexName: GSI_NAME,
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': status,
    },
    Limit: limit,
    ScanIndexForward: false, // Sort descending by default (newest first)
  };

  // Add date range filter if provided
  if (dateFrom && dateTo) {
    params.KeyConditionExpression += ' AND createdAt BETWEEN :dateFrom AND :dateTo';
    params.ExpressionAttributeValues[':dateFrom'] = dateFrom;
    params.ExpressionAttributeValues[':dateTo'] = dateTo;
  } else if (dateFrom) {
    params.KeyConditionExpression += ' AND createdAt >= :dateFrom';
    params.ExpressionAttributeValues[':dateFrom'] = dateFrom;
  } else if (dateTo) {
    params.KeyConditionExpression += ' AND createdAt <= :dateTo';
    params.ExpressionAttributeValues[':dateTo'] = dateTo;
  }

  if (exclusiveStartKey) {
    params.ExclusiveStartKey = exclusiveStartKey;
  }

  logger.info({ event: 'dynamodb_query', indexName: GSI_NAME, status }, 'Querying DynamoDB by status');

  const result = await client.send(new QueryCommand(params));

  return {
    items: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

// Scan quotes table (when status is 'all')
async function scanQuotes(dateFrom, dateTo, limit, exclusiveStartKey, logger) {
  const params = {
    TableName: TABLE_NAME,
    Limit: limit,
  };

  // Add date filter expression if provided
  if (dateFrom || dateTo) {
    const filterExpressions = [];
    params.ExpressionAttributeNames = {};
    params.ExpressionAttributeValues = {};

    if (dateFrom && dateTo) {
      filterExpressions.push('createdAt BETWEEN :dateFrom AND :dateTo');
      params.ExpressionAttributeValues[':dateFrom'] = dateFrom;
      params.ExpressionAttributeValues[':dateTo'] = dateTo;
    } else if (dateFrom) {
      filterExpressions.push('createdAt >= :dateFrom');
      params.ExpressionAttributeValues[':dateFrom'] = dateFrom;
    } else if (dateTo) {
      filterExpressions.push('createdAt <= :dateTo');
      params.ExpressionAttributeValues[':dateTo'] = dateTo;
    }

    params.FilterExpression = filterExpressions.join(' AND ');
  }

  if (exclusiveStartKey) {
    params.ExclusiveStartKey = exclusiveStartKey;
  }

  logger.info({ event: 'dynamodb_scan', hasDateFilter: !!(dateFrom || dateTo) }, 'Scanning DynamoDB for all quotes');

  const result = await client.send(new ScanCommand(params));

  return {
    items: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

// Get single quote by ID
export async function getQuoteById(quoteId, logger) {
  logger.info({ event: 'quote_detail_fetch_start', quoteId }, 'Fetching quote details');

  const params = {
    TableName: TABLE_NAME,
    Key: { quoteId },
  };

  const result = await client.send(new GetCommand(params));

  if (!result.Item) {
    logger.warn({ event: 'quote_not_found', quoteId }, 'Quote not found');
    return null;
  }

  logger.info({ event: 'quote_detail_fetched', quoteId }, 'Quote details retrieved');

  return result.Item;
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
      const priceA = a.totalPrice || 0;
      const priceB = b.totalPrice || 0;
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

// Get all quotes for export (no pagination, respects filters)
export async function getAllQuotesForExport(filters, logger) {
  const { status, dateFrom, dateTo, priceMin, priceMax, search } = filters;

  logger.info(
    {
      event: 'quotes_export_start',
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
      result = await queryByStatus(status, dateFrom, dateTo, 1000, lastEvaluatedKey, logger);
    } else {
      result = await scanQuotes(dateFrom, dateTo, 1000, lastEvaluatedKey, logger);
    }

    allItems = allItems.concat(result.items);
    lastEvaluatedKey = result.lastEvaluatedKey;
  } while (lastEvaluatedKey);

  // Apply filters (same logic as queryQuotes)
  let filteredItems = allItems;

  if (priceMin !== undefined || priceMax !== undefined) {
    filteredItems = filteredItems.filter(item => {
      const price = item.totalPrice || 0;
      if (priceMin !== undefined && price < priceMin) return false;
      if (priceMax !== undefined && price > priceMax) return false;
      return true;
    });
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredItems = filteredItems.filter(item => {
      const quoteId = (item.quoteId || '').toLowerCase();
      const pickupAddress = (item.pickupLocation?.address || '').toLowerCase();
      const dropoffAddress = (item.dropoffLocation?.address || '').toLowerCase();
      const customerEmail = (item.customerEmail || '').toLowerCase();

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
      totalQuotes: filteredItems.length,
    },
    'Quotes export data prepared'
  );

  return filteredItems;
}
