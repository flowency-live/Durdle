/**
 * API Gateway Lambda Authorizer
 *
 * Validates JWT tokens for admin endpoints.
 * Uses same JWT secret as admin-auth Lambda.
 *
 * Returns IAM policy allowing/denying API access.
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import jwt from 'jsonwebtoken';

const secretsClient = new SecretsManagerClient({ region: 'eu-west-2' });
const JWT_SECRET_NAME = process.env.JWT_SECRET_NAME || 'durdle/jwt-secret';

// Cache JWT secret to avoid repeated Secrets Manager calls
let cachedJwtSecret = null;

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
 * Extract token from Authorization header or Cookie
 */
function extractToken(event) {
  // Try Authorization header first (Bearer token)
  const authHeader = event.authorizationToken;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // If no Bearer prefix, check if it's just the token
  if (authHeader && !authHeader.includes(' ')) {
    return authHeader;
  }

  // Try extracting from headers if passed differently
  const headers = event.headers || {};
  const authorization = headers.Authorization || headers.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.substring(7);
  }

  // Try Cookie header
  const cookie = headers.Cookie || headers.cookie;
  if (cookie) {
    const cookies = cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('sessionToken='));
    if (sessionCookie) {
      return sessionCookie.split('=')[1].trim();
    }
  }

  return null;
}

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(principalId, effect, resource, context = {}) {
  const policy = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource
      }]
    }
  };

  // Add context (user claims) for downstream Lambdas
  if (Object.keys(context).length > 0) {
    policy.context = context;
  }

  return policy;
}

/**
 * Lambda Authorizer Handler
 */
export const handler = async (event) => {
  console.log('Authorizer invoked:', JSON.stringify({
    methodArn: event.methodArn,
    hasAuthToken: !!event.authorizationToken,
    type: event.type
  }));

  try {
    // Extract token
    const token = extractToken(event);

    if (!token) {
      console.log('No token provided');
      throw new Error('Unauthorized');
    }

    // Get JWT secret
    const jwtSecret = await getJwtSecret();

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

    console.log('Token verified:', JSON.stringify({
      username: decoded.username,
      role: decoded.role,
      exp: decoded.exp
    }));

    // Generate Allow policy with user context
    // Use wildcard resource to allow all methods on this API
    // The authorizer result is cached, so we allow access to all admin routes
    const resourceArn = event.methodArn;
    const arnParts = resourceArn.split(':');
    const apiGatewayParts = arnParts[5].split('/');
    const apiId = apiGatewayParts[0];
    const stage = apiGatewayParts[1];

    // Allow all admin/* routes for this user
    const allowedResource = `arn:aws:execute-api:${arnParts[3]}:${arnParts[4]}:${apiId}/${stage}/*/admin/*`;

    return generatePolicy(decoded.username, 'Allow', allowedResource, {
      username: decoded.username,
      role: decoded.role || 'admin',
      email: decoded.email || ''
    });

  } catch (error) {
    console.log('Authorization failed:', error.message);

    if (error.name === 'TokenExpiredError') {
      console.log('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid token');
    }

    // Return Deny policy or throw Unauthorized
    // Throwing 'Unauthorized' returns 401, Deny policy returns 403
    throw new Error('Unauthorized');
  }
};
