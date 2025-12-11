# corporate-auth Lambda

Corporate portal authentication using magic link (passwordless) login.

## Purpose

Handles authentication for the DTC corporate portal:
- Magic link request (sends email via SES)
- Magic link verification (returns JWT)
- Session verification (validates JWT)

## Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /corporate/auth/magic-link | Request magic link email |
| POST | /corporate/auth/verify | Verify token, return JWT |
| GET | /corporate/auth/session | Validate JWT session |

## Authentication Flow

1. User enters email on corporate portal login page
2. POST /corporate/auth/magic-link with `{ email }`
3. Lambda looks up user in durdle-corporate-dev table
4. Lambda creates magic link token (15min TTL, single-use)
5. Lambda sends email via SES with magic link
6. User clicks link -> redirects to /corporate/verify?token=xxx
7. Frontend POST /corporate/auth/verify with `{ token }`
8. Lambda validates token, returns JWT
9. Frontend stores JWT in localStorage
10. All subsequent requests include `Authorization: Bearer <token>`

## JWT Token Structure

```javascript
{
  type: 'corporate',           // Distinguishes from admin JWT
  tenantId: 'TENANT#001',
  corpAccountId: 'corp-001',
  userId: 'user-001',
  email: 'jane@acme.com',
  role: 'admin',               // admin | booker
  userName: 'Jane Smith',
  companyName: 'Acme Corp',
  exp: <8 hours from issue>
}
```

## DynamoDB Access

**Table**: `durdle-corporate-dev`

**Read Operations**:
- Query GSI1 for user by email: `GSI1PK = TENANT#001#CORP_USER_EMAIL, GSI1SK = email`
- Get corporate account: `PK = TENANT#001#CORP#corp-001, SK = METADATA`
- Get user: `PK = TENANT#001#CORP#corp-001, SK = USER#user-001`
- Get magic link: `PK = TENANT#001#MAGIC#token, SK = METADATA`

**Write Operations**:
- Create magic link token (with TTL)
- Update magic link as used
- Update user lastLogin

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| CORPORATE_TABLE_NAME | durdle-corporate-dev | Corporate data table |
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
- `@aws-sdk/client-ses` - SES for sending emails
- `jsonwebtoken` - JWT creation and verification
- `zod` - Input validation

## Lambda Layer

Uses `durdle-common-layer:4` for:
- `/opt/nodejs/logger.mjs` - Pino structured logging
- `/opt/nodejs/tenant.mjs` - Tenant utilities

## Deployment

### Prerequisites

- SES verified sender email (noreply@dorsettransfercompany.co.uk)
- SES production access (out of sandbox) or verified recipient emails
- durdle-corporate-dev table created
- JWT secret in Secrets Manager (durdle/jwt-secret)

### First-time Deployment

```bash
cd c:/VSProjects/_Websites/Durdle/durdle-serverless-api/functions/corporate-auth

# Install dependencies
npm install

# Create deployment package
rm -f function.zip
powershell -Command "Compress-Archive -Path index.mjs,validation.mjs,node_modules -DestinationPath function.zip -Force"

# Create Lambda function
aws lambda create-function \
  --function-name corporate-auth-dev \
  --runtime nodejs20.x \
  --architectures arm64 \
  --handler index.handler \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --layers "arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4" \
  --environment "Variables={CORPORATE_TABLE_NAME=durdle-corporate-dev,JWT_SECRET_NAME=durdle/jwt-secret,SES_FROM_EMAIL=noreply@dorsettransfercompany.co.uk,CORPORATE_PORTAL_URL=https://dorsettransfercompany.co.uk/corporate}" \
  --region eu-west-2
```

### Update Deployment

```bash
cd c:/VSProjects/_Websites/Durdle/durdle-serverless-api/functions/corporate-auth

# Create deployment package
rm -f function.zip
powershell -Command "Compress-Archive -Path index.mjs,validation.mjs,node_modules -DestinationPath function.zip -Force"

# Update function code
aws lambda update-function-code \
  --function-name corporate-auth-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

### API Gateway Routes

After creating the Lambda, add API Gateway routes:

```bash
# Get API Gateway ID
API_ID="qcfd5p4514"

# Get root resource ID
aws apigateway get-resources --rest-api-id $API_ID --region eu-west-2

# Create /corporate resource (if not exists)
# Create /corporate/auth resource
# Create /corporate/auth/magic-link resource
# Create /corporate/auth/verify resource
# Create /corporate/auth/session resource

# Add methods (POST, GET) and Lambda integrations
# See API Gateway section in main documentation
```

## Testing

### Request Magic Link
```bash
curl -X POST https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/corporate/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Verify Token
```bash
curl -X POST https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/corporate/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123..."}'
```

### Check Session
```bash
curl https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/corporate/auth/session \
  -H "Authorization: Bearer <jwt-token>"
```

## Security Considerations

1. **Magic link tokens**: 15-minute TTL, single-use, auto-deleted by DynamoDB TTL
2. **Email enumeration prevention**: Same response whether email exists or not
3. **Rate limiting**: Max 3 magic links per email per hour (future enhancement)
4. **JWT validation**: Token type checked to prevent admin tokens being used
5. **User/account status**: Verified on each session check

## Troubleshooting

### SES Errors
- Check SES is out of sandbox for production
- Verify sender email in SES console
- Check CloudWatch logs for specific SES errors

### Magic Link Not Received
- Check spam folder
- Verify email address in DynamoDB
- Check SES bounce/complaint metrics

### Token Invalid
- Token may be expired (15 min)
- Token may already be used (single-use)
- Check for clock drift issues
