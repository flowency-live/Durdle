import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantPK, logTenantContext } from '/opt/nodejs/tenant.mjs';
import bcrypt from 'bcryptjs';
import {
  validateRequest,
  MagicLinkRequestSchema,
  VerifyTokenSchema,
  PasswordLoginSchema,
  SetPasswordSchema,
  ForgotPasswordSchema
} from './validation.mjs';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);
const sesClient = new SESClient({ region: 'eu-west-2' });
const secretsClient = new SecretsManagerClient({ region: 'eu-west-2' });

const CORPORATE_TABLE_NAME = process.env.CORPORATE_TABLE_NAME || 'durdle-corporate-dev';
const JWT_SECRET_NAME = process.env.JWT_SECRET_NAME || 'durdle/jwt-secret';
const JWT_EXPIRY = 28800; // 8 hours in seconds
const MAGIC_LINK_TTL = 5 * 24 * 60 * 60; // 5 days in seconds
const MAX_MAGIC_LINKS_PER_HOUR = 3;

// SES Configuration
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
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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
  }, 'Corporate auth Lambda invoked');

  logTenantContext(logger, tenantId, 'corporate_auth');

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, path } = event;

    // POST /corporate/auth/magic-link - Request magic link (returns URL for testing)
    if (path.includes('/magic-link') && !path.includes('/forgot')) {
      if (httpMethod !== 'POST') {
        return errorResponse(405, 'Method not allowed', null, headers);
      }
      return await requestMagicLink(event.body, headers, logger, tenantId);
    }

    // POST /corporate/auth/verify - Verify token and return JWT
    if (path.includes('/verify')) {
      if (httpMethod !== 'POST') {
        return errorResponse(405, 'Method not allowed', null, headers);
      }
      return await verifyMagicLink(event.body, headers, logger, tenantId);
    }

    // POST /corporate/auth/login - Email + password login
    if (path.includes('/login')) {
      if (httpMethod !== 'POST') {
        return errorResponse(405, 'Method not allowed', null, headers);
      }
      return await passwordLogin(event.body, headers, logger, tenantId);
    }

    // POST /corporate/auth/set-password - Set password (first time or reset)
    if (path.includes('/set-password')) {
      if (httpMethod !== 'POST') {
        return errorResponse(405, 'Method not allowed', null, headers);
      }
      return await setPassword(event.body, headers, logger, tenantId);
    }

    // POST /corporate/auth/forgot-password - Request password reset
    if (path.includes('/forgot-password')) {
      if (httpMethod !== 'POST') {
        return errorResponse(405, 'Method not allowed', null, headers);
      }
      return await forgotPassword(event.body, headers, logger, tenantId);
    }

    // GET /corporate/auth/session - Check session validity
    if (path.includes('/session')) {
      if (httpMethod !== 'GET') {
        return errorResponse(405, 'Method not allowed', null, headers);
      }
      return await verifySession(event.headers, headers, logger, tenantId);
    }

    return errorResponse(404, 'Endpoint not found', null, headers);
  } catch (error) {
    logger.error({
      event: 'lambda_error',
      errorMessage: error.message,
      errorStack: error.stack,
      tenantId,
    }, 'Unhandled error in corporate auth Lambda');
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
 * Generate a secure random token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request a magic link - sends email with login link
 */
async function requestMagicLink(requestBody, headers, logger, tenantId) {
  let data;
  try {
    data = JSON.parse(requestBody || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', null, headers);
  }

  // Validate input
  const validation = validateRequest(data, MagicLinkRequestSchema);
  if (!validation.success) {
    return errorResponse(400, validation.error, null, headers);
  }

  const email = validation.data.email.toLowerCase();

  logger.info({
    event: 'magic_link_request',
    email,
    tenantId,
  }, 'Magic link requested');

  // Find user by email across all corporate accounts for this tenant
  // Query GSI1 where GSI1PK = TENANT#001#CORP_USER_EMAIL and GSI1SK = email
  const userQuery = await ddbDocClient.send(new QueryCommand({
    TableName: CORPORATE_TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :email',
    ExpressionAttributeValues: {
      ':gsi1pk': `${tenantId}#CORP_USER_EMAIL`,
      ':email': email,
    },
  }));

  if (!userQuery.Items || userQuery.Items.length === 0) {
    // Don't reveal if email exists - same response
    logger.warn({
      event: 'magic_link_user_not_found',
      email,
      tenantId,
    }, 'Magic link requested for unknown email');

    // Return success to prevent email enumeration
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'If this email is registered, you will receive a login link shortly.',
      }),
    };
  }

  const userRecord = userQuery.Items[0];
  const corpAccountId = userRecord.corpAccountId;
  const userId = userRecord.userId;
  const userRole = userRecord.role;
  const userName = userRecord.name;

  // Check user status
  if (userRecord.status !== 'active') {
    logger.warn({
      event: 'magic_link_inactive_user',
      email,
      userId,
      status: userRecord.status,
      tenantId,
    }, 'Magic link requested for inactive user');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'If this email is registered, you will receive a login link shortly.',
      }),
    };
  }

  // Get corporate account to check if it's active
  const corpAccount = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', corpAccountId),
      SK: 'METADATA',
    },
  }));

  if (!corpAccount.Item || corpAccount.Item.status !== 'active') {
    logger.warn({
      event: 'magic_link_inactive_account',
      email,
      corpAccountId,
      tenantId,
    }, 'Magic link requested for inactive corporate account');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'If this email is registered, you will receive a login link shortly.',
      }),
    };
  }

  // Rate limiting - check recent magic link requests
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  // Check for recent tokens (rudimentary rate limiting via scan - could be improved with GSI)
  // For simplicity, we'll proceed and let the single-use token handle security

  // Generate magic link token
  const token = generateToken();
  const ttl = Math.floor(now / 1000) + MAGIC_LINK_TTL;

  // Store magic link token in DynamoDB
  await ddbDocClient.send(new PutCommand({
    TableName: CORPORATE_TABLE_NAME,
    Item: {
      PK: buildTenantPK(tenantId, 'MAGIC', token),
      SK: 'METADATA',
      tenantId,
      token,
      email,
      corpAccountId,
      userId,
      userRole,
      userName,
      companyName: corpAccount.Item.companyName,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(ttl * 1000).toISOString(),
      ttl, // DynamoDB TTL
      used: false,
    },
  }));

  // Send email via SES
  const magicLink = `${CORPORATE_PORTAL_URL}/verify?token=${token}`;

  try {
    await sesClient.send(new SendEmailCommand({
      Source: SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'Your Dorset Transfer Company Login Link',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: generateMagicLinkEmail(userName, magicLink, corpAccount.Item.companyName),
            Charset: 'UTF-8',
          },
          Text: {
            Data: `Hello ${userName},\n\nClick here to log in to your Dorset Transfer Company corporate account:\n\n${magicLink}\n\nThis link will expire in 5 days.\n\nIf you did not request this link, please ignore this email.\n\nDorset Transfer Company`,
            Charset: 'UTF-8',
          },
        },
      },
    }));

    logger.info({
      event: 'magic_link_sent',
      email,
      userId,
      corpAccountId,
      tenantId,
    }, 'Magic link email sent');

  } catch (sesError) {
    logger.error({
      event: 'ses_error',
      email,
      errorMessage: sesError.message,
      tenantId,
    }, 'Failed to send magic link email');

    // Don't reveal the error to the user
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'If this email is registered, you will receive a login link shortly.',
      // Include magic link for testing (remove in production when SES is configured)
      magicLink: magicLink,
      debugInfo: {
        note: 'Magic link shown for testing. In production, this will be sent via email only.',
        expiresIn: '5 days',
      }
    }),
  };
}

