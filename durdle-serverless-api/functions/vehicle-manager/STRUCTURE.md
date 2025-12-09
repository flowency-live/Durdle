# vehicle-manager Lambda - Deployment Structure

**Last Updated**: December 6, 2025 (Lambda Layer Implemented)
**Lambda Name**: vehicle-manager-dev
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
- ❌ `vehicle-manager.zip` - Old deployment packages
- ❌ `logger.mjs` - **NOW IN LAMBDA LAYER** (do NOT include in deployment ZIP)

---

## File Dependencies (Import Chain)

```
index.mjs
├── imports @aws-sdk/client-dynamodb (from deployment node_modules)
├── imports @aws-sdk/lib-dynamodb (from deployment node_modules)
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
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\vehicle-manager"
npm install
```

### 2. Create Deployment ZIP (NO LONGER INCLUDES logger.mjs)
```powershell
powershell -Command "Compress-Archive -Path index.mjs,package.json,package-lock.json,node_modules -DestinationPath vehicle-manager.zip -Force"
```

**Important**:
- This takes 15-30 seconds (node_modules has ~10K files)
- logger.mjs is NO LONGER included (it's in the layer)
- Only 1 .mjs file now: index

### 3. Verify Lambda Layer is Attached
```bash
aws lambda get-function-configuration \
  --function-name vehicle-manager-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

**Expected Output**: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4"]`

**If layer is missing**, attach it:
```bash
aws lambda update-function-configuration \
  --function-name vehicle-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --region eu-west-2
```

### 4. Deploy Code to AWS
```bash
aws lambda update-function-code \
  --function-name vehicle-manager-dev \
  --zip-file fileb://vehicle-manager.zip \
  --region eu-west-2
```

### 5. Verify Deployment
```bash
# Check CloudWatch logs
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/vehicle-manager-dev" \
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
  "time": "2025-12-06T21:49:00.000Z",
  "environment": "dev",
  "functionName": "vehicle-manager-dev",
  "awsRequestId": "abc-123-def-456",
  "event": "lambda_invocation",
  "httpMethod": "GET",
  "path": "/v1/vehicles",
  "msg": "Vehicle manager Lambda invoked"
}
```

**Vehicle List Operation Events**:
- `vehicle_list_request` - Request initiated (includes isPublic flag)
- `dynamodb_operation` - Database scan operation
- `vehicle_list_fetched` - Raw vehicles fetched from DynamoDB
- `vehicle_list_filtered` - Active vehicles filtered (public endpoint only)
- `vehicle_list_success` - Final response prepared
- `invalid_method` - Non-GET request attempted

If you see plain console.log output instead, **structured logging layer is NOT working**.

---

## Deployment Checklist

Before deploying, verify:

- [ ] Read this STRUCTURE.md file completely
- [ ] Ran `npm install` to ensure node_modules is current
- [ ] Created ZIP with 1 .mjs file (index) + package.json + package-lock.json + node_modules
- [ ] Did NOT include logger.mjs (it's in the layer)
- [ ] Verified layer is attached: `aws lambda get-function-configuration --function-name vehicle-manager-dev --query 'Layers[*].Arn'`
- [ ] Deployed to vehicle-manager-dev (not prod)
- [ ] Checked CloudWatch logs for JSON format
- [ ] Verified vehicle list returns correctly

---

## Common Errors & Fixes

### Error: "Cannot find module '/opt/nodejs/logger.mjs'"
**Cause**: Lambda Layer not attached to function
**Fix**: Run:
```bash
aws lambda update-function-configuration \
  --function-name vehicle-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --region eu-west-2
```

### Error: "Cannot find module 'pino'"
**Cause**: node_modules not included in ZIP OR layer not attached
**Fix**:
1. Verify layer is attached (see above)
2. Run `npm install` then include `node_modules` in ZIP

### ZIP file is 0 bytes
**Cause**: PowerShell Compress-Archive interrupted or failed
**Fix**: Wait 30 seconds for compression to complete, check file size: `ls -lh vehicle-manager.zip`

---

## Current Structure Status

**Source Files in Deployment**: 1 .mjs file (index)
**Source Files in Layer**: 1 .mjs file (logger)
**Lambda Layer**: durdle-common-layer:4 (365KB)
**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4`
**Deployment Package Size**: ~3.2MB
**Structured Logging**: ✅ Deployed via Lambda Layer (Pino + logger.mjs)
**Input Validation**: N/A (read-only GET endpoint)

---

## NPM Dependencies

**Runtime Dependencies**:
```json
{
  "@aws-sdk/client-dynamodb": "^3.700.0",
  "@aws-sdk/lib-dynamodb": "^3.700.0",
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
| ENVIRONMENT | dev | Environment name (for logs) |
| PRICING_TABLE_NAME | durdle-pricing-config-dev | DynamoDB pricing table (same as pricing-manager) |

---

## Vehicle Listing Functionality

**Endpoints**:
- `GET /v1/vehicles` - Public endpoint (active vehicles only, no pricing)
- `GET /v1/admin/vehicles` - Admin endpoint (all vehicles, includes pricing)

**Public Response** (no pricing details):
```json
{
  "vehicles": [
    {
      "vehicleId": "uuid",
      "name": "Standard Sedan",
      "description": "Comfortable 4-seater",
      "capacity": 4,
      "features": ["Air conditioning", "GPS"],
      "imageUrl": "https://...",
      "active": true
    }
  ],
  "count": 1
}
```

**Admin Response** (includes pricing):
```json
{
  "vehicles": [
    {
      "vehicleId": "uuid",
      "name": "Standard Sedan",
      "description": "Comfortable 4-seater",
      "capacity": 4,
      "features": ["Air conditioning", "GPS"],
      "baseFare": 500,
      "perMile": 200,
      "perMinute": 50,
      "active": true,
      "imageKey": "vehicles/sedan.jpg",
      "imageUrl": "https://...",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "updatedBy": "admin"
    }
  ],
  "count": 1
}
```

**Sorting**: Vehicles are sorted by capacity (smallest to largest)

---

**Questions?** Check [BACKEND_TEAM_START_HERE.md](../../BACKEND_TEAM_START_HERE.md)

**Last Deployed**: December 6, 2025 (with Lambda Layer v2)
**Layer Version**: durdle-common-layer:4
**Next Review**: After frontend integration testing
