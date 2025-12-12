/**
 * zone-pricing-manager Lambda
 *
 * Manages zone-to-destination pricing matrix.
 * - CRUD operations for zone pricing (zone -> destination pairs)
 * - Full pricing matrix retrieval
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantPK, logTenantContext } from '/opt/nodejs/tenant.mjs';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const PRICING_TABLE_NAME = process.env.PRICING_TABLE_NAME || 'durdle-pricing-config-dev';

// CORS configuration
const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://durdle.flowency.build',
  'https://durdle.co.uk',
  'https://dorsettransfercompany.flowency.build',
  'https://dorsettransfercompany.co.uk'
];

const getHeaders = (origin) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};

// Validation schemas
const VehiclePriceSchema = z.object({
  outbound: z.number().int().min(100, 'Minimum price is 100 pence (1 pound)'),
  return: z.number().int().min(100, 'Minimum price is 100 pence (1 pound)'),
});

const PricesSchema = z.object({
  standard: VehiclePriceSchema,
  executive: VehiclePriceSchema,
  minibus: VehiclePriceSchema,
});

const CreateZonePricingSchema = z.object({
  destinationId: z.string().min(1),
  name: z.string().min(3).max(100),
  prices: PricesSchema,
  active: z.boolean().optional().default(true),
});

const UpdateZonePricingSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  prices: PricesSchema.optional(),
  active: z.boolean().optional(),
});

// Get all pricing for a zone
async function getZonePricing(tenantId, zoneId, logger) {
  logger.info({ event: 'zone_pricing_list_start', zoneId }, 'Getting pricing for zone');

  const command = new QueryCommand({
    TableName: PRICING_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': buildTenantPK(tenantId, 'ZONE', zoneId),
      ':skPrefix': 'PRICING#',
    },
  });

  const result = await docClient.send(command);
  const pricingRecords = (result.Items || []).map(item => ({
    zoneId: item.zoneId,
    destinationId: item.destinationId,
    name: item.name,
    prices: item.prices,
    active: item.active,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  logger.info({ event: 'zone_pricing_list_success', zoneId, count: pricingRecords.length }, 'Zone pricing retrieved');
  return pricingRecords;
}

// Get single zone-destination pricing
async function getZoneDestinationPricing(tenantId, zoneId, destinationId, logger) {
  logger.info({ event: 'zone_dest_pricing_get', zoneId, destinationId }, 'Getting zone-destination pricing');

  const command = new GetCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'ZONE', zoneId),
      SK: `PRICING#${destinationId}`,
    },
  });

  const result = await docClient.send(command);
  return result.Item || null;
}

// Create zone-destination pricing
async function createZonePricing(tenantId, zoneId, data, logger) {
  const now = new Date().toISOString();

  logger.info({ event: 'zone_pricing_create_start', zoneId, destinationId: data.destinationId }, 'Creating zone pricing');

  // Check if pricing already exists
  const existing = await getZoneDestinationPricing(tenantId, zoneId, data.destinationId, logger);
  if (existing) {
    logger.warn({ event: 'zone_pricing_create_conflict', zoneId, destinationId: data.destinationId }, 'Zone pricing already exists');
    return { error: 'Pricing for this zone-destination pair already exists', statusCode: 409 };
  }

  const item = {
    PK: buildTenantPK(tenantId, 'ZONE', zoneId),
    SK: `PRICING#${data.destinationId}`,
    tenantId,
    zoneId,
    destinationId: data.destinationId,
    name: data.name,
    prices: data.prices,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: PRICING_TABLE_NAME,
    Item: item,
  }));

  logger.info({ event: 'zone_pricing_create_success', zoneId, destinationId: data.destinationId }, 'Zone pricing created');
  return { pricing: item };
}

// Update zone-destination pricing
async function updateZonePricing(tenantId, zoneId, destinationId, data, logger) {
  logger.info({ event: 'zone_pricing_update_start', zoneId, destinationId }, 'Updating zone pricing');

  const existing = await getZoneDestinationPricing(tenantId, zoneId, destinationId, logger);
  if (!existing) {
    logger.warn({ event: 'zone_pricing_update_not_found', zoneId, destinationId }, 'Zone pricing not found');
    return { error: 'Zone pricing not found', statusCode: 404 };
  }

  const now = new Date().toISOString();

  const updatedItem = {
    ...existing,
    name: data.name ?? existing.name,
    prices: data.prices ?? existing.prices,
    active: data.active ?? existing.active,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: PRICING_TABLE_NAME,
    Item: updatedItem,
  }));

  logger.info({ event: 'zone_pricing_update_success', zoneId, destinationId }, 'Zone pricing updated');
  return { pricing: updatedItem };
}

// Delete zone-destination pricing
async function deleteZonePricing(tenantId, zoneId, destinationId, logger) {
  logger.info({ event: 'zone_pricing_delete_start', zoneId, destinationId }, 'Deleting zone pricing');

  const existing = await getZoneDestinationPricing(tenantId, zoneId, destinationId, logger);
  if (!existing) {
    logger.warn({ event: 'zone_pricing_delete_not_found', zoneId, destinationId }, 'Zone pricing not found');
    return { error: 'Zone pricing not found', statusCode: 404 };
  }

  await docClient.send(new DeleteCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'ZONE', zoneId),
      SK: `PRICING#${destinationId}`,
    },
  }));

  logger.info({ event: 'zone_pricing_delete_success', zoneId, destinationId }, 'Zone pricing deleted');
  return { success: true };
}

// Get full pricing matrix (all zones x all destinations)
async function getPricingMatrix(tenantId, logger) {
  logger.info({ event: 'pricing_matrix_start' }, 'Building pricing matrix');

  // Get all zones
  const zonesCommand = new ScanCommand({
    TableName: PRICING_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':prefix': `${tenantId}#ZONE#`,
      ':sk': 'METADATA',
      ':tenantId': tenantId,
    },
  });
  const zonesResult = await docClient.send(zonesCommand);
  const zones = (zonesResult.Items || []).map(z => ({
    zoneId: z.zoneId,
    name: z.name,
    outwardCodesCount: z.outwardCodes?.length || 0,
    active: z.active,
  }));

  // Get all destinations
  const destsCommand = new ScanCommand({
    TableName: PRICING_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':prefix': `${tenantId}#DESTINATION#`,
      ':sk': 'METADATA',
      ':tenantId': tenantId,
    },
  });
  const destsResult = await docClient.send(destsCommand);
  const destinations = (destsResult.Items || []).map(d => ({
    destinationId: d.destinationId,
    name: d.name,
    locationType: d.locationType,
    active: d.active,
  }));

  // Get all pricing records
  const pricingCommand = new ScanCommand({
    TableName: PRICING_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :prefix) AND begins_with(SK, :skPrefix) AND tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':prefix': `${tenantId}#ZONE#`,
      ':skPrefix': 'PRICING#',
      ':tenantId': tenantId,
    },
  });
  const pricingResult = await docClient.send(pricingCommand);

  // Build pricing lookup map
  const pricingMap = {};
  for (const p of pricingResult.Items || []) {
    const key = `${p.zoneId}:${p.destinationId}`;
    pricingMap[key] = {
      name: p.name,
      prices: p.prices,
      active: p.active,
    };
  }

  logger.info({
    event: 'pricing_matrix_success',
    zoneCount: zones.length,
    destinationCount: destinations.length,
    pricingCount: Object.keys(pricingMap).length,
  }, 'Pricing matrix built');

  return {
    zones,
    destinations,
    pricing: pricingMap,
    summary: {
      totalZones: zones.length,
      totalDestinations: destinations.length,
      totalPricingRecords: Object.keys(pricingMap).length,
      coverage: zones.length * destinations.length > 0
        ? ((Object.keys(pricingMap).length / (zones.length * destinations.length)) * 100).toFixed(1) + '%'
        : '0%',
    },
  };
}

// Main handler
export const handler = async (event, context) => {
  const logger = createLogger(event, context);
  const tenantId = getTenantId(event);
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  const { httpMethod, path, pathParameters, body } = event;

  logTenantContext(logger, tenantId, 'zone-pricing-manager');
  logger.info({ event: 'lambda_invocation', httpMethod, path }, 'Zone pricing manager invoked');

  // OPTIONS for CORS
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // GET /admin/pricing-matrix - Full pricing matrix
    if (httpMethod === 'GET' && path?.includes('/pricing-matrix')) {
      const matrix = await getPricingMatrix(tenantId, logger);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(matrix),
      };
    }

    // GET /admin/zones/{zoneId}/pricing - Get all pricing for zone
    if (httpMethod === 'GET' && pathParameters?.zoneId && !pathParameters?.destId) {
      const pricing = await getZonePricing(tenantId, pathParameters.zoneId, logger);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ pricing }),
      };
    }

    // GET /admin/zones/{zoneId}/pricing/{destId} - Get single pricing
    if (httpMethod === 'GET' && pathParameters?.zoneId && pathParameters?.destId) {
      const pricing = await getZoneDestinationPricing(tenantId, pathParameters.zoneId, pathParameters.destId, logger);
      if (!pricing) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Zone pricing not found' }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ pricing }),
      };
    }

    // POST /admin/zones/{zoneId}/pricing - Create zone pricing
    if (httpMethod === 'POST' && pathParameters?.zoneId) {
      const validation = CreateZonePricingSchema.safeParse(JSON.parse(body || '{}'));
      if (!validation.success) {
        logger.warn({ event: 'validation_error', issues: validation.error.issues }, 'Validation failed');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid request', details: validation.error.issues }),
        };
      }

      const result = await createZonePricing(tenantId, pathParameters.zoneId, validation.data, logger);
      if (result.error) {
        return {
          statusCode: result.statusCode,
          headers,
          body: JSON.stringify({ error: result.error }),
        };
      }
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result),
      };
    }

    // PUT /admin/zones/{zoneId}/pricing/{destId} - Update zone pricing
    if (httpMethod === 'PUT' && pathParameters?.zoneId && pathParameters?.destId) {
      const validation = UpdateZonePricingSchema.safeParse(JSON.parse(body || '{}'));
      if (!validation.success) {
        logger.warn({ event: 'validation_error', issues: validation.error.issues }, 'Validation failed');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid request', details: validation.error.issues }),
        };
      }

      const result = await updateZonePricing(tenantId, pathParameters.zoneId, pathParameters.destId, validation.data, logger);
      if (result.error) {
        return {
          statusCode: result.statusCode,
          headers,
          body: JSON.stringify({ error: result.error }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // DELETE /admin/zones/{zoneId}/pricing/{destId} - Delete zone pricing
    if (httpMethod === 'DELETE' && pathParameters?.zoneId && pathParameters?.destId) {
      const result = await deleteZonePricing(tenantId, pathParameters.zoneId, pathParameters.destId, logger);
      if (result.error) {
        return {
          statusCode: result.statusCode,
          headers,
          body: JSON.stringify({ error: result.error }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Zone pricing deleted' }),
      };
    }

    // Unknown route
    logger.warn({ event: 'unknown_route', httpMethod, path }, 'Unknown route');
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };

  } catch (error) {
    logger.error({ event: 'handler_error', error: error.message, stack: error.stack }, 'Handler error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
