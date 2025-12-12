# zone-manager Lambda - Deployment Structure

**Last Updated**: December 12, 2025
**Lambda Name**: zone-manager-dev
**Runtime**: Node.js 20.x (arm64)
**Lambda Layer**: durdle-common-layer:5 <- **REQUIRED!**

---

## CRITICAL: Lambda Layer Required

This function uses a Lambda Layer for shared utilities.

**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5`
**Layer Contains**: logger.mjs + tenant.mjs + Pino dependency

If the layer is not attached, the Lambda WILL CRASH with "Cannot find module '/opt/nodejs/logger.mjs'".

---

## Files to INCLUDE in Deployment ZIP

### Source Files
- `index.mjs` - Main Lambda handler (Zone CRUD + PostcodeLookup management + polygon resolution)

### Dependencies
- `package.json` - NPM dependencies manifest
- `package-lock.json` - Locked dependency versions
- `node_modules/` - ALL installed packages (run `npm install` first)

---

## Files to EXCLUDE from Deployment ZIP

- `zone-manager.zip` - Old deployment packages
- `STRUCTURE.md` - This documentation file
- `deploy.sh` - Deployment script

---

## Deployment Commands

### 1. Install Dependencies
```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\zone-manager"
npm install
```

### 2. Create Deployment ZIP
```powershell
powershell -Command "Compress-Archive -Path index.mjs,package.json,package-lock.json,node_modules -DestinationPath zone-manager.zip -Force"
```

### 3. Create Lambda Function (First Time Only)
```bash
aws lambda create-function \
  --function-name zone-manager-dev \
  --runtime nodejs20.x \
  --architectures arm64 \
  --handler index.handler \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --zip-file fileb://zone-manager.zip \
  --timeout 30 \
  --memory-size 256 \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5 \
  --environment "Variables={PRICING_TABLE_NAME=durdle-pricing-config-dev,UK_POSTCODES_TABLE_NAME=durdle-uk-postcodes-dev,ENVIRONMENT=dev}" \
  --region eu-west-2
```

### 4. Deploy Code Updates (Subsequent Deploys)
```bash
aws lambda update-function-code \
  --function-name zone-manager-dev \
  --zip-file fileb://zone-manager.zip \
  --region eu-west-2
```

### 5. Verify Lambda Layer is Attached
```bash
aws lambda get-function-configuration \
  --function-name zone-manager-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

**Expected Output**: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5"]`

### 6. Verify Deployment
```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/zone-manager-dev" \
  --region eu-west-2 \
  --since 5m \
  --format short
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/zones | List all zones |
| POST | /admin/zones | Create zone |
| GET | /admin/zones/{zoneId} | Get single zone |
| PUT | /admin/zones/{zoneId} | Update zone |
| DELETE | /admin/zones/{zoneId} | Delete zone (hard delete) |
| POST | /admin/zones/resolve-polygon | Resolve polygon to outward codes |

---

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| PRICING_TABLE_NAME | durdle-pricing-config-dev | DynamoDB table for zones |
| UK_POSTCODES_TABLE_NAME | durdle-uk-postcodes-dev | UK postcode reference table |
| ENVIRONMENT | dev | Environment name (for logs) |

---

## NPM Dependencies

**Runtime Dependencies**:
```json
{
  "@turf/boolean-point-in-polygon": "^7.2.0",
  "@turf/helpers": "^7.2.0",
  "zod": "^3.24.1"
}
```

**Dev Dependencies** (AWS SDK provided by Lambda runtime):
```json
{
  "@aws-sdk/client-dynamodb": "^3.700.0",
  "@aws-sdk/lib-dynamodb": "^3.700.0"
}
```

---

## Zone Schema

```json
{
  "PK": "TENANT#001#ZONE#zone-bournemouth-urban",
  "SK": "METADATA",
  "tenantId": "TENANT#001",
  "zoneId": "zone-bournemouth-urban",
  "name": "Bournemouth Urban",
  "description": "Central Bournemouth and immediate surrounds",
  "outwardCodes": ["BH1", "BH2", "BH3", "BH4", "BH5", "BH6", "BH7", "BH8"],
  "polygon": { "type": "Polygon", "coordinates": [[...]] },
  "active": true,
  "createdAt": "2025-12-12T...",
  "updatedAt": "2025-12-12T..."
}
```

---

## PostcodeLookup Records (GSI1)

When a zone is created/updated, PostcodeLookup records are automatically managed:

```json
{
  "PK": "TENANT#001#POSTCODE#BH1",
  "SK": "ZONE#zone-bournemouth-urban",
  "GSI1PK": "TENANT#001#POSTCODE#BH1",
  "GSI1SK": "ZONE#zone-bournemouth-urban",
  "tenantId": "TENANT#001",
  "outwardCode": "BH1",
  "zoneId": "zone-bournemouth-urban"
}
```

This enables O(1) lookup: "What zone is BH1 in?"

---

## Common Errors & Fixes

### Error: "Cannot find module '/opt/nodejs/logger.mjs'"
**Cause**: Lambda Layer not attached
**Fix**: Attach layer via AWS CLI or console

### Error: "Cannot find module '@turf/boolean-point-in-polygon'"
**Cause**: node_modules not included in ZIP
**Fix**: Run `npm install` then recreate ZIP with node_modules

---

**Questions?** Check [BACKEND_TEAM_START_HERE.md](../../BACKEND_TEAM_START_HERE.md)
