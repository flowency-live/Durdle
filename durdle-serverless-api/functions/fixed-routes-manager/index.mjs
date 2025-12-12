import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { getTenantId, buildTenantPK } from '/opt/nodejs/tenant.mjs';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);
const secretsClient = new SecretsManagerClient({ region: 'eu-west-2' });

const FIXED_ROUTES_TABLE_NAME = process.env.FIXED_ROUTES_TABLE_NAME || 'durdle-fixed-routes-dev';
const GOOGLE_MAPS_SECRET_NAME = process.env.GOOGLE_MAPS_SECRET_NAME || 'durdle/google-maps-api-key';

let cachedApiKey = null;

const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://durdle.flowency.build',
  'https://durdle.co.uk',
  'https://dorsettransfercompany.flowency.build',
  'https://dorsettransfercompany.co.uk'
];

const getHeaders = (origin) => {
  // All admin endpoints require credentials - use specific origin
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

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const httpMethod = event.httpMethod || 'GET';
  const headers = getHeaders(origin);
  const tenantId = getTenantId(event);

  console.log('Tenant context:', { tenantId, operation: 'fixed_routes_manager' });

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, pathParameters, body: requestBody, queryStringParameters } = event;
    const routeId = pathParameters?.routeId;

    switch (httpMethod) {
      case 'GET':
        if (routeId) {
          return await getRoute(routeId, headers, tenantId);
        }
        return await listRoutes(queryStringParameters || {}, headers, tenantId);

      case 'POST':
        return await createRoute(requestBody, headers, tenantId);

      case 'PUT':
        if (!routeId) {
          return errorResponse(400, 'routeId is required', null, headers);
        }
        return await updateRoute(routeId, requestBody, headers, tenantId);

      case 'DELETE':
        if (!routeId) {
          return errorResponse(400, 'routeId is required', null, headers);
        }
        return await deleteRoute(routeId, headers, tenantId);

      default:
        return errorResponse(405, 'Method not allowed', null, headers);
    }
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

async function getGoogleMapsApiKey() {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  const command = new GetSecretValueCommand({
    SecretId: GOOGLE_MAPS_SECRET_NAME
  });

  const response = await secretsClient.send(command);
  cachedApiKey = response.SecretString;
  return cachedApiKey;
}

async function fetchRouteDetails(originPlaceId, destinationPlaceId) {
  const apiKey = await getGoogleMapsApiKey();

  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  const params = {
    origins: `place_id:${originPlaceId}`,
    destinations: `place_id:${destinationPlaceId}`,
    key: apiKey
  };

  const response = await axios.get(url, { params });

  if (response.data.status !== 'OK') {
    throw new Error(`Google Maps API error: ${response.data.status}`);
  }

  const element = response.data.rows[0]?.elements[0];
  if (!element || element.status !== 'OK') {
    throw new Error(`Route not found: ${element?.status || 'unknown'}`);
  }

  return {
    distance: element.distance.value / 1609.34, // meters to miles
    distanceText: element.distance.text,
    duration: Math.round(element.duration.value / 60), // seconds to minutes
    durationText: element.duration.text
  };
}

async function listRoutes(queryParams, headers, tenantId) {
  const { origin, destination, vehicleId, active, limit, lastEvaluatedKey } = queryParams;

  let command;

  // Tenant filter expression for all queries
  const tenantFilter = 'attribute_not_exists(tenantId) OR tenantId = :tenantId';

  if (vehicleId) {
    // Query GSI1 for all routes for a specific vehicle
    command = new QueryCommand({
      TableName: FIXED_ROUTES_TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      FilterExpression: tenantFilter,
      ExpressionAttributeValues: {
        ':gsi1pk': `VEHICLE#${vehicleId}`,
        ':tenantId': tenantId
      },
      Limit: limit ? parseInt(limit) : 50,
      ExclusiveStartKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined
    });
  } else if (origin) {
    // Query by origin place ID - try both tenant-prefixed and old format
    // For now, use dual-format scan since PK varies
    command = new ScanCommand({
      TableName: FIXED_ROUTES_TABLE_NAME,
      FilterExpression: `(begins_with(PK, :tenantPrefix) OR begins_with(PK, :oldPrefix)) AND (${tenantFilter})`,
      ExpressionAttributeValues: {
        ':tenantPrefix': `${tenantId}#ROUTE#${origin}`,
        ':oldPrefix': `ROUTE#${origin}`,
        ':tenantId': tenantId
      },
      Limit: limit ? parseInt(limit) : 50,
      ExclusiveStartKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined
    });
  } else {
    // Scan all routes with tenant filter
    command = new ScanCommand({
      TableName: FIXED_ROUTES_TABLE_NAME,
      FilterExpression: `(begins_with(PK, :tenantPrefix) OR begins_with(PK, :oldPrefix)) AND (${tenantFilter})`,
      ExpressionAttributeValues: {
        ':tenantPrefix': `${tenantId}#ROUTE#`,
        ':oldPrefix': 'ROUTE#',
        ':tenantId': tenantId
      },
      Limit: limit ? parseInt(limit) : 50,
      ExclusiveStartKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined
    });
  }

  const result = await ddbDocClient.send(command);

  let routes = result.Items || [];

  // Apply active filter if specified
  if (active !== undefined) {
    const isActive = active === 'true';
    routes = routes.filter(item => item.active === isActive);
  }

  const formattedRoutes = routes.map(formatRoute);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      routes: formattedRoutes,
      count: formattedRoutes.length,
      lastEvaluatedKey: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : null
    })
  };
}

