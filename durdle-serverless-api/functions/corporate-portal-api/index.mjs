import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantPK, logTenantContext } from '/opt/nodejs/tenant.mjs';
import {
  validateRequest,
  UpdateNotificationsSchema,
  UpdateCompanySchema,
  AddUserSchema,
  UpdateUserSchema,
} from './validation.mjs';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);
const sesClient = new SESClient({ region: 'eu-west-2' });
const secretsClient = new SecretsManagerClient({ region: 'eu-west-2' });

const CORPORATE_TABLE_NAME = process.env.CORPORATE_TABLE_NAME || 'durdle-corporate-dev';
const QUOTES_TABLE_NAME = process.env.QUOTES_TABLE_NAME || 'durdle-quotes-dev';
const JWT_SECRET_NAME = process.env.JWT_SECRET_NAME || 'durdle/jwt-secret';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@dorsettransfercompany.co.uk';
const CORPORATE_PORTAL_URL = process.env.CORPORATE_PORTAL_URL || 'https://dorsettransfercompany.co.uk/corporate';

let cachedJwtSecret = null;

/**
 * Get allowed origins for CORS
 * DTC website origins (NOT admin portal)
 */
const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://dorsettransfercompany.flowency.build',
  'https://dorsettransfercompany.co.uk',
  'https://www.dorsettransfercompany.co.uk'
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
  const tenantId = getTenantId(event);

  logger.info({
    event: 'lambda_invocation',
    httpMethod: event.httpMethod,
    path: event.path,
  }, 'Corporate portal API Lambda invoked');

  logTenantContext(logger, tenantId, 'corporate_portal_api');

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Verify JWT for all requests (except OPTIONS)
    const user = await verifyToken(event.headers, logger, tenantId);
    if (!user) {
      return errorResponse(401, 'Unauthorized', null, headers);
    }

    const { httpMethod, path, pathParameters } = event;

    // GET /corporate/me - Current user profile
    if (path.endsWith('/me') && httpMethod === 'GET') {
      return await getProfile(user, headers, logger, tenantId);
    }

    // PUT /corporate/me/notifications - Update notification preferences
    if (path.includes('/me/notifications') && httpMethod === 'PUT') {
      return await updateNotifications(user, event.body, headers, logger, tenantId);
    }

    // GET /corporate/dashboard - Dashboard data
    if (path.endsWith('/dashboard') && httpMethod === 'GET') {
      return await getDashboard(user, headers, logger, tenantId);
    }

    // GET /corporate/company - Get company details
    if (path.endsWith('/company') && httpMethod === 'GET') {
      return await getCompany(user, headers, logger, tenantId);
    }

    // PUT /corporate/company - Update company (admin only)
    if (path.endsWith('/company') && httpMethod === 'PUT') {
      return await updateCompany(user, event.body, headers, logger, tenantId);
    }

    // GET /corporate/users - List team members
    if (path.endsWith('/users') && httpMethod === 'GET') {
      return await listUsers(user, headers, logger, tenantId);
    }

    // POST /corporate/users - Add user (admin only)
    if (path.endsWith('/users') && httpMethod === 'POST') {
      return await addUser(user, event.body, headers, logger, tenantId);
    }

    // PUT /corporate/users/{userId} - Update user (admin only)
    if (path.includes('/users/') && httpMethod === 'PUT') {
      const userId = pathParameters?.userId;
      if (!userId) {
        return errorResponse(400, 'User ID is required', null, headers);
      }
      return await updateUser(user, userId, event.body, headers, logger, tenantId);
    }

    // DELETE /corporate/users/{userId} - Remove user (admin only)
    if (path.includes('/users/') && httpMethod === 'DELETE') {
      const userId = pathParameters?.userId;
      if (!userId) {
        return errorResponse(400, 'User ID is required', null, headers);
      }
      return await deleteUser(user, userId, headers, logger, tenantId);
    }

    return errorResponse(404, 'Endpoint not found', null, headers);
  } catch (error) {
    logger.error({
      event: 'lambda_error',
      errorMessage: error.message,
      errorStack: error.stack,
      tenantId,
    }, 'Unhandled error in corporate portal API Lambda');
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

/**
 * Get JWT secret from Secrets Manager
 */
async function getJwtSecret() {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const command = new GetSecretValueCommand({
    SecretId: JWT_SECRET_NAME
  });

  const response = await secretsClient.send(command);
  cachedJwtSecret = response.SecretString;
  return cachedJwtSecret;
}

/**
 * Verify JWT token and return user info
 */
async function verifyToken(requestHeaders, logger, tenantId) {
  let token = null;

  if (requestHeaders.Authorization || requestHeaders.authorization) {
    const authHeader = requestHeaders.Authorization || requestHeaders.authorization;
    token = authHeader.replace('Bearer ', '');
  }

  if (!token) {
    logger.warn({ event: 'auth_failure', reason: 'no_token', tenantId }, 'No token provided');
    return null;
  }

  try {
    const jwtSecret = await getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret);

    // Verify this is a corporate token
    if (decoded.type !== 'corporate') {
      logger.warn({
        event: 'auth_failure',
        reason: 'wrong_token_type',
        tokenType: decoded.type,
        tenantId,
      }, 'Wrong token type');
      return null;
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn({ event: 'token_expired', tenantId }, 'Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn({ event: 'invalid_token', tenantId }, 'Invalid token');
    }
    return null;
  }
}

/**
 * GET /corporate/me - Get current user profile
 */
async function getProfile(user, headers, logger, tenantId) {
  logger.info({
    event: 'get_profile',
    userId: user.userId,
    corpAccountId: user.corpAccountId,
    tenantId,
  }, 'Getting user profile');

  // Get user from DynamoDB for latest data
  const userRecord = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      SK: `USER#${user.userId}`,
    },
  }));

  if (!userRecord.Item) {
    return errorResponse(404, 'User not found', null, headers);
  }

  // Get corporate account for company info
  const corpAccount = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      SK: 'METADATA',
    },
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      user: {
        userId: userRecord.Item.userId,
        email: userRecord.Item.email,
        name: userRecord.Item.name,
        role: userRecord.Item.role,
        status: userRecord.Item.status,
        notifications: userRecord.Item.notifications || {},
        lastLogin: userRecord.Item.lastLogin,
        createdAt: userRecord.Item.createdAt,
      },
      company: corpAccount.Item ? {
        corpAccountId: corpAccount.Item.corpAccountId,
        companyName: corpAccount.Item.companyName,
        discountPercentage: corpAccount.Item.discountPercentage,
        status: corpAccount.Item.status,
      } : null,
    }),
  };
}