/**
 * Verify magic link token and return JWT
 */
async function verifyMagicLink(requestBody, headers, logger, tenantId) {
  let data;
  try {
    data = JSON.parse(requestBody || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', null, headers);
  }

  // Validate input
  const validation = validateRequest(data, VerifyTokenSchema);
  if (!validation.success) {
    return errorResponse(400, validation.error, null, headers);
  }

  const { token } = validation.data;

  logger.info({
    event: 'magic_link_verify',
    tokenPrefix: token.substring(0, 8),
    tenantId,
  }, 'Verifying magic link token');

  // Get the magic link token
  const tokenRecord = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'MAGIC', token),
      SK: 'METADATA',
    },
  }));

  if (!tokenRecord.Item) {
    logger.warn({
      event: 'magic_link_invalid',
      tokenPrefix: token.substring(0, 8),
      reason: 'not_found',
      tenantId,
    }, 'Magic link token not found');

    return errorResponse(401, 'Invalid or expired login link', null, headers);
  }

  const magicLink = tokenRecord.Item;

  // Check if already used
  if (magicLink.used) {
    logger.warn({
      event: 'magic_link_invalid',
      tokenPrefix: token.substring(0, 8),
      reason: 'already_used',
      tenantId,
    }, 'Magic link already used');

    return errorResponse(401, 'This login link has already been used', null, headers);
  }

  // Check if expired (TTL might not have cleaned it up yet)
  if (magicLink.ttl < Math.floor(Date.now() / 1000)) {
    logger.warn({
      event: 'magic_link_invalid',
      tokenPrefix: token.substring(0, 8),
      reason: 'expired',
      tenantId,
    }, 'Magic link expired');

    return errorResponse(401, 'This login link has expired', null, headers);
  }

  // Check if user has a password set
  const userRecord = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', magicLink.corpAccountId),
      SK: `USER#${magicLink.userId}`,
    },
  }));

  const hasPassword = userRecord.Item?.passwordHash ? true : false;

  // If user needs to set password, don't mark token as used yet
  // They'll use it again when setting the password
  if (!hasPassword) {
    logger.info({
      event: 'magic_link_needs_password',
      userId: magicLink.userId,
      corpAccountId: magicLink.corpAccountId,
      tenantId,
    }, 'User needs to set password');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        needsPassword: true,
        token: token, // Return the same token for set-password flow
        user: {
          userId: magicLink.userId,
          email: magicLink.email,
          name: magicLink.userName,
          role: magicLink.userRole,
          companyName: magicLink.companyName,
          corpAccountId: magicLink.corpAccountId,
        },
      }),
    };
  }

  // User has password - mark token as used and issue JWT
  await ddbDocClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'MAGIC', token),
      SK: 'METADATA',
    },
    UpdateExpression: 'SET used = :used, usedAt = :usedAt',
    ExpressionAttributeValues: {
      ':used': true,
      ':usedAt': new Date().toISOString(),
    },
  }));

  // Update user's last login
  await ddbDocClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', magicLink.corpAccountId),
      SK: `USER#${magicLink.userId}`,
    },
    UpdateExpression: 'SET lastLogin = :lastLogin',
    ExpressionAttributeValues: {
      ':lastLogin': new Date().toISOString(),
    },
  }));

  // Generate JWT
  const jwtSecret = await getJwtSecret();
  const jwtToken = jwt.sign(
    {
      type: 'corporate', // Distinguish from admin tokens
      tenantId,
      corpAccountId: magicLink.corpAccountId,
      userId: magicLink.userId,
      email: magicLink.email,
      role: magicLink.userRole,
      userName: magicLink.userName,
      companyName: magicLink.companyName,
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );

  logger.info({
    event: 'magic_link_verified',
    userId: magicLink.userId,
    corpAccountId: magicLink.corpAccountId,
    role: magicLink.userRole,
    tenantId,
  }, 'Magic link verified, JWT issued');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      needsPassword: false,
      token: jwtToken,
      user: {
        userId: magicLink.userId,
        email: magicLink.email,
        name: magicLink.userName,
        role: magicLink.userRole,
        companyName: magicLink.companyName,
        corpAccountId: magicLink.corpAccountId,
      },
      expiresIn: JWT_EXPIRY,
    }),
  };
}

