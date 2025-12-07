# quotes-manager Lambda - Complete Deployment Guide

**Last Updated:** December 7, 2025
**Function Name:** `quotes-manager-dev`
**Purpose:** Admin quotes management backend

---

## Prerequisites

Before deploying this Lambda, ensure:

1. DynamoDB table `durdle-quotes-dev` exists
2. GSI `status-createdAt-index` has been created
3. Existing quotes have been backfilled with `status` field
4. AWS CLI configured with admin credentials
5. Lambda execution role `durdle-lambda-execution-role-dev` exists

---

## Step 1: Create DynamoDB GSI

Run this command to add the Global Secondary Index:

```bash
aws dynamodb update-table \
  --table-name durdle-quotes-dev \
  --region eu-west-2 \
  --attribute-definitions \
    AttributeName=status,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"status-createdAt-index\",\"KeySchema\":[{\"AttributeName\":\"status\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]"
```

**Wait 5-10 minutes** for the GSI to finish creating. Check status with:

```bash
aws dynamodb describe-table \
  --table-name durdle-quotes-dev \
  --region eu-west-2 \
  --query 'Table.GlobalSecondaryIndexes[?IndexName==`status-createdAt-index`].IndexStatus'
```

Expected output: `["ACTIVE"]`

---

## Step 2: Backfill Quote Status

Run the migration script to add `status` field to existing quotes:

```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\quotes-manager"
node backfill-quote-status.mjs
```

Expected output:
```
Starting quote status backfill...
Table: durdle-quotes-dev

Scanning batch (processed so far: 0)...
Found 23 items in this batch
  [1] QUOTE#abc123: Setting status to 'expired'
  [1] QUOTE#abc123: ✓ Updated successfully
  ...
============================================================
Backfill complete!
Total quotes processed: 23
Total quotes updated: 23
Total quotes skipped (already had status): 0
============================================================
```

---

## Step 3: Update IAM Permissions

The Lambda execution role needs DynamoDB permissions for the table and GSI.

### Option A: Add permissions via AWS Console

1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Find role: `durdle-lambda-execution-role-dev`
3. Add inline policy with JSON below

### Option B: Add permissions via AWS CLI

```bash
aws iam put-role-policy \
  --role-name durdle-lambda-execution-role-dev \
  --policy-name QuotesManagerDynamoDBAccess \
  --policy-document file://iam-policy.json
```

Where `iam-policy.json` contains:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:GetItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:eu-west-2:771551874768:table/durdle-quotes-dev",
        "arn:aws:dynamodb:eu-west-2:771551874768:table/durdle-quotes-dev/index/*"
      ]
    }
  ]
}
```

**Verify permissions:**

```bash
aws iam get-role-policy \
  --role-name durdle-lambda-execution-role-dev \
  --policy-name QuotesManagerDynamoDBAccess
```

---

## Step 4: Create Lambda Function

If the Lambda doesn't exist yet, create it:

```bash
aws lambda create-function \
  --function-name quotes-manager-dev \
  --runtime nodejs20.x \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --handler index.handler \
  --region eu-west-2 \
  --architectures arm64 \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables={NODE_ENV=development} \
  --zip-file fileb://function.zip
```

If it already exists, skip to Step 5.

---

## Step 5: Attach Lambda Layer

Attach the `durdle-common-layer:3` to the Lambda:

```bash
aws lambda update-function-configuration \
  --function-name quotes-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3 \
  --region eu-west-2
```

**Verify layer attachment:**

```bash
aws lambda get-function-configuration \
  --function-name quotes-manager-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

Expected output: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3"]`

---

## Step 6: Deploy Lambda Code

Follow the deployment commands in [STRUCTURE.md](./STRUCTURE.md):

```bash
# 1. Install dependencies
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\quotes-manager"
npm install

# 2. Create deployment ZIP
powershell -Command "Compress-Archive -Path index.mjs,queries.mjs,validation.mjs,csv-export.mjs,package.json,package-lock.json,node_modules -DestinationPath function.zip -Force"

# 3. Deploy to AWS
aws lambda update-function-code \
  --function-name quotes-manager-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

**Wait 10-15 seconds** for deployment to complete.

---

## Step 7: Configure API Gateway

Add the following routes to API Gateway (`qry0k6pmd0`):

### Route 1: List Quotes

- **Path:** `/admin/quotes`
- **Method:** `GET`
- **Integration:** Lambda Proxy
- **Lambda:** `quotes-manager-dev`
- **Authorization:** Cognito Authorizer (admin pool)

```bash
# Use API Gateway console or AWS CLI to add route
# Example CLI command (simplified):
aws apigatewayv2 create-route \
  --api-id qry0k6pmd0 \
  --route-key "GET /admin/quotes" \
  --target "integrations/<integration-id>"
