import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { createLogger } from '/opt/nodejs/logger.mjs';
import { z } from 'zod';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const PRICING_TABLE_NAME = process.env.PRICING_TABLE_NAME || 'durdle-pricing-config-dev';

// Zod schemas for vehicle validation
const CreateVehicleSchema = z.object({
  vehicleId: z.string().optional(),
  name: z.string().min(1, 'Vehicle name is required'),
  description: z.string().min(1, 'Description is required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
  baseFare: z.number().int().min(0, 'Base fare cannot be negative'),
  perMile: z.number().int().min(0, 'Per mile rate cannot be negative'),
  perMinute: z.number().int().min(0, 'Per minute rate cannot be negative'),
  features: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  imageKey: z.string().optional(),
  imageUrl: z.string().optional(),
  updatedBy: z.string().optional(),
});

const UpdateVehicleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').optional(),
  baseFare: z.number().int().min(0, 'Base fare cannot be negative').optional(),
  perMile: z.number().int().min(0, 'Per mile rate cannot be negative').optional(),
  perMinute: z.number().int().min(0, 'Per minute rate cannot be negative').optional(),
  features: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  imageKey: z.string().optional(),
  imageUrl: z.string().optional(),
  updatedBy: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

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
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};

export const handler = async (event, context) => {
  const logger = createLogger(event, context);

  logger.info({
    event: 'lambda_invocation',
    httpMethod: event.httpMethod,
    path: event.path,
  }, 'Pricing manager Lambda invoked');

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, pathParameters, body: requestBody } = event;
    const vehicleId = pathParameters?.vehicleId;

    switch (httpMethod) {
      case 'GET':
        logger.info({ event: 'vehicle_operation', operation: 'GET', vehicleId }, 'Processing GET request');
        if (vehicleId) {
          return await getVehicle(vehicleId, headers, logger);
        }
        return await listVehicles(headers, logger);

      case 'POST':
        logger.info({ event: 'vehicle_operation', operation: 'POST' }, 'Processing POST request');
        return await createVehicle(requestBody, headers, logger);

      case 'PUT':
        logger.info({ event: 'vehicle_operation', operation: 'PUT', vehicleId }, 'Processing PUT request');
        if (!vehicleId) {
          return errorResponse(400, 'vehicleId is required', null, headers);
        }
        return await updateVehicle(vehicleId, requestBody, headers, logger);

      case 'DELETE':
        logger.info({ event: 'vehicle_operation', operation: 'DELETE', vehicleId }, 'Processing DELETE request');
        if (!vehicleId) {
          return errorResponse(400, 'vehicleId is required', null, headers);
        }
        return await deleteVehicle(vehicleId, headers, logger);

      default:
        return errorResponse(405, 'Method not allowed', null, headers);
    }
  } catch (error) {
    logger.error({
      event: 'lambda_error',
      errorMessage: error.message,
      errorStack: error.stack,
    }, 'Unhandled error in pricing manager Lambda');
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

async function listVehicles(headers, logger) {
  logger.info({ event: 'vehicle_list_start' }, 'Fetching all vehicles');

  logger.info({
    event: 'dynamodb_operation',
    operation: 'Scan',
    tableName: PRICING_TABLE_NAME,
  }, 'Querying DynamoDB for vehicles');

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

  logger.info({
    event: 'vehicle_list_success',
    count: vehicles.length,
  }, 'Successfully retrieved vehicles');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      vehicles,
      count: vehicles.length
    })
  };
}

async function getVehicle(vehicleId, headers, logger) {
  logger.info({ event: 'vehicle_get_start', vehicleId }, 'Fetching vehicle by ID');

  logger.info({
    event: 'dynamodb_operation',
    operation: 'GetCommand',
    tableName: PRICING_TABLE_NAME,
    vehicleId,
  }, 'Querying DynamoDB for vehicle');

  const command = new GetCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: `VEHICLE#${vehicleId}`,
      SK: 'METADATA'
    }
  });

  const result = await ddbDocClient.send(command);

  if (!result.Item) {
    logger.warn({ event: 'vehicle_get_not_found', vehicleId }, 'Vehicle not found');
    return errorResponse(404, 'Vehicle not found', null, headers);
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

  logger.info({ event: 'vehicle_get_success', vehicleId }, 'Successfully retrieved vehicle');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(vehicle)
  };
}

