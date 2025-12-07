# Lambda Deployment Guide - Durdle Platform

**Last Updated**: December 6, 2025 (Updated for Lambda Layers)
**Owner**: CTO
**Audience**: Backend Team

**⚠️ IMPORTANT: This is a detailed reference guide. For quick start, see [BACKEND_TEAM_START_HERE.md](../../durdle-serverless-api/BACKEND_TEAM_START_HERE.md)**

---

## Current Deployment Method

**Status**: Manual deployment via AWS CLI
- SAM/CloudFormation templates exist but are NOT currently used
- GitHub Actions auto-deploy is DISABLED during active development
- Each Lambda must be manually packaged and deployed
- **Lambda Layers are used** to share code across functions

---

## Lambda Layer Architecture (NEW - Dec 6, 2025)

### What Are Lambda Layers?

Lambda Layers allow us to share code across multiple Lambda functions without duplicating it in each deployment package.

**Current Layer**: `durdle-common-layer:2`
**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:2`
**Contains**:
- `nodejs/logger.mjs` - Structured logging utility
- `nodejs/node_modules/pino` - Pino logging framework

**Why This Matters**:
- ✅ Reduces deployment package size (14MB → <1MB for some Lambdas)
- ✅ Centralizes logger updates (update layer once, all Lambdas benefit)
- ✅ Faster deployments (no need to upload node_modules every time)

### How Lambdas Import from Layers

**Layer files are mounted at `/opt/nodejs/` in Lambda runtime**:

```javascript
// Import from layer
import { createLogger } from '/opt/nodejs/logger.mjs';

// NOT from local directory
// import { createLogger } from './logger.mjs'; ← WRONG
```

---

## quotes-calculator Lambda - Current Structure

### Files to Include in Deployment ZIP

**Required Source Files**:
- `index.mjs` - Main Lambda handler
- `validation.mjs` - Zod schema validation
- `pricing-engine.mjs` - Pure pricing calculation functions
- `package.json` - Dependencies manifest
- `package-lock.json` - Locked dependency versions
- `node_modules/` - All installed dependencies

**Files to EXCLUDE from Deployment**:
- ❌ `logger.mjs` - **NOW IN LAMBDA LAYER** (do NOT include)
- ❌ `tests/` - Jest test files (dev only)
- ❌ `coverage/` - Test coverage reports (dev only)
- ❌ `jest.config.mjs` - Jest configuration (dev only)
- ❌ `test-payload.json` - Test data (dev only)
- ❌ `*.zip` - Old deployment packages

### Why This Matters

The Lambda runtime expects files at the **root** of the ZIP package:
```
quotes-calculator.zip
├── index.mjs
├── validation.mjs
├── pricing-engine.mjs
├── package.json
├── package-lock.json
└── node_modules/
    └── ... (all deps)

Layer provides:
/opt/nodejs/logger.mjs          ← ACCESSED FROM LAYER
/opt/nodejs/node_modules/pino   ← ACCESSED FROM LAYER
```

**NOT** in subdirectories like:
```
quotes-calculator.zip
└── coverage/           ← WRONG - bloats package
└── tests/              ← WRONG - not needed at runtime
└── logger.mjs          ← WRONG - now in layer
```

---

## Deployment Commands

### Step 1: Navigate to Function Directory

```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\quotes-calculator"
```

### Step 2: Install/Update Dependencies

```bash
npm install
```

This ensures `node_modules` is up to date with `pino` and all other dependencies.

### Step 3: Create Deployment Package

**Windows (PowerShell)** - UPDATED FOR LAMBDA LAYERS:
```powershell
powershell -Command "Compress-Archive -Path index.mjs,validation.mjs,pricing-engine.mjs,package.json,package-lock.json,node_modules -DestinationPath function.zip -Force"
```

**Important Notes**:
- ❌ DO NOT include `logger.mjs` (it's in the Lambda Layer)
- This will take 30-60 seconds (node_modules has 15K+ files)
- The ZIP will be approximately 14MB
- DO NOT include `tests/`, `coverage/`, or `jest.config.mjs`

### Step 4: Verify Lambda Layer Attachment (CRITICAL)

**If the Lambda imports from `/opt/nodejs/`, verify the layer is attached**:

```bash
aws lambda get-function-configuration \
  --function-name quotes-calculator-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

**Expected output**:
```json
["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:2"]
```

**If layer is missing**, attach it:
```bash
aws lambda update-function-configuration \
  --function-name quotes-calculator-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:2 \
  --region eu-west-2
```

### Step 5: Deploy to AWS

```bash
aws lambda update-function-code \
  --function-name quotes-calculator-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

Expected output:
```json
{
  "FunctionName": "quotes-calculator-dev",
  "CodeSize": 14567890,
  "LastModified": "2025-12-06T20:27:00.000+0000"
}
```

### Step 6: Verify Deployment

**Test the Lambda**:
```bash
aws lambda invoke \
  --function-name quotes-calculator-dev \
  --region eu-west-2 \
  --payload file://test-payload.json \
  --cli-binary-format raw-in-base64-out \
  response.json
```

**Check CloudWatch Logs for Structured JSON**:
```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/quotes-calculator-dev" \
  --region eu-west-2 \
  --since 5m \
  --format short
