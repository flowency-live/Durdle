# Backend Team - Start Here

**Last Updated**: December 8, 2025
**Owner**: CTO
**Purpose**: Single entry point for all backend development on Durdle platform

---

## What Is This Document?

This is your **single source of truth** for backend development. Before touching ANY Lambda function, deployment, or AWS infrastructure, read this document first.

---

## Critical Rules

### 0. ADMIN ENDPOINTS: Read ADMIN_ENDPOINT_STANDARD.md FIRST

**If you are working on ANY `/admin/*` endpoint, you MUST read:**
```
durdle-serverless-api/ADMIN_ENDPOINT_STANDARD.md
```

This document contains **MANDATORY** CORS configuration that prevents browser errors. Failure to follow this standard results in CORS errors in production.

**Key requirement**: Admin endpoints CANNOT use `Access-Control-Allow-Origin: '*'` because the frontend uses `credentials: 'include'`.

---

### 1. NEVER Deploy Without Reading STRUCTURE.md

Every Lambda function has a `STRUCTURE.md` file in its directory. This file lists:
- Exact files to INCLUDE in deployment
- Exact files to EXCLUDE from deployment
- Lambda Layer requirements
- Deployment commands
- Common errors and fixes

**Example**: Before deploying `quotes-calculator`, read:
```
durdle-serverless-api/functions/quotes-calculator/STRUCTURE.md
```

### 2. Lambda Layers Are REQUIRED

**We use Lambda Layers** to share code across functions. Currently deployed layer:

**Layer Name**: `durdle-common-layer`
**Current Version**: 3
**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3`
**Contains**: logger.mjs + Pino dependency (includes logger.log() backward compatibility fix)

**Critical**: If a Lambda imports from `/opt/nodejs/`, it REQUIRES the layer attached or it will crash.

### 3. Do NOT Include Layer Files in Deployment ZIPs

Files that are in Lambda Layers must NOT be in your deployment ZIP:
- ❌ DO NOT include `logger.mjs` in deployment ZIPs
- ✅ DO include all other .mjs files specific to that Lambda

### 4. Follow Deployment Commands Exactly

Each STRUCTURE.md has exact deployment commands. Copy and paste them. Do NOT modify.

---

## Current Lambda Functions

All functions are in `durdle-serverless-api/functions/`:

| Function | Description | Uses Layer? | STRUCTURE.md |
|----------|-------------|-------------|--------------|
| quotes-calculator | Calculate transfer quotes | ✅ Yes (v3) | [STRUCTURE.md](functions/quotes-calculator/STRUCTURE.md) |
| admin-auth | Admin authentication (JWT) | ✅ Yes (v3) | [STRUCTURE.md](functions/admin-auth/STRUCTURE.md) |
| pricing-manager | Manage pricing config | ✅ Yes (v3) | [STRUCTURE.md](functions/pricing-manager/STRUCTURE.md) |
| vehicle-manager | Manage vehicle fleet | ✅ Yes (v3) | [STRUCTURE.md](functions/vehicle-manager/STRUCTURE.md) |
| feedback-manager | Customer feedback | ✅ Yes (v3) | [STRUCTURE.md](functions/feedback-manager/STRUCTURE.md) |
| locations-lookup | Search locations | ✅ Yes (v3) | Not yet created |
| uploads-presigned | S3 presigned URLs | ✅ Yes (v3) | Not yet created |
| document-comments | Quote comments | ✅ Yes (v3) | Not yet created |
| fixed-routes-manager | Fixed route pricing | ✅ Yes (v3) | Not yet created |

**Deployment Status**:
- ✅ **quotes-calculator**: Fully documented, layer attached, structured logging (14 log events), Zod validation, 32 tests
- ✅ **admin-auth**: Fully documented, layer attached, structured logging (security audit trails)
- ✅ **pricing-manager**: Fully documented, layer attached, structured logging (19 log events), Zod validation
- ✅ **vehicle-manager**: Fully documented, layer attached, structured logging (6 log events)
- ✅ **feedback-manager**: Fully documented, layer attached, structured logging (7 log events)
- ⚠️ **locations-lookup**: Layer attached, structured logging deployed (17 log events) - No STRUCTURE.md yet
- ⚠️ **uploads-presigned**: Layer attached, structured logging deployed (7 log events) - No STRUCTURE.md yet
- ⚠️ **document-comments**: Layer attached, structured logging deployed (23 log events) - No STRUCTURE.md yet
- ⚠️ **fixed-routes-manager**: Layer attached, structured logging deployed (43 log events) - No STRUCTURE.md yet

**Summary**: 9/9 Lambdas have Layer v3 attached | 5/9 have STRUCTURE.md documentation | 9/9 have structured logging (130+ total log events)

---

## Deployment Process (Standard)

### Step 1: Read STRUCTURE.md

Navigate to the Lambda directory and open STRUCTURE.md:
```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\[function-name]"
cat STRUCTURE.md
```

### Step 2: Install Dependencies

```bash
npm install
```

This ensures `node_modules` is up to date.

### Step 3: Create Deployment ZIP

Copy the exact command from STRUCTURE.md. It will look like:

```powershell
powershell -Command "Compress-Archive -Path [file-list] -DestinationPath function.zip -Force"
```

**Important**:
- This takes 30-60 seconds (node_modules is large)
- DO NOT interrupt the process
- Verify ZIP size after: `ls -lh function.zip` (should be 3-14MB)

### Step 4: Verify Layer Attachment

If STRUCTURE.md says "Lambda Layer Required", verify it's attached:

```bash
aws lambda get-function-configuration \
  --function-name [function-name]-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

