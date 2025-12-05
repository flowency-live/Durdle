import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const COMMENTS_TABLE_NAME = process.env.COMMENTS_TABLE_NAME || 'durdle-document-comments-dev';

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

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, pathParameters, body: requestBody } = event;
    const { documentPath, commentId } = pathParameters || {};

    switch (httpMethod) {
      case 'GET':
        if (!documentPath) {
          return errorResponse(400, 'documentPath is required', null, headers);
        }
        return await listComments(documentPath, headers);

      case 'POST':
        if (!documentPath) {
          return errorResponse(400, 'documentPath is required', null, headers);
        }
        return await createComment(documentPath, requestBody, headers);

      case 'PUT':
        if (!documentPath || !commentId) {
          return errorResponse(400, 'documentPath and commentId are required', null, headers);
        }
        return await updateComment(documentPath, commentId, requestBody, headers);

      case 'DELETE':
        if (!documentPath || !commentId) {
          return errorResponse(400, 'documentPath and commentId are required', null, headers);
        }
        return await deleteComment(documentPath, commentId, headers);

      default:
        return errorResponse(405, 'Method not allowed', null, headers);
    }
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

async function listComments(documentPath, headers) {
  const command = new QueryCommand({
    TableName: COMMENTS_TABLE_NAME,
    KeyConditionExpression: 'documentPath = :documentPath',
    ExpressionAttributeValues: {
      ':documentPath': documentPath
    }
  });

  const result = await ddbDocClient.send(command);

  const comments = result.Items.map(item => ({
    commentId: item.commentId,
    documentPath: item.documentPath,
    username: item.username,
    comment: item.comment,
    status: item.status,
    created: item.created,
    updated: item.updated
  }));

  comments.sort((a, b) => new Date(a.created) - new Date(b.created));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      comments,
      count: comments.length
    })
  };
}

async function createComment(documentPath, requestBody, headers) {
  const data = JSON.parse(requestBody);

  const requiredFields = ['username', 'comment'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return errorResponse(400, `Missing required field: ${field}`, null, headers);
    }
  }

  const commentId = ulid();
  const now = new Date().toISOString();

  const item = {
    documentPath,
    commentId,
    username: data.username,
    comment: data.comment,
    status: 'active',
    created: now,
    updated: now
  };

  const command = new PutCommand({
    TableName: COMMENTS_TABLE_NAME,
    Item: item
  });

  await ddbDocClient.send(command);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'Comment created successfully',
      comment: item
    })
  };
}

async function updateComment(documentPath, commentId, requestBody, headers) {
  const data = JSON.parse(requestBody);

  const updates = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (data.status !== undefined) {
    const validStatuses = ['active', 'resolved'];
    if (!validStatuses.includes(data.status)) {
      return errorResponse(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, null, headers);
    }
    updates.push('#status = :status');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = data.status;
  }

  if (data.comment !== undefined) {
    updates.push('#comment = :comment');
    expressionAttributeNames['#comment'] = 'comment';
    expressionAttributeValues[':comment'] = data.comment;
  }

  if (updates.length === 0) {
    return errorResponse(400, 'No fields to update', null, headers);
  }

  updates.push('updated = :updated');
  expressionAttributeValues[':updated'] = new Date().toISOString();

  const updateCommand = new UpdateCommand({
    TableName: COMMENTS_TABLE_NAME,
    Key: {
      documentPath,
      commentId
    },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  });

  const result = await ddbDocClient.send(updateCommand);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Comment updated successfully',
      comment: {
        commentId: result.Attributes.commentId,
        documentPath: result.Attributes.documentPath,
        username: result.Attributes.username,
        comment: result.Attributes.comment,
        status: result.Attributes.status,
        created: result.Attributes.created,
        updated: result.Attributes.updated
      }
    })
  };
}

async function deleteComment(documentPath, commentId, headers) {
  const deleteCommand = new DeleteCommand({
    TableName: COMMENTS_TABLE_NAME,
    Key: {
      documentPath,
      commentId
    },
    ConditionExpression: 'attribute_exists(documentPath)',
    ReturnValues: 'ALL_OLD'
  });

  try {
    await ddbDocClient.send(deleteCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Comment deleted successfully',
        commentId
      })
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return errorResponse(404, 'Comment not found', null, headers);
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
