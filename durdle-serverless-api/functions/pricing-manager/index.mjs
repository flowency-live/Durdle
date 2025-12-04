import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const PRICING_TABLE_NAME = process.env.PRICING_TABLE_NAME || 'durdle-pricing-config-dev';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, pathParameters, body: requestBody } = event;
    const vehicleId = pathParameters?.vehicleId;

    switch (httpMethod) {
      case 'GET':
        if (vehicleId) {
          return await getVehicle(vehicleId);
        }
        return await listVehicles();

      case 'POST':
        return await createVehicle(requestBody);

      case 'PUT':
        if (!vehicleId) {
          return errorResponse(400, 'vehicleId is required');
        }
        return await updateVehicle(vehicleId, requestBody);

      case 'DELETE':
        if (!vehicleId) {
          return errorResponse(400, 'vehicleId is required');
        }
        return await deleteVehicle(vehicleId);

      default:
        return errorResponse(405, 'Method not allowed');
    }
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'Internal server error', error.message);
  }
};

async function listVehicles() {
  const command = new ScanCommand({
    TableName: PRICING_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':pkPrefix': 'VEHICLE#',
      ':sk': 'METADATA'
    }
  });

  const result = await ddbDocClient.send(command);

  const vehicles = result.Items.map(item => ({
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
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      vehicles,
      count: vehicles.length
    })
  };
}

async function getVehicle(vehicleId) {
  const command = new GetCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: `VEHICLE#${vehicleId}`,
      SK: 'METADATA'
    }
  });

  const result = await ddbDocClient.send(command);

  if (!result.Item) {
    return errorResponse(404, 'Vehicle not found');
  }

  const vehicle = {
    vehicleId: result.Item.vehicleId,
    name: result.Item.name,
    description: result.Item.description,
    capacity: result.Item.capacity,
    features: result.Item.features || [],
    baseFare: result.Item.baseFare,
    perMile: result.Item.perMile,
    perMinute: result.Item.perMinute,
    active: result.Item.active,
    imageKey: result.Item.imageKey || '',
    imageUrl: result.Item.imageUrl || '',
    createdAt: result.Item.createdAt,
    updatedAt: result.Item.updatedAt,
    updatedBy: result.Item.updatedBy
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(vehicle)
  };
}

async function createVehicle(requestBody) {
  const data = JSON.parse(requestBody);

  // Validate required fields
  const requiredFields = ['name', 'description', 'capacity', 'baseFare', 'perMile', 'perMinute'];
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      return errorResponse(400, `Missing required field: ${field}`);
    }
  }

  // Validate numeric fields
  if (data.capacity < 1) {
    return errorResponse(400, 'Capacity must be at least 1');
  }
  if (data.baseFare < 0 || data.perMile < 0 || data.perMinute < 0) {
    return errorResponse(400, 'Pricing values cannot be negative');
  }

  const vehicleId = data.vehicleId || randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: `VEHICLE#${vehicleId}`,
    SK: 'METADATA',
    vehicleId,
    name: data.name,
    description: data.description,
    capacity: parseInt(data.capacity),
    features: data.features || [],
    baseFare: parseInt(data.baseFare),
    perMile: parseInt(data.perMile),
    perMinute: parseInt(data.perMinute),
    active: data.active !== undefined ? data.active : true,
    imageKey: data.imageKey || '',
    imageUrl: data.imageUrl || '',
    createdAt: now,
    updatedAt: now,
    updatedBy: data.updatedBy || 'admin'
  };

  const command = new PutCommand({
    TableName: PRICING_TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK)'
  });

  try {
    await ddbDocClient.send(command);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Vehicle created successfully',
        vehicleId,
        vehicle: {
          vehicleId: item.vehicleId,
          name: item.name,
          description: item.description,
          capacity: item.capacity,
          features: item.features,
          baseFare: item.baseFare,
          perMile: item.perMile,
          perMinute: item.perMinute,
          active: item.active,
          imageKey: item.imageKey,
          imageUrl: item.imageUrl,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          updatedBy: item.updatedBy
        }
      })
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return errorResponse(409, 'Vehicle already exists');
    }
    throw error;
  }
}

