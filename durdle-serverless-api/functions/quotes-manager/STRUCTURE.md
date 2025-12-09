# quotes-manager Lambda - Deployment Structure

**Function Name:** `quotes-manager-dev`
**Runtime:** Node.js 20.x
**Architecture:** arm64
**Lambda Layer:** `durdle-common-layer:4` (REQUIRED)
**Purpose:** Admin quotes management - list, filter, search, and export quotes

---

## Files to INCLUDE in Deployment ZIP

```
index.mjs
queries.mjs
validation.mjs
csv-export.mjs
package.json
package-lock.json
node_modules/
```

## Files to EXCLUDE from Deployment ZIP

```
logger.mjs           (provided by Lambda Layer)
STRUCTURE.md
tests/
.git/
.env
*.test.mjs
```

---

## Lambda Layer Required

This Lambda function imports from `/opt/nodejs/logger.mjs`, which is provided by the Lambda Layer.

**Layer ARN:** `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4`

**IMPORTANT:**
- Do NOT include `logger.mjs` in the deployment ZIP
- Do NOT include `pino` in package.json (it's in the layer)
- The layer MUST be attached or the function will crash

---

## Deployment Commands

### Step 1: Install Dependencies

```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\quotes-manager"
npm install
```

### Step 2: Create Deployment ZIP

```powershell
powershell -Command "Compress-Archive -Path index.mjs,queries.mjs,validation.mjs,csv-export.mjs,package.json,package-lock.json,node_modules -DestinationPath function.zip -Force"
```

**Wait 30-60 seconds** for compression to complete (node_modules is large).

### Step 3: Verify ZIP Size

```bash
ls -lh function.zip
```

Expected size: 3-4 MB

### Step 4: Verify Lambda Layer is Attached

```bash
aws lambda get-function-configuration \
  --function-name quotes-manager-dev \
  --region eu-west-2 \
  --query 'Layers[*].Arn'
```

Expected output: `["arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4"]`

If layer is NOT attached, attach it:

```bash
aws lambda update-function-configuration \
  --function-name quotes-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --region eu-west-2
```

### Step 5: Deploy to AWS

```bash
aws lambda update-function-code \
  --function-name quotes-manager-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

### Step 6: Test Deployment

Test the list quotes endpoint:

```bash
aws lambda invoke \
  --function-name quotes-manager-dev \
  --region eu-west-2 \
  --payload file://test-list-quotes.json \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json
```

Where `test-list-quotes.json` contains:

```json
{
  "httpMethod": "GET",
  "path": "/admin/quotes",
  "resource": "/admin/quotes",
  "queryStringParameters": {
    "status": "all",
    "limit": "10"
  },
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-admin-user",
        "email": "admin@durdletransfers.co.uk"
      }
    }
  }
}
```

### Step 7: Check CloudWatch Logs

```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/quotes-manager-dev" \
  --region eu-west-2 \
  --since 5m \
  --format short
