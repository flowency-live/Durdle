import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID, randomBytes } from 'crypto';
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantPK, logTenantContext } from '/opt/nodejs/tenant.mjs';
import {
  CreateCorporateAccountSchema,
  UpdateCorporateAccountSchema,
  AddCorporateUserSchema,
  UpdateCorporateUserSchema,
  ListQuerySchema,
  validateRequest,
  validateEmailDomain
} from './validation.mjs';

const CORPORATE_PORTAL_URL = process.env.CORPORATE_PORTAL_URL || 'https://dorsettransfercompany.flowency.build/corporate';
const MAGIC_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CORPORATE_TABLE_NAME = process.env.CORPORATE_TABLE_NAME || 'durdle-corporate-dev';

// CORS - Admin portal origins (same as admin-auth)
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
  const tenantId = getTenantId(event);

  logger.info({
    event: 'lambda_invocation',
    httpMethod: event.httpMethod,
    path: event.path,
  }, 'Corporate accounts manager invoked');

  logTenantContext(logger, tenantId, 'corporate_accounts_manager');

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, path, pathParameters } = event;
    const corpId = pathParameters?.corpId;
    const userId = pathParameters?.userId;

    // Route: POST /admin/corporate - Create corporate account
    if (path.match(/\/admin\/corporate\/?$/) && httpMethod === 'POST') {
      return await createCorporateAccount(event.body, headers, logger, tenantId);
    }

    // Route: GET /admin/corporate - List corporate accounts
    if (path.match(/\/admin\/corporate\/?$/) && httpMethod === 'GET') {
      return await listCorporateAccounts(event.queryStringParameters, headers, logger, tenantId);
    }

    // Route: GET /admin/corporate/{corpId} - Get corporate account
    if (path.match(/\/admin\/corporate\/[^/]+\/?$/) && !path.includes('/users') && !path.includes('/invite') && httpMethod === 'GET') {
      return await getCorporateAccount(corpId, headers, logger, tenantId);
    }

    // Route: PUT /admin/corporate/{corpId} - Update corporate account
    if (path.match(/\/admin\/corporate\/[^/]+\/?$/) && !path.includes('/users') && httpMethod === 'PUT') {
      return await updateCorporateAccount(corpId, event.body, headers, logger, tenantId);
    }

    // Route: POST /admin/corporate/{corpId}/users - Add user to corporate account
    if (path.includes('/users') && httpMethod === 'POST' && !userId) {
      return await addCorporateUser(corpId, event.body, headers, logger, tenantId);
    }

    // Route: GET /admin/corporate/{corpId}/users - List users for corporate account
    if (path.includes('/users') && httpMethod === 'GET' && !userId) {
      return await listCorporateUsers(corpId, headers, logger, tenantId);
    }

    // Route: PUT /admin/corporate/{corpId}/users/{userId} - Update corporate user
    if (path.includes('/users/') && httpMethod === 'PUT' && userId) {
      return await updateCorporateUser(corpId, userId, event.body, headers, logger, tenantId);
    }

    // Route: DELETE /admin/corporate/{corpId}/users/{userId} - Remove corporate user
    if (path.includes('/users/') && httpMethod === 'DELETE' && userId) {
      return await removeCorporateUser(corpId, userId, headers, logger, tenantId);
    }

    // Route: POST /admin/corporate/{corpId}/users/{userId}/magic-link - Regenerate magic link for user
    if (path.includes('/magic-link') && httpMethod === 'POST' && userId) {
      return await regenerateMagicLink(corpId, userId, headers, logger, tenantId);
    }

    // Route: POST /admin/corporate/{corpId}/invite - Send invite to primary contact
    if (path.includes('/invite') && httpMethod === 'POST') {
      return await sendInvite(corpId, event.body, headers, logger, tenantId);
    }

    return errorResponse(404, 'Endpoint not found', null, headers);
  } catch (error) {
    logger.error({
      event: 'lambda_error',
      errorMessage: error.message,
      errorStack: error.stack,
      tenantId,
    }, 'Unhandled error in corporate accounts manager');
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

// Generate corporate account ID
function generateCorpId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomUUID().slice(0, 4).toUpperCase();
  return `CORP-${timestamp}${random}`;
}

