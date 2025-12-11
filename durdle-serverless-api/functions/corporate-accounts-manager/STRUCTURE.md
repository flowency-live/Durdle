# corporate-accounts-manager Lambda

**Last Updated**: December 10, 2025
**Lambda Layer Required**: `durdle-common-layer:4`

---

## Purpose

Admin CRUD operations for corporate accounts. Used by the Durdle admin portal to manage corporate accounts and their users.

---

## Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /admin/corporate | Create corporate account |
| GET | /admin/corporate | List corporate accounts |
| GET | /admin/corporate/{corpId} | Get corporate account details |
| PUT | /admin/corporate/{corpId} | Update corporate account |
| POST | /admin/corporate/{corpId}/users | Add user to account |
| GET | /admin/corporate/{corpId}/users | List users for account |
| PUT | /admin/corporate/{corpId}/users/{userId} | Update user |
| DELETE | /admin/corporate/{corpId}/users/{userId} | Remove user |
| POST | /admin/corporate/{corpId}/invite | Send invite email |

---

## Files to Include in Deployment ZIP

**Required**:
- `index.mjs` - Main Lambda handler
- `validation.mjs` - Zod validation schemas
- `package.json` - Dependencies manifest
- `package-lock.json` - Locked dependency versions
- `node_modules/` - All installed dependencies

**DO NOT Include**:
- `STRUCTURE.md` - This documentation file
- `*.zip` - Old deployment packages
- `tests/` - Test files (if any)

---

## Deployment Commands

### 1. Navigate to Function Directory

```bash
cd "c:/VSProjects/_Websites/Durdle/durdle-serverless-api/functions/corporate-accounts-manager"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Deployment Package

**Windows (PowerShell)**:
```powershell
powershell -Command "Compress-Archive -Path index.mjs,validation.mjs,package.json,package-lock.json,node_modules -DestinationPath function.zip -Force"
```

### 4. Create Lambda Function (First Time Only)

```bash
aws lambda create-function \
  --function-name corporate-accounts-manager-dev \
  --runtime nodejs20.x \
  --architectures arm64 \
  --handler index.handler \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --environment "Variables={CORPORATE_TABLE_NAME=durdle-corporate-dev,AWS_REGION=eu-west-2}" \
  --region eu-west-2
```

### 5. Update Lambda Code (Subsequent Deploys)

```bash
aws lambda update-function-code \
  --function-name corporate-accounts-manager-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

### 6. Verify Lambda Layer Attached

```bash
aws lambda get-function-configuration \
  --function-name corporate-accounts-manager-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

**Expected output**:
```json
["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4"]
```

### 7. Test Deployment

```bash
aws lambda invoke \
  --function-name corporate-accounts-manager-dev \
  --region eu-west-2 \
  --payload '{"httpMethod":"GET","path":"/admin/corporate","headers":{"origin":"https://durdle.flowency.build"}}' \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json
```

### 8. Check Logs

```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/corporate-accounts-manager-dev" \
  --region eu-west-2 \
  --since 5m \
  --format short
```

---

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| CORPORATE_TABLE_NAME | durdle-corporate-dev | DynamoDB table for corporate data |
| CORPORATE_PORTAL_URL | https://dorsettransfercompany.flowency.build/corporate | Base URL for magic links |

---

## DynamoDB Table

**Table**: `durdle-corporate-dev`

**Data Model**:
- `PK: TENANT#001#CORP#corp-001, SK: METADATA` - Corporate account
- `PK: TENANT#001#CORP#corp-001, SK: USER#user-001` - Corporate user
- GSI1: `{tenantId}#CORP` + `STATUS#active#{createdAt}` - List accounts by status
- GSI1: `{tenantId}#EMAIL` + `{email}` - Look up user by email

**TTL Attribute**: `ttl` (for magic link tokens, managed by corporate-auth)

---

## CORS Configuration

Allowed origins (must match exactly):
- `http://localhost:3000`
- `https://durdle.flowency.build`
- `https://durdle.co.uk`

---

## API Gateway Routes (to be configured)

All routes should be added to API Gateway `qcfd5p4514`:

| Route | Method | Integration |
|-------|--------|-------------|
| /admin/corporate | POST | corporate-accounts-manager-dev |
| /admin/corporate | GET | corporate-accounts-manager-dev |
| /admin/corporate/{corpId} | GET | corporate-accounts-manager-dev |
| /admin/corporate/{corpId} | PUT | corporate-accounts-manager-dev |
| /admin/corporate/{corpId}/users | POST | corporate-accounts-manager-dev |
| /admin/corporate/{corpId}/users | GET | corporate-accounts-manager-dev |
| /admin/corporate/{corpId}/users/{userId} | PUT | corporate-accounts-manager-dev |
| /admin/corporate/{corpId}/users/{userId} | DELETE | corporate-accounts-manager-dev |
| /admin/corporate/{corpId}/invite | POST | corporate-accounts-manager-dev |

**Note**: Don't forget OPTIONS methods for CORS preflight.

---

## Dependencies

- `@aws-sdk/client-dynamodb` - DynamoDB client
- `@aws-sdk/lib-dynamodb` - DynamoDB document client
- `zod` - Schema validation

**From Lambda Layer**:
- `logger.mjs` - Pino structured logging
- `tenant.mjs` - Multi-tenant utilities

---

**Document Owner**: CTO
**Last Updated**: December 10, 2025
