# admin-auth Lambda - Deployment Structure

**Last Updated**: December 6, 2025 (Lambda Layer Implemented)
**Lambda Name**: admin-auth-dev
**Runtime**: Node.js 20.x (arm64)
**Lambda Layer**: durdle-common-layer:4 <- **REQUIRED!**

---

## ⚡ CRITICAL: Lambda Layer Required

This function uses a Lambda Layer for shared utilities.

**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4`
**Layer Contains**: logger.mjs + Pino dependency

If the layer is not attached, the Lambda WILL CRASH with "Cannot find module '/opt/nodejs/logger.mjs'".

---

## ✅ Files to INCLUDE in Deployment ZIP

### Source Files (1 file - REQUIRED)
- ✅ `index.mjs` - Main Lambda handler (imports logger from LAYER)

### Dependencies (3 files - ALL REQUIRED)
- ✅ `package.json` - NPM dependencies manifest
- ✅ `package-lock.json` - Locked dependency versions
- ✅ `node_modules/` - ALL installed packages (run `npm install` first)

---

## ❌ Files to EXCLUDE from Deployment ZIP

### Development Files (NEVER deploy these)
- ❌ `test-session.json` - Test payload (dev only)
- ❌ `response.json` - Test output (dev only)
- ❌ `*.zip` - Old deployment packages
- ❌ `logger.mjs` - **NOW IN LAMBDA LAYER** (do NOT include in deployment ZIP)

---

## File Dependencies (Import Chain)

```
index.mjs
├── imports @aws-sdk/client-dynamodb (from deployment node_modules)
├── imports @aws-sdk/lib-dynamodb (from deployment node_modules)
├── imports @aws-sdk/client-secrets-manager (from deployment node_modules)
├── imports bcryptjs (from deployment node_modules)
├── imports jsonwebtoken (from deployment node_modules)
└── imports /opt/nodejs/logger.mjs (PROVIDED BY LAYER)

/opt/nodejs/logger.mjs (Lambda Layer durdle-common-layer:4)
└── imports pino (from layer node_modules)
```

**Translation**:
- index.mjs imports logger from `/opt/nodejs/logger.mjs` (the layer mount point)
- logger.mjs is NO LONGER in the deployment ZIP
- The Lambda Layer MUST be attached or the function will crash

---

## Deployment Commands

### 1. Install Dependencies
```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\admin-auth"
npm install
```

### 2. Create Deployment ZIP (NO LONGER INCLUDES logger.mjs)
```powershell
powershell -Command "Compress-Archive -Path index.mjs,package.json,package-lock.json,node_modules -DestinationPath admin-auth.zip -Force"
```

**Important**:
- This takes 15-30 seconds (node_modules has ~10K files)
- logger.mjs is NO LONGER included (it's in the layer)
- Only 1 .mjs file now: index

### 3. Verify Lambda Layer is Attached
```bash
aws lambda get-function-configuration \
  --function-name admin-auth-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

**Expected Output**: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4"]`

**If layer is missing**, attach it:
```bash
aws lambda update-function-configuration \
  --function-name admin-auth-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --region eu-west-2
```

### 4. Deploy Code to AWS
```bash
aws lambda update-function-code \
  --function-name admin-auth-dev \
  --zip-file fileb://admin-auth.zip \
  --region eu-west-2
```

### 5. Verify Deployment
```bash
# Test with sample payload
aws lambda invoke \
  --function-name admin-auth-dev \
  --region eu-west-2 \
  --payload file://test-session.json \
  --cli-binary-format raw-in-base64-out \
  response.json

# Check CloudWatch logs
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/admin-auth-dev" \
  --region eu-west-2 \
  --since 5m \
  --format short
```

---

## Expected Log Format (Structured JSON from Layer)

After successful deployment, CloudWatch logs should show structured JSON from the layer:

```json
{
  "level": "INFO",
  "time": "2025-12-06T21:10:49.237Z",
  "service": "quotes-calculator",
  "environment": "dev",
  "functionName": "admin-auth-dev",
  "awsRequestId": "49f1e72a-d178-4185-ad14-16fb2cb02917",
  "event": "lambda_invocation",
  "httpMethod": "GET",
  "path": "/v1/admin/auth/session",
  "msg": "Admin auth Lambda invoked"
}
```

**Security Audit Events**:
- `login_attempt` - User attempting to log in
- `login_failure` - Failed login (reasons: user_not_found, account_disabled, invalid_password)
- `login_success` - Successful authentication
- `logout` - User logged out
- `session_verification_success` - Valid session verified
- `session_verification_failure` - Invalid session (reasons: no_token, account_disabled_or_not_found)
- `session_expired` - JWT token expired
- `invalid_token` - JWT token invalid

If you see plain console.log output instead, **structured logging layer is NOT working**.