// Generate user ID
function generateUserId() {
  return `USR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

// Generate magic link token
function generateMagicToken() {
  return randomBytes(32).toString('hex');
}

// Create magic link token in DynamoDB
async function createMagicLinkToken(tenantId, email, corpId, userId, tokenType = 'invite') {
  const token = generateMagicToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + MAGIC_TOKEN_TTL_SECONDS * 1000).toISOString();
  const ttl = Math.floor((now.getTime() / 1000) + MAGIC_TOKEN_TTL_SECONDS);

  const tokenItem = {
    PK: `${tenantId}#MAGIC#${token}`,
    SK: 'METADATA',
    EntityType: 'MagicLinkToken',
    tenantId,
    token,
    email: email.toLowerCase(),
    corpId,
    userId,
    tokenType, // 'invite' or 'reset'
    createdAt: now.toISOString(),
    expiresAt,
    usedAt: null,
    TTL: ttl, // DynamoDB auto-delete
  };

  await docClient.send(new PutCommand({
    TableName: CORPORATE_TABLE_NAME,
    Item: tokenItem,
  }));

  return token;
}

// Create a new corporate account
async function createCorporateAccount(requestBody, headers, logger, tenantId) {
  const body = JSON.parse(requestBody || '{}');
  const validation = validateRequest(body, CreateCorporateAccountSchema);

  if (!validation.success) {
    return errorResponse(400, 'Validation failed', validation.errors, headers);
  }

  const data = validation.data;
  const corpId = generateCorpId();
  const now = new Date().toISOString();

  const item = {
    PK: buildTenantPK(tenantId, 'CORP', corpId),
    SK: 'METADATA',
    EntityType: 'CorporateAccount',
    tenantId,
    corpId,
    // GSI1: For listing all corporate accounts for a tenant
    GSI1PK: `${tenantId}#CORP`,
    GSI1SK: `STATUS#${data.status || 'active'}#${now}`,
    // Account details
    companyName: data.companyName,
    companyNumber: data.companyNumber || null,
    contactName: data.contactName,
    contactEmail: data.contactEmail.toLowerCase(),
    contactPhone: data.contactPhone || null,
    billingAddress: data.billingAddress || null,
    // Pricing
    discountPercentage: data.discountPercentage || 0,
    paymentTerms: data.paymentTerms || 'immediate',
    // Domain restrictions for users
    allowedDomains: data.allowedDomains || [],
    // Status
    status: 'active',
    // Stats (will be updated as bookings are made)
    stats: {
      totalBookings: 0,
      totalSpend: 0,
      usersCount: 0,
    },
    notes: data.notes || null,
    // Timestamps
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: CORPORATE_TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK)',
  }));

  logger.info({
    event: 'corporate_account_created',
    corpId,
    companyName: data.companyName,
    tenantId,
  }, 'Corporate account created');

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      corporateAccount: {
        corpId: item.corpId,
        companyName: item.companyName,
        contactName: item.contactName,
        contactEmail: item.contactEmail,
        status: item.status,
        discountPercentage: item.discountPercentage,
        createdAt: item.createdAt,
      },
    }),
  };
}