```

Expected log format:
```json
{
  "level": "INFO",
  "time": "2025-12-06T20:27:58.086Z",
  "service": "quotes-calculator",
  "environment": "dev",
  "functionName": "quotes-calculator-dev",
  "awsRequestId": "afae8e42-04cf-4220-9acd-a9bfcb626135",
  "event": "lambda_invocation",
  "httpMethod": "POST",
  "path": "/v1/quotes",
  "msg": "Quote calculator invoked"
}
```

If you see this JSON structure, deployment is successful!

---

## Common Deployment Errors

### Error 1: "Runtime.ImportModuleError: Error: Cannot find module 'index'"

**Cause**: ZIP package has wrong directory structure or missing files

**Fix**:
1. Verify ZIP contents: `unzip -l function.zip | grep -E "\.mjs$"`
2. Ensure files are at root, not in subdirectories
3. Recreate ZIP with correct file list

### Error 2: "Cannot find module 'pino'"

**Cause**: `node_modules` not included in deployment ZIP

**Fix**:
1. Run `npm install` in function directory
2. Verify `node_modules/pino` exists
3. Include `node_modules/` in ZIP command

### Error 3: "Cannot find module './logger.mjs'"

**Cause**: `logger.mjs` not included in deployment ZIP

**Fix**:
1. Add `logger.mjs` to the Compress-Archive command
2. Verify file exists: `ls -la logger.mjs`
3. Redeploy with updated ZIP

---

## File Dependencies (quotes-calculator)

```
index.mjs
├── imports validation.mjs
├── imports logger.mjs          ← NEW DEPENDENCY
└── imports pricing-engine.mjs

logger.mjs
└── imports pino (from node_modules)

validation.mjs
└── imports zod (from node_modules)

pricing-engine.mjs
└── no external dependencies (pure functions)
```

**Translation for Backend Team**:
- If you deploy `index.mjs`, you MUST also deploy `logger.mjs` or the Lambda will crash
- Always include ALL .mjs files when deploying quotes-calculator

---

## Deployment Checklist

Before deploying any Lambda function:

- [ ] Navigate to function directory
- [ ] Run `npm install` to ensure dependencies are current
- [ ] Identify ALL .mjs files in the directory (use `ls *.mjs`)
- [ ] Create ZIP with ALL .mjs files + package.json + package-lock.json + node_modules
- [ ] Verify ZIP contents with `unzip -l function.zip`
- [ ] Deploy ZIP to Lambda
- [ ] Test Lambda with sample payload
- [ ] Check CloudWatch logs for errors
- [ ] If structured logging is enabled, verify JSON log format

---

## Current State (Lambda Layers Implemented - Dec 6, 2025)

Lambda Layers are NOW IN USE:

**Current Architecture**:
```
ZIP Package: index.mjs + validation.mjs + pricing-engine.mjs + node_modules (14MB)
Layer 1 (durdle-common-layer:2): logger.mjs + pino (365KB)
```

**Future Optimization** (when all Lambdas use layer):
```
ZIP Package: index.mjs + validation.mjs + pricing-engine.mjs + minimal node_modules (<1MB)
Layer 1: logger.mjs + pino
Layer 2: zod + other shared deps
Layer 3: @aws-sdk packages (built into Lambda runtime, may not need)
```

**Benefits Already Achieved**:
- ✅ Centralized logger updates (update layer once, all Lambdas benefit)
- ✅ No need to include logger.mjs in every deployment
- ✅ Foundation for further optimization

**Remaining Optimization**:
- Remove Pino from individual package.json files (save ~14MB per Lambda)
- Create additional layers for shared dependencies

---

## Environment Variables

All Lambda functions use these environment variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| AWS_REGION | eu-west-2 | AWS region |
| ENVIRONMENT | dev | Environment name (for logs) |
| LOG_LEVEL | info | Pino log level (debug/info/warn/error) |
| TABLE_NAME | durdle-quotes-dev | DynamoDB table for quotes |
| PRICING_TABLE_NAME | durdle-pricing-config-dev | DynamoDB table for pricing |
| FIXED_ROUTES_TABLE_NAME | durdle-fixed-routes-dev | DynamoDB table for fixed routes |
| GOOGLE_MAPS_SECRET_NAME | prod/google-maps-api-key | Secrets Manager secret |

**Note**: These are set in the Lambda configuration, NOT in the deployment package.

---

## Quick Reference - All Commands (UPDATED FOR LAMBDA LAYERS)

```bash
# 1. Navigate to function
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\quotes-calculator"

# 2. Install dependencies
npm install

# 3. Create deployment ZIP (NO LONGER INCLUDES logger.mjs)
powershell -Command "Compress-Archive -Path index.mjs,validation.mjs,pricing-engine.mjs,package.json,package-lock.json,node_modules -DestinationPath function.zip -Force"

# 4. Verify Lambda Layer attached
aws lambda get-function-configuration --function-name quotes-calculator-dev --region eu-west-2 --query 'Layers[*].Arn'

# 5. Attach layer if missing
aws lambda update-function-configuration --function-name quotes-calculator-dev --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:2 --region eu-west-2

# 6. Deploy to AWS
aws lambda update-function-code --function-name quotes-calculator-dev --zip-file fileb://function.zip --region eu-west-2

# 7. Test deployment
aws lambda invoke --function-name quotes-calculator-dev --region eu-west-2 --payload file://test-payload.json --cli-binary-format raw-in-base64-out response.json

# 8. Check logs
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/quotes-calculator-dev" --region eu-west-2 --since 5m --format short
```

---

**Document Owner**: CTO
**Last Updated**: December 6, 2025 (Updated for Lambda Layers)
**Next Review**: After all Lambdas have STRUCTURE.md files

---

**⚠️ CRITICAL REMINDER**: Read [BACKEND_TEAM_START_HERE.md](../../durdle-serverless-api/BACKEND_TEAM_START_HERE.md) before deploying ANY Lambda function.
