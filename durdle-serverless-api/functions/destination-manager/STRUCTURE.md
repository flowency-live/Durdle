# destination-manager Lambda - Deployment Structure

**Last Updated**: December 12, 2025
**Lambda Name**: destination-manager-dev
**Runtime**: Node.js 20.x (arm64)
**Lambda Layer**: durdle-common-layer:5 <- **REQUIRED!**

---

## CRITICAL: Lambda Layer Required

**Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5`
**Layer Contains**: logger.mjs + tenant.mjs + Pino dependency

---

## Files to INCLUDE in Deployment ZIP

- `index.mjs` - Main Lambda handler
- `package.json`, `package-lock.json`, `node_modules/`

---

## Deployment Commands

### 1. Install Dependencies
```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\destination-manager"
npm install --production
```

### 2. Create Deployment ZIP
```powershell
powershell -Command "Compress-Archive -Path index.mjs,package.json,package-lock.json,node_modules -DestinationPath destination-manager.zip -Force"
```

### 3. Create Lambda Function (First Time Only)
```bash
aws lambda create-function \
  --function-name destination-manager-dev \
  --runtime nodejs20.x \
  --architectures arm64 \
  --handler index.handler \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --zip-file fileb://destination-manager.zip \
  --timeout 30 \
  --memory-size 256 \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5 \
  --environment "Variables={PRICING_TABLE_NAME=durdle-pricing-config-dev,ENVIRONMENT=dev}" \
  --region eu-west-2
```

### 4. Deploy Code Updates
```bash
aws lambda update-function-code \
  --function-name destination-manager-dev \
  --zip-file fileb://destination-manager.zip \
  --region eu-west-2
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/destinations | List all destinations |
| POST | /admin/destinations | Create destination |
| GET | /admin/destinations/{destId} | Get single destination |
| PUT | /admin/destinations/{destId} | Update destination |
| DELETE | /admin/destinations/{destId} | Delete destination |
| GET | /admin/destinations/lookup?placeId=xxx | Find destination by Google Place ID |

---

## Destination Schema

```json
{
  "destinationId": "dest-heathrow-airport",
  "name": "Heathrow Airport",
  "placeId": "ChIJJ9cBhSUQdkgRNMX7WxK3x5c",
  "locationType": "airport",
  "alternativePlaceIds": ["ChIJLQE...", "ChIJABC..."],
  "active": true
}
```

**Location Types**: `airport`, `train_station`, `port`, `other`