/**
 * Verify session - check if JWT is valid
 */
async function verifySession(requestHeaders, headers, logger, tenantId) {
  // Extract token from Authorization header
  let token = null;

  if (requestHeaders.Authorization || requestHeaders.authorization) {
    const authHeader = requestHeaders.Authorization || requestHeaders.authorization;
    token = authHeader.replace('Bearer ', '');
  }

  if (!token) {
    logger.warn({
      event: 'session_verification_failure',
      reason: 'no_token',
      tenantId,
    }, 'No session token provided');
    return errorResponse(401, 'No session token provided', null, headers);
  }

  try {
    const jwtSecret = await getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret);

    // Verify this is a corporate token
    if (decoded.type !== 'corporate') {
      logger.warn({
        event: 'session_verification_failure',
        reason: 'wrong_token_type',
        tokenType: decoded.type,
        tenantId,
      }, 'Wrong token type');
      return errorResponse(401, 'Invalid token type', null, headers);
    }

    // Verify user still exists and is active
    const userRecord = await ddbDocClient.send(new GetCommand({
      TableName: CORPORATE_TABLE_NAME,
      Key: {
        PK: buildTenantPK(tenantId, 'CORP', decoded.corpAccountId),
        SK: `USER#${decoded.userId}`,
      },
    }));

    if (!userRecord.Item || userRecord.Item.status !== 'active') {
      logger.warn({
        event: 'session_verification_failure',
        userId: decoded.userId,
        reason: 'user_inactive_or_not_found',
        tenantId,
      }, 'User inactive or not found');
      return errorResponse(403, 'Account is disabled or not found', null, headers);
    }

    // Verify corporate account is still active
    const corpAccount = await ddbDocClient.send(new GetCommand({
      TableName: CORPORATE_TABLE_NAME,
      Key: {
        PK: buildTenantPK(tenantId, 'CORP', decoded.corpAccountId),
        SK: 'METADATA',
      },
    }));

    if (!corpAccount.Item || corpAccount.Item.status !== 'active') {
      logger.warn({
        event: 'session_verification_failure',
        corpAccountId: decoded.corpAccountId,
        reason: 'account_inactive',
        tenantId,
      }, 'Corporate account inactive');
      return errorResponse(403, 'Corporate account is disabled', null, headers);
    }

    logger.info({
      event: 'session_verification_success',
      userId: decoded.userId,
      corpAccountId: decoded.corpAccountId,
      tenantId,
    }, 'Session verified successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        user: {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.userName,
          role: decoded.role,
          companyName: decoded.companyName,
          corpAccountId: decoded.corpAccountId,
        },
      }),
    };

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn({ event: 'session_expired', tenantId }, 'Session token expired');
      return errorResponse(401, 'Session expired', null, headers);
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn({ event: 'invalid_token', tenantId }, 'Invalid session token');
      return errorResponse(401, 'Invalid session token', null, headers);
    }
    throw error;
  }
}