Expected output: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3"]`

If missing, attach it:
```bash
aws lambda update-function-configuration \
  --function-name [function-name]-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3 \
  --region eu-west-2
```

### Step 5: Deploy to AWS

```bash
aws lambda update-function-code \
  --function-name [function-name]-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

### Step 6: Verify Deployment

**Test the Lambda**:
```bash
aws lambda invoke \
  --function-name [function-name]-dev \
  --region eu-west-2 \
  --payload file://test-payload.json \
  --cli-binary-format raw-in-base64-out \
  response.json
```

**Check CloudWatch Logs**:
```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/[function-name]-dev" \
  --region eu-west-2 \
  --since 5m \
  --format short
```

**Look for**:
- ✅ No ERROR logs
- ✅ Structured JSON logs (if logging enabled)
- ✅ Function executed successfully

---

## Structured Logging (Pino)

**Lambdas with structured logging (9/9 - 100% Coverage)**:
1. **quotes-calculator** (14 log events) - Quote calculation, validation, rate limiting
2. **admin-auth** (Security audit trails) - Admin login, JWT, session management
3. **pricing-manager** (19 log events) - Pricing config CRUD, validation
4. **vehicle-manager** (6 log events) - Vehicle fleet CRUD
5. **feedback-manager** (7 log events) - Customer feedback CRUD
6. **locations-lookup** (17 log events) - Google Maps autocomplete, place details, reverse geocoding
7. **uploads-presigned** (7 log events) - S3 presigned URL generation for vehicle images
8. **document-comments** (23 log events) - Document comment CRUD, status tracking
9. **fixed-routes-manager** (43 log events) - Fixed route CRUD, Google Maps Distance Matrix API

**Total**: 130+ structured log events across all backend operations

**How to use structured logging in code**:

```javascript
import { createLogger } from '/opt/nodejs/logger.mjs';

export const handler = async (event, context) => {
  const logger = createLogger(event, context);

  logger.info({
    event: 'lambda_invocation',
    someData: 'value',
  }, 'Human-readable message');

  logger.error({
    event: 'error_occurred',
    errorMessage: error.message,
  }, 'Error message');
};
```

**Expected CloudWatch log format**:
```json
{
  "level": "INFO",
  "time": "2025-12-06T21:17:00.000Z",
  "environment": "dev",
  "functionName": "quotes-calculator-dev",
  "awsRequestId": "abc-123-def-456",
  "event": "lambda_invocation",
  "msg": "Human-readable message"
}
```

---

## Common Deployment Errors

### Error: "Runtime.ImportModuleError: Cannot find module 'index'"

**Cause**: Deployment ZIP has wrong structure or missing files

**Fix**:
1. Read STRUCTURE.md for the Lambda
2. Verify all required .mjs files are listed in Compress-Archive command
3. Recreate ZIP with correct file list

### Error: "Cannot find module '/opt/nodejs/logger.mjs'"

**Cause**: Lambda Layer not attached to function

**Fix**:
```bash
aws lambda update-function-configuration \
  --function-name [function-name]-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3 \
  --region eu-west-2
