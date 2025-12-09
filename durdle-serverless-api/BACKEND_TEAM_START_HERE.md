# Backend Team - Start Here

**Last Updated**: December 9, 2025
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
**Current Version**: 5
**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5`
**Contains**:
- `logger.mjs` - Structured logging with Pino (includes logger.log() backward compatibility)
- `tenant.mjs` - Multi-tenant utilities (Phase 0.5 - see Tenant Awareness section below)
- `node_modules/pino` - Pino logging framework

**Critical**: If a Lambda imports from `/opt/nodejs/`, it REQUIRES the layer attached or it will crash.

### 3. Do NOT Include Layer Files in Deployment ZIPs

Files that are in Lambda Layers must NOT be in your deployment ZIP:
- DO NOT include `logger.mjs` in deployment ZIPs
- DO NOT include `tenant.mjs` in deployment ZIPs
- DO include all other .mjs files specific to that Lambda

### 4. Follow Deployment Commands Exactly

Each STRUCTURE.md has exact deployment commands. Copy and paste them. Do NOT modify.

---

## Current Lambda Functions

All functions are in `durdle-serverless-api/functions/`:

| Function | Description | Layer | Tenant-Aware | STRUCTURE.md |
|----------|-------------|-------|--------------|--------------|
| api-gateway-authorizer | JWT validation for API Gateway | No | N/A | [STRUCTURE.md](functions/api-gateway-authorizer/STRUCTURE.md) |
| quotes-calculator | Calculate transfer quotes | v5 | Yes | [STRUCTURE.md](functions/quotes-calculator/STRUCTURE.md) |
| quotes-manager | Admin quotes CRUD + export | v5 | Yes | [STRUCTURE.md](functions/quotes-manager/STRUCTURE.md) |
| bookings-manager | Booking management | v5 | Yes | Not yet created |
| admin-auth | Admin authentication (JWT) | v5 | Yes | [STRUCTURE.md](functions/admin-auth/STRUCTURE.md) |
| pricing-manager | Manage pricing config | v5 | Yes | [STRUCTURE.md](functions/pricing-manager/STRUCTURE.md) |
| vehicle-manager | Manage vehicle fleet | v5 | Yes | [STRUCTURE.md](functions/vehicle-manager/STRUCTURE.md) |
| feedback-manager | Customer feedback | v5 | Yes | [STRUCTURE.md](functions/feedback-manager/STRUCTURE.md) |
| locations-lookup | Search locations | v5 | Yes (logging) | Not yet created |
| uploads-presigned | S3 presigned URLs | v5 | Yes | Not yet created |
| document-comments | Quote comments | v5 | Yes | Not yet created |
| fixed-routes-manager | Fixed route pricing | v5 | Yes | Not yet created |

**Deployment Status**:
- **api-gateway-authorizer**: Fully documented, validates JWT for all admin routes
- **quotes-calculator**: Fully documented, layer v5, tenant-aware, Zod validation, 32 tests
- **quotes-manager**: Fully documented, layer v5, tenant-aware queries/exports
- **bookings-manager**: Layer v5, tenant-aware bookings - needs STRUCTURE.md
- **admin-auth**: Fully documented, layer v5, tenant-aware, tenantId in JWT tokens
- **pricing-manager**: Fully documented, layer v5, tenant-aware pricing CRUD
- **vehicle-manager**: Fully documented, layer v5, tenant-aware vehicle listing
- **feedback-manager**: Fully documented, layer v5, tenant-aware feedback CRUD
- **locations-lookup**: Layer v5, tenant context logging (no DynamoDB) - needs STRUCTURE.md
- **uploads-presigned**: Layer v5, tenant-prefixed S3 paths - needs STRUCTURE.md
- **document-comments**: Layer v5, tenant-prefixed document paths - needs STRUCTURE.md
- **fixed-routes-manager**: Layer v5, tenant-aware routes CRUD - needs STRUCTURE.md

**Summary**: 11 Lambdas total | All data Lambdas have Layer v5 + tenant awareness | 8/11 have STRUCTURE.md

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

Expected output: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5"]`

If missing, attach it:
```bash
aws lambda update-function-configuration \
  --function-name [function-name]-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5 \
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

**CRITICAL: Local code changes do NOT automatically deploy to AWS.**

After making local code changes, you MUST:
1. Create deployment ZIP
2. Run `aws lambda update-function-code`
3. Verify deployment completed

**Verify deployment timestamp**:
```bash
aws lambda get-function-configuration --function-name [function-name]-dev --region eu-west-2 --query '{LastModified:LastModified,LastUpdateStatus:LastUpdateStatus}'
```

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
- ✅ LastModified timestamp matches your deployment time

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

## Tenant Awareness (Phase 0.5)

**Status**: Implemented December 9, 2025
**Documentation**: [MULTI_TENANT_ARCHITECTURE.md](../.documentation/CTO/MULTI_TENANT_ARCHITECTURE.md)

### What Is This?

Phase 0.5 implements "lightweight tenant-awareness" across all Lambda functions. This prepares the platform for multi-tenant operation when Client #2 arrives, without requiring full multi-tenancy infrastructure now.

**Key Principle**: All NEW records include tenant context. Existing data unchanged (backward compatible).

### Current Tenant

All functions currently use hardcoded tenant: `TENANT#001`

