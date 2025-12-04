import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);
const secretsClient = new SecretsManagerClient({ region: 'eu-west-2' });

const ADMIN_USERS_TABLE_NAME = process.env.ADMIN_USERS_TABLE_NAME || 'durdle-admin-users-dev';
const JWT_SECRET_NAME = process.env.JWT_SECRET_NAME || 'durdle/jwt-secret';
const JWT_EXPIRY = 28800; // 8 hours in seconds

let cachedJwtSecret = null;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, path } = event;

    if (path.includes('/login')) {
      if (httpMethod !== 'POST') {
        return errorResponse(405, 'Method not allowed');
      }
      return await login(event.body);
    }

    if (path.includes('/logout')) {
      if (httpMethod !== 'POST') {
        return errorResponse(405, 'Method not allowed');
      }
      return await logout();
    }

    if (path.includes('/session')) {
      if (httpMethod !== 'GET') {
        return errorResponse(405, 'Method not allowed');
      }
      return await verifySession(event.headers);
    }

    return errorResponse(404, 'Endpoint not found');
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'Internal server error', error.message);
  }
};

async function getJwtSecret() {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: JWT_SECRET_NAME
    });

    const response = await secretsClient.send(command);
    cachedJwtSecret = response.SecretString;
    return cachedJwtSecret;
  } catch (error) {
    console.error('Failed to fetch JWT secret, using fallback');
    // Fallback secret (for development only)
    cachedJwtSecret = 'durdle-dev-jwt-secret-fallback-' + Date.now();
    return cachedJwtSecret;
  }
}

async function login(requestBody) {
  const data = JSON.parse(requestBody);

  if (!data.username || !data.password) {
    return errorResponse(400, 'Missing username or password');
  }

  // Fetch user from DynamoDB
  const getCommand = new GetCommand({
    TableName: ADMIN_USERS_TABLE_NAME,
    Key: {
      PK: `USER#${data.username.toLowerCase()}`,
      SK: 'METADATA'
    }
  });

  const result = await ddbDocClient.send(getCommand);

  if (!result.Item) {
    console.log('User not found:', data.username);
    return errorResponse(401, 'Invalid username or password');
  }

  const user = result.Item;

  // Check if user is active
  if (!user.active) {
    return errorResponse(403, 'Account is disabled');
  }

  // Compare password with bcrypt
  const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);

  if (!passwordMatch) {
    console.log('Password mismatch for user:', data.username);
    return errorResponse(401, 'Invalid username or password');
  }

  // Update lastLogin timestamp
  const now = new Date().toISOString();
  const updateCommand = new UpdateCommand({
    TableName: ADMIN_USERS_TABLE_NAME,
    Key: {
      PK: `USER#${data.username.toLowerCase()}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'SET lastLogin = :lastLogin',
    ExpressionAttributeValues: {
      ':lastLogin': now
    }
  });

  await ddbDocClient.send(updateCommand);

  // Generate JWT
  const jwtSecret = await getJwtSecret();
  const token = jwt.sign(
    {
      username: user.username,
      role: user.role,
      email: user.email
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );

  // Set httpOnly cookie
  const cookieHeader = `sessionToken=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${JWT_EXPIRY}; Path=/`;

  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Set-Cookie': cookieHeader
    },
    body: JSON.stringify({
      success: true,
      sessionToken: token,
      user: {
        username: user.username,
        role: user.role,
        email: user.email,
        fullName: user.fullName
      },
      expiresIn: JWT_EXPIRY
    })
  };
}

async function logout() {
  // Clear the session cookie
  const cookieHeader = 'sessionToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/';

  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Set-Cookie': cookieHeader
    },
    body: JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    })
  };
}

async function verifySession(requestHeaders) {
  // Extract token from Authorization header or Cookie
  let token = null;

  if (requestHeaders.Authorization || requestHeaders.authorization) {
    const authHeader = requestHeaders.Authorization || requestHeaders.authorization;
    token = authHeader.replace('Bearer ', '');
  } else if (requestHeaders.Cookie || requestHeaders.cookie) {
    const cookies = (requestHeaders.Cookie || requestHeaders.cookie).split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('sessionToken='));
    if (sessionCookie) {
      token = sessionCookie.split('=')[1];
    }
  }

  if (!token) {
    return errorResponse(401, 'No session token provided');
  }

  try {
    const jwtSecret = await getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret);

    // Fetch fresh user data from DynamoDB
    const getCommand = new GetCommand({
      TableName: ADMIN_USERS_TABLE_NAME,
      Key: {
        PK: `USER#${decoded.username}`,
        SK: 'METADATA'
      }
    });

    const result = await ddbDocClient.send(getCommand);

    if (!result.Item || !result.Item.active) {
      return errorResponse(403, 'Account is disabled or not found');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        user: {
          username: result.Item.username,
          role: result.Item.role,
          email: result.Item.email,
          fullName: result.Item.fullName
        }
      })
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(401, 'Session expired');
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(401, 'Invalid session token');
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