// List corporate accounts for tenant
async function listCorporateAccounts(queryParams, headers, logger, tenantId) {
  const params = queryParams || {};
  const validation = validateRequest(params, ListQuerySchema);

  if (!validation.success) {
    return errorResponse(400, 'Invalid query parameters', validation.errors, headers);
  }

  const { limit, cursor, status, search } = validation.data;

  const queryCommand = {
    TableName: CORPORATE_TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `${tenantId}#CORP`,
    },
    Limit: limit,
    ScanIndexForward: false, // Most recent first
  };

  // Filter by status if specified
  if (status && status !== 'all') {
    queryCommand.KeyConditionExpression += ' AND begins_with(GSI1SK, :statusPrefix)';
    queryCommand.ExpressionAttributeValues[':statusPrefix'] = `STATUS#${status}`;
  }

  // Add cursor for pagination
  if (cursor) {
    try {
      queryCommand.ExclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch (e) {
      return errorResponse(400, 'Invalid cursor', null, headers);
    }
  }

  const result = await docClient.send(new QueryCommand(queryCommand));

  // Filter by search term if provided (client-side filter)
  let items = result.Items || [];
  if (search) {
    const searchLower = search.toLowerCase();
    items = items.filter(item =>
      item.companyName?.toLowerCase().includes(searchLower) ||
      item.contactEmail?.toLowerCase().includes(searchLower)
    );
  }

  // Build response
  const accounts = items.map(item => ({
    corpId: item.corpId,
    companyName: item.companyName,
    contactName: item.contactName,
    contactEmail: item.contactEmail,
    status: item.status,
    discountPercentage: item.discountPercentage,
    stats: item.stats,
    createdAt: item.createdAt,
  }));

  // Generate next cursor if there are more results
  let nextCursor = null;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }

  logger.info({
    event: 'corporate_accounts_listed',
    count: accounts.length,
    tenantId,
  }, 'Corporate accounts listed');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      corporateAccounts: accounts,
      nextCursor,
      count: accounts.length,
    }),
  };
}

// Get a single corporate account
async function getCorporateAccount(corpId, headers, logger, tenantId) {
  if (!corpId) {
    return errorResponse(400, 'Corporate account ID is required', null, headers);
  }

  const result = await docClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: 'METADATA',
    },
  }));

  if (!result.Item) {
    return errorResponse(404, 'Corporate account not found', null, headers);
  }

  const item = result.Item;

  logger.info({
    event: 'corporate_account_retrieved',
    corpId,
    tenantId,
  }, 'Corporate account retrieved');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      corporateAccount: {
        corpId: item.corpId,
        companyName: item.companyName,
        companyNumber: item.companyNumber,
        contactName: item.contactName,
        contactEmail: item.contactEmail,
        contactPhone: item.contactPhone,
        billingAddress: item.billingAddress,
        discountPercentage: item.discountPercentage,
        paymentTerms: item.paymentTerms,
        allowedDomains: item.allowedDomains || [],
        status: item.status,
        stats: item.stats,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    }),
  };
}

// Update a corporate account
async function updateCorporateAccount(corpId, requestBody, headers, logger, tenantId) {
  if (!corpId) {
    return errorResponse(400, 'Corporate account ID is required', null, headers);
  }

  const body = JSON.parse(requestBody || '{}');
  const validation = validateRequest(body, UpdateCorporateAccountSchema);

  if (!validation.success) {
    return errorResponse(400, 'Validation failed', validation.errors, headers);
  }

  const data = validation.data;

  // Check account exists
  const existing = await docClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: 'METADATA',
    },
  }));

  if (!existing.Item) {
    return errorResponse(404, 'Corporate account not found', null, headers);
  }

  // Build update expression
  const now = new Date().toISOString();
  const updateParts = ['updatedAt = :updatedAt'];
  const expressionValues = { ':updatedAt': now };

  const fieldMap = {
    companyName: 'companyName',
    companyNumber: 'companyNumber',
    contactName: 'contactName',
    contactEmail: 'contactEmail',
    contactPhone: 'contactPhone',
    billingAddress: 'billingAddress',
    discountPercentage: 'discountPercentage',
    paymentTerms: 'paymentTerms',
    status: 'status',
    notes: 'notes',
    allowedDomains: 'allowedDomains',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      updateParts.push(`${dbField} = :${key}`);
      expressionValues[`:${key}`] = key === 'contactEmail' ? data[key].toLowerCase() : data[key];
    }
  }

  // Update GSI1SK if status changed
  if (data.status) {
    updateParts.push('GSI1SK = :gsi1sk');
    expressionValues[':gsi1sk'] = `STATUS#${data.status}#${existing.Item.createdAt}`;
  }

  await docClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: 'METADATA',
    },
    UpdateExpression: `SET ${updateParts.join(', ')}`,
    ExpressionAttributeValues: expressionValues,
  }));

  logger.info({
    event: 'corporate_account_updated',
    corpId,
    updatedFields: Object.keys(data),
    tenantId,
  }, 'Corporate account updated');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Corporate account updated successfully',
    }),
  };
}

