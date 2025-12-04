import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const PRICING_TABLE_NAME = process.env.PRICING_TABLE_NAME || 'durdle-pricing-config-dev';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
};

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, path } = event;

    if (httpMethod !== 'GET') {
      return errorResponse(405, 'Method not allowed');
    }

    // Determine if this is public or admin endpoint
    const isPublic = path.includes('/v1/vehicles');

    return await listVehicles(isPublic);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'Internal server error', error.message);
  }
};

async function listVehicles(isPublic) {
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

  // If public endpoint, only return active vehicles
  if (isPublic) {
    vehicles = vehicles.filter(item => item.active === true);
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

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      vehicles: formattedVehicles,
      count: formattedVehicles.length
    })
  };
}

function errorResponse(statusCode, message, details = null) {
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