```

Look for:
- Structured JSON logs with `event` field
- No `ERROR` level logs
- Successful query execution

---

## Environment Variables

This Lambda requires the following environment variables (set in AWS Console):

| Variable | Value | Description |
|----------|-------|-------------|
| NODE_ENV | `development` | Environment |

No sensitive credentials needed (uses IAM role for DynamoDB access).

---

## IAM Permissions Required

The Lambda execution role must have these DynamoDB permissions:

```json
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
```

**IMPORTANT:** This Lambda needs access to the GSI `status-createdAt-index`.

---

## Structured Logging Events

This Lambda emits the following structured log events (using Pino from Lambda Layer):

| Event | When | Fields |
|-------|------|--------|
| `lambda_invocation` | Every request | httpMethod, path, resource |
| `list_quotes_request` | List quotes endpoint called | - |
| `list_quotes_filters` | Filters applied | filters object |
| `list_quotes_success` | Query successful | quoteCount, hasMoreResults |
| `quote_details_request` | Get quote details called | - |
| `quote_details_lookup` | Looking up quote | quoteId |
| `quote_details_success` | Quote found | quoteId |
| `quote_not_found` | Quote not found | quoteId |
| `export_quotes_request` | Export endpoint called | - |
| `export_quotes_filters` | Export filters applied | filters object |
| `export_quotes_data_fetched` | Data fetched for export | quoteCount |
| `export_quotes_success` | CSV generated | quoteCount, filename, csvSize |
| `quotes_query_start` | DynamoDB query starting | filters |
| `quotes_query_complete` | DynamoDB query done | resultCount, hasMoreResults |
| `dynamodb_query` | Querying GSI | indexName, status |
| `dynamodb_scan` | Scanning table | hasDateFilter |
| `quote_detail_fetch_start` | Fetching single quote | quoteId |
| `quote_detail_fetched` | Quote retrieved | quoteId |
| `quotes_export_start` | Export query starting | filters |
| `quotes_export_complete` | Export data ready | totalQuotes |
| `unauthorized_access` | No auth context | - |
| `route_not_found` | Invalid route | httpMethod, path |
| `lambda_error` | Error occurred | errorName, errorMessage, stack |
| `response_success` | Returning success | - |
| `response_error` | Returning error | statusCode, errorMessage |

**Total:** 24 structured log events

---

## API Gateway Integration

This Lambda handles these routes:

| Route | Method | Description |
|-------|--------|-------------|
| `/admin/quotes` | GET | List quotes with filters |
| `/admin/quotes/{quoteId}` | GET | Get quote details |
| `/admin/quotes/export` | GET | Export quotes to CSV |

**Security:** All routes require Cognito Authorizer (admin JWT token).

---

## Common Errors

### Error: "Cannot find module '/opt/nodejs/logger.mjs'"

**Cause:** Lambda Layer not attached

**Fix:**
```bash
aws lambda update-function-configuration \
  --function-name quotes-manager-dev \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:4 \
  --region eu-west-2
```

### Error: "Invalid pagination cursor"

**Cause:** Corrupted or tampered cursor string

**Fix:** Return error to client, they should restart from first page

### Error: "Unauthorized"

**Cause:** Missing or invalid JWT token in request

**Fix:** Ensure API Gateway Cognito Authorizer is configured correctly

### Error: "Quote not found"

**Cause:** Quote doesn't exist or quoteId format invalid

**Fix:** Verify quote exists in DynamoDB, check quoteId format (must be `QUOTE#<id>`)

---

## Testing

### Unit Tests

```bash
npm test
```

### Manual Test (Local)

Create `test-list-quotes.json`:

```json
{
  "httpMethod": "GET",
  "path": "/admin/quotes",
  "resource": "/admin/quotes",
  "queryStringParameters": {
    "status": "active",
    "limit": "5"
  },
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-admin",
        "email": "admin@test.com"
      }
    }
  }
}
```

Invoke:

```bash
aws lambda invoke \
  --function-name quotes-manager-dev \
  --payload file://test-list-quotes.json \
  --cli-binary-format raw-in-base64-out \
  --region eu-west-2 \
  response.json
```

---

## Performance Notes

- GSI queries are fast (< 100ms for status filter)
- Table scans (status=all) are slower (200-500ms depending on table size)
- CSV export may take 2-5 seconds for 1000+ quotes
- Pagination is efficient (cursor-based, O(1) per page)

---

## Dependencies

- `@aws-sdk/client-dynamodb` (3.621.0)
- `@aws-sdk/lib-dynamodb` (3.621.0)
- `zod` (3.23.8)
- `pino` (from Lambda Layer, NOT in package.json)

---

## Deployment Checklist

Before deploying:
- [ ] `npm install` completed
- [ ] `function.zip` created (3-4 MB)
- [ ] Lambda Layer v3 attached
- [ ] IAM permissions include DynamoDB + GSI access
- [ ] Environment variables set
- [ ] API Gateway routes configured
- [ ] Cognito Authorizer enabled

After deploying:
- [ ] Test list quotes endpoint
- [ ] Test get quote details endpoint
- [ ] Test CSV export endpoint
- [ ] Check CloudWatch logs for structured logging
- [ ] Verify no ERROR logs

---

**Last Updated:** December 7, 2025
**Owner:** CTO
**Status:** Ready for Deployment

**Questions?** Consult BACKEND_TEAM_START_HERE.md or CTO before deploying.