// Add a user to corporate account
async function addCorporateUser(corpId, requestBody, headers, logger, tenantId) {
  if (!corpId) {
    return errorResponse(400, 'Corporate account ID is required', null, headers);
  }

  const body = JSON.parse(requestBody || '{}');
  const validation = validateRequest(body, AddCorporateUserSchema);

  if (!validation.success) {
    return errorResponse(400, 'Validation failed', validation.errors, headers);
  }

  const data = validation.data;

  // Check corporate account exists
  const corpResult = await docClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: 'METADATA',
    },
  }));

  if (!corpResult.Item) {
    return errorResponse(404, 'Corporate account not found', null, headers);
  }

  const corpAccount = corpResult.Item;

  // Validate email domain against allowed domains
  if (corpAccount.allowedDomains && corpAccount.allowedDomains.length > 0) {
    const domainValidation = validateEmailDomain(data.email, corpAccount.allowedDomains);
    if (!domainValidation.valid) {
      logger.warn({
        event: 'email_domain_rejected',
        email: data.email,
        domain: domainValidation.domain,
        allowedDomains: corpAccount.allowedDomains,
        corpId,
        tenantId,
      }, 'Email domain not in allowed list');
      return errorResponse(400, domainValidation.message, null, headers);
    }
  }

  // Check if user email already exists in this account
  const existingUsers = await docClient.send(new QueryCommand({
    TableName: CORPORATE_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':pk': buildTenantPK(tenantId, 'CORP', corpId),
      ':skPrefix': 'USER#',
      ':email': data.email.toLowerCase(),
    },
  }));

  if (existingUsers.Items && existingUsers.Items.length > 0) {
    const existingUser = existingUsers.Items[0];

    // If user was removed, reactivate them instead of returning 409
    if (existingUser.status === 'removed') {
      logger.info({
        event: 'reactivating_removed_user',
        userId: existingUser.userId,
        email: data.email,
        corpId,
      }, 'Reactivating previously removed corporate user');

      const now = new Date().toISOString();

      // Reactivate the user
      await docClient.send(new UpdateCommand({
        TableName: CORPORATE_TABLE_NAME,
        Key: {
          PK: buildTenantPK(tenantId, 'CORP', corpId),
          SK: `USER#${existingUser.userId}`,
        },
        UpdateExpression: 'SET #status = :status, #name = :name, #role = :role, updatedAt = :now',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#name': 'name',
          '#role': 'role',
        },
        ExpressionAttributeValues: {
          ':status': 'pending',
          ':name': data.name,
          ':role': data.role || 'booker',
          ':now': now,
        },
      }));

      // Update user count on corporate account
      await docClient.send(new UpdateCommand({
        TableName: CORPORATE_TABLE_NAME,
        Key: {
          PK: buildTenantPK(tenantId, 'CORP', corpId),
          SK: 'METADATA',
        },
        UpdateExpression: 'SET stats.usersCount = stats.usersCount + :inc, updatedAt = :now',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':now': now,
        },
      }));

      // Generate new magic link for the reactivated user
      const magicToken = await createMagicLinkToken(
        tenantId,
        data.email,
        corpId,
        existingUser.userId,
        'invite'
      );

      const magicLink = `${CORPORATE_PORTAL_URL}/verify?token=${magicToken}`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'User reactivated successfully',
          user: {
            userId: existingUser.userId,
            email: data.email.toLowerCase(),
            name: data.name,
            role: data.role || 'booker',
            status: 'pending',
          },
          magicLink,
          instructions: {
            note: 'Magic link expires in 15 minutes. Share this with the user to set up their account.',
          },
        }),
      };
    }

    // User exists and is not removed - return 409
    return errorResponse(409, 'User with this email already exists in this corporate account', null, headers);
  }

  const userId = generateUserId();
  const now = new Date().toISOString();

  const userItem = {
    PK: buildTenantPK(tenantId, 'CORP', corpId),
    SK: `USER#${userId}`,
    EntityType: 'CorporateUser',
    tenantId,
    corpAccountId: corpId, // Used by corporate-auth for user lookup
    userId,
    // GSI1: For looking up user by email across all corporate accounts
    GSI1PK: `${tenantId}#CORP_USER_EMAIL`,
    GSI1SK: data.email.toLowerCase(),
    // User details
    email: data.email.toLowerCase(),
    name: data.name,
    role: data.role || 'booker',
    status: 'pending', // Pending until they verify magic link
    // Stats
    stats: {
      bookingsCount: 0,
      lastBookingAt: null,
    },
    // Timestamps
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  await docClient.send(new PutCommand({
    TableName: CORPORATE_TABLE_NAME,
    Item: userItem,
  }));

  // Update user count on corporate account
  await docClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: 'METADATA',
    },
    UpdateExpression: 'SET stats.usersCount = stats.usersCount + :inc, updatedAt = :now',
    ExpressionAttributeValues: {
      ':inc': 1,
      ':now': now,
    },
  }));

  // Generate magic link token for the new user
  const magicToken = await createMagicLinkToken(
    tenantId,
    data.email,
    corpId,
    userId,
    'invite'
  );

  const magicLink = `${CORPORATE_PORTAL_URL}/verify?token=${magicToken}`;

  logger.info({
    event: 'corporate_user_added',
    corpId,
    userId,
    email: data.email,
    role: data.role,
    tenantId,
    magicLinkGenerated: true,
  }, 'Corporate user added with magic link');

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      user: {
        userId: userItem.userId,
        email: userItem.email,
        name: userItem.name,
        role: userItem.role,
        status: userItem.status,
        createdAt: userItem.createdAt,
      },
      magicLink, // Return magic link for admin to share with user
      debugInfo: {
        note: 'Magic link expires in 15 minutes. Share this with the user to set up their account.',
        expiresIn: '15 minutes',
      },
    }),
  };
}