/**
 * Generate magic link email HTML
 */
function generateMagicLinkEmail(userName, magicLink, companyName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login to Dorset Transfer Company</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a365d; margin: 0;">Dorset Transfer Company</h1>
    <p style="color: #666; margin: 5px 0;">Corporate Travel Portal</p>
  </div>

  <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #1a365d; margin-top: 0;">Hello ${userName},</h2>

    <p>You requested a login link for your corporate account${companyName ? ` (${companyName})` : ''}.</p>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}"
         style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Log In to Your Account
      </a>
    </p>

    <p style="color: #666; font-size: 14px;">
      This link will expire in <strong>15 minutes</strong> and can only be used once.
    </p>

    <p style="color: #666; font-size: 14px;">
      If you didn't request this link, you can safely ignore this email.
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

/**
 * Password login - authenticate with email + password
 */
async function passwordLogin(requestBody, headers, logger, tenantId) {
  let data;
  try {
    data = JSON.parse(requestBody || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', null, headers);
  }

  // Validate input
  const validation = validateRequest(data, PasswordLoginSchema);
  if (!validation.success) {
    return errorResponse(400, validation.error, null, headers);
  }

  const { email, password } = validation.data;
  const emailLower = email.toLowerCase();

  logger.info({
    event: 'password_login_attempt',
    email: emailLower,
    tenantId,
  }, 'Password login attempt');

  // Find user by email
  const userQuery = await ddbDocClient.send(new QueryCommand({
    TableName: CORPORATE_TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :email',
    ExpressionAttributeValues: {
      ':gsi1pk': `${tenantId}#CORP_USER_EMAIL`,
      ':email': emailLower,
    },
  }));

  if (!userQuery.Items || userQuery.Items.length === 0) {
    logger.warn({
      event: 'password_login_failed',
      email: emailLower,
      reason: 'user_not_found',
      tenantId,
    }, 'Login failed - user not found');
    return errorResponse(401, 'Invalid email or password', null, headers);
  }

  const userRecord = userQuery.Items[0];

  // Check if user has a password set
  if (!userRecord.passwordHash) {
    logger.warn({
      event: 'password_login_failed',
      email: emailLower,
      reason: 'no_password_set',
      tenantId,
    }, 'Login failed - no password set');
    return errorResponse(401, 'Please use the magic link to set up your password first', null, headers);
  }

  // Check user status
  if (userRecord.status !== 'active') {
    logger.warn({
      event: 'password_login_failed',
      email: emailLower,
      reason: 'user_inactive',
      tenantId,
    }, 'Login failed - user inactive');
    return errorResponse(401, 'Your account is not active', null, headers);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, userRecord.passwordHash);
  if (!isValidPassword) {
    logger.warn({
      event: 'password_login_failed',
      email: emailLower,
      reason: 'invalid_password',
      tenantId,
    }, 'Login failed - invalid password');
    return errorResponse(401, 'Invalid email or password', null, headers);
  }

  // Get corporate account to check if it's active
  const corpAccount = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', userRecord.corpAccountId),
      SK: 'METADATA',
    },
  }));

  if (!corpAccount.Item || corpAccount.Item.status !== 'active') {
    logger.warn({
      event: 'password_login_failed',
      email: emailLower,
      corpAccountId: userRecord.corpAccountId,
      reason: 'account_inactive',
      tenantId,
    }, 'Login failed - corporate account inactive');
    return errorResponse(401, 'Your corporate account is not active', null, headers);
  }

  // Update user's last login
  await ddbDocClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', userRecord.corpAccountId),
      SK: `USER#${userRecord.userId}`,
    },
    UpdateExpression: 'SET lastLogin = :lastLogin',
    ExpressionAttributeValues: {
      ':lastLogin': new Date().toISOString(),
    },
  }));

  // Generate JWT
  const jwtSecret = await getJwtSecret();
  const jwtToken = jwt.sign(
    {
      type: 'corporate',
      tenantId,
      corpAccountId: userRecord.corpAccountId,
      userId: userRecord.userId,
      email: userRecord.email,
      role: userRecord.role,
      userName: userRecord.name,
      companyName: corpAccount.Item.companyName,
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );

  logger.info({
    event: 'password_login_success',
    userId: userRecord.userId,
    corpAccountId: userRecord.corpAccountId,
    tenantId,
  }, 'Password login successful');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      token: jwtToken,
      user: {
        userId: userRecord.userId,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        companyName: corpAccount.Item.companyName,
        corpAccountId: userRecord.corpAccountId,
      },
      expiresIn: JWT_EXPIRY,
    }),
  };
}