/**
 * PUT /corporate/me/notifications - Update notification preferences
 */
async function updateNotifications(user, requestBody, headers, logger, tenantId) {
  let data;
  try {
    data = JSON.parse(requestBody || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', null, headers);
  }

  const validation = validateRequest(data, UpdateNotificationsSchema);
  if (!validation.success) {
    return errorResponse(400, validation.error, null, headers);
  }

  logger.info({
    event: 'update_notifications',
    userId: user.userId,
    tenantId,
  }, 'Updating notification preferences');

  await ddbDocClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      SK: `USER#${user.userId}`,
    },
    UpdateExpression: 'SET notifications = :notifications, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':notifications': validation.data,
      ':updatedAt': new Date().toISOString(),
    },
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Notification preferences updated',
      notifications: validation.data,
    }),
  };
}

/**
 * GET /corporate/dashboard - Get dashboard data
 */
async function getDashboard(user, headers, logger, tenantId) {
  logger.info({
    event: 'get_dashboard',
    userId: user.userId,
    corpAccountId: user.corpAccountId,
    tenantId,
  }, 'Getting dashboard data');

  // Get corporate account
  const corpAccount = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      SK: 'METADATA',
    },
  }));

  // Get team members count
  const usersQuery = await ddbDocClient.send(new QueryCommand({
    TableName: CORPORATE_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      ':sk': 'USER#',
    },
    Select: 'COUNT',
  }));

  // TODO: Get recent bookings for this corporate account
  // For now, return placeholder data
  const recentBookings = [];
  const totalBookings = 0;
  const totalSpend = 0;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      company: corpAccount.Item ? {
        companyName: corpAccount.Item.companyName,
        discountPercentage: corpAccount.Item.discountPercentage,
        status: corpAccount.Item.status,
      } : null,
      stats: {
        teamMembers: usersQuery.Count || 0,
        totalBookings,
        totalSpend,
        pendingApprovals: 0, // For future requestor workflow
      },
      recentBookings,
    }),
  };
}

