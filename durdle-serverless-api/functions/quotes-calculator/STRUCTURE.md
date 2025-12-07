# quotes-calculator Lambda - Deployment Structure

**Last Updated**: December 6, 2025 (Layer v3 + Pino Optimization Complete)
**Lambda Name**: quotes-calculator-dev
**Runtime**: Node.js 20.x (arm64)
**Lambda Layer**: durdle-common-layer:3 ← **REQUIRED!**

---

## ⚡ CRITICAL: Lambda Layer Required

This function uses a Lambda Layer for shared utilities.

**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3`
**Layer Contains**: logger.mjs (with logger.log() backward compatibility) + Pino dependency

If the layer is not attached, the Lambda WILL CRASH with "Cannot find module '/opt/nodejs/logger.mjs'".

---

## ✅ Files to INCLUDE in Deployment ZIP

### Source Files (3 files - ALL REQUIRED)
- ✅ `index.mjs` - Main Lambda handler (imports logger from LAYER)
- ✅ `validation.mjs` - Zod schema validation (imports: zod)
- ✅ `pricing-engine.mjs` - Pure pricing calculation functions

### Dependencies (3 files - ALL REQUIRED)
- ✅ `package.json` - NPM dependencies manifest
- ✅ `package-lock.json` - Locked dependency versions
- ✅ `node_modules/` - ALL installed packages (run `npm install` first)

---

## ❌ Files to EXCLUDE from Deployment ZIP

### Development Files (NEVER deploy these)
- ❌ `tests/` - Jest test files (dev only)
- ❌ `coverage/` - Test coverage reports (dev only)
- ❌ `jest.config.mjs` - Jest configuration (dev only)
- ❌ `test-payload.json` - Test data (dev only)
- ❌ `test-same-location.json` - Test data (dev only)
- ❌ `response.json` - Test output (dev only)
- ❌ `validate-deployment.sh` - Pre-flight validation script
- ❌ `*.zip` - Old deployment packages
- ❌ `logger.mjs` - **NOW IN LAMBDA LAYER** (do NOT include in deployment ZIP)

---

## File Dependencies (Import Chain)

```
index.mjs
├── imports ./validation.mjs (REQUIRED in deployment)
├── imports ./pricing-engine.mjs (REQUIRED in deployment)
└── imports /opt/nodejs/logger.mjs (PROVIDED BY LAYER)

/opt/nodejs/logger.mjs (Lambda Layer durdle-common-layer:3)
└── imports pino (from layer node_modules)

validation.mjs
└── imports zod (from deployment node_modules)

pricing-engine.mjs
└── no external dependencies (pure functions)
```

**Translation**:
- index.mjs imports logger from `/opt/nodejs/logger.mjs` (the layer mount point)
- logger.mjs is NO LONGER in the deployment ZIP
- The Lambda Layer MUST be attached or the function will crash

---

## Deployment Commands

### 1. Install Dependencies
```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\quotes-calculator"
npm install
```

### 2. Run Pre-Flight Validation (RECOMMENDED)
```bash
./validate-deployment.sh
```

This checks all required files are present before packaging.

### 3. Create Deployment ZIP (NO LONGER INCLUDES logger.mjs)
```powershell
powershell -Command "Compress-Archive -Path index.mjs,validation.mjs,pricing-engine.mjs,package.json,package-lock.json,node_modules -DestinationPath function.zip -Force"
```

**Important**:
- This takes 30-60 seconds (node_modules has 15K+ files)
- logger.mjs is NO LONGER included (it's in the layer)
- Only 3 .mjs files now: index, validation, pricing-engine

### 4. Verify Lambda Layer is Attached
```bash
aws lambda get-function-configuration \
  --function-name quotes-calculator-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

**Expected Output**: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3"]`

**If layer is missing**, attach it:
```bash
aws lambda update-function-configuration \
  --function-name quotes-calculator-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3 \
  --region eu-west-2
```

### 5. Deploy Code to AWS
```bash
aws lambda update-function-code \
  --function-name quotes-calculator-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

### 6. Verify Deployment
```bash
# Test with sample payload
aws lambda invoke \
  --function-name quotes-calculator-dev \
  --region eu-west-2 \
  --payload file://test-payload.json \
  --cli-binary-format raw-in-base64-out \
  response.json