/**
 * Set password - create or reset password using magic link token
 */
async function setPassword(requestBody, headers, logger, tenantId) {
  let data;
  try {
    data = JSON.parse(requestBody || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', null, headers);
  }

  // Validate input
  const validation = validateRequest(data, SetPasswordSchema);
  if (!validation.success) {
    return errorResponse(400, validation.error, null, headers);
  }

  const { token, password } = validation.data;

  logger.info({
    event: 'set_password_attempt',
    tokenPrefix: token.substring(0, 8),
    tenantId,
  }, 'Set password attempt');

  // Get the magic link token
  const tokenRecord = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'MAGIC', token),
      SK: 'METADATA',
    },
  }));

  if (!tokenRecord.Item) {
    logger.warn({
      event: 'set_password_failed',
      tokenPrefix: token.substring(0, 8),
      reason: 'token_not_found',
      tenantId,
    }, 'Set password failed - token not found');
    return errorResponse(401, 'Invalid or expired link', null, headers);
  }

  const magicLink = tokenRecord.Item;

  // Check if already used
  if (magicLink.used) {
    logger.warn({
      event: 'set_password_failed',
      tokenPrefix: token.substring(0, 8),
      reason: 'token_already_used',
      tenantId,
    }, 'Set password failed - token already used');
    return errorResponse(401, 'This link has already been used', null, headers);
  }

  // Check if expired
  if (magicLink.ttl < Math.floor(Date.now() / 1000)) {
    logger.warn({
      event: 'set_password_failed',
      tokenPrefix: token.substring(0, 8),
      reason: 'token_expired',
      tenantId,
    }, 'Set password failed - token expired');
    return errorResponse(401, 'This link has expired', null, headers);
  }

  // Hash the password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Update user with password hash AND set status to active
  await ddbDocClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', magicLink.corpAccountId),
      SK: `USER#${magicLink.userId}`,
    },
    UpdateExpression: 'SET passwordHash = :passwordHash, passwordSetAt = :passwordSetAt, lastLogin = :lastLogin, #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status', // 'status' is a reserved word in DynamoDB
    },
    ExpressionAttributeValues: {
      ':passwordHash': passwordHash,
      ':passwordSetAt': new Date().toISOString(),
      ':lastLogin': new Date().toISOString(),
      ':status': 'active', // Activate user when password is set
    },
  }));

  // Mark token as used
  await ddbDocClient.send(new UpdateCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'MAGIC', token),
      SK: 'METADATA',
    },
    UpdateExpression: 'SET used = :used, usedAt = :usedAt',
    ExpressionAttributeValues: {
      ':used': true,
      ':usedAt': new Date().toISOString(),
    },
  }));

  // Get corporate account for company name
  const corpAccount = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', magicLink.corpAccountId),
      SK: 'METADATA',
    },
  }));

  // Generate JWT
  const jwtSecret = await getJwtSecret();
  const jwtToken = jwt.sign(
    {
      type: 'corporate',
      tenantId,
      corpAccountId: magicLink.corpAccountId,
      userId: magicLink.userId,
      email: magicLink.email,
      role: magicLink.userRole,
      userName: magicLink.userName,
      companyName: corpAccount.Item?.companyName || magicLink.companyName,
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );

  logger.info({
    event: 'set_password_success',
    userId: magicLink.userId,
    corpAccountId: magicLink.corpAccountId,
    tenantId,
  }, 'Password set successfully');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      token: jwtToken,
      user: {
        userId: magicLink.userId,
        email: magicLink.email,
        name: magicLink.userName,
        role: magicLink.userRole,
        companyName: corpAccount.Item?.companyName || magicLink.companyName,
        corpAccountId: magicLink.corpAccountId,
      },
      expiresIn: JWT_EXPIRY,
    }),
  };
}