// List users for a corporate account
async function listCorporateUsers(corpId, headers, logger, tenantId) {
  if (!corpId) {
    return errorResponse(400, 'Corporate account ID is required', null, headers);
  }

  const result = await docClient.send(new QueryCommand({
    TableName: CORPORATE_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': buildTenantPK(tenantId, 'CORP', corpId),
      ':skPrefix': 'USER#',
    },
  }));

  const users = (result.Items || []).map(item => ({
    userId: item.userId,
    email: item.email,
    name: item.name,
    role: item.role,
    status: item.status,
    stats: item.stats,
    createdAt: item.createdAt,
    lastLoginAt: item.lastLoginAt,
  }));

  logger.info({
    event: 'corporate_users_listed',
    corpId,
    count: users.length,
    tenantId,
  }, 'Corporate users listed');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      users,
      count: users.length,
    }),
  };
}

// Update a corporate user
async function updateCorporateUser(corpId, userId, requestBody, headers, logger, tenantId) {
  if (!corpId || !userId) {
    return errorResponse(400, 'Corporate account ID and user ID are required', null, headers);
  }

  const body = JSON.parse(requestBody || '{}');
  const validation = validateRequest(body, UpdateCorporateUserSchema);

  if (!validation.success) {
    return errorResponse(400, 'Validation failed', validation.errors, headers);
  }

  const data = validation.data;

  // Check user exists
  const existing = await docClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: `USER#${userId}`,
    },
  }));

  if (!existing.Item) {
    return errorResponse(404, 'User not found', null, headers);
  }

  // Build update expression
  const now = new Date().toISOString();
  const updateParts = ['updatedAt = :updatedAt'];
  const expressionValues = { ':updatedAt': now };

  if (data.name !== undefined) {
    updateParts.push('#name = :name');
    expressionValues[':name'] = data.name;
  }
  if (data.role !== undefined) {
    updateParts.push('#role = :role');
    expressionValues[':role'] = data.role;
  }
  if (data.status !== undefined) {
    updateParts.push('#status = :status');
    expressionValues[':status'] = data.status;
  }

  const expressionAttributeNames = {};
  if (data.name !== undefined) expressionAttributeNames['#name'] = 'name';
  if (data.role !== undefined) expressionAttributeNames['#role'] = 'role';
  if (data.status !== undefined) expressionAttributeNames['#status'] = 'status';

  const updateCommand = {
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: `USER#${userId}`,
    },
    UpdateExpression: `SET ${updateParts.join(', ')}`,
    ExpressionAttributeValues: expressionValues,
  };

  if (Object.keys(expressionAttributeNames).length > 0) {
    updateCommand.ExpressionAttributeNames = expressionAttributeNames;
  }

  await docClient.send(new UpdateCommand(updateCommand));

  logger.info({
    event: 'corporate_user_updated',
    corpId,
    userId,
    updatedFields: Object.keys(data),
    tenantId,
  }, 'Corporate user updated');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'User updated successfully',
    }),
  };
}

