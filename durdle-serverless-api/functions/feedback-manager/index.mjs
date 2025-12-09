import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantPK, logTenantContext } from '/opt/nodejs/tenant.mjs';

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
  const tenantId = getTenantId(event);

  logger.info({
    event: 'lambda_invocation',
    httpMethod: event.httpMethod,
    path: event.path,
  }, 'Feedback manager Lambda invoked');

  logTenantContext(logger, tenantId, 'feedback_manager');

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
        logger.info({ event: 'feedback_operation', operation: 'GET', feedbackId, tenantId }, 'Processing GET request');
        if (feedbackId) {
          return await getFeedback(feedbackId, headers, logger, tenantId);
        }
        return await listFeedback(headers, logger, tenantId);

      case 'POST':
        logger.info({ event: 'feedback_operation', operation: 'POST', tenantId }, 'Processing POST request');
        return await createFeedback(requestBody, headers, logger, tenantId);

      case 'PUT':
        logger.info({ event: 'feedback_operation', operation: 'PUT', feedbackId, tenantId }, 'Processing PUT request');
        if (!feedbackId) {
          return errorResponse(400, 'feedbackId is required', null, headers);
        }
        return await updateFeedback(feedbackId, requestBody, headers, logger, tenantId);

      case 'DELETE':
        logger.info({ event: 'feedback_operation', operation: 'DELETE', feedbackId, tenantId }, 'Processing DELETE request');
        if (!feedbackId) {
          return errorResponse(400, 'feedbackId is required', null, headers);
        }
        return await deleteFeedback(feedbackId, headers, logger, tenantId);

      default:
        return errorResponse(405, 'Method not allowed', null, headers);
    }
  } catch (error) {
    logger.error({
      event: 'lambda_error',
      errorMessage: error.message,
      errorStack: error.stack,
      tenantId,
    }, 'Unhandled error in feedback manager Lambda');
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

async function listFeedback(headers, logger, tenantId) {
  logger.info({ event: 'feedback_list_start', tenantId }, 'Fetching all feedback');

  logger.info({
    event: 'dynamodb_operation',
    operation: 'Scan',
    tableName: FEEDBACK_TABLE_NAME,
    tenantId,
  }, 'Querying DynamoDB for feedback');

  // Dual-format filter: supports both old (FEEDBACK#id) and new (TENANT#001#FEEDBACK#id) PK formats
  const command = new ScanCommand({
    TableName: FEEDBACK_TABLE_NAME,
    FilterExpression: '(begins_with(PK, :tenantPrefix) OR begins_with(PK, :oldPrefix)) AND SK = :sk AND (attribute_not_exists(tenantId) OR tenantId = :tenantId)',
    ExpressionAttributeValues: {
      ':tenantPrefix': `${tenantId}#FEEDBACK#`,
      ':oldPrefix': 'FEEDBACK#',
      ':sk': 'METADATA',
      ':tenantId': tenantId
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
    tenantId,
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

async function getFeedback(feedbackId, headers, logger, tenantId) {
  logger.info({ event: 'feedback_get_start', feedbackId, tenantId }, 'Fetching feedback by ID');

  logger.info({
    event: 'dynamodb_operation',
    operation: 'GetCommand',
    tableName: FEEDBACK_TABLE_NAME,
    feedbackId,
    tenantId,
  }, 'Querying DynamoDB for feedback');

  // Try tenant-prefixed PK first
  let result = await ddbDocClient.send(new GetCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'FEEDBACK', feedbackId),
      SK: 'METADATA'
    }
  }));

  // Fallback to old PK format if not found
  if (!result.Item) {
    result = await ddbDocClient.send(new GetCommand({
      TableName: FEEDBACK_TABLE_NAME,
      Key: {
        PK: `FEEDBACK#${feedbackId}`,
        SK: 'METADATA'
      }
    }));
  }

  if (!result.Item) {
    logger.warn({ event: 'feedback_get_not_found', feedbackId, tenantId }, 'Feedback not found');
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

  logger.info({ event: 'feedback_get_success', feedbackId, tenantId }, 'Successfully retrieved feedback');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(feedback)
  };
}

async function createFeedback(requestBody, headers, logger, tenantId) {
  logger.info({ event: 'feedback_create_start', tenantId }, 'Creating new feedback');

  const data = JSON.parse(requestBody);

  // Validate required fields
  const requiredFields = ['type', 'page', 'description'];
  for (const field of requiredFields) {
    if (!data[field]) {
      logger.warn({
        event: 'validation_error',
        field,
        error: 'Missing required field',
        tenantId,
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
      tenantId,
    }, 'Invalid feedback type provided');
    return errorResponse(400, `Invalid type. Must be one of: ${validTypes.join(', ')}`, null, headers);
  }

  const feedbackId = randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: buildTenantPK(tenantId, 'FEEDBACK', feedbackId),
    SK: 'METADATA',
    GSI1PK: `STATUS#New`,
    GSI1SK: `CREATED#${now}`,
    tenantId, // Always include tenant attribute for filtering
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
    tenantId,
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
    tenantId,
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

async function updateFeedback(feedbackId, requestBody, headers, logger, tenantId) {
  logger.info({ event: 'feedback_update_start', feedbackId, tenantId }, 'Updating feedback');

  const data = JSON.parse(requestBody);

  // Check if feedback exists with dual-format lookup
  logger.info({
    event: 'dynamodb_operation',
    operation: 'GetCommand',
    tableName: FEEDBACK_TABLE_NAME,
    feedbackId,
    tenantId,
  }, 'Checking if feedback exists');

  // Try tenant-prefixed PK first
  let existingItem = await ddbDocClient.send(new GetCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'FEEDBACK', feedbackId),
      SK: 'METADATA'
    }
  }));

  // Fallback to old PK format if not found
  if (!existingItem.Item) {
    existingItem = await ddbDocClient.send(new GetCommand({
      TableName: FEEDBACK_TABLE_NAME,
      Key: {
        PK: `FEEDBACK#${feedbackId}`,
        SK: 'METADATA'
      }
    }));
  }

  if (!existingItem.Item) {
    logger.warn({ event: 'feedback_update_not_found', feedbackId, tenantId }, 'Feedback not found');
    return errorResponse(404, 'Feedback not found', null, headers);
  }

  // Use the PK from the found record (could be old or new format)
  const existingPK = existingItem.Item.PK;

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
        tenantId,
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
    logger.warn({ event: 'feedback_update_no_fields', feedbackId, tenantId }, 'No fields provided for update');
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
    tenantId,
  }, 'Updating feedback in DynamoDB');

  const updateCommand = new UpdateCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: existingPK,
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
    tenantId,
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