```

### Error: "Cannot find module 'pino'" or "Cannot find module 'zod'"

**Cause**: `node_modules` not included in deployment ZIP

**Fix**:
1. Run `npm install` in function directory
2. Verify `node_modules/` exists
3. Include `node_modules` in Compress-Archive command

### ZIP file is 0 bytes or very small

**Cause**: PowerShell Compress-Archive interrupted or failed

**Fix**:
1. Wait 60 seconds for compression to complete
2. Check file size: `ls -lh function.zip`
3. If still 0 bytes, delete and recreate

### Error: "CORS header 'Access-Control-Allow-Origin' cannot be '*' when credentials mode is 'include'"

**Cause**: Admin endpoint using wildcard `*` for CORS origin

**Fix**:
1. Read `ADMIN_ENDPOINT_STANDARD.md`
2. Copy CORS code exactly from `admin-auth/index.mjs`
3. Never use `'Access-Control-Allow-Origin': '*'` for admin endpoints
4. Always use specific origin matching: `allowedOrigins.includes(origin) ? origin : allowedOrigins[0]`
5. Always include `'Access-Control-Allow-Credentials': 'true'`

---

## Best Practices

### 1. Always Use STRUCTURE.md

Don't guess what files to include. Read STRUCTURE.md and follow exactly.

### 2. Test Locally First (If Possible)

If the Lambda has tests (`npm test`), run them before deploying.

### 3. Check CloudWatch Logs After Deployment

Don't assume deployment worked. Always verify with CloudWatch logs.

### 4. Never Deploy to Production

All commands deploy to `-dev` functions. Production deployment is CTO-approved only.

### 5. Ask Before Changing Environment Variables

Lambda environment variables are set in AWS console. Don't change without consulting CTO.

---

## AWS Resources Reference

| Resource | Value | Purpose |
|----------|-------|---------|
| Region | eu-west-2 | London data center |
| API Gateway ID | qry0k6pmd0 | API endpoint |
| DynamoDB Tables | durdle-*-dev | All dev tables |
| Lambda Execution Role | durdle-lambda-execution-role-dev | IAM role for Lambdas |
| Lambda Layer | durdle-common-layer:3 | Shared logger utility |

---

## Documentation Hierarchy

Start at this document, then drill down:

```
1. BACKEND_TEAM_START_HERE.md (you are here)
   ├── 2. ADMIN_ENDPOINT_STANDARD.md (MANDATORY for /admin/* endpoints - CORS config)
   ├── 3. functions/[lambda-name]/STRUCTURE.md (deployment guide per Lambda)
   ├── 4. .documentation/CTO/LAMBDA_DEPLOYMENT_GUIDE.md (detailed deployment process)
   └── 5. .documentation/CTO/CODE_AUDIT_AND_REMEDIATION.md (CTO tracking, optional reading)
```

**When deploying**:
1. Read this document first (overview)
2. **If admin endpoint**: Read ADMIN_ENDPOINT_STANDARD.md (CORS config)
3. Read STRUCTURE.md for specific Lambda (exact commands)
4. Follow commands exactly
5. Verify deployment
6. **If admin endpoint**: Test from production URL to verify no CORS errors

---

## Getting Help

**Before asking for help**:
1. Did you read STRUCTURE.md for the Lambda?
2. Did you follow the deployment commands exactly?
3. Did you check CloudWatch logs for error details?

**When asking for help, provide**:
1. Lambda function name
2. Full error message from CloudWatch logs
3. Deployment command you ran
4. Contents of deployment ZIP (`unzip -l function.zip`)

---

## Lambda Layer Details

### Current Layer: durdle-common-layer:3

**What's in the layer**:
- `nodejs/logger.mjs` - Structured logging utility (with logger.log() backward compatibility)
- `nodejs/node_modules/pino` - Pino logging framework

**Layer Coverage**: 9/9 Lambdas (100%)
- All backend Lambda functions now use Layer v3 for consistent observability
- Centralized logging infrastructure achieved (Dec 6, 2025)
- **IMPORTANT**: Pino is ONLY in the Lambda Layer - DO NOT add it to package.json
- Pino was removed from all Lambda package.json files (Dec 6, 2025) to eliminate duplication
- This reduces deployment package sizes by ~500 KB per Lambda
- **Layer v3 Critical Fix**: Added logger.log() method for backward compatibility (Dec 6, 2025 evening)

**How to use in Lambda code**:
```javascript
import { createLogger } from '/opt/nodejs/logger.mjs';
```

**How Lambdas access layer files**:
- Layer files are mounted at `/opt/nodejs/` in Lambda runtime
- Import from `/opt/nodejs/[filename]`, not `./[filename]`

**Layer versioning**:
- Version 1: Initial release (had hardcoded service name bug)
- Version 2: Fixed service name (deployed Dec 6 2025 morning)
- Version 3: Added logger.log() backward compatibility method (current, deployed Dec 6 2025 evening)

**When layer is updated**:
- CTO will publish new version (e.g., version 4)
- All Lambdas must update layer ARN to new version
- STRUCTURE.md files will be updated with new ARN

### Deployment Package Sizes (After Pino Optimization - Dec 6, 2025)

All Lambdas now have optimized packages with Pino removed:

| Lambda | Package Size | Key Dependencies |
|--------|--------------|------------------|
| quotes-calculator | 13.4 MB | AWS SDK, Zod, Axios |
| admin-auth | 3.2 MB | AWS SDK, bcryptjs, jsonwebtoken |
| pricing-manager | 3.7 MB | AWS SDK, Zod |
| vehicle-manager | 2.9 MB | AWS SDK only |
| feedback-manager | 2.9 MB | AWS SDK only |
| locations-lookup | 3.2 MB | AWS SDK, Axios |
| uploads-presigned | 3.3 MB | AWS SDK |
| document-comments | 2.9 MB | AWS SDK, ulid |
| fixed-routes-manager | 3.9 MB | AWS SDK, Axios |

**Note**: AWS SDK v3 accounts for most of the package size (~2.5-3 MB). Pino is provided by Lambda Layer v3.

---

## Quick Reference Commands

### Check Lambda configuration
```bash
aws lambda get-function-configuration --function-name [name]-dev --region eu-west-2
```

### Check Lambda layers
```bash
aws lambda get-function-configuration --function-name [name]-dev --region eu-west-2 --query 'Layers[*].Arn'
```

### Tail CloudWatch logs (live)
```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/[name]-dev" --region eu-west-2 --follow
```

### View recent logs
```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/[name]-dev" --region eu-west-2 --since 10m --format short
```

### List all Lambda functions
```bash
aws lambda list-functions --region eu-west-2 --query 'Functions[?starts_with(FunctionName, `durdle`)].FunctionName'
```

---

**Document Owner**: CTO
**Last Updated**: December 8, 2025 (ADMIN_ENDPOINT_STANDARD.md added)
**Next Review**: After remaining 4 Lambdas have STRUCTURE.md files

**Backend Foundation Status**:
- ✅ 9/9 Lambdas with Lambda Layer v3 (includes logger.log() backward compatibility fix)
- ✅ 9/9 Lambdas with structured logging (130+ log events)
- ✅ 5/9 Lambdas with STRUCTURE.md deployment documentation
- ✅ Pino optimization complete (removed duplication, ~3.6 MB saved across all Lambdas)
- ✅ ADMIN_ENDPOINT_STANDARD.md created (CORS configuration for admin endpoints)
- ⏭️ Next: Create STRUCTURE.md for locations-lookup, uploads-presigned, document-comments, fixed-routes-manager

**Questions?** Consult CTO before deploying if anything is unclear.
