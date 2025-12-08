# Lambda Code Patterns

**Last Updated**: December 8, 2025
**Owner**: CTO
**Purpose**: Canonical code patterns for ALL Lambda functions. Copy these exactly.

---

## Why This Document Exists

Different developers/sessions implement patterns differently. This document provides **exact code to copy** so all Lambdas are consistent.

**Rule**: When implementing a new Lambda, copy code blocks from this document. Do NOT improvise.

---

## 1. CORS Configuration (Admin Endpoints)

**Required for**: All `/admin/*` endpoints

**Copy this exactly**:

```javascript
// CORS configuration per ADMIN_ENDPOINT_STANDARD.md
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
```

**Usage in handler**:

```javascript
export const handler = async (event, context) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  // Handle OPTIONS preflight FIRST
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ... rest of handler
};
```

---

## 2. CORS Configuration (Public Endpoints)

**Required for**: Public endpoints like `/v1/quotes`, `/v1/vehicles`

**Copy this exactly**:

```javascript
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};
```

**Note**: Public endpoints can use wildcard `*` because they don't send credentials.

---

## 3. Dual CORS (Public + Admin)

**Required for**: Lambdas that serve both public AND admin routes (e.g., feedback-manager)

**Copy this exactly**:

```javascript
const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://durdle.flowency.build',
  'https://durdle.co.uk'
];

const getHeaders = (path, origin) => {
  // Public endpoint uses wildcard CORS
  const isPublicPath = path && path.includes('/v1/') && !path.includes('/admin/');

  if (isPublicPath) {
    return {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
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
```

---

## 4. Structured Logging (Pino)

**Required for**: ALL Lambdas

**Import**:

```javascript
import { createLogger } from '/opt/nodejs/logger.mjs';
```

**Create logger in handler**:

```javascript
export const handler = async (event, context) => {
  const logger = createLogger(event, context);

  // Log invocation
  logger.info({
    event: 'lambda_invocation',
    httpMethod: event.httpMethod,
    path: event.path,
  }, 'Lambda function invoked');

  // ... rest of handler
};
```

**Log levels and usage**:

```javascript
// Info - normal operations
logger.info({
  event: 'operation_name',
  key: 'value',
}, 'Human readable message');

// Warn - expected failures (validation, not found)
logger.warn({
  event: 'validation_error',
  field: 'email',
  reason: 'invalid format',
}, 'Validation failed');

// Error - unexpected failures
logger.error({
  event: 'lambda_error',
  errorMessage: error.message,
  errorStack: error.stack,
}, 'Unhandled error');
```

**DO NOT use**:
- `console.log()` - not structured
- `logger.log()` - deprecated (works but avoid)

---

## 5. Error Response Function

**Copy this exactly**:

```javascript
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
```

**Usage**:

```javascript
return errorResponse(400, 'Missing required field: email', null, headers);
return errorResponse(404, 'Vehicle not found', null, headers);
return errorResponse(500, 'Internal server error', error.message, headers);
```

---

## 6. DynamoDB Client Setup

**Copy this exactly**:

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'durdle-[table-name]-dev';
```

---

## 7. Complete Handler Template (Admin Endpoint)

**Copy this for new admin Lambdas**:

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { createLogger } from '/opt/nodejs/logger.mjs';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'durdle-[table-name]-dev';

// CORS configuration per ADMIN_ENDPOINT_STANDARD.md
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

  logger.info({
    event: 'lambda_invocation',
    httpMethod: event.httpMethod,
    path: event.path,
  }, '[Lambda Name] invoked');

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, pathParameters, body: requestBody } = event;
    const resourceId = pathParameters?.resourceId;

    switch (httpMethod) {
      case 'GET':
        if (resourceId) {
          return await getResource(resourceId, headers, logger);
        }
        return await listResources(headers, logger);

      case 'POST':
        return await createResource(requestBody, headers, logger);

      case 'PUT':
        if (!resourceId) {
          return errorResponse(400, 'resourceId is required', null, headers);
        }
        return await updateResource(resourceId, requestBody, headers, logger);

      case 'DELETE':
        if (!resourceId) {
          return errorResponse(400, 'resourceId is required', null, headers);
        }
        return await deleteResource(resourceId, headers, logger);

      default:
        return errorResponse(405, 'Method not allowed', null, headers);
    }
  } catch (error) {
    logger.error({
      event: 'lambda_error',
      errorMessage: error.message,
      errorStack: error.stack,
    }, 'Unhandled error in Lambda');
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

// Implement these functions based on your resource
async function listResources(headers, logger) { /* ... */ }
async function getResource(resourceId, headers, logger) { /* ... */ }
async function createResource(requestBody, headers, logger) { /* ... */ }
async function updateResource(resourceId, requestBody, headers, logger) { /* ... */ }
async function deleteResource(resourceId, headers, logger) { /* ... */ }

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
```

---

## 8. Authentication Pattern

**Current architecture**: Admin endpoints do NOT validate JWT in Lambda. Authentication is handled by:
1. Frontend middleware checks session before making API calls
2. API Gateway routes are not publicly accessible without frontend

**Future consideration**: May add API Gateway Cognito authorizer for defense in depth.

**What this means**: Do NOT add JWT validation code to admin Lambdas unless CTO explicitly requests it.

---

## Reference Implementations

When in doubt, copy from these canonical implementations:

| Pattern | Reference Lambda |
|---------|------------------|
| Admin CORS | `admin-auth/index.mjs` lines 18-35 |
| Structured Logging | `pricing-manager/index.mjs` |
| CRUD Operations | `pricing-manager/index.mjs` |
| Zod Validation | `pricing-manager/index.mjs` |
| Dual CORS | `feedback-manager/index.mjs` |

---

## Checklist Before Deployment

- [ ] CORS uses `getHeaders(origin)` pattern (not hardcoded `*` for admin)
- [ ] Logger created with `createLogger(event, context)`
- [ ] All log statements use `logger.info/warn/error` (not console.log)
- [ ] OPTIONS handler returns early with headers
- [ ] Error responses include headers parameter
- [ ] DynamoDB client uses `eu-west-2` region

---

**Document Owner**: CTO
**Last Updated**: December 8, 2025