/**
 * GET /corporate/company - Get company details
 */
async function getCompany(user, headers, logger, tenantId) {
  logger.info({
    event: 'get_company',
    corpAccountId: user.corpAccountId,
    tenantId,
  }, 'Getting company details');

  const corpAccount = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      SK: 'METADATA',
    },
  }));

  if (!corpAccount.Item) {
    return errorResponse(404, 'Corporate account not found', null, headers);
  }

  const account = corpAccount.Item;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      corpAccountId: account.corpAccountId,
      companyName: account.companyName,
      companiesHouseNumber: account.companiesHouseNumber,
      primaryContactName: account.primaryContactName,
      primaryContactEmail: account.primaryContactEmail,
      primaryContactPhone: account.primaryContactPhone,
      billingAddress: account.billingAddress,
      invoiceEmail: account.invoiceEmail,
      discountPercentage: account.discountPercentage,
      paymentTerms: account.paymentTerms,
      purchaseOrderRequired: account.purchaseOrderRequired,
      status: account.status,
      createdAt: account.createdAt,
    }),
  };
}

/**
 * PUT /corporate/company - Update company (admin only)
 */
async function updateCompany(user, requestBody, headers, logger, tenantId) {
  // Check admin role
  if (user.role !== 'admin') {
    return errorResponse(403, 'Only corporate admins can update company details', null, headers);
  }

  let data;
  try {
    data = JSON.parse(requestBody || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', null, headers);
  }

  const validation = validateRequest(data, UpdateCompanySchema);
  if (!validation.success) {
    return errorResponse(400, validation.error, null, headers);
  }

  logger.info({
    event: 'update_company',
    corpAccountId: user.corpAccountId,
    userId: user.userId,
    tenantId,
  }, 'Updating company details');

  // Build update expression
  const updateParts = [];
  const expressionAttributeValues = {
    ':updatedAt': new Date().toISOString(),
    ':updatedBy': user.userId,
  };
  const expressionAttributeNames = {};

  Object.entries(validation.data).forEach(([key, value]) => {
    if (value !== undefined) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
      updateParts.push(`${attrName} = ${attrValue}`);
    }
  });

  if (updateParts.length === 0) {
    return errorResponse(400, 'No fields to update', null, headers);
  }

  updateParts.push('updatedAt = :updatedAt');
  updateParts.push('updatedBy = :updatedBy');

  await ddbDocClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      SK: 'METADATA',
    },
    UpdateExpression: `SET ${updateParts.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Company details updated',
    }),
  };
}

/**
 * GET /corporate/users - List team members
 */
async function listUsers(user, headers, logger, tenantId) {
  logger.info({
    event: 'list_users',
    corpAccountId: user.corpAccountId,
    tenantId,
  }, 'Listing team members');

  const usersQuery = await ddbDocClient.send(new QueryCommand({
    TableName: CORPORATE_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      ':sk': 'USER#',
    },
  }));

  const users = (usersQuery.Items || []).map(item => ({
    userId: item.userId,
    email: item.email,
    name: item.name,
    role: item.role,
    status: item.status,
    lastLogin: item.lastLogin,
    createdAt: item.createdAt,
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      users,
      total: users.length,
    }),
  };
}

/**
 * POST /corporate/users - Add user (admin only)
 */
async function addUser(user, requestBody, headers, logger, tenantId) {
  // Check admin role
  if (user.role !== 'admin') {
    return errorResponse(403, 'Only corporate admins can add users', null, headers);
  }

  let data;
  try {
    data = JSON.parse(requestBody || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', null, headers);
  }

  const validation = validateRequest(data, AddUserSchema);
  if (!validation.success) {
    return errorResponse(400, validation.error, null, headers);
  }

  const { email, name, role } = validation.data;
  const normalizedEmail = email.toLowerCase();

  logger.info({
    event: 'add_user',
    email: normalizedEmail,
    role,
    corpAccountId: user.corpAccountId,
    tenantId,
  }, 'Adding new user');

  // Check if email already exists in this corporate account
  const usersQuery = await ddbDocClient.send(new QueryCommand({
    TableName: CORPORATE_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':pk': buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      ':sk': 'USER#',
      ':email': normalizedEmail,
    },
  }));

  if (usersQuery.Items && usersQuery.Items.length > 0) {
    return errorResponse(409, 'A user with this email already exists', null, headers);
  }

  // Generate user ID
  const userId = crypto.randomUUID().substring(0, 8);
  const now = new Date().toISOString();

  // Get corporate account for company name
  const corpAccount = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      SK: 'METADATA',
    },
  }));

  const companyName = corpAccount.Item?.companyName || 'Your Company';

  // Create user record
  await ddbDocClient.send(new PutCommand({
    TableName: CORPORATE_TABLE_NAME,
    Item: {
      PK: buildTenantPK(tenantId, 'CORP', user.corpAccountId),
      SK: `USER#${userId}`,
      GSI1PK: `${tenantId}#CORP_USER_EMAIL`,
      GSI1SK: normalizedEmail,
      tenantId,
      corpAccountId: user.corpAccountId,
      userId,
      email: normalizedEmail,
      name,
      role,
      status: 'pending', // Pending until they log in
      notifications: {
        emailBookingConfirmations: true,
        emailWeeklyDigest: false,
        emailMarketingUpdates: false,
      },
      createdAt: now,
      createdBy: user.userId,
    },
  }));

  // Send invitation email
  try {
    const loginUrl = `${CORPORATE_PORTAL_URL}/login`;

    await sesClient.send(new SendEmailCommand({
      Source: SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [normalizedEmail],
      },
      Message: {
        Subject: {
          Data: `You've been invited to ${companyName}'s corporate travel account`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: generateInviteEmail(name, companyName, loginUrl, user.userName),
            Charset: 'UTF-8',
          },
          Text: {
            Data: `Hello ${name},\n\nYou've been invited to ${companyName}'s corporate travel account on Dorset Transfer Company.\n\nTo get started, visit: ${loginUrl}\n\nEnter your email address and we'll send you a secure login link.\n\nBest regards,\nDorset Transfer Company`,
            Charset: 'UTF-8',
          },
        },
      },
    }));

    logger.info({
      event: 'invite_sent',
      email: normalizedEmail,
      userId,
      corpAccountId: user.corpAccountId,
      tenantId,
    }, 'Invitation email sent');

  } catch (sesError) {
    logger.error({
      event: 'ses_error',
      email: normalizedEmail,
      errorMessage: sesError.message,
      tenantId,
    }, 'Failed to send invitation email');
    // Don't fail the request - user is created, they just didn't get the email
  }

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'User added and invitation sent',
      user: {
        userId,
        email: normalizedEmail,
        name,
        role,
        status: 'pending',
      },
    }),
  };
}