async function getRoute(routeId, headers, tenantId) {
  // Since we only have routeId, we need to scan to find the item with tenant filter
  const command = new ScanCommand({
    TableName: FIXED_ROUTES_TABLE_NAME,
    FilterExpression: 'routeId = :routeId AND (attribute_not_exists(tenantId) OR tenantId = :tenantId)',
    ExpressionAttributeValues: {
      ':routeId': routeId,
      ':tenantId': tenantId
    }
  });

  const result = await ddbDocClient.send(command);

  if (!result.Items || result.Items.length === 0) {
    return errorResponse(404, 'Route not found', null, headers);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatRoute(result.Items[0]))
  };
}

async function createRoute(requestBody, headers, tenantId) {
  const data = JSON.parse(requestBody);

  // Validate required fields
  const requiredFields = ['originPlaceId', 'originName', 'destinationPlaceId', 'destinationName', 'vehicleId', 'price'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return errorResponse(400, `Missing required field: ${field}`, null, headers);
    }
  }

  // Validate origin != destination
  if (data.originPlaceId === data.destinationPlaceId) {
    return errorResponse(400, 'Origin and destination must be different', null, headers);
  }

  // Validate price
  if (data.price < 0) {
    return errorResponse(400, 'Price cannot be negative', null, headers);
  }

  // Check for duplicate route - try both tenant-prefixed and old formats
  const tenantPK = buildTenantPK(tenantId, 'ROUTE', data.originPlaceId);
  const duplicateCheck = new QueryCommand({
    TableName: FIXED_ROUTES_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': tenantPK,
      ':sk': `DEST#${data.destinationPlaceId}#VEHICLE#${data.vehicleId}`
    }
  });

  let duplicateResult = await ddbDocClient.send(duplicateCheck);

  // Also check old format
  if (!duplicateResult.Items || duplicateResult.Items.length === 0) {
    const oldDuplicateCheck = new QueryCommand({
      TableName: FIXED_ROUTES_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `ROUTE#${data.originPlaceId}`,
        ':sk': `DEST#${data.destinationPlaceId}#VEHICLE#${data.vehicleId}`
      }
    });
    duplicateResult = await ddbDocClient.send(oldDuplicateCheck);
  }

  if (duplicateResult.Items && duplicateResult.Items.length > 0) {
    return errorResponse(409, 'Route already exists for this origin, destination, and vehicle combination', null, headers);
  }

  // Fetch route details from Google Maps
  let routeDetails;
  try {
    routeDetails = await fetchRouteDetails(data.originPlaceId, data.destinationPlaceId);
  } catch (error) {
    return errorResponse(400, 'Failed to fetch route details from Google Maps', error.message, headers);
  }

  const routeId = randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: tenantPK,
    SK: `DEST#${data.destinationPlaceId}#VEHICLE#${data.vehicleId}`,
    tenantId, // Always include tenant attribute for filtering
    GSI1PK: `VEHICLE#${data.vehicleId}`,
    GSI1SK: `ROUTE#${data.originPlaceId}#${data.destinationPlaceId}`,
    routeId,
    originPlaceId: data.originPlaceId,
    originName: data.originName,
    originType: data.originType || 'location',
    destinationPlaceId: data.destinationPlaceId,
    destinationName: data.destinationName,
    destinationType: data.destinationType || 'location',
    vehicleId: data.vehicleId,
    vehicleName: data.vehicleName || '',
    price: parseInt(data.price),
    distance: routeDetails.distance,
    estimatedDuration: routeDetails.duration,
    active: data.active !== undefined ? data.active : true,
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now,
    updatedBy: data.updatedBy || 'admin'
  };

  const command = new PutCommand({
    TableName: FIXED_ROUTES_TABLE_NAME,
    Item: item
  });

  await ddbDocClient.send(command);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'Route created successfully',
      routeId,
      route: formatRoute(item)
    })
  };
}

