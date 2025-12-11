# corporate-portal-api Lambda

Corporate portal API - handles dashboard, profile, users, and company management.

## Purpose

Provides authenticated endpoints for corporate portal users to:
- View/update their profile and notification preferences
- View dashboard statistics
- View/update company details (admin only)
- Manage team members (admin only)

## Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | /corporate/me | JWT | Get current user profile |
| PUT | /corporate/me/notifications | JWT | Update notification preferences |
| GET | /corporate/dashboard | JWT | Get dashboard statistics |
| GET | /corporate/company | JWT | Get company details |
| PUT | /corporate/company | JWT (admin) | Update company details |
| GET | /corporate/users | JWT | List team members |
| POST | /corporate/users | JWT (admin) | Add new user (sends invite) |
| PUT | /corporate/users/{userId} | JWT (admin) | Update user role/status |
| DELETE | /corporate/users/{userId} | JWT (admin) | Remove user |

## Authentication

All endpoints require a valid JWT token from corporate-auth Lambda.
Token must be passed in `Authorization: Bearer <token>` header.

**Role-Based Access**:
- `admin`: Full access to all endpoints including user management
- `booker`: Can view profile, dashboard, company, team list. Cannot modify.

## DynamoDB Access

**Table**: `durdle-corporate-dev`

**Read Operations**:
- Get corporate account: `PK = TENANT#001#CORP#corp-001, SK = METADATA`
- Get user: `PK = TENANT#001#CORP#corp-001, SK = USER#user-001`
- Query users: `PK = TENANT#001#CORP#corp-001, SK begins_with USER#`

**Write Operations**:
- Update user notifications
- Update company details
- Create new user
- Update user role/status
- Delete user

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| CORPORATE_TABLE_NAME | durdle-corporate-dev | Corporate data table |
| QUOTES_TABLE_NAME | durdle-quotes-dev | Quotes table (for stats) |
| JWT_SECRET_NAME | durdle/jwt-secret | Secrets Manager secret name |
| SES_FROM_EMAIL | noreply@dorsettransfercompany.co.uk | SES verified sender |
| CORPORATE_PORTAL_URL | https://dorsettransfercompany.co.uk/corporate | Portal base URL |

## CORS Configuration

Allowed origins (DTC website, NOT admin portal):
- `http://localhost:3000`
- `https://dorsettransfercompany.flowency.build`
- `https://dorsettransfercompany.co.uk`
- `https://www.dorsettransfercompany.co.uk`

## Dependencies

- `@aws-sdk/client-dynamodb` - DynamoDB client
- `@aws-sdk/lib-dynamodb` - Document client
- `@aws-sdk/client-ses` - SES for invitation emails
- `@aws-sdk/client-secrets-manager` - JWT secret
- `jsonwebtoken` - JWT verification
- `zod` - Input validation

## Lambda Layer

Uses `durdle-common-layer:4` for:
- `/opt/nodejs/logger.mjs` - Pino structured logging
- `/opt/nodejs/tenant.mjs` - Tenant utilities

## Deployment

### First-time Deployment

```bash
cd c:/VSProjects/_Websites/Durdle/durdle-serverless-api/functions/corporate-portal-api

# Install dependencies
npm install

# Create deployment package
rm -f function.zip
powershell -Command "Compress-Archive -Path index.mjs,validation.mjs,node_modules -DestinationPath function.zip -Force"

# Create Lambda function
aws lambda create-function \
  --function-name corporate-portal-api-dev \
  --runtime nodejs20.x \
  --architectures arm64 \
  --handler index.handler \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --layers "arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4" \
  --environment "Variables={CORPORATE_TABLE_NAME=durdle-corporate-dev,QUOTES_TABLE_NAME=durdle-quotes-dev,JWT_SECRET_NAME=durdle/jwt-secret,SES_FROM_EMAIL=noreply@dorsettransfercompany.co.uk,CORPORATE_PORTAL_URL=https://dorsettransfercompany.co.uk/corporate}" \
  --region eu-west-2
```

### Update Deployment

```bash
cd c:/VSProjects/_Websites/Durdle/durdle-serverless-api/functions/corporate-portal-api

# Create deployment package
rm -f function.zip
powershell -Command "Compress-Archive -Path index.mjs,validation.mjs,node_modules -DestinationPath function.zip -Force"

# Update function code
aws lambda update-function-code \
  --function-name corporate-portal-api-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

## Testing

### Get Profile
```bash
curl https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/corporate/me \
  -H "Authorization: Bearer <jwt-token>"
```

### Get Dashboard
```bash
curl https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/corporate/dashboard \
  -H "Authorization: Bearer <jwt-token>"
```

### List Users
```bash
curl https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/corporate/users \
  -H "Authorization: Bearer <jwt-token>"
```

### Add User (Admin Only)
```bash
curl -X POST https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/corporate/users \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "new@example.com", "name": "New User", "role": "booker"}'
```

## Security Considerations

1. **JWT Validation**: Verifies token type is 'corporate'
2. **Role Checks**: Admin-only endpoints verify user.role === 'admin'
3. **Self-Protection**: Cannot delete yourself
4. **Last Admin Protection**: Cannot remove or demote the last admin
5. **Email Enumeration**: User list only visible to authenticated team members