async function updateVehicle(vehicleId, requestBody) {
  const data = JSON.parse(requestBody);

  // Check if vehicle exists
  const getCommand = new GetCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: `VEHICLE#${vehicleId}`,
      SK: 'METADATA'
    }
  });

  const existingItem = await ddbDocClient.send(getCommand);
  if (!existingItem.Item) {
    return errorResponse(404, 'Vehicle not found');
  }

  // Build update expression
  const updates = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (data.name !== undefined) {
    updates.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = data.name;
  }

  if (data.description !== undefined) {
    updates.push('description = :description');
    expressionAttributeValues[':description'] = data.description;
  }

  if (data.capacity !== undefined) {
    if (data.capacity < 1) {
      return errorResponse(400, 'Capacity must be at least 1');
    }
    updates.push('capacity = :capacity');
    expressionAttributeValues[':capacity'] = parseInt(data.capacity);
  }

  if (data.features !== undefined) {
    updates.push('features = :features');
    expressionAttributeValues[':features'] = data.features;
  }

  if (data.baseFare !== undefined) {
    if (data.baseFare < 0) {
      return errorResponse(400, 'Base fare cannot be negative');
    }
    updates.push('baseFare = :baseFare');
    expressionAttributeValues[':baseFare'] = parseInt(data.baseFare);
  }

  if (data.perMile !== undefined) {
    if (data.perMile < 0) {
      return errorResponse(400, 'Per mile rate cannot be negative');
    }
    updates.push('perMile = :perMile');
    expressionAttributeValues[':perMile'] = parseInt(data.perMile);
  }

  if (data.perMinute !== undefined) {
    if (data.perMinute < 0) {
      return errorResponse(400, 'Per minute rate cannot be negative');
    }
    updates.push('perMinute = :perMinute');
    expressionAttributeValues[':perMinute'] = parseInt(data.perMinute);
  }

  if (data.active !== undefined) {
    updates.push('active = :active');
    expressionAttributeValues[':active'] = data.active;
  }

  if (data.imageKey !== undefined) {
    updates.push('imageKey = :imageKey');
    expressionAttributeValues[':imageKey'] = data.imageKey;
  }

  if (data.imageUrl !== undefined) {
    updates.push('imageUrl = :imageUrl');
    expressionAttributeValues[':imageUrl'] = data.imageUrl;
  }

  if (updates.length === 0) {
    return errorResponse(400, 'No fields to update');
  }

  updates.push('updatedAt = :updatedAt');
  updates.push('updatedBy = :updatedBy');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  expressionAttributeValues[':updatedBy'] = data.updatedBy || 'admin';

  const updateCommand = new UpdateCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: `VEHICLE#${vehicleId}`,
      SK: 'METADATA'
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
      message: 'Vehicle updated successfully',
      vehicle: {
        vehicleId: result.Attributes.vehicleId,
        name: result.Attributes.name,
        description: result.Attributes.description,
        capacity: result.Attributes.capacity,
        features: result.Attributes.features,
        baseFare: result.Attributes.baseFare,
        perMile: result.Attributes.perMile,
        perMinute: result.Attributes.perMinute,
        active: result.Attributes.active,
        imageKey: result.Attributes.imageKey,
        imageUrl: result.Attributes.imageUrl,
        createdAt: result.Attributes.createdAt,
        updatedAt: result.Attributes.updatedAt,
        updatedBy: result.Attributes.updatedBy
      }
    })
  };
}

async function deleteVehicle(vehicleId) {
  // Soft delete by setting active = false
  const updateCommand = new UpdateCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: `VEHICLE#${vehicleId}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'SET active = :active, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':active': false,
      ':updatedAt': new Date().toISOString()
    },
    ConditionExpression: 'attribute_exists(PK)',
    ReturnValues: 'ALL_NEW'
  });

  try {
    await ddbDocClient.send(updateCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Vehicle deactivated successfully',
        vehicleId
      })
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return errorResponse(404, 'Vehicle not found');
    }
    throw error;
  }
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