async function deleteFeedback(feedbackId, headers, logger, tenantId) {
  logger.info({ event: 'feedback_delete_start', feedbackId, tenantId }, 'Deleting feedback');

  // First find the record to get the correct PK format
  let existingItem = await ddbDocClient.send(new GetCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'FEEDBACK', feedbackId),
      SK: 'METADATA'
    }
  }));

  // Fallback to old PK format if not found
  if (!existingItem.Item) {
    existingItem = await ddbDocClient.send(new GetCommand({
      TableName: FEEDBACK_TABLE_NAME,
      Key: {
        PK: `FEEDBACK#${feedbackId}`,
        SK: 'METADATA'
      }
    }));
  }

  if (!existingItem.Item) {
    logger.warn({ event: 'feedback_delete_not_found', feedbackId, tenantId }, 'Feedback not found');
    return errorResponse(404, 'Feedback not found', null, headers);
  }

  // Use the PK from the found record
  const existingPK = existingItem.Item.PK;

  logger.info({
    event: 'dynamodb_operation',
    operation: 'DeleteCommand',
    tableName: FEEDBACK_TABLE_NAME,
    feedbackId,
    tenantId,
  }, 'Deleting feedback from DynamoDB');

  const deleteCommand = new DeleteCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: existingPK,
      SK: 'METADATA'
    },
    ReturnValues: 'ALL_OLD'
  });

  await ddbDocClient.send(deleteCommand);

  logger.info({
    event: 'feedback_delete_success',
    feedbackId,
    tenantId,
  }, 'Feedback deleted successfully');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Feedback deleted successfully',
      feedbackId
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