```

### Route 2: Get Quote Details

- **Path:** `/admin/quotes/{quoteId}`
- **Method:** `GET`
- **Integration:** Lambda Proxy
- **Lambda:** `quotes-manager-dev`
- **Authorization:** Cognito Authorizer (admin pool)

### Route 3: Export Quotes CSV

- **Path:** `/admin/quotes/export`
- **Method:** `GET`
- **Integration:** Lambda Proxy
- **Lambda:** `quotes-manager-dev`
- **Authorization:** Cognito Authorizer (admin pool)

### CORS Configuration

Add CORS headers for all routes:

```json
{
  "AllowOrigins": ["https://admin.durdletransfers.co.uk", "http://localhost:3000"],
  "AllowMethods": ["GET", "OPTIONS"],
  "AllowHeaders": ["Authorization", "Content-Type"],
  "AllowCredentials": true,
  "MaxAge": 86400
}
```

### Grant API Gateway Permission to Invoke Lambda

```bash
aws lambda add-permission \
  --function-name quotes-manager-dev \
  --statement-id apigateway-quotes-list \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:eu-west-2:771551874768:qry0k6pmd0/*/GET/admin/quotes" \
  --region eu-west-2

aws lambda add-permission \
  --function-name quotes-manager-dev \
  --statement-id apigateway-quotes-details \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:eu-west-2:771551874768:qry0k6pmd0/*/GET/admin/quotes/*" \
  --region eu-west-2

aws lambda add-permission \
  --function-name quotes-manager-dev \
  --statement-id apigateway-quotes-export \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:eu-west-2:771551874768:qry0k6pmd0/*/GET/admin/quotes/export" \
  --region eu-west-2
```

---

## Step 8: Test Deployment

### Test 1: List Quotes

```bash
aws lambda invoke \
  --function-name quotes-manager-dev \
  --region eu-west-2 \
  --payload file://test-list-quotes.json \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json
```

Expected response:
```json
{
  "quotes": [...],
  "pagination": {
    "total": 10,
    "limit": 10,
    "cursor": null
  }
}
```

### Test 2: Get Quote Details

Update `test-quote-details.json` with a real quote ID, then:

```bash
aws lambda invoke \
  --function-name quotes-manager-dev \
  --region eu-west-2 \
  --payload file://test-quote-details.json \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json
```

Expected response: Full quote object

### Test 3: Check CloudWatch Logs

```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/quotes-manager-dev" \
  --region eu-west-2 \
  --since 5m \
  --format short
```

Look for:
- Structured JSON logs with `event` fields
- No `ERROR` level logs
- Successful query execution

### Test 4: API Gateway Integration

Use curl or Postman to test via API Gateway:

```bash
curl -X GET \
  "https://qry0k6pmd0.execute-api.eu-west-2.amazonaws.com/admin/quotes?status=active&limit=5" \
  -H "Authorization: Bearer <admin-jwt-token>"
```

Expected: 200 OK with quotes array

---

## Step 9: Verify Everything Works

Checklist:

- [ ] GSI `status-createdAt-index` is ACTIVE
- [ ] All existing quotes have `status` field
- [ ] Lambda Layer v3 is attached
- [ ] IAM permissions include DynamoDB + GSI access
- [ ] Lambda deploys without errors
- [ ] API Gateway routes are configured
- [ ] CORS is enabled
- [ ] Lambda can be invoked via API Gateway
- [ ] CloudWatch logs show structured logging
- [ ] No ERROR logs in CloudWatch

---

## Troubleshooting

### Error: "Cannot find module '/opt/nodejs/logger.mjs'"

**Cause:** Lambda Layer not attached

**Fix:**
```bash
aws lambda update-function-configuration \
  --function-name quotes-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3 \
  --region eu-west-2
```

### Error: "User is not authorized to perform: dynamodb:Query"

**Cause:** IAM role missing DynamoDB permissions

**Fix:** Re-run Step 3 to add IAM policy

### Error: "ValidationException: The provided key element does not match the schema"

**Cause:** GSI not created or not active

**Fix:** Check GSI status, wait for it to become ACTIVE

### Error: "Unauthorized" when calling API Gateway

**Cause:** Missing or invalid JWT token

**Fix:** Ensure Cognito Authorizer is configured and valid JWT is passed in Authorization header

---

## Rollback Plan

If deployment fails:

1. **Restore previous Lambda code:**
   ```bash
   aws lambda update-function-code \
     --function-name quotes-manager-dev \
     --s3-bucket <backup-bucket> \
     --s3-key quotes-manager-backup.zip \
     --region eu-west-2
   ```

2. **Remove API Gateway routes** (if causing issues)

3. **Remove IAM permissions** (if security concern):
   ```bash
   aws iam delete-role-policy \
     --role-name durdle-lambda-execution-role-dev \
     --policy-name QuotesManagerDynamoDBAccess
   ```

4. **Delete GSI** (if needed, but this will take time):
   ```bash
   aws dynamodb update-table \
     --table-name durdle-quotes-dev \
     --global-secondary-index-updates \
       "[{\"Delete\":{\"IndexName\":\"status-createdAt-index\"}}]" \
     --region eu-west-2
   ```

---

## Post-Deployment

After successful deployment:

1. Update CTO tracking docs: [CODE_AUDIT_AND_REMEDIATION.md](../../../.documentation/CTO/CODE_AUDIT_AND_REMEDIATION.md)
2. Update [BACKEND_TEAM_START_HERE.md](../../BACKEND_TEAM_START_HERE.md) to include quotes-manager
3. Document API endpoints in frontend docs
4. Add monitoring/alarms (post-MVP)

---

## Next Steps

1. Build frontend admin dashboard: `/admin/quotes`
2. Implement filtering UI
3. Add CSV export button
4. Test end-to-end with real data
5. Deploy to production (CTO approval required)

---

**Document Owner:** CTO
**Status:** Ready for Deployment
**Last Updated:** December 7, 2025