This will be replaced by API Gateway authorizer context when Client #2 onboards.

### tenant.mjs Utilities (Lambda Layer v4)

```javascript
import { getTenantId, buildTenantPK, buildTenantS3Key, logTenantContext, validateTenantAccess } from '/opt/nodejs/tenant.mjs';

// Get current tenant (hardcoded until authorizer built)
const tenantId = getTenantId(event);  // Returns "TENANT#001"

// Build tenant-prefixed DynamoDB partition key
const pk = buildTenantPK(tenantId, 'VEHICLE', vehicleId);
// Result: "TENANT#001#VEHICLE#standard"

// Build tenant-prefixed S3 key (uses hyphens for S3 compatibility)
const s3Key = buildTenantS3Key(tenantId, 'vehicles', 'image.jpg');
// Result: "TENANT-001/vehicles/image.jpg"

// Log tenant context at Lambda start
logTenantContext(logger, tenantId, 'lambda_name');

// Validate tenant access (cross-tenant guard)
validateTenantAccess(requestTenantId, resourceTenantId);
```

### Dual-Format PK Pattern

All read operations must support both old and new PK formats for backward compatibility:

```javascript
// Try tenant-prefixed PK first
let result = await docClient.send(new GetCommand({
  Key: { PK: buildTenantPK(tenantId, 'ENTITY', id), SK: 'METADATA' }
}));

// Fallback to old format if not found
if (!result.Item) {
  result = await docClient.send(new GetCommand({
    Key: { PK: `ENTITY#${id}`, SK: 'METADATA' }
  }));
}
```

### GSI Query Tenant Filtering

GSI keys don't include tenant prefix, so filter by attribute:

```javascript
FilterExpression: 'attribute_not_exists(tenantId) OR tenantId = :tenantId',
ExpressionAttributeValues: {
  ':tenantId': tenantId
}
```

### New Record Pattern

All new records MUST include tenant context:

```javascript
const item = {
  PK: buildTenantPK(tenantId, 'ENTITY', entityId),
  SK: 'METADATA',
  tenantId,  // ALWAYS include tenant attribute
  // ... other fields
};
```

### What We Defer Until Client #2

- API Gateway custom authorizer (extract tenantId from API key)
- Multiple API keys (one per tenant)
- Tenant management UI
- Data migration (backfill existing records with tenant prefix)

---

## Common Deployment Errors

### Error: "Runtime.ImportModuleError: Cannot find module 'index'"

**Cause**: Deployment ZIP has wrong structure or missing files

**Fix**:
1. Read STRUCTURE.md for the Lambda
2. Verify all required .mjs files are listed in Compress-Archive command
3. Recreate ZIP with correct file list

### Error: "Cannot find module '/opt/nodejs/logger.mjs'" or "Cannot find module '/opt/nodejs/tenant.mjs'"

**Cause**: Lambda Layer not attached to function

**Fix**:
```bash
aws lambda update-function-configuration \
  --function-name [function-name]-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5 \
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

### Error: 401 Unauthorized on admin endpoint

**Cause**: API Gateway JWT authorizer rejected the request

**Possible reasons**:
- No `Authorization: Bearer <token>` header sent
- Token is expired (8 hour expiry)
- Token signature invalid (wrong secret)
- Token malformed

**Fix**:
1. Check frontend is sending Authorization header
2. Verify user is logged in (check localStorage for `durdle_admin_token`)
3. If token expired, user needs to re-login
4. Test with curl: `curl -H "Authorization: Bearer TOKEN" URL`
5. Check authorizer logs: `aws logs tail /aws/lambda/durdle-api-gateway-authorizer-dev --since 5m`

**Note**: This is NOT a Lambda error - it happens BEFORE your Lambda is invoked.

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
| API Gateway ID | qcfd5p4514 | API endpoint |
| API Gateway Authorizer | durdle-jwt-authorizer (c4xm5e) | JWT validation for admin routes |
| DynamoDB Tables | durdle-*-dev | All dev tables |
| Lambda Execution Role | durdle-lambda-execution-role-dev | IAM role for Lambdas |
| Lambda Layer | durdle-common-layer:5 | Shared logger + tenant utilities |

---

## API Gateway Authorization (CRITICAL)

**All `/admin/*` routes (except `/admin/auth/login`) require JWT authentication.**

The API Gateway validates tokens BEFORE your Lambda is invoked:

