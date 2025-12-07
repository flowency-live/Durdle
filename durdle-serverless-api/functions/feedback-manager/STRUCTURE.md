# feedback-manager Lambda - Deployment Structure

**Last Updated**: December 6, 2025 (Lambda Layer Implemented)
**Lambda Name**: feedback-manager-dev
**Runtime**: Node.js 20.x (arm64)
**Lambda Layer**: durdle-common-layer:3 <- **REQUIRED!**

---

## ⚡ CRITICAL: Lambda Layer Required

This function uses a Lambda Layer for shared utilities.

**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3`
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
- ❌ `feedback-manager.zip` - Old deployment packages
- ❌ `logger.mjs` - **NOW IN LAMBDA LAYER** (do NOT include in deployment ZIP)

---

## File Dependencies (Import Chain)

```
index.mjs
├── imports @aws-sdk/client-dynamodb (from deployment node_modules)
├── imports @aws-sdk/lib-dynamodb (from deployment node_modules)
└── imports /opt/nodejs/logger.mjs (PROVIDED BY LAYER)

/opt/nodejs/logger.mjs (Lambda Layer durdle-common-layer:3)
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
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\feedback-manager"
npm install
```

### 2. Create Deployment ZIP (NO LONGER INCLUDES logger.mjs)
```powershell
powershell -Command "Compress-Archive -Path index.mjs,package.json,package-lock.json,node_modules -DestinationPath feedback-manager.zip -Force"
```

**Important**:
- This takes 15-30 seconds (node_modules has ~10K files)
- logger.mjs is NO LONGER included (it's in the layer)
- Only 1 .mjs file now: index

### 3. Verify Lambda Layer is Attached
```bash
aws lambda get-function-configuration \
  --function-name feedback-manager-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

**Expected Output**: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3"]`

**If layer is missing**, attach it:
```bash
aws lambda update-function-configuration \
  --function-name feedback-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3 \
  --region eu-west-2
```

### 4. Deploy Code to AWS
```bash
aws lambda update-function-code \
  --function-name feedback-manager-dev \
  --zip-file fileb://feedback-manager.zip \
  --region eu-west-2
```

### 5. Verify Deployment
```bash
# Check CloudWatch logs
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/feedback-manager-dev" \
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
  "time": "2025-12-06T21:59:00.000Z",
  "environment": "dev",
  "functionName": "feedback-manager-dev",
  "awsRequestId": "abc-123-def-456",
  "event": "lambda_invocation",
  "httpMethod": "POST",
  "path": "/v1/feedback",
  "msg": "Feedback manager Lambda invoked"
}
```

**CRUD Operation Events**:
- `feedback_list_start` / `feedback_list_success` - List all feedback
- `feedback_get_start` / `feedback_get_success` / `feedback_get_not_found` - Get single feedback
- `feedback_create_start` / `feedback_create_success` - Create feedback (public endpoint)
- `feedback_update_start` / `feedback_update_success` / `feedback_update_not_found` / `feedback_update_no_fields` - Update feedback (admin)
- `feedback_delete_start` / `feedback_delete_success` / `feedback_delete_not_found` - Delete feedback (admin)
- `validation_error` - Field validation failure with details
- `dynamodb_operation` - Database operation tracking

If you see plain console.log output instead, **structured logging layer is NOT working**.

---

## Deployment Checklist

Before deploying, verify:

- [ ] Read this STRUCTURE.md file completely
- [ ] Ran `npm install` to ensure node_modules is current
- [ ] Created ZIP with 1 .mjs file (index) + package.json + package-lock.json + node_modules
- [ ] Did NOT include logger.mjs (it's in the layer)
- [ ] Verified layer is attached: `aws lambda get-function-configuration --function-name feedback-manager-dev --query 'Layers[*].Arn'`
- [ ] Deployed to feedback-manager-dev (not prod)
- [ ] Checked CloudWatch logs for JSON format
- [ ] Verified CRUD operations log correctly

---

## Common Errors & Fixes

### Error: "Cannot find module '/opt/nodejs/logger.mjs'"
**Cause**: Lambda Layer not attached to function
**Fix**: Run:
```bash
aws lambda update-function-configuration \
  --function-name feedback-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3 \
  --region eu-west-2
```

### Error: "Cannot find module 'pino'"
**Cause**: node_modules not included in ZIP OR layer not attached
**Fix**:
1. Verify layer is attached (see above)
2. Run `npm install` then include `node_modules` in ZIP

### ZIP file is 0 bytes
**Cause**: PowerShell Compress-Archive interrupted or failed
**Fix**: Wait 30 seconds for compression to complete, check file size: `ls -lh feedback-manager.zip`

---

## Current Structure Status

**Source Files in Deployment**: 1 .mjs file (index)
**Source Files in Layer**: 1 .mjs file (logger)
**Lambda Layer**: durdle-common-layer:3 (365KB)
**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3`
**Deployment Package Size**: ~3.3MB
**Structured Logging**: ✅ Deployed via Lambda Layer (Pino + logger.mjs)
**Input Validation**: Manual validation (type, status fields)

---

## NPM Dependencies

**Runtime Dependencies**:
```json
{
  "@aws-sdk/client-dynamodb": "^3.0.0",
  "@aws-sdk/lib-dynamodb": "^3.0.0",
  "pino": "^10.1.0"
}
```

**Note**: Pino is currently in both the deployment package AND the layer. Future optimization will remove Pino from package.json.

---

## Environment Variables (Set in Lambda Config)

These are NOT in the deployment package - they're configured in AWS Lambda:

| Variable | Value | Purpose |
|----------|-------|---------|
| AWS_REGION | eu-west-2 | AWS region |
| FEEDBACK_TABLE_NAME | durdle-feedback-dev | DynamoDB feedback table |

---

## Feedback CRUD Operations

**Endpoints**:
- `GET /v1/admin/feedback` - List all feedback (admin)
- `GET /v1/admin/feedback/{feedbackId}` - Get single feedback (admin)
- `POST /v1/feedback` - Create feedback (public - wildcard CORS)
- `PUT /v1/admin/feedback/{feedbackId}` - Update feedback (admin)
- `DELETE /v1/admin/feedback/{feedbackId}` - Delete feedback (admin)

**Feedback Types**: Bug, Feature, Copy Change
**Feedback Statuses**: New, Done, Closed

**Public vs Admin Endpoints**:
- Public (`/v1/feedback`): Wildcard CORS for user submissions
- Admin (`/v1/admin/feedback`): Origin-based CORS with credentials

---

**Questions?** Check [BACKEND_TEAM_START_HERE.md](../../BACKEND_TEAM_START_HERE.md)

**Last Deployed**: December 6, 2025 (with Lambda Layer v2)
**Layer Version**: durdle-common-layer:3
**Next Review**: After frontend integration testing
