# pricing-manager Lambda - Deployment Structure

**Last Updated**: December 6, 2025 (Lambda Layer Implemented)
**Lambda Name**: pricing-manager-dev
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

### Source Files (2 files - ALL REQUIRED)
- ✅ `index.mjs` - Main Lambda handler (imports logger from LAYER)
- ✅ `surge-rules.mjs` - Surge pricing rules CRUD operations

### Dependencies (3 files - ALL REQUIRED)
- ✅ `package.json` - NPM dependencies manifest
- ✅ `package-lock.json` - Locked dependency versions
- ✅ `node_modules/` - ALL installed packages (run `npm install` first)

---

## ❌ Files to EXCLUDE from Deployment ZIP

### Development Files (NEVER deploy these)
- ❌ `pricing-manager.zip` - Old deployment packages
- ❌ `logger.mjs` - **NOW IN LAMBDA LAYER** (do NOT include in deployment ZIP)

---

## File Dependencies (Import Chain)

```
index.mjs
├── imports ./surge-rules.mjs (REQUIRED in deployment)
├── imports @aws-sdk/client-dynamodb (from deployment node_modules)
├── imports @aws-sdk/lib-dynamodb (from deployment node_modules)
├── imports zod (from deployment node_modules)
└── imports /opt/nodejs/logger.mjs (PROVIDED BY LAYER)

surge-rules.mjs
├── imports @aws-sdk/client-dynamodb (from deployment node_modules)
├── imports @aws-sdk/lib-dynamodb (from deployment node_modules)
├── imports zod (from deployment node_modules)
└── imports /opt/nodejs/logger.mjs (PROVIDED BY LAYER)

/opt/nodejs/logger.mjs (Lambda Layer durdle-common-layer:4)
└── imports pino (from layer node_modules)
```

**Translation**:
- index.mjs imports logger from `/opt/nodejs/logger.mjs` (the layer mount point)
- index.mjs imports surge-rules.mjs for surge pricing operations
- logger.mjs is NO LONGER in the deployment ZIP
- The Lambda Layer MUST be attached or the function will crash

---

## Deployment Commands

### 1. Install Dependencies
```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\pricing-manager"
npm install
```

### 2. Create Deployment ZIP (NO LONGER INCLUDES logger.mjs)
```powershell
powershell -Command "Compress-Archive -Path index.mjs,surge-rules.mjs,package.json,package-lock.json,node_modules -DestinationPath pricing-manager.zip -Force"
```