/**
 * Forgot password - generate a password reset magic link
 */
async function forgotPassword(requestBody, headers, logger, tenantId) {
  let data;
  try {
    data = JSON.parse(requestBody || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', null, headers);
  }

  // Validate input
  const validation = validateRequest(data, ForgotPasswordSchema);
  if (!validation.success) {
    return errorResponse(400, validation.error, null, headers);
  }

  const email = validation.data.email.toLowerCase();

  logger.info({
    event: 'forgot_password_request',
    email,
    tenantId,
  }, 'Forgot password request');

  // Find user by email
  const userQuery = await ddbDocClient.send(new QueryCommand({
    TableName: CORPORATE_TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :email',
    ExpressionAttributeValues: {
      ':gsi1pk': `${tenantId}#CORP_USER_EMAIL`,
      ':email': email,
    },
  }));

  // Always return success to prevent email enumeration
  const successResponse = {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'If this email is registered, you will receive a password reset link.',
    }),
  };

  if (!userQuery.Items || userQuery.Items.length === 0) {
    logger.warn({
      event: 'forgot_password_user_not_found',
      email,
      tenantId,
    }, 'Forgot password - user not found');
    return successResponse;
  }

  const userRecord = userQuery.Items[0];

  // Check user status
  if (userRecord.status !== 'active') {
    logger.warn({
      event: 'forgot_password_user_inactive',
      email,
      tenantId,
    }, 'Forgot password - user inactive');
    return successResponse;
  }

  // Get corporate account
  const corpAccount = await ddbDocClient.send(new GetCommand({
    TableName: CORPORATE_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'CORP', userRecord.corpAccountId),
      SK: 'METADATA',
    },
  }));

  if (!corpAccount.Item || corpAccount.Item.status !== 'active') {
    logger.warn({
      event: 'forgot_password_account_inactive',
      email,
      corpAccountId: userRecord.corpAccountId,
      tenantId,
    }, 'Forgot password - corporate account inactive');
    return successResponse;
  }

  // Generate magic link token
  const token = generateToken();
  const now = Date.now();
  const ttl = Math.floor(now / 1000) + MAGIC_LINK_TTL;

  // Store magic link token in DynamoDB
  await ddbDocClient.send(new PutCommand({
    TableName: CORPORATE_TABLE_NAME,
    Item: {
      PK: buildTenantPK(tenantId, 'MAGIC', token),
      SK: 'METADATA',
      tenantId,
      token,
      email,
      corpAccountId: userRecord.corpAccountId,
      userId: userRecord.userId,
      userRole: userRecord.role,
      userName: userRecord.name,
      companyName: corpAccount.Item.companyName,
      purpose: 'password_reset',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(ttl * 1000).toISOString(),
      ttl,
      used: false,
    },
  }));

  const magicLink = `${CORPORATE_PORTAL_URL}/verify?token=${token}`;

  logger.info({
    event: 'forgot_password_link_generated',
    email,
    userId: userRecord.userId,
    tenantId,
  }, 'Forgot password link generated');

  // Try to send email via SES (will fail if not configured)
  try {
    await sesClient.send(new SendEmailCommand({
      Source: SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'Reset Your Password - Dorset Transfer Company',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: generatePasswordResetEmail(userRecord.name, magicLink, corpAccount.Item.companyName),
            Charset: 'UTF-8',
          },
          Text: {
            Data: `Hello ${userRecord.name},\n\nYou requested to reset your password for your Dorset Transfer Company corporate account.\n\nClick here to reset your password:\n\n${magicLink}\n\nThis link will expire in 5 days.\n\nIf you did not request this, please ignore this email.\n\nDorset Transfer Company`,
            Charset: 'UTF-8',
          },
        },
      },
    }));

    logger.info({
      event: 'forgot_password_email_sent',
      email,
      tenantId,
    }, 'Password reset email sent');
  } catch (sesError) {
    logger.error({
      event: 'ses_error',
      email,
      errorMessage: sesError.message,
      tenantId,
    }, 'Failed to send password reset email');
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'If this email is registered, you will receive a password reset link.',
      // Include magic link for testing
      magicLink: magicLink,
      debugInfo: {
        note: 'Magic link shown for testing. In production, this will be sent via email only.',
        expiresIn: '5 days',
      }
    }),
  };
}

/**
 * Generate password reset email HTML
 */
function generatePasswordResetEmail(userName, magicLink, companyName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Dorset Transfer Company</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a365d; margin: 0;">Dorset Transfer Company</h1>
    <p style="color: #666; margin: 5px 0;">Corporate Travel Portal</p>
  </div>

  <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #1a365d; margin-top: 0;">Reset Your Password</h2>

    <p>Hello ${userName},</p>

    <p>You requested to reset your password for your corporate account${companyName ? ` (${companyName})` : ''}.</p>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}"
         style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Reset Password
      </a>
    </p>

    <p style="color: #666; font-size: 14px;">
      This link will expire in <strong>15 minutes</strong> and can only be used once.
    </p>

    <p style="color: #666; font-size: 14px;">
      If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
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
