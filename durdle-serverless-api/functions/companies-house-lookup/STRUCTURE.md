# companies-house-lookup Lambda

**Last Updated**: December 11, 2025
**Lambda Layer Required**: `durdle-common-layer:4`

---

## Purpose

Proxies search requests to the Companies House Public Data API. Used by admin portal for company name autocomplete when creating corporate accounts.

---

## Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /admin/companies-house/search?q={query} | Search companies by name |
| GET | /admin/companies-house/{companyNumber} | Get company details |

---

## Files to Include in Deployment ZIP

**Required**:
- `index.mjs` - Main Lambda handler

**DO NOT Include**:
- `STRUCTURE.md` - This documentation file
- `*.zip` - Old deployment packages
- `package.json` - No dependencies needed
- `node_modules/` - No dependencies needed

---

## Deployment Commands

### 1. Navigate to Function Directory

```bash
cd "c:/VSProjects/_Websites/Durdle/durdle-serverless-api/functions/companies-house-lookup"
```

### 2. Create Deployment Package

**Windows (PowerShell)**:
```powershell
powershell -Command "Compress-Archive -Path index.mjs -DestinationPath function.zip -Force"
```

### 3. Create Lambda Function (First Time Only)

```bash
aws lambda create-function \
  --function-name companies-house-lookup-dev \
  --runtime nodejs20.x \
  --architectures arm64 \
  --handler index.handler \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --memory-size 128 \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --environment "Variables={COMPANIES_HOUSE_API_KEY=YOUR_API_KEY_HERE}" \
  --region eu-west-2
```

### 4. Update Lambda Code (Subsequent Deploys)

```bash
aws lambda update-function-code \
  --function-name companies-house-lookup-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

### 5. Verify Lambda Layer Attached

```bash
aws lambda get-function-configuration \
  --function-name companies-house-lookup-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

**Expected output**:
```json
["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4"]
```

### 6. Test Deployment

```bash
aws lambda invoke \
  --function-name companies-house-lookup-dev \
  --region eu-west-2 \
  --payload '{"httpMethod":"GET","path":"/admin/companies-house/search","queryStringParameters":{"q":"test"},"headers":{"origin":"https://durdle.flowency.build"}}' \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json
```

### 7. Check Logs

```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/companies-house-lookup-dev" \
  --region eu-west-2 \
  --since 5m \
  --format short
```

---

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| COMPANIES_HOUSE_API_KEY | (from Companies House) | API key for authentication |

---

## Getting a Companies House API Key

1. Go to https://developer.company-information.service.gov.uk/
2. Register for a free account
3. Create an application
4. Copy the API key
5. Set it in the Lambda environment variables

---

## Rate Limits

- Companies House API: 600 requests per 5 minutes (2 per second)
- This is generous for admin portal use

---

## CORS Configuration

Allowed origins (admin portal only):
- `http://localhost:3000`
- `https://durdle.flowency.build`
- `https://durdle.co.uk`

---

## API Gateway Routes (to be configured)

All routes should be added to API Gateway `qcfd5p4514`:

| Route | Method | Integration |
|-------|--------|-------------|
| /admin/companies-house/search | GET | companies-house-lookup-dev |
| /admin/companies-house/{companyNumber} | GET | companies-house-lookup-dev |

**Note**: Don't forget OPTIONS methods for CORS preflight.

---

## Response Format

### Search Response
```json
{
  "totalResults": 150,
  "itemsPerPage": 10,
  "companies": [
    {
      "companyNumber": "12345678",
      "companyName": "ACME CORP LTD",
      "companyStatus": "active",
      "companyType": "ltd",
      "dateOfCreation": "2020-01-15",
      "address": {
        "line1": "123 High Street",
        "line2": "",
        "city": "London",
        "region": "Greater London",
        "postcode": "SW1A 1AA",
        "country": "United Kingdom"
      }
    }
  ]
}
```

### Company Detail Response
```json
{
  "company": {
    "companyNumber": "12345678",
    "companyName": "ACME CORP LTD",
    "companyStatus": "active",
    "companyType": "ltd",
    "dateOfCreation": "2020-01-15",
    "address": {
      "line1": "123 High Street",
      "line2": "",
      "city": "London",
      "region": "Greater London",
      "postcode": "SW1A 1AA",
      "country": "United Kingdom"
    }
  }
}
```

---

**Document Owner**: CTO
**Last Updated**: December 11, 2025
