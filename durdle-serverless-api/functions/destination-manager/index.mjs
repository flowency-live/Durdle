/**
 * destination-manager Lambda
 *
 * Manages destinations for zone-based pricing (airports, stations, ports).
 * - CRUD operations for destinations
 * - Google Place ID storage for quote matching
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
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
const LocationTypeEnum = z.enum(['airport', 'train_station', 'port', 'other']);

const CreateDestinationSchema = z.object({
  name: z.string().min(3).max(100),
  placeId: z.string().startsWith('ChIJ', 'Must be a valid Google Place ID'),
  locationType: LocationTypeEnum,
  alternativePlaceIds: z.array(z.string().startsWith('ChIJ')).optional(),
  active: z.boolean().optional().default(true),
});

const UpdateDestinationSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  placeId: z.string().startsWith('ChIJ').optional(),
  locationType: LocationTypeEnum.optional(),
  alternativePlaceIds: z.array(z.string().startsWith('ChIJ')).optional(),
  active: z.boolean().optional(),
});

// Generate destination ID from name
function generateDestinationId(name) {
  return 'dest-' + name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
}

// List all destinations
async function listDestinations(tenantId, logger) {
  logger.info({ event: 'destination_list_start' }, 'Listing destinations');

  const command = new ScanCommand({
    TableName: PRICING_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':prefix': `${tenantId}#DESTINATION#`,
      ':sk': 'METADATA',
      ':tenantId': tenantId,
    },
  });

  const result = await docClient.send(command);
  const destinations = (result.Items || []).map(item => ({
    destinationId: item.destinationId,
    name: item.name,
    placeId: item.placeId,
    locationType: item.locationType,
    alternativePlaceIds: item.alternativePlaceIds || [],
    active: item.active,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  logger.info({ event: 'destination_list_success', count: destinations.length }, 'Destinations listed');
  return destinations;
}

// Get single destination
async function getDestination(tenantId, destinationId, logger) {
  logger.info({ event: 'destination_get_start', destinationId }, 'Getting destination');

  const command = new GetCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'DESTINATION', destinationId),
      SK: 'METADATA',
    },
  });

  const result = await docClient.send(command);

  if (!result.Item) {
    logger.warn({ event: 'destination_get_not_found', destinationId }, 'Destination not found');
    return null;
  }

  logger.info({ event: 'destination_get_success', destinationId }, 'Destination retrieved');
  return result.Item;
}

// Find destination by placeId (for quote matching)
async function findDestinationByPlaceId(tenantId, placeId, logger) {
  logger.info({ event: 'destination_find_by_placeid', placeId }, 'Finding destination by placeId');

  const command = new ScanCommand({
    TableName: PRICING_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND tenantId = :tenantId AND (placeId = :placeId OR contains(alternativePlaceIds, :placeId))',
    ExpressionAttributeValues: {
      ':prefix': `${tenantId}#DESTINATION#`,
      ':sk': 'METADATA',
      ':tenantId': tenantId,
      ':placeId': placeId,
    },
  });

  const result = await docClient.send(command);

  if (!result.Items || result.Items.length === 0) {
    logger.debug({ event: 'destination_not_found_by_placeid', placeId }, 'No destination found for placeId');
    return null;
  }

  logger.info({ event: 'destination_found_by_placeid', placeId, destinationId: result.Items[0].destinationId }, 'Destination found');
  return result.Items[0];
}

// Create destination
async function createDestination(tenantId, data, logger) {
  const destinationId = generateDestinationId(data.name);
  const now = new Date().toISOString();

  logger.info({ event: 'destination_create_start', destinationId, name: data.name }, 'Creating destination');

  // Check if destination already exists
  const existing = await getDestination(tenantId, destinationId, logger);
  if (existing) {
    logger.warn({ event: 'destination_create_conflict', destinationId }, 'Destination already exists');
    return { error: 'Destination with this name already exists', statusCode: 409 };
  }

  const item = {
    PK: buildTenantPK(tenantId, 'DESTINATION', destinationId),
    SK: 'METADATA',
    tenantId,
    destinationId,
    name: data.name,
    placeId: data.placeId,
    locationType: data.locationType,
    alternativePlaceIds: data.alternativePlaceIds || [],
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: PRICING_TABLE_NAME,
    Item: item,
  }));

  logger.info({ event: 'destination_create_success', destinationId }, 'Destination created');
  return { destination: item };
}

// Update destination
async function updateDestination(tenantId, destinationId, data, logger) {
  logger.info({ event: 'destination_update_start', destinationId }, 'Updating destination');

  const existing = await getDestination(tenantId, destinationId, logger);
  if (!existing) {
    logger.warn({ event: 'destination_update_not_found', destinationId }, 'Destination not found');
    return { error: 'Destination not found', statusCode: 404 };
  }

  const now = new Date().toISOString();

  const updatedItem = {
    ...existing,
    name: data.name ?? existing.name,
    placeId: data.placeId ?? existing.placeId,
    locationType: data.locationType ?? existing.locationType,
    alternativePlaceIds: data.alternativePlaceIds !== undefined ? data.alternativePlaceIds : existing.alternativePlaceIds,
    active: data.active ?? existing.active,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: PRICING_TABLE_NAME,
    Item: updatedItem,
  }));

  logger.info({ event: 'destination_update_success', destinationId }, 'Destination updated');
  return { destination: updatedItem };
}

// Delete destination (hard delete)
async function deleteDestination(tenantId, destinationId, logger) {
  logger.info({ event: 'destination_delete_start', destinationId }, 'Deleting destination');

  const existing = await getDestination(tenantId, destinationId, logger);
  if (!existing) {
    logger.warn({ event: 'destination_delete_not_found', destinationId }, 'Destination not found');
    return { error: 'Destination not found', statusCode: 404 };
  }

  // TODO: Check if destination has any zone pricing records before deleting
  // For now, allow deletion - orphaned pricing records will be cleaned up later

  await docClient.send(new DeleteCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'DESTINATION', destinationId),
      SK: 'METADATA',
    },
  }));

  logger.info({ event: 'destination_delete_success', destinationId }, 'Destination deleted');
  return { success: true };
}

// Main handler
export const handler = async (event, context) => {
  const logger = createLogger(event, context);
  const tenantId = getTenantId(event);
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  const { httpMethod, path, pathParameters, body, queryStringParameters } = event;

  logTenantContext(logger, tenantId, 'destination-manager');
  logger.info({ event: 'lambda_invocation', httpMethod, path }, 'Destination manager invoked');

  // OPTIONS for CORS
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // GET /admin/destinations/lookup?placeId=xxx - Find destination by placeId
    if (httpMethod === 'GET' && path?.includes('/lookup')) {
      const placeId = queryStringParameters?.placeId;
      if (!placeId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'placeId query parameter required' }),
        };
      }

      const destination = await findDestinationByPlaceId(tenantId, placeId, logger);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ destination, found: !!destination }),
      };
    }

    // GET /admin/destinations - List all destinations
    if (httpMethod === 'GET' && !pathParameters?.destId) {
      const destinations = await listDestinations(tenantId, logger);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ destinations }),
      };
    }

    // GET /admin/destinations/{destId} - Get single destination
    if (httpMethod === 'GET' && pathParameters?.destId) {
      const destination = await getDestination(tenantId, pathParameters.destId, logger);
      if (!destination) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Destination not found' }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ destination }),
      };
    }

    // POST /admin/destinations - Create destination
    if (httpMethod === 'POST') {
      const validation = CreateDestinationSchema.safeParse(JSON.parse(body || '{}'));
      if (!validation.success) {
        logger.warn({ event: 'validation_error', issues: validation.error.issues }, 'Validation failed');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid request', details: validation.error.issues }),
        };
      }

      const result = await createDestination(tenantId, validation.data, logger);
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

    // PUT /admin/destinations/{destId} - Update destination
    if (httpMethod === 'PUT' && pathParameters?.destId) {
      const validation = UpdateDestinationSchema.safeParse(JSON.parse(body || '{}'));
      if (!validation.success) {
        logger.warn({ event: 'validation_error', issues: validation.error.issues }, 'Validation failed');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid request', details: validation.error.issues }),
        };
      }

      const result = await updateDestination(tenantId, pathParameters.destId, validation.data, logger);
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

    // DELETE /admin/destinations/{destId} - Delete destination
    if (httpMethod === 'DELETE' && pathParameters?.destId) {
      const result = await deleteDestination(tenantId, pathParameters.destId, logger);
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
        body: JSON.stringify({ success: true, message: 'Destination deleted' }),
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
