import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { createLogger } from '/opt/nodejs/logger.mjs';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const FEEDBACK_TABLE_NAME = process.env.FEEDBACK_TABLE_NAME || 'durdle-feedback-dev';

const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://durdle.flowency.build',
  'https://durdle.co.uk'
];

const getHeaders = (path, origin) => {
  // Public endpoint /v1/feedback uses wildcard CORS
  const isPublicPath = path && path.includes('/v1/feedback') && !path.includes('/admin/');

  if (isPublicPath) {
    return {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
  }

  // Admin endpoints use dynamic origin matching with credentials
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
  }, 'Feedback manager Lambda invoked');

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const path = event.path || event.requestContext?.resourcePath || '';
  const headers = getHeaders(path, origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, pathParameters, body: requestBody } = event;
    const feedbackId = pathParameters?.feedbackId;

    switch (httpMethod) {
      case 'GET':
        logger.info({ event: 'feedback_operation', operation: 'GET', feedbackId }, 'Processing GET request');
        if (feedbackId) {
          return await getFeedback(feedbackId, headers, logger);
        }
        return await listFeedback(headers, logger);

      case 'POST':
        logger.info({ event: 'feedback_operation', operation: 'POST' }, 'Processing POST request');
        return await createFeedback(requestBody, headers, logger);

      case 'PUT':
        logger.info({ event: 'feedback_operation', operation: 'PUT', feedbackId }, 'Processing PUT request');
        if (!feedbackId) {
          return errorResponse(400, 'feedbackId is required', null, headers);
        }
        return await updateFeedback(feedbackId, requestBody, headers, logger);

      case 'DELETE':
        logger.info({ event: 'feedback_operation', operation: 'DELETE', feedbackId }, 'Processing DELETE request');
        if (!feedbackId) {
          return errorResponse(400, 'feedbackId is required', null, headers);
        }
        return await deleteFeedback(feedbackId, headers, logger);

      default:
        return errorResponse(405, 'Method not allowed', null, headers);
    }
  } catch (error) {
    logger.error({
      event: 'lambda_error',
      errorMessage: error.message,
      errorStack: error.stack,
    }, 'Unhandled error in feedback manager Lambda');
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

async function listFeedback(headers, logger) {
  logger.info({ event: 'feedback_list_start' }, 'Fetching all feedback');

  logger.info({
    event: 'dynamodb_operation',
    operation: 'Scan',
    tableName: FEEDBACK_TABLE_NAME,
  }, 'Querying DynamoDB for feedback');

  const command = new ScanCommand({
    TableName: FEEDBACK_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':pkPrefix': 'FEEDBACK#',
      ':sk': 'METADATA'
    }
  });

  const result = await ddbDocClient.send(command);

  const feedback = result.Items.map(item => ({
    feedbackId: item.feedbackId,
    type: item.type,
    page: item.page,
    description: item.description,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }));

  // Sort by createdAt descending (newest first)
  feedback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  logger.info({
    event: 'feedback_list_success',
    count: feedback.length,
  }, 'Successfully retrieved feedback');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      feedback,
      count: feedback.length
    })
  };
}

async function getFeedback(feedbackId, headers, logger) {
  logger.info({ event: 'feedback_get_start', feedbackId }, 'Fetching feedback by ID');

  logger.info({
    event: 'dynamodb_operation',
    operation: 'GetCommand',
    tableName: FEEDBACK_TABLE_NAME,
    feedbackId,
  }, 'Querying DynamoDB for feedback');

  const command = new GetCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: `FEEDBACK#${feedbackId}`,
      SK: 'METADATA'
    }
  });

  const result = await ddbDocClient.send(command);

  if (!result.Item) {
    logger.warn({ event: 'feedback_get_not_found', feedbackId }, 'Feedback not found');
    return errorResponse(404, 'Feedback not found', null, headers);
  }

  const feedback = {
    feedbackId: result.Item.feedbackId,
    type: result.Item.type,
    page: result.Item.page,
    description: result.Item.description,
    status: result.Item.status,
    createdAt: result.Item.createdAt,
    updatedAt: result.Item.updatedAt
  };

  logger.info({ event: 'feedback_get_success', feedbackId }, 'Successfully retrieved feedback');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(feedback)
  };
}