# Check CloudWatch logs
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/quotes-calculator-dev" \
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
  "time": "2025-12-06T20:58:43.971Z",
  "service": "quotes-calculator",
  "environment": "dev",
  "functionName": "quotes-calculator-dev",
  "awsRequestId": "95222ab3-a044-46a3-8037-a6b74b9359c2",
  "event": "lambda_invocation",
  "httpMethod": "POST",
  "path": "/v1/quotes",
  "msg": "Quote calculator invoked"
}
```

If you see plain console.log output instead, **structured logging layer is NOT working**.

---

## Deployment Checklist

Before deploying, verify:

- [ ] Read this STRUCTURE.md file completely
- [ ] Ran `npm install` to ensure node_modules is current
- [ ] Ran `./validate-deployment.sh` (optional but recommended)
- [ ] Listed .mjs files: `ls *.mjs` (should show 3 files: index, validation, pricing-engine)
- [ ] Created ZIP with 3 .mjs files + package.json + package-lock.json + node_modules
- [ ] Did NOT include logger.mjs (it's in the layer)
- [ ] Did NOT include tests/, coverage/, or jest.config.mjs
- [ ] Verified layer is attached: `aws lambda get-function-configuration --function-name quotes-calculator-dev --query 'Layers[*].Arn'`
- [ ] Deployed to quotes-calculator-dev (not prod)
- [ ] Tested with test-payload.json
- [ ] Checked CloudWatch logs for JSON format
- [ ] Verified no ERROR logs in CloudWatch

---

## Common Errors & Fixes

### Error: "Cannot find module '/opt/nodejs/logger.mjs'"
**Cause**: Lambda Layer not attached to function
**Fix**: Run:
```bash
aws lambda update-function-configuration \
  --function-name quotes-calculator-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3 \
  --region eu-west-2
```

### Error: "Cannot find module 'pino'"
**Cause**: node_modules not included in ZIP OR layer not attached
**Fix**:
1. Verify layer is attached (see above)
2. Run `npm install` then include `node_modules` in ZIP

### Error: "Cannot find module './logger.mjs'"
**Cause**: Old version of index.mjs trying to import from local path
**Fix**: Ensure index.mjs line 7-16 imports from `/opt/nodejs/logger.mjs` not `./logger.mjs`

### Error: "Cannot read properties of undefined (reading 'map')"
**Cause**: Old version of validation.mjs deployed
**Fix**: Ensure validation.mjs line 65 has: `const zodErrors = result.error?.errors || result.error?.issues || [];`

### ZIP file is 0 bytes
**Cause**: PowerShell Compress-Archive interrupted or failed
**Fix**: Wait 60 seconds for compression to complete, check file size: `ls -lh function.zip`

---

## Current Structure Status

**Source Files in Deployment**: 3 .mjs files (index, validation, pricing-engine)
**Source Files in Layer**: 1 .mjs file (logger)
**Lambda Layer**: durdle-common-layer:3 (373KB)
**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3`
**Test Coverage**: 100% on pricing-engine.mjs (32 tests)
**Structured Logging**: ✅ Deployed via Lambda Layer v3 (Pino + logger.mjs with logger.log() support)
**Input Validation**: ✅ Deployed (Zod + validation.mjs)
**Deployment Package Size**: 13.4 MB (optimized - Pino removed from package.json, Dec 6 2025)

---

## NPM Dependencies

**Runtime Dependencies** (in deployment package):
```json
{
  "@aws-sdk/client-dynamodb": "^3.700.0",
  "@aws-sdk/client-secrets-manager": "^3.700.0",
  "@aws-sdk/lib-dynamodb": "^3.700.0",
  "axios": "^1.7.0",
  "zod": "^4.1.13"
}
```

**Dev Dependencies** (NOT deployed):
```json
{
  "@types/jest": "^30.0.0",
  "jest": "^30.2.0"
}
```

**Note**: Pino is ONLY in Lambda Layer v3 (NOT in package.json). This optimization was completed Dec 6, 2025.

---

## Environment Variables (Set in Lambda Config)

These are NOT in the deployment package - they're configured in AWS Lambda:

| Variable | Value | Purpose |
|----------|-------|---------|
| AWS_REGION | eu-west-2 | AWS region |
| ENVIRONMENT | dev | Environment name (for logs) |
| LOG_LEVEL | info | Pino log level |
| TABLE_NAME | durdle-quotes-dev | DynamoDB quotes table |
| PRICING_TABLE_NAME | durdle-pricing-config-dev | DynamoDB pricing table |
| FIXED_ROUTES_TABLE_NAME | durdle-fixed-routes-dev | DynamoDB routes table |
| GOOGLE_MAPS_SECRET_NAME | prod/google-maps-api-key | Secrets Manager secret |

---

**Questions?** Check [C:\VSProjects\_Websites\Durdle\.documentation\CTO\LAMBDA_DEPLOYMENT_GUIDE.md](../../.documentation/CTO/LAMBDA_DEPLOYMENT_GUIDE.md)

**Last Deployed**: December 6, 2025 (Layer v3 + Pino optimization complete)
**Layer Version**: durdle-common-layer:3 (with logger.log() backward compatibility)
**Package Size**: 13.4 MB (optimized)
