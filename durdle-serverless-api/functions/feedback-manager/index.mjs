import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

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

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

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
        if (feedbackId) {
          return await getFeedback(feedbackId, headers);
        }
        return await listFeedback(headers);

      case 'POST':
        return await createFeedback(requestBody, headers);

      case 'PUT':
        if (!feedbackId) {
          return errorResponse(400, 'feedbackId is required', null, headers);
        }
        return await updateFeedback(feedbackId, requestBody, headers);

      case 'DELETE':
        if (!feedbackId) {
          return errorResponse(400, 'feedbackId is required', null, headers);
        }
        return await deleteFeedback(feedbackId, headers);

      default:
        return errorResponse(405, 'Method not allowed', null, headers);
    }
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

async function listFeedback(headers) {
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

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      feedback,
      count: feedback.length
    })
  };
}

async function getFeedback(feedbackId, headers) {
  const command = new GetCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: `FEEDBACK#${feedbackId}`,
      SK: 'METADATA'
    }
  });

  const result = await ddbDocClient.send(command);

  if (!result.Item) {
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

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(feedback)
  };
}

async function createFeedback(requestBody, headers) {
  const data = JSON.parse(requestBody);

  // Validate required fields
  const requiredFields = ['type', 'page', 'description'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return errorResponse(400, `Missing required field: ${field}`, null, headers);
    }
  }

  // Validate type
  const validTypes = ['Bug', 'Feature', 'Copy Change'];
  if (!validTypes.includes(data.type)) {
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

  const command = new PutCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Item: item
  });

  await ddbDocClient.send(command);

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

async function updateFeedback(feedbackId, requestBody, headers) {
  const data = JSON.parse(requestBody);

  // Check if feedback exists
  const getCommand = new GetCommand({
    TableName: FEEDBACK_TABLE_NAME,
    Key: {
      PK: `FEEDBACK#${feedbackId}`,
      SK: 'METADATA'
    }
  });

  const existingItem = await ddbDocClient.send(getCommand);
  if (!existingItem.Item) {
    return errorResponse(404, 'Feedback not found', null, headers);
  }

  // Build update expression
  const updates = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (data.status !== undefined) {
    const validStatuses = ['New', 'Done', 'Closed'];
    if (!validStatuses.includes(data.status)) {
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
    return errorResponse(400, 'No fields to update', null, headers);
  }

  updates.push('updatedAt = :updatedAt');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

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

async function deleteFeedback(feedbackId, headers) {
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