/**
 * PUT /corporate/users/{userId} - Update user (admin only)
 */
async function updateUser(currentUser, targetUserId, requestBody, headers, logger, tenantId) {
  // Check admin role
  if (currentUser.role !== 'admin') {
    return errorResponse(403, 'Only corporate admins can update users', null, headers);
  }

  let data;
  try {
    data = JSON.parse(requestBody || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', null, headers);
  }

  const validation = validateRequest(data, UpdateUserSchema);
  if (!validation.success) {
    return errorResponse(400, validation.error, null, headers);
  }

  logger.info({
    event: 'update_user',
    targetUserId,
    updatedBy: currentUser.userId,
    corpAccountId: currentUser.corpAccountId,
    tenantId,
  }, 'Updating user');

  // Check if target user exists
  const targetUser = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', currentUser.corpAccountId),
      SK: `USER#${targetUserId}`,
    },
  }));

  if (!targetUser.Item) {
    return errorResponse(404, 'User not found', null, headers);
  }

  // Prevent removing last admin
  if (validation.data.role === 'booker' && targetUser.Item.role === 'admin') {
    // Count admins
    const usersQuery = await ddbDocClient.send(new QueryCommand({
      TableName: CORPORATE_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#role = :adminRole',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: {
        ':pk': buildTenantPK(tenantId, 'CORP', currentUser.corpAccountId),
        ':sk': 'USER#',
        ':adminRole': 'admin',
      },
    }));

    if ((usersQuery.Items?.length || 0) <= 1) {
      return errorResponse(400, 'Cannot remove the last admin', null, headers);
    }
  }

  // Build update expression
  const updateParts = [];
  const expressionAttributeValues = {
    ':updatedAt': new Date().toISOString(),
    ':updatedBy': currentUser.userId,
  };
  const expressionAttributeNames = {};

  Object.entries(validation.data).forEach(([key, value]) => {
    if (value !== undefined) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
      updateParts.push(`${attrName} = ${attrValue}`);
    }
  });

  if (updateParts.length === 0) {
    return errorResponse(400, 'No fields to update', null, headers);
  }

  updateParts.push('updatedAt = :updatedAt');
  updateParts.push('updatedBy = :updatedBy');

  await ddbDocClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', currentUser.corpAccountId),
      SK: `USER#${targetUserId}`,
    },
    UpdateExpression: `SET ${updateParts.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'User updated',
    }),
  };
}

/**
 * DELETE /corporate/users/{userId} - Remove user (admin only)
 */
async function deleteUser(currentUser, targetUserId, headers, logger, tenantId) {
  // Check admin role
  if (currentUser.role !== 'admin') {
    return errorResponse(403, 'Only corporate admins can remove users', null, headers);
  }

  // Prevent self-deletion
  if (targetUserId === currentUser.userId) {
    return errorResponse(400, 'Cannot remove yourself', null, headers);
  }

  logger.info({
    event: 'delete_user',
    targetUserId,
    deletedBy: currentUser.userId,
    corpAccountId: currentUser.corpAccountId,
    tenantId,
  }, 'Deleting user');

  // Check if target user exists
  const targetUser = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', currentUser.corpAccountId),
      SK: `USER#${targetUserId}`,
    },
  }));

  if (!targetUser.Item) {
    return errorResponse(404, 'User not found', null, headers);
  }

  // Prevent removing last admin
  if (targetUser.Item.role === 'admin') {
    const usersQuery = await ddbDocClient.send(new QueryCommand({
      TableName: CORPORATE_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#role = :adminRole',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: {
        ':pk': buildTenantPK(tenantId, 'CORP', currentUser.corpAccountId),
        ':sk': 'USER#',
        ':adminRole': 'admin',
      },
    }));

    if ((usersQuery.Items?.length || 0) <= 1) {
      return errorResponse(400, 'Cannot remove the last admin', null, headers);
    }
  }

  await ddbDocClient.send(new DeleteCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', currentUser.corpAccountId),
      SK: `USER#${targetUserId}`,
    },
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'User removed',
    }),
  };
}