**Known Issue**: The `service` field shows "quotes-calculator" instead of "admin-auth" due to hardcoded service name in layer. This is cosmetic only - the `functionName` field correctly identifies the Lambda. Will be fixed in future layer update.

---

## Deployment Checklist

Before deploying, verify:

- [ ] Read this STRUCTURE.md file completely
- [ ] Ran `npm install` to ensure node_modules is current
- [ ] Created ZIP with 1 .mjs file (index) + package.json + package-lock.json + node_modules
- [ ] Did NOT include logger.mjs (it's in the layer)
- [ ] Did NOT include test files (test-session.json, response.json)
- [ ] Verified layer is attached: `aws lambda get-function-configuration --function-name admin-auth-dev --query 'Layers[*].Arn'`
- [ ] Deployed to admin-auth-dev (not prod)
- [ ] Tested with test-session.json
- [ ] Checked CloudWatch logs for JSON format
- [ ] Verified security audit events are logged

---

## Common Errors & Fixes

### Error: "Cannot find module '/opt/nodejs/logger.mjs'"
**Cause**: Lambda Layer not attached to function
**Fix**: Run:
```bash
aws lambda update-function-configuration \
  --function-name admin-auth-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --region eu-west-2
```

### Error: "Cannot find module 'pino'"
**Cause**: node_modules not included in ZIP OR layer not attached
**Fix**:
1. Verify layer is attached (see above)
2. Run `npm install` then include `node_modules` in ZIP

### Error: "Cannot find module './logger.mjs'"
**Cause**: Old version of index.mjs trying to import from local path
**Fix**: Ensure index.mjs line 6 imports from `/opt/nodejs/logger.mjs` not `./logger.mjs`

### Error: "JWT secret unavailable"
**Cause**: Lambda doesn't have permission to access AWS Secrets Manager
**Fix**: Verify IAM role `durdle-lambda-execution-role-dev` has `secretsmanager:GetSecretValue` permission

### ZIP file is 0 bytes
**Cause**: PowerShell Compress-Archive interrupted or failed
**Fix**: Wait 30 seconds for compression to complete, check file size: `ls -lh admin-auth.zip`

---

## Current Structure Status

**Source Files in Deployment**: 1 .mjs file (index)
**Source Files in Layer**: 1 .mjs file (logger)
**Lambda Layer**: durdle-common-layer:4 (365KB)
**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4`
**Deployment Package Size**: ~3.6MB
**Structured Logging**: ✅ Deployed via Lambda Layer (Pino + logger.mjs)
**Security Audit Trail**: ✅ Comprehensive login/session/logout events

---

## NPM Dependencies

**Runtime Dependencies**:
```json
{
  "@aws-sdk/client-dynamodb": "^3.700.0",
  "@aws-sdk/lib-dynamodb": "^3.700.0",
  "@aws-sdk/client-secrets-manager": "^3.700.0",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "pino": "^10.1.0"
}
```

**Note**: Pino is currently in both the deployment package AND the layer. Future optimization will remove Pino from package.json after all Lambdas are migrated to the layer.

---

## Environment Variables (Set in Lambda Config)

These are NOT in the deployment package - they're configured in AWS Lambda:

| Variable | Value | Purpose |
|----------|-------|---------|
| AWS_REGION | eu-west-2 | AWS region |
| ENVIRONMENT | dev | Environment name (for logs) |
| ADMIN_USERS_TABLE_NAME | durdle-admin-users-dev | DynamoDB admin users table |
| JWT_SECRET_NAME | durdle/jwt-secret | Secrets Manager secret for JWT signing |

---

## Authentication Flow

1. **Login** (`POST /v1/admin/auth/login`):
   - Validates username/password
   - Checks user exists and is active in DynamoDB
   - Compares password with bcrypt hash
   - Generates JWT token with 8-hour expiry
   - Sets httpOnly cookie and returns session token

2. **Session Verification** (`GET /v1/admin/auth/session`):
   - Extracts token from Authorization header or Cookie
   - Verifies JWT signature and expiry
   - Checks user still exists and is active
   - Returns user details if valid

3. **Logout** (`POST /v1/admin/auth/logout`):
   - Clears session cookie (sets Max-Age=0)
   - Returns success message

**Security Features**:
- httpOnly cookies (XSS protection)
- Secure flag (HTTPS only)
- SameSite=Strict (CSRF protection)
- 8-hour JWT expiry
- bcrypt password hashing
- Comprehensive audit logging

---

**Questions?** Check [C:\VSProjects\_Websites\Durdle\.documentation\CTO\LAMBDA_DEPLOYMENT_GUIDE.md](../../.documentation/CTO/LAMBDA_DEPLOYMENT_GUIDE.md)

**Last Deployed**: December 6, 2025 (with Lambda Layer)
**Layer Version**: durdle-common-layer:4
**Next Review**: After service name fix in layer
