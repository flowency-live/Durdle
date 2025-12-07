import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger } from '/opt/nodejs/logger.mjs';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const PRICING_TABLE_NAME = process.env.PRICING_TABLE_NAME || 'durdle-pricing-config-dev';

const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://durdle.flowency.build',
  'https://durdle.co.uk'
];

const getHeaders = (origin) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};

export const handler = async (event, context) => {
  const logger = createLogger(event, context);

  logger.info({
    event: 'lambda_invocation',
    httpMethod: event.httpMethod,
    path: event.path,
  }, 'Vehicle manager Lambda invoked');

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, path } = event;

    if (httpMethod !== 'GET') {
      logger.warn({ event: 'invalid_method', httpMethod }, 'Method not allowed');
      return errorResponse(405, 'Method not allowed', null, headers);
    }

    // Determine if this is public or admin endpoint
    const isPublic = path.includes('/v1/vehicles');

    logger.info({ event: 'vehicle_list_request', isPublic }, 'Fetching vehicle list');

    return await listVehicles(isPublic, headers, logger);
  } catch (error) {
    logger.error({
      event: 'lambda_error',
      errorMessage: error.message,
      errorStack: error.stack,
    }, 'Unhandled error in vehicle manager Lambda');
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

async function listVehicles(isPublic, headers, logger) {
  logger.info({
    event: 'dynamodb_operation',
    operation: 'scan',
    tableName: PRICING_TABLE_NAME,
  }, 'Scanning vehicles from DynamoDB');

  const command = new ScanCommand({
    TableName: PRICING_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':pkPrefix': 'VEHICLE#',
      ':sk': 'METADATA'
    }
  });

  const result = await ddbDocClient.send(command);

  let vehicles = result.Items || [];

  logger.info({
    event: 'vehicle_list_fetched',
    totalCount: vehicles.length,
    isPublic,
  }, 'Vehicles fetched from database');

  // If public endpoint, only return active vehicles
  if (isPublic) {
    vehicles = vehicles.filter(item => item.active === true);
    logger.info({
      event: 'vehicle_list_filtered',
      activeCount: vehicles.length,
    }, 'Filtered to active vehicles only');
  }

  // Format vehicles - public endpoint excludes pricing details
  const formattedVehicles = vehicles.map(item => {
    if (isPublic) {
      return {
        vehicleId: item.vehicleId,
        name: item.name,
        description: item.description,
        capacity: item.capacity,
        features: item.features || [],
        imageUrl: item.imageUrl || '',
        active: item.active
      };
    } else {
      return {
        vehicleId: item.vehicleId,
        name: item.name,
        description: item.description,
        capacity: item.capacity,
        features: item.features || [],
        baseFare: item.baseFare,
        perMile: item.perMile,
        perMinute: item.perMinute,
        active: item.active,
        imageKey: item.imageKey || '',
        imageUrl: item.imageUrl || '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        updatedBy: item.updatedBy
      };
    }
  });

  // Sort by capacity (smallest to largest)
  formattedVehicles.sort((a, b) => a.capacity - b.capacity);

  logger.info({
    event: 'vehicle_list_success',
    count: formattedVehicles.length,
    isPublic,
    includePricing: !isPublic,
  }, 'Vehicle list returned successfully');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      vehicles: formattedVehicles,
      count: formattedVehicles.length
    })
  };
}

function errorResponse(statusCode, message, details = null, headers) {
  const body = { error: message };
  if (details) {
    body.details = details;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}