async function createFeedback(requestBody, headers, logger) {
  logger.info({ event: 'feedback_create_start' }, 'Creating new feedback');

  const data = JSON.parse(requestBody);

  // Validate required fields
  const requiredFields = ['type', 'page', 'description'];
  for (const field of requiredFields) {
    if (!data[field]) {
      logger.warn({
        event: 'validation_error',
        field,
        error: 'Missing required field',
      }, 'Feedback creation validation failed');
      return errorResponse(400, `Missing required field: ${field}`, null, headers);
    }
  }

  // Validate type
  const validTypes = ['Bug', 'Feature', 'Copy Change'];
  if (!validTypes.includes(data.type)) {
    logger.warn({
      event: 'validation_error',
      field: 'type',
      providedValue: data.type,
      allowedValues: validTypes,
    }, 'Invalid feedback type provided');
    return errorResponse(400, `Invalid type. Must be one of: ${validTypes.join(', ')}`, null, headers);
  }

  const feedbackId = randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: `FEEDBACK#${feedbackId}`,
    SK: 'METADATA',
    GSI1PK: `STATUS#New`,
    GSI1SK: `CREATED#${now}`,
    feedbackId,
    type: data.type,
    page: data.page,
    description: data.description,
    status: 'New',
    createdAt: now,
    updatedAt: now
  };

  logger.info({
    event: 'dynamodb_operation',
    operation: 'PutCommand',
    tableName: FEEDBACK_TABLE_NAME,
    feedbackId,
    type: data.type,
  }, 'Creating feedback in DynamoDB');

  const command = new PutCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Item: item
  });

  await ddbDocClient.send(command);

  logger.info({
    event: 'feedback_create_success',
    feedbackId,
    type: data.type,
  }, 'Feedback created successfully');

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'Feedback submitted successfully',
      feedbackId,
      feedback: {
        feedbackId: item.feedbackId,
        type: item.type,
        page: item.page,
        description: item.description,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }
    })
  };
}

async function updateFeedback(feedbackId, requestBody, headers, logger) {
  logger.info({ event: 'feedback_update_start', feedbackId }, 'Updating feedback');

  const data = JSON.parse(requestBody);

  // Check if feedback exists
  logger.info({
    event: 'dynamodb_operation',
    operation: 'GetCommand',
    tableName: FEEDBACK_TABLE_NAME,
    feedbackId,
  }, 'Checking if feedback exists');

  const getCommand = new GetCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: `FEEDBACK#${feedbackId}`,
      SK: 'METADATA'
    }
  });

  const existingItem = await ddbDocClient.send(getCommand);
  if (!existingItem.Item) {
    logger.warn({ event: 'feedback_update_not_found', feedbackId }, 'Feedback not found');
    return errorResponse(404, 'Feedback not found', null, headers);
  }

  // Build update expression
  const updates = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (data.status !== undefined) {
    const validStatuses = ['New', 'Done', 'Closed'];
    if (!validStatuses.includes(data.status)) {
      logger.warn({
        event: 'validation_error',
        field: 'status',
        providedValue: data.status,
        allowedValues: validStatuses,
      }, 'Invalid feedback status provided');
      return errorResponse(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, null, headers);
    }
    updates.push('#status = :status');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = data.status;

    // Update GSI1PK when status changes
    updates.push('GSI1PK = :gsi1pk');
    expressionAttributeValues[':gsi1pk'] = `STATUS#${data.status}`;
  }

  if (data.description !== undefined) {
    updates.push('description = :description');
    expressionAttributeValues[':description'] = data.description;
  }

  if (updates.length === 0) {
    logger.warn({ event: 'feedback_update_no_fields', feedbackId }, 'No fields provided for update');
    return errorResponse(400, 'No fields to update', null, headers);
  }

  updates.push('updatedAt = :updatedAt');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const fieldsUpdated = Object.keys(data).length;

  logger.info({
    event: 'dynamodb_operation',
    operation: 'UpdateCommand',
    tableName: FEEDBACK_TABLE_NAME,
    feedbackId,
    fieldsUpdated,
  }, 'Updating feedback in DynamoDB');

  const updateCommand = new UpdateCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: `FEEDBACK#${feedbackId}`,
      SK: 'METADATA'
    },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  });

  const result = await ddbDocClient.send(updateCommand);

  logger.info({
    event: 'feedback_update_success',
    feedbackId,
    fieldsUpdated,
  }, 'Feedback updated successfully');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Feedback updated successfully',
      feedback: {
        feedbackId: result.Attributes.feedbackId,
        type: result.Attributes.type,
        page: result.Attributes.page,
        description: result.Attributes.description,
        status: result.Attributes.status,
        createdAt: result.Attributes.createdAt,
        updatedAt: result.Attributes.updatedAt
      }
    })
  };
}

async function deleteFeedback(feedbackId, headers, logger) {
  logger.info({ event: 'feedback_delete_start', feedbackId }, 'Deleting feedback');

  logger.info({
    event: 'dynamodb_operation',
    operation: 'DeleteCommand',
    tableName: FEEDBACK_TABLE_NAME,
    feedbackId,
  }, 'Deleting feedback from DynamoDB');

  const deleteCommand = new DeleteCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: `FEEDBACK#${feedbackId}`,
      SK: 'METADATA'
    },
    ConditionExpression: 'attribute_exists(PK)',
    ReturnValues: 'ALL_OLD'
  });

  try {
    await ddbDocClient.send(deleteCommand);

    logger.info({
      event: 'feedback_delete_success',
      feedbackId,
    }, 'Feedback deleted successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Feedback deleted successfully',
        feedbackId
      })
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      logger.warn({ event: 'feedback_delete_not_found', feedbackId }, 'Feedback not found');
      return errorResponse(404, 'Feedback not found', null, headers);
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