**Important**:
- This takes 15-30 seconds (node_modules has ~10K files)
- logger.mjs is NO LONGER included (it's in the layer)
- 2 .mjs files now: index, surge-rules

### 3. Verify Lambda Layer is Attached
```bash
aws lambda get-function-configuration \
  --function-name pricing-manager-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

**Expected Output**: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4"]`

**If layer is missing**, attach it:
```bash
aws lambda update-function-configuration \
  --function-name pricing-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --region eu-west-2
```

### 4. Deploy Code to AWS
```bash
aws lambda update-function-code \
  --function-name pricing-manager-dev \
  --zip-file fileb://pricing-manager.zip \
  --region eu-west-2
```

### 5. Verify Deployment
```bash
# Check CloudWatch logs
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/pricing-manager-dev" \
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
  "time": "2025-12-06T21:45:00.000Z",
  "environment": "dev",
  "functionName": "pricing-manager-dev",
  "awsRequestId": "abc-123-def-456",
  "event": "lambda_invocation",
  "httpMethod": "GET",
  "path": "/v1/pricing/vehicles",
  "msg": "Pricing manager Lambda invoked"
}
```

**CRUD Operation Events**:
- `vehicle_list_start` / `vehicle_list_success` - List all vehicles
- `vehicle_get_start` / `vehicle_get_success` / `vehicle_get_not_found` - Get single vehicle
- `vehicle_create_start` / `vehicle_create_success` / `vehicle_create_conflict` - Create vehicle
- `vehicle_update_start` / `vehicle_update_success` / `vehicle_update_not_found` - Update vehicle
- `vehicle_delete_start` / `vehicle_delete_success` / `vehicle_delete_not_found` - Soft delete vehicle
- `validation_error` - Zod validation failure with field details
- `dynamodb_operation` - Database operation tracking

If you see plain console.log output instead, **structured logging layer is NOT working**.

---

## Deployment Checklist

Before deploying, verify:

- [ ] Read this STRUCTURE.md file completely
- [ ] Ran `npm install` to ensure node_modules is current
- [ ] Created ZIP with 2 .mjs files (index, surge-rules) + package.json + package-lock.json + node_modules
- [ ] Did NOT include logger.mjs (it's in the layer)
- [ ] Verified layer is attached: `aws lambda get-function-configuration --function-name pricing-manager-dev --query 'Layers[*].Arn'`
- [ ] Deployed to pricing-manager-dev (not prod)
- [ ] Checked CloudWatch logs for JSON format
- [ ] Verified CRUD operations log correctly

---

## Common Errors & Fixes

### Error: "Cannot find module '/opt/nodejs/logger.mjs'"
**Cause**: Lambda Layer not attached to function
**Fix**: Run:
```bash
aws lambda update-function-configuration \
  --function-name pricing-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --region eu-west-2
```

### Error: "Cannot find module 'pino'" or "Cannot find module 'zod'"
**Cause**: node_modules not included in ZIP OR layer not attached
**Fix**:
1. Verify layer is attached (see above)
2. Run `npm install` then include `node_modules` in ZIP

### ZIP file is 0 bytes
**Cause**: PowerShell Compress-Archive interrupted or failed
**Fix**: Wait 30 seconds for compression to complete, check file size: `ls -lh pricing-manager.zip`

---

## Current Structure Status

**Source Files in Deployment**: 2 .mjs files (index, surge-rules)
**Source Files in Layer**: 1 .mjs file (logger)
**Lambda Layer**: durdle-common-layer:4 (365KB)
**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4`
**Deployment Package Size**: ~4.2MB
**Structured Logging**: ✅ Deployed via Lambda Layer (Pino + logger.mjs)
**Input Validation**: ✅ Zod schemas for create/update operations
**Surge Pricing**: ✅ CRUD operations for surge rules

---

## NPM Dependencies

**Runtime Dependencies**:
```json
{
  "@aws-sdk/client-dynamodb": "^3.700.0",
  "@aws-sdk/lib-dynamodb": "^3.700.0",
  "pino": "^10.1.0",
  "zod": "^3.24.1"
}
```

**Note**: Pino is currently in both the deployment package AND the layer. Future optimization will remove Pino from package.json.

---

## Environment Variables (Set in Lambda Config)

These are NOT in the deployment package - they're configured in AWS Lambda:

| Variable | Value | Purpose |
|----------|-------|---------|
| AWS_REGION | eu-west-2 | AWS region |
| ENVIRONMENT | dev | Environment name (for logs) |
| PRICING_TABLE_NAME | durdle-pricing-config-dev | DynamoDB pricing table |

---

## Vehicle Pricing CRUD Operations

**Endpoints**:
- `GET /v1/pricing/vehicles` - List all vehicles
- `GET /v1/pricing/vehicles/{vehicleId}` - Get single vehicle
- `POST /v1/pricing/vehicles` - Create vehicle
- `PUT /v1/pricing/vehicles/{vehicleId}` - Update vehicle
- `DELETE /v1/pricing/vehicles/{vehicleId}` - Soft delete (set active=false)

**Vehicle Schema**:
- Required: name, description, capacity, baseFare, perMile, perMinute
- Optional: vehicleId, features, active, imageKey, imageUrl, updatedBy
- All pricing fields are validated as non-negative integers
- Capacity must be at least 1

---

## Surge Pricing CRUD Operations

**Endpoints**:
- `GET /admin/pricing/surge` - List all surge rules
- `GET /admin/pricing/surge/{ruleId}` - Get single surge rule
- `POST /admin/pricing/surge` - Create surge rule
- `PUT /admin/pricing/surge/{ruleId}` - Update surge rule
- `DELETE /admin/pricing/surge/{ruleId}` - Delete surge rule
- `GET /admin/pricing/surge/templates` - Get pre-defined templates
- `POST /admin/pricing/surge/templates/{templateId}` - Apply a template

**Rule Types**:
- `specific_dates` - Specific dates (e.g., bank holidays)
- `date_range` - Date range (e.g., school holidays)
- `day_of_week` - Days of week (e.g., weekends)
- `time_of_day` - Time ranges (e.g., night rates)

**Surge Rule Schema**:
- Required: name, ruleType, multiplier (1.0-3.0)
- Type-specific: dates (specific_dates), startDate/endDate (date_range), daysOfWeek (day_of_week), startTime/endTime (time_of_day)
- Optional: priority, isActive

**Multiplier Stacking**: Rules multiply together, capped at 3.0x

---

**Questions?** Check [BACKEND_TEAM_START_HERE.md](../../BACKEND_TEAM_START_HERE.md)

**Last Deployed**: December 6, 2025 (with Lambda Layer v2)
**Layer Version**: durdle-common-layer:4
**Next Review**: After frontend integration testing