async function updateRoute(routeId, requestBody, headers, tenantId) {
  const data = JSON.parse(requestBody);

  // Find the route first with tenant filter
  const findCommand = new ScanCommand({
    TableName: FIXED_ROUTES_TABLE_NAME,
    FilterExpression: 'routeId = :routeId AND (attribute_not_exists(tenantId) OR tenantId = :tenantId)',
    ExpressionAttributeValues: {
      ':routeId': routeId,
      ':tenantId': tenantId
    }
  });

  const findResult = await ddbDocClient.send(findCommand);
  if (!findResult.Items || findResult.Items.length === 0) {
    return errorResponse(404, 'Route not found', null, headers);
  }

  const existingItem = findResult.Items[0];

  // Build update expression
  const updates = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (data.price !== undefined) {
    if (data.price < 0) {
      return errorResponse(400, 'Price cannot be negative', null, headers);
    }
    updates.push('price = :price');
    expressionAttributeValues[':price'] = parseInt(data.price);
  }

  if (data.active !== undefined) {
    updates.push('active = :active');
    expressionAttributeValues[':active'] = data.active;
  }

  if (data.notes !== undefined) {
    updates.push('notes = :notes');
    expressionAttributeValues[':notes'] = data.notes;
  }

  if (data.vehicleName !== undefined) {
    updates.push('vehicleName = :vehicleName');
    expressionAttributeValues[':vehicleName'] = data.vehicleName;
  }

  // If origin or destination changed, fetch new route details
  if (data.originPlaceId || data.destinationPlaceId) {
    const newOrigin = data.originPlaceId || existingItem.originPlaceId;
    const newDest = data.destinationPlaceId || existingItem.destinationPlaceId;

    if (newOrigin === newDest) {
      return errorResponse(400, 'Origin and destination must be different', null, headers);
    }

    try {
      const routeDetails = await fetchRouteDetails(newOrigin, newDest);
      updates.push('distance = :distance');
      updates.push('estimatedDuration = :estimatedDuration');
      expressionAttributeValues[':distance'] = routeDetails.distance;
      expressionAttributeValues[':estimatedDuration'] = routeDetails.duration;
    } catch (error) {
      return errorResponse(400, 'Failed to fetch route details from Google Maps', error.message, headers);
    }

    if (data.originPlaceId) {
      updates.push('originPlaceId = :originPlaceId');
      expressionAttributeValues[':originPlaceId'] = data.originPlaceId;
    }

    if (data.originName) {
      updates.push('originName = :originName');
      expressionAttributeValues[':originName'] = data.originName;
    }

    if (data.destinationPlaceId) {
      updates.push('destinationPlaceId = :destinationPlaceId');
      expressionAttributeValues[':destinationPlaceId'] = data.destinationPlaceId;
    }

    if (data.destinationName) {
      updates.push('destinationName = :destinationName');
      expressionAttributeValues[':destinationName'] = data.destinationName;
    }
  }

  if (updates.length === 0) {
    return errorResponse(400, 'No fields to update', null, headers);
  }

  updates.push('updatedAt = :updatedAt');
  updates.push('updatedBy = :updatedBy');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  expressionAttributeValues[':updatedBy'] = data.updatedBy || 'admin';

  const updateCommand = new UpdateCommand({
    TableName: FIXED_ROUTES_TABLE_NAME,
    Key: {
      PK: existingItem.PK,
      SK: existingItem.SK
    },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  });

  const result = await ddbDocClient.send(updateCommand);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Route updated successfully',
      route: formatRoute(result.Attributes)
    })
  };
}

async function deleteRoute(routeId, headers, tenantId) {
  // Find the route first with tenant filter
  const findCommand = new ScanCommand({
    TableName: FIXED_ROUTES_TABLE_NAME,
    FilterExpression: 'routeId = :routeId AND (attribute_not_exists(tenantId) OR tenantId = :tenantId)',
    ExpressionAttributeValues: {
      ':routeId': routeId,
      ':tenantId': tenantId
    }
  });

  const findResult = await ddbDocClient.send(findCommand);
  if (!findResult.Items || findResult.Items.length === 0) {
    return errorResponse(404, 'Route not found', null, headers);
  }

  const item = findResult.Items[0];

  const deleteCommand = new DeleteCommand({
    TableName: FIXED_ROUTES_TABLE_NAME,
    Key: {
      PK: item.PK,
      SK: item.SK
    }
  });

  await ddbDocClient.send(deleteCommand);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Route deleted successfully',
      routeId
    })
  };
}

function formatRoute(item) {
  return {
    routeId: item.routeId,
    originPlaceId: item.originPlaceId,
    originName: item.originName,
    originType: item.originType,
    destinationPlaceId: item.destinationPlaceId,
    destinationName: item.destinationName,
    destinationType: item.destinationType,
    vehicleId: item.vehicleId,
    vehicleName: item.vehicleName,
    price: item.price,
    distance: item.distance,
    estimatedDuration: item.estimatedDuration,
    active: item.active,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    updatedBy: item.updatedBy
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
