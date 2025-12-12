# zone-pricing-manager Lambda - Deployment Structure

**Last Updated**: December 12, 2025
**Lambda Name**: zone-pricing-manager-dev
**Runtime**: Node.js 20.x (arm64)
**Lambda Layer**: durdle-common-layer:5 <- **REQUIRED!**

---

## CRITICAL: Lambda Layer Required

**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5`

---

## Deployment Commands

### 1. Install Dependencies
```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\zone-pricing-manager"
npm install --omit=dev
```

### 2. Create Deployment ZIP
```powershell
powershell -Command "Compress-Archive -Path index.mjs,package.json,package-lock.json,node_modules -DestinationPath zone-pricing-manager.zip -Force"
```

### 3. Create Lambda Function (First Time Only)
```bash
aws lambda create-function \
  --function-name zone-pricing-manager-dev \
  --runtime nodejs20.x \
  --architectures arm64 \
  --handler index.handler \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --zip-file fileb://zone-pricing-manager.zip \
  --timeout 30 \
  --memory-size 256 \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5 \
  --environment "Variables={PRICING_TABLE_NAME=durdle-pricing-config-dev,ENVIRONMENT=dev}" \
  --region eu-west-2
```

### 4. Deploy Code Updates
```bash
aws lambda update-function-code \
  --function-name zone-pricing-manager-dev \
  --zip-file fileb://zone-pricing-manager.zip \
  --region eu-west-2
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/zones/{zoneId}/pricing | Get all pricing for zone |
| POST | /admin/zones/{zoneId}/pricing | Create zone-destination pricing |
| GET | /admin/zones/{zoneId}/pricing/{destId} | Get single pricing |
| PUT | /admin/zones/{zoneId}/pricing/{destId} | Update pricing |
| DELETE | /admin/zones/{zoneId}/pricing/{destId} | Delete pricing |
| GET | /admin/pricing-matrix | Get full pricing matrix |

---

## Zone Pricing Schema

```json
{
  "PK": "TENANT#001#ZONE#zone-bournemouth-urban",
  "SK": "PRICING#dest-heathrow-airport",
  "zoneId": "zone-bournemouth-urban",
  "destinationId": "dest-heathrow-airport",
  "name": "BH Zone 1 - Heathrow",
  "prices": {
    "standard": { "outbound": 12500, "return": 12500 },
    "executive": { "outbound": 17500, "return": 17500 },
    "minibus": { "outbound": 22500, "return": 22500 }
  },
  "active": true
}
```

All prices are in pence (100 = 1 pound).