/**
 * Generate invitation email HTML
 */
function generateInviteEmail(userName, companyName, loginUrl, inviterName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a365d; margin: 0;">Dorset Transfer Company</h1>
    <p style="color: #666; margin: 5px 0;">Corporate Travel Portal</p>
  </div>

  <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #1a365d; margin-top: 0;">Hello ${userName},</h2>

    <p>${inviterName || 'Your colleague'} has invited you to join <strong>${companyName}</strong>'s corporate travel account on Dorset Transfer Company.</p>

    <p>As a team member, you'll be able to:</p>
    <ul style="color: #555;">
      <li>Book airport transfers with your company's special rates</li>
      <li>View booking history</li>
      <li>Manage your travel preferences</li>
    </ul>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}"
         style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Get Started
      </a>
    </p>

    <p style="color: #666; font-size: 14px;">
      Click the button above, then enter your email address to receive a secure login link.
    </p>
  </div>

  <div style="text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
    <p>
      Dorset Transfer Company<br>
      Professional Airport & Executive Transfers
    </p>
    <p>
      <a href="https://dorsettransfercompany.co.uk" style="color: #2563eb;">dorsettransfercompany.co.uk</a>
    </p>
  </div>
</body>
</html>
`;
}

/**
 * Standard error response
 */
function errorResponse(statusCode, message, details = null, headers) {
  const body = { error: message };
  if (details) {
    body.details = details;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}