```
Request → API Gateway → JWT Authorizer → Your Lambda
                            ↓
                  Validates Authorization header
                  against durdle/jwt-secret
```

### Testing Admin Endpoints

**With valid token** (frontend handles this automatically):
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/quotes"
```

**Without token** (returns 401):
```bash
curl "https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/quotes"
# Returns: {"message":"Unauthorized"}
```

### Troubleshooting 401 Errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| 401 on all requests | No Authorization header | Frontend must send `Authorization: Bearer <token>` |
| 401 with valid token | Token expired | User needs to re-login |
| 401 "Invalid token" | Token signature mismatch | Check JWT secret in Secrets Manager |

### Authorizer Lambda

**Function**: `durdle-api-gateway-authorizer-dev`
**STRUCTURE.md**: [functions/api-gateway-authorizer/STRUCTURE.md](functions/api-gateway-authorizer/STRUCTURE.md)

This Lambda validates JWTs against the `durdle/jwt-secret` in Secrets Manager. Do NOT modify unless CTO-approved.

---

## Documentation Hierarchy

Start at this document, then drill down:

```
1. BACKEND_TEAM_START_HERE.md (you are here)
   ├── 2. LAMBDA_CODE_PATTERNS.md (COPY-PASTE code patterns - CORS, logging, templates)
   ├── 3. ADMIN_ENDPOINT_STANDARD.md (MANDATORY for /admin/* endpoints - CORS rules)
   ├── 4. functions/[lambda-name]/STRUCTURE.md (deployment guide per Lambda)
   ├── 5. .documentation/CTO/LAMBDA_DEPLOYMENT_GUIDE.md (detailed deployment process)
   └── 6. .documentation/CTO/CODE_AUDIT_AND_REMEDIATION.md (CTO tracking, optional reading)
```

**When writing new Lambda code**:
1. Read LAMBDA_CODE_PATTERNS.md FIRST
2. Copy code blocks exactly from that document
3. Do NOT improvise patterns - use the documented ones

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

### Current Layer: durdle-common-layer:5

**What's in the layer**:
- `nodejs/logger.mjs` - Structured logging utility (with logger.log() backward compatibility)
- `nodejs/tenant.mjs` - Multi-tenant utilities (Phase 0.5)
- `nodejs/node_modules/pino` - Pino logging framework

**Layer Coverage**: 11/11 Lambdas (100%)
- All backend Lambda functions now use Layer v5 with logging + tenant utilities
- Centralized infrastructure for logging and multi-tenancy
- **IMPORTANT**: Pino is ONLY in the Lambda Layer - DO NOT add it to package.json
- Pino was removed from all Lambda package.json files to eliminate duplication
- This reduces deployment package sizes by ~500 KB per Lambda

**How to use in Lambda code**:
```javascript
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantPK, logTenantContext } from '/opt/nodejs/tenant.mjs';
```

**How Lambdas access layer files**:
- Layer files are mounted at `/opt/nodejs/` in Lambda runtime
- Import from `/opt/nodejs/[filename]`, not `./[filename]`

**Layer versioning**:
- Version 1: Initial release (had hardcoded service name bug)
- Version 2: Fixed service name (deployed Dec 6 2025 morning)
- Version 3: Added logger.log() backward compatibility method (deployed Dec 6 2025 evening)
- Version 4: Intermediate release
- Version 5: Added tenant.mjs for multi-tenant support (current, deployed Dec 9 2025)

**When layer is updated**:
- CTO will publish new version (e.g., version 6)
- All Lambdas must update layer ARN to new version
- STRUCTURE.md files will be updated with new ARN

### Deployment Package Sizes (After Pino Optimization - Dec 6, 2025)

All Lambdas now have optimized packages with Pino removed:

| Lambda | Package Size | Key Dependencies |
|--------|--------------|------------------|
| api-gateway-authorizer | 2.5 MB | AWS SDK, jsonwebtoken |
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
**Last Updated**: December 9, 2025 (Phase 0.5 tenant awareness complete)
**Next Review**: After remaining Lambdas have STRUCTURE.md files

**Backend Foundation Status**:
- API Gateway JWT Authorizer active for all admin routes (except /admin/auth/login)
- 11/11 Lambdas with Lambda Layer v5 (structured logging + tenant awareness)
- 8/11 Lambdas with STRUCTURE.md deployment documentation
- ADMIN_ENDPOINT_STANDARD.md + LAMBDA_CODE_PATTERNS.md created
- CORS, auth, logging, and tenant patterns fully documented
- Gateway responses (401/403) configured with proper CORS
- Phase 0.5 multi-tenant refactor complete (Dec 9, 2025)
- All data operations tenant-aware with dual-format backward compatibility
- Next: Create STRUCTURE.md for remaining Lambdas, deploy Layer v4 + updated functions

**Questions?** Consult CTO before deploying if anything is unclear.
