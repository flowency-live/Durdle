import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import { getTenantId, logTenantContext } from '/opt/nodejs/tenant.mjs';

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
  const tenantId = getTenantId(event);
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Tenant context:', { tenantId, lambdaName: 'document_comments' });

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
        return await listComments(documentPath, headers, tenantId);

      case 'POST':
        if (!documentPath) {
          return errorResponse(400, 'documentPath is required', null, headers);
        }
        return await createComment(documentPath, requestBody, headers, tenantId);

      case 'PUT':
        if (!documentPath || !commentId) {
          return errorResponse(400, 'documentPath and commentId are required', null, headers);
        }
        return await updateComment(documentPath, commentId, requestBody, headers, tenantId);

      case 'DELETE':
        if (!documentPath || !commentId) {
          return errorResponse(400, 'documentPath and commentId are required', null, headers);
        }
        return await deleteComment(documentPath, commentId, headers, tenantId);

      default:
        return errorResponse(405, 'Method not allowed', null, headers);
    }
  } catch (error) {
    console.error('Error:', error, 'tenantId:', tenantId);
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

// Build tenant-prefixed documentPath key
function buildTenantDocPath(tenantId, documentPath) {
  return `${tenantId}#${documentPath}`;
}

async function listComments(documentPath, headers, tenantId) {
  // Query for tenant-prefixed documentPath (new format)
  const newFormatCommand = new QueryCommand({
    TableName: COMMENTS_TABLE_NAME,
    KeyConditionExpression: 'documentPath = :documentPath',
    ExpressionAttributeValues: {
      ':documentPath': buildTenantDocPath(tenantId, documentPath)
    }
  });

  // Query for old format documentPath (backward compatibility)
  const oldFormatCommand = new QueryCommand({
    TableName: COMMENTS_TABLE_NAME,
    KeyConditionExpression: 'documentPath = :documentPath',
    ExpressionAttributeValues: {
      ':documentPath': documentPath
    }
  });

  // Execute both queries in parallel
  const [newResult, oldResult] = await Promise.all([
    ddbDocClient.send(newFormatCommand),
    ddbDocClient.send(oldFormatCommand)
  ]);

  // Combine results from both queries
  const allItems = [...(newResult.Items || []), ...(oldResult.Items || [])];

  // Extract the original documentPath for display (strip tenant prefix if present)
  const comments = allItems.map(item => {
    const originalDocPath = item.documentPath.startsWith(`${tenantId}#`)
      ? item.documentPath.replace(`${tenantId}#`, '')
      : item.documentPath;

    return {
      commentId: item.commentId,
      documentPath: originalDocPath,
      username: item.username,
      comment: item.comment,
      status: item.status,
      created: item.created,
      updated: item.updated
    };
  });

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

async function createComment(documentPath, requestBody, headers, tenantId) {
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
    documentPath: buildTenantDocPath(tenantId, documentPath),
    commentId,
    tenantId, // Always include tenant attribute for filtering
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

  // Return the original documentPath (without tenant prefix) in response
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'Comment created successfully',
      comment: {
        ...item,
        documentPath // Return original documentPath for client
      }
    })
  };
}

async function updateComment(documentPath, commentId, requestBody, headers, tenantId) {
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

  // Try tenant-prefixed documentPath first, then fall back to old format
  const tenantDocPath = buildTenantDocPath(tenantId, documentPath);
  let actualDocPath = tenantDocPath;

  // Check if the comment exists with tenant-prefixed key
  try {
    const updateCommand = new UpdateCommand({
      TableName: COMMENTS_TABLE_NAME,
      Key: {
        documentPath: tenantDocPath,
        commentId
      },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(documentPath)',
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
          documentPath, // Return original documentPath for client
          username: result.Attributes.username,
          comment: result.Attributes.comment,
          status: result.Attributes.status,
          created: result.Attributes.created,
          updated: result.Attributes.updated
        }
      })
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // Try old format documentPath
      try {
        const updateCommand = new UpdateCommand({
          TableName: COMMENTS_TABLE_NAME,
          Key: {
            documentPath,
            commentId
          },
          UpdateExpression: `SET ${updates.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(documentPath)',
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
      } catch (fallbackError) {
        if (fallbackError.name === 'ConditionalCheckFailedException') {
          return errorResponse(404, 'Comment not found', null, headers);
        }
        throw fallbackError;
      }
    }
    throw error;
  }
}

async function deleteComment(documentPath, commentId, headers, tenantId) {
  // Try tenant-prefixed documentPath first
  const tenantDocPath = buildTenantDocPath(tenantId, documentPath);

  try {
    const deleteCommand = new DeleteCommand({
      TableName: COMMENTS_TABLE_NAME,
      Key: {
        documentPath: tenantDocPath,
        commentId
      },
      ConditionExpression: 'attribute_exists(documentPath)',
      ReturnValues: 'ALL_OLD'
    });

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
      // Try old format documentPath
      try {
        const deleteCommand = new DeleteCommand({
          TableName: COMMENTS_TABLE_NAME,
          Key: {
            documentPath,
            commentId
          },
          ConditionExpression: 'attribute_exists(documentPath)',
          ReturnValues: 'ALL_OLD'
        });

        await ddbDocClient.send(deleteCommand);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Comment deleted successfully',
            commentId
          })
        };
      } catch (fallbackError) {
        if (fallbackError.name === 'ConditionalCheckFailedException') {
          return errorResponse(404, 'Comment not found', null, headers);
        }
        throw fallbackError;
      }
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