async function createVehicle(requestBody, headers, logger) {
  logger.info({ event: 'vehicle_create_start' }, 'Creating new vehicle');

  const rawData = JSON.parse(requestBody);

  // Validate with Zod schema
  const validation = CreateVehicleSchema.safeParse(rawData);

  if (!validation.success) {
    const errors = validation.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    logger.warn({
      event: 'validation_error',
      errors,
    }, 'Vehicle creation validation failed');

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Validation failed',
        details: errors
      })
    };
  }

  const data = validation.data;
  const vehicleId = data.vehicleId || randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: `VEHICLE#${vehicleId}`,
    SK: 'METADATA',
    vehicleId,
    name: data.name,
    description: data.description,
    capacity: data.capacity,
    features: data.features || [],
    baseFare: data.baseFare,
    perMile: data.perMile,
    perMinute: data.perMinute,
    active: data.active !== undefined ? data.active : true,
    imageKey: data.imageKey || '',
    imageUrl: data.imageUrl || '',
    createdAt: now,
    updatedAt: now,
    updatedBy: data.updatedBy || 'admin'
  };

  logger.info({
    event: 'dynamodb_operation',
    operation: 'PutCommand',
    tableName: PRICING_TABLE_NAME,
    vehicleId,
  }, 'Creating vehicle in DynamoDB');

  const command = new PutCommand({
    TableName: PRICING_TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK)'
  });

  try {
    await ddbDocClient.send(command);

    logger.info({
      event: 'vehicle_create_success',
      vehicleId,
    }, 'Vehicle created successfully');

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
      logger.warn({ event: 'vehicle_create_conflict', vehicleId }, 'Vehicle already exists');
      return errorResponse(409, 'Vehicle already exists', null, headers);
    }
    throw error;
  }
}

async function updateVehicle(vehicleId, requestBody, headers, logger) {
  logger.info({ event: 'vehicle_update_start', vehicleId }, 'Updating vehicle');

  const rawData = JSON.parse(requestBody);

  // Validate with Zod schema
  const validation = UpdateVehicleSchema.safeParse(rawData);

  if (!validation.success) {
    const errors = validation.error.errors.map(err => ({
      field: err.path.join('.') || 'root',
      message: err.message,
      code: err.code
    }));

    logger.warn({
      event: 'validation_error',
      vehicleId,
      errors,
    }, 'Vehicle update validation failed');

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Validation failed',
        details: errors
      })
    };
  }

  const data = validation.data;

  // Check if vehicle exists
  logger.info({
    event: 'dynamodb_operation',
    operation: 'GetCommand',
    tableName: PRICING_TABLE_NAME,
    vehicleId,
  }, 'Checking if vehicle exists');

  const getCommand = new GetCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: `VEHICLE#${vehicleId}`,
      SK: 'METADATA'
    }
  });

  const existingItem = await ddbDocClient.send(getCommand);
  if (!existingItem.Item) {
    logger.warn({ event: 'vehicle_update_not_found', vehicleId }, 'Vehicle not found');
    return errorResponse(404, 'Vehicle not found', null, headers);
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
    updates.push('#capacity = :capacity');
    expressionAttributeNames['#capacity'] = 'capacity';
    expressionAttributeValues[':capacity'] = data.capacity;
  }

  if (data.features !== undefined) {
    updates.push('features = :features');
    expressionAttributeValues[':features'] = data.features;
  }

  if (data.baseFare !== undefined) {
    updates.push('baseFare = :baseFare');
    expressionAttributeValues[':baseFare'] = data.baseFare;
  }

  if (data.perMile !== undefined) {
    updates.push('perMile = :perMile');
    expressionAttributeValues[':perMile'] = data.perMile;
  }

  if (data.perMinute !== undefined) {
    updates.push('perMinute = :perMinute');
    expressionAttributeValues[':perMinute'] = data.perMinute;
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

  updates.push('updatedAt = :updatedAt');
  updates.push('updatedBy = :updatedBy');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  expressionAttributeValues[':updatedBy'] = data.updatedBy || 'admin';

  const fieldsUpdated = Object.keys(data).length;

  logger.info({
    event: 'dynamodb_operation',
    operation: 'UpdateCommand',
    tableName: PRICING_TABLE_NAME,
    vehicleId,
    fieldsUpdated,
  }, 'Updating vehicle in DynamoDB');

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

  logger.info({
    event: 'vehicle_update_success',
    vehicleId,
    fieldsUpdated,
  }, 'Vehicle updated successfully');

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

async function deleteVehicle(vehicleId, headers, logger) {
  logger.info({ event: 'vehicle_delete_start', vehicleId }, 'Deactivating vehicle');

  // Soft delete by setting active = false
  logger.info({
    event: 'dynamodb_operation',
    operation: 'UpdateCommand',
    tableName: PRICING_TABLE_NAME,
    vehicleId,
  }, 'Soft deleting vehicle in DynamoDB');

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

    logger.info({
      event: 'vehicle_delete_success',
      vehicleId,
    }, 'Vehicle deactivated successfully');

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
      logger.warn({ event: 'vehicle_delete_not_found', vehicleId }, 'Vehicle not found');
      return errorResponse(404, 'Vehicle not found', null, headers);
    }
    throw error;
  }
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