// Remove a corporate user
async function removeCorporateUser(corpId, userId, headers, logger, tenantId) {
  if (!corpId || !userId) {
    return errorResponse(400, 'Corporate account ID and user ID are required', null, headers);
  }

  // Check user exists
  const existing = await docClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: `USER#${userId}`,
    },
  }));

  if (!existing.Item) {
    return errorResponse(404, 'User not found', null, headers);
  }

  // Soft delete - mark as removed rather than deleting
  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: `USER#${userId}`,
    },
    UpdateExpression: 'SET #status = :status, updatedAt = :now, removedAt = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'removed',
      ':now': now,
    },
  }));

  // Update user count on corporate account
  await docClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: 'METADATA',
    },
    UpdateExpression: 'SET stats.usersCount = stats.usersCount - :dec, updatedAt = :now',
    ExpressionAttributeValues: {
      ':dec': 1,
      ':now': now,
    },
  }));

  logger.info({
    event: 'corporate_user_removed',
    corpId,
    userId,
    tenantId,
  }, 'Corporate user removed');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'User removed successfully',
    }),
  };
}

// Regenerate magic link for an existing user
async function regenerateMagicLink(corpId, userId, headers, logger, tenantId) {
  if (!corpId || !userId) {
    return errorResponse(400, 'Corporate account ID and user ID are required', null, headers);
  }

  // Get the user
  const userResult = await docClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: `USER#${userId}`,
    },
  }));

  if (!userResult.Item) {
    return errorResponse(404, 'User not found', null, headers);
  }

  const user = userResult.Item;

  // Don't allow regenerating links for removed users
  if (user.status === 'removed') {
    return errorResponse(400, 'Cannot generate magic link for removed user', null, headers);
  }

  // Generate new magic link token
  const magicToken = await createMagicLinkToken(
    tenantId,
    user.email,
    corpId,
    userId,
    'invite'
  );

  const magicLink = `${CORPORATE_PORTAL_URL}/verify?token=${magicToken}`;

  logger.info({
    event: 'magic_link_regenerated',
    corpId,
    userId,
    email: user.email,
    tenantId,
  }, 'Magic link regenerated for corporate user');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Magic link generated successfully',
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      magicLink,
      instructions: {
        note: 'Magic link expires in 15 minutes. Share this with the user to set up their account.',
      },
    }),
  };
}

// Send invite to primary contact (placeholder - SES integration in corporate-auth)
async function sendInvite(corpId, requestBody, headers, logger, tenantId) {
  if (!corpId) {
    return errorResponse(400, 'Corporate account ID is required', null, headers);
  }

  // Get corporate account
  const corpResult = await docClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpId),
      SK: 'METADATA',
    },
  }));

  if (!corpResult.Item) {
    return errorResponse(404, 'Corporate account not found', null, headers);
  }

  const corp = corpResult.Item;

  // TODO: Integrate with corporate-auth Lambda to send magic link
  // For now, just log the intent and return success
  logger.info({
    event: 'invite_requested',
    corpId,
    email: corp.contactEmail,
    tenantId,
  }, 'Invite requested for corporate account');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: `Invite will be sent to ${corp.contactEmail}`,
      note: 'SES integration pending - magic link system in Phase 2',
    }),
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
    body: JSON.stringify(body),
  };
}
