/**
 * zone-manager Lambda
 *
 * Manages postcode zones for zone-based pricing.
 * - CRUD operations for zones
 * - PostcodeLookup record management (GSI1)
 * - Polygon resolution to outward codes
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantPK, logTenantContext } from '/opt/nodejs/tenant.mjs';

// Lazy load turf for polygon resolution (only when needed)
let booleanPointInPolygon = null;
let turfHelpers = null;

async function loadTurf() {
  if (!booleanPointInPolygon) {
    const module = await import('@turf/boolean-point-in-polygon');
    booleanPointInPolygon = module.default;
  }
  if (!turfHelpers) {
    turfHelpers = await import('@turf/helpers');
  }
  return { booleanPointInPolygon, point: turfHelpers.point };
}

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const PRICING_TABLE_NAME = process.env.PRICING_TABLE_NAME || 'durdle-pricing-config-dev';
const UK_POSTCODES_TABLE_NAME = process.env.UK_POSTCODES_TABLE_NAME || 'durdle-uk-postcodes-dev';

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
const OutwardCodeSchema = z.string().regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?$/i, 'Invalid UK outward code format');

const CreateZoneSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  outwardCodes: z.array(OutwardCodeSchema).min(1),
  polygon: z.any().optional(), // GeoJSON polygon for visual editing
  active: z.boolean().optional().default(true),
});

const UpdateZoneSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  outwardCodes: z.array(OutwardCodeSchema).min(1).optional(),
  polygon: z.any().optional(),
  active: z.boolean().optional(),
});

const ResolvePolygonSchema = z.object({
  polygon: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
  includeNonDorset: z.boolean().optional().default(false),
});

// Generate zone ID from name
function generateZoneId(name) {
  return 'zone-' + name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
}

// Create PostcodeLookup records for a zone
async function createPostcodeLookupRecords(tenantId, zoneId, outwardCodes, logger) {
  const batches = [];
  for (let i = 0; i < outwardCodes.length; i += 25) {
    batches.push(outwardCodes.slice(i, i + 25));
  }

  for (const batch of batches) {
    const params = {
      RequestItems: {
        [PRICING_TABLE_NAME]: batch.map(code => ({
          PutRequest: {
            Item: {
              PK: buildTenantPK(tenantId, 'POSTCODE', code.toUpperCase()),
              SK: `ZONE#${zoneId}`,
              GSI1PK: buildTenantPK(tenantId, 'POSTCODE', code.toUpperCase()),
              GSI1SK: `ZONE#${zoneId}`,
              tenantId,
              outwardCode: code.toUpperCase(),
              zoneId,
            }
          }
        }))
      }
    };

    try {
      await docClient.send(new BatchWriteCommand(params));
      logger.debug({ event: 'postcode_lookup_created', count: batch.length, zoneId }, 'PostcodeLookup records created');
    } catch (error) {
      logger.error({ event: 'postcode_lookup_error', error: error.message, zoneId }, 'Failed to create PostcodeLookup records');
      throw error;
    }
  }
}

// Delete PostcodeLookup records for a zone
async function deletePostcodeLookupRecords(tenantId, zoneId, outwardCodes, logger) {
  const batches = [];
  for (let i = 0; i < outwardCodes.length; i += 25) {
    batches.push(outwardCodes.slice(i, i + 25));
  }

  for (const batch of batches) {
    const params = {
      RequestItems: {
        [PRICING_TABLE_NAME]: batch.map(code => ({
          DeleteRequest: {
            Key: {
              PK: buildTenantPK(tenantId, 'POSTCODE', code.toUpperCase()),
              SK: `ZONE#${zoneId}`,
            }
          }
        }))
      }
    };

    try {
      await docClient.send(new BatchWriteCommand(params));
      logger.debug({ event: 'postcode_lookup_deleted', count: batch.length, zoneId }, 'PostcodeLookup records deleted');
    } catch (error) {
      logger.error({ event: 'postcode_lookup_delete_error', error: error.message, zoneId }, 'Failed to delete PostcodeLookup records');
      throw error;
    }
  }
}

// List all zones
async function listZones(tenantId, logger) {
  logger.info({ event: 'zone_list_start' }, 'Listing zones');

  const command = new ScanCommand({
    TableName: PRICING_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':prefix': `${tenantId}#ZONE#`,
      ':sk': 'METADATA',
      ':tenantId': tenantId,
    },
  });

  const result = await docClient.send(command);
  const zones = (result.Items || []).map(item => ({
    zoneId: item.zoneId,
    name: item.name,
    description: item.description,
    outwardCodes: item.outwardCodes,
    outwardCodesCount: item.outwardCodes?.length || 0,
    active: item.active,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  logger.info({ event: 'zone_list_success', count: zones.length }, 'Zones listed');
  return zones;
}

// Get single zone
async function getZone(tenantId, zoneId, logger) {
  logger.info({ event: 'zone_get_start', zoneId }, 'Getting zone');

  const command = new GetCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'ZONE', zoneId),
      SK: 'METADATA',
    },
  });

  const result = await docClient.send(command);

  if (!result.Item) {
    logger.warn({ event: 'zone_get_not_found', zoneId }, 'Zone not found');
    return null;
  }

  logger.info({ event: 'zone_get_success', zoneId }, 'Zone retrieved');
  return result.Item;
}

// Create zone
async function createZone(tenantId, data, logger) {
  const zoneId = generateZoneId(data.name);
  const now = new Date().toISOString();

  logger.info({ event: 'zone_create_start', zoneId, name: data.name }, 'Creating zone');

  // Check if zone already exists
  const existing = await getZone(tenantId, zoneId, logger);
  if (existing) {
    logger.warn({ event: 'zone_create_conflict', zoneId }, 'Zone already exists');
    return { error: 'Zone with this name already exists', statusCode: 409 };
  }

  // Normalize outward codes
  const outwardCodes = data.outwardCodes.map(c => c.toUpperCase());

  const item = {
    PK: buildTenantPK(tenantId, 'ZONE', zoneId),
    SK: 'METADATA',
    tenantId,
    zoneId,
    name: data.name,
    description: data.description || null,
    outwardCodes,
    polygon: data.polygon || null,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: PRICING_TABLE_NAME,
    Item: item,
  }));

  // Create PostcodeLookup records for GSI1
  await createPostcodeLookupRecords(tenantId, zoneId, outwardCodes, logger);

  logger.info({ event: 'zone_create_success', zoneId, outwardCodesCount: outwardCodes.length }, 'Zone created');
  return { zone: item };
}

// Update zone
async function updateZone(tenantId, zoneId, data, logger) {
  logger.info({ event: 'zone_update_start', zoneId }, 'Updating zone');

  const existing = await getZone(tenantId, zoneId, logger);
  if (!existing) {
    logger.warn({ event: 'zone_update_not_found', zoneId }, 'Zone not found');
    return { error: 'Zone not found', statusCode: 404 };
  }

  const now = new Date().toISOString();
  const oldOutwardCodes = existing.outwardCodes || [];
  const newOutwardCodes = data.outwardCodes ? data.outwardCodes.map(c => c.toUpperCase()) : oldOutwardCodes;

  const updatedItem = {
    ...existing,
    name: data.name ?? existing.name,
    description: data.description !== undefined ? data.description : existing.description,
    outwardCodes: newOutwardCodes,
    polygon: data.polygon !== undefined ? data.polygon : existing.polygon,
    active: data.active ?? existing.active,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: PRICING_TABLE_NAME,
    Item: updatedItem,
  }));

  // Update PostcodeLookup records if outwardCodes changed
  if (data.outwardCodes) {
    const removedCodes = oldOutwardCodes.filter(c => !newOutwardCodes.includes(c));
    const addedCodes = newOutwardCodes.filter(c => !oldOutwardCodes.includes(c));

    if (removedCodes.length > 0) {
      await deletePostcodeLookupRecords(tenantId, zoneId, removedCodes, logger);
    }
    if (addedCodes.length > 0) {
      await createPostcodeLookupRecords(tenantId, zoneId, addedCodes, logger);
    }

    logger.info({
      event: 'postcode_lookup_updated',
      zoneId,
      removed: removedCodes.length,
      added: addedCodes.length,
    }, 'PostcodeLookup records updated');
  }

  logger.info({ event: 'zone_update_success', zoneId }, 'Zone updated');
  return { zone: updatedItem };
}

// Delete zone (hard delete)
async function deleteZone(tenantId, zoneId, logger) {
  logger.info({ event: 'zone_delete_start', zoneId }, 'Deleting zone');

  const existing = await getZone(tenantId, zoneId, logger);
  if (!existing) {
    logger.warn({ event: 'zone_delete_not_found', zoneId }, 'Zone not found');
    return { error: 'Zone not found', statusCode: 404 };
  }

  // Delete PostcodeLookup records first
  if (existing.outwardCodes && existing.outwardCodes.length > 0) {
    await deletePostcodeLookupRecords(tenantId, zoneId, existing.outwardCodes, logger);
  }

  // Delete zone record
  await docClient.send(new DeleteCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'ZONE', zoneId),
      SK: 'METADATA',
    },
  }));

  logger.info({ event: 'zone_delete_success', zoneId }, 'Zone deleted');
  return { success: true };
}

// Resolve polygon to outward codes
async function resolvePolygon(polygon, includeNonDorset, logger) {
  logger.info({ event: 'resolve_polygon_start', includeNonDorset }, 'Resolving polygon to outward codes');

  const { booleanPointInPolygon, point } = await loadTurf();

  // Fetch all UK postcodes from reference table
  const scanCommand = new ScanCommand({
    TableName: UK_POSTCODES_TABLE_NAME,
    FilterExpression: includeNonDorset ? 'attribute_exists(outwardCode)' : 'isDorset = :isDorset',
    ExpressionAttributeValues: includeNonDorset ? {} : { ':isDorset': true },
  });

  const result = await docClient.send(scanCommand);
  const postcodes = result.Items || [];

  logger.debug({ event: 'postcodes_fetched', count: postcodes.length }, 'Fetched postcodes for resolution');

  // Check which postcodes fall within the polygon
  const matchingCodes = [];
  for (const pc of postcodes) {
    const pt = point([pc.lon, pc.lat]);
    if (booleanPointInPolygon(pt, polygon)) {
      matchingCodes.push({
        outwardCode: pc.outwardCode,
        area: pc.area,
        region: pc.region,
        isDorset: pc.isDorset,
      });
    }
  }

  logger.info({
    event: 'resolve_polygon_success',
    totalChecked: postcodes.length,
    matchingCount: matchingCodes.length,
  }, 'Polygon resolved to outward codes');

  return {
    outwardCodes: matchingCodes.map(c => c.outwardCode),
    details: matchingCodes,
    totalChecked: postcodes.length,
  };
}

// Fetch all UK postcodes for map display
async function listPostcodes(logger) {
  logger.info({ event: 'postcodes_list_start' }, 'Listing UK postcodes');

  const scanCommand = new ScanCommand({
    TableName: UK_POSTCODES_TABLE_NAME,
  });

  const result = await docClient.send(scanCommand);
  const postcodes = (result.Items || []).map(item => ({
    outwardCode: item.outwardCode,
    lat: item.lat,
    lon: item.lon,
    area: item.area,
    region: item.region,
    isDorset: item.isDorset,
  }));

  logger.info({ event: 'postcodes_list_success', count: postcodes.length }, 'UK postcodes listed');
  return postcodes;
}

// Main handler
export const handler = async (event, context) => {
  const logger = createLogger(event, context);
  const tenantId = getTenantId(event);
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  const { httpMethod, path, pathParameters, body } = event;

  logTenantContext(logger, tenantId, 'zone-manager');
  logger.info({ event: 'lambda_invocation', httpMethod, path }, 'Zone manager invoked');

  // OPTIONS for CORS
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // GET /admin/postcodes - List all UK postcodes for map
    if (httpMethod === 'GET' && path?.includes('/postcodes')) {
      const postcodes = await listPostcodes(logger);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ postcodes }),
      };
    }

    // POST /admin/zones/resolve-polygon
    if (httpMethod === 'POST' && path?.includes('/resolve-polygon')) {
      const validation = ResolvePolygonSchema.safeParse(JSON.parse(body || '{}'));
      if (!validation.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid request', details: validation.error.issues }),
        };
      }

      const result = await resolvePolygon(validation.data.polygon, validation.data.includeNonDorset, logger);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // GET /admin/zones - List all zones
    if (httpMethod === 'GET' && !pathParameters?.zoneId) {
      const zones = await listZones(tenantId, logger);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ zones }),
      };
    }

    // GET /admin/zones/{zoneId} - Get single zone
    if (httpMethod === 'GET' && pathParameters?.zoneId) {
      const zone = await getZone(tenantId, pathParameters.zoneId, logger);
      if (!zone) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Zone not found' }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ zone }),
      };
    }

    // POST /admin/zones - Create zone
    if (httpMethod === 'POST' && !path?.includes('/resolve-polygon')) {
      const validation = CreateZoneSchema.safeParse(JSON.parse(body || '{}'));
      if (!validation.success) {
        logger.warn({ event: 'validation_error', issues: validation.error.issues }, 'Validation failed');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid request', details: validation.error.issues }),
        };
      }

      const result = await createZone(tenantId, validation.data, logger);
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

    // PUT /admin/zones/{zoneId} - Update zone
    if (httpMethod === 'PUT' && pathParameters?.zoneId) {
      const validation = UpdateZoneSchema.safeParse(JSON.parse(body || '{}'));
      if (!validation.success) {
        logger.warn({ event: 'validation_error', issues: validation.error.issues }, 'Validation failed');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid request', details: validation.error.issues }),
        };
      }

      const result = await updateZone(tenantId, pathParameters.zoneId, validation.data, logger);
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

    // DELETE /admin/zones/{zoneId} - Delete zone
    if (httpMethod === 'DELETE' && pathParameters?.zoneId) {
      const result = await deleteZone(tenantId, pathParameters.zoneId, logger);
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
        body: JSON.stringify({ success: true, message: 'Zone deleted' }),
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
