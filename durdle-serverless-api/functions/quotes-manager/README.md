# quotes-manager Lambda Function

**Function Name:** `quotes-manager-dev`
**Status:** Ready for Deployment
**Created:** December 7, 2025

---

## Overview

Backend Lambda function for the Admin Quotes View feature. Provides comprehensive quote management capabilities for admin users including listing, filtering, searching, and exporting quotes to CSV.

**Feature Spec:** See [AdminQuotesView_Implementation_Plan.md](../../../.documentation/FeatureDev/AdminQuotesView_Implementation_Plan.md)

---

## Capabilities

1. **List Quotes** - Query quotes with advanced filtering
   - Filter by status (active/expired/converted/all)
   - Filter by date range
   - Filter by price range
   - Search by quote ID or location
   - Sort by date or price
   - Cursor-based pagination

2. **Get Quote Details** - Retrieve full details for a single quote

3. **Export to CSV** - Generate downloadable CSV file of filtered quotes

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/quotes` | GET | List quotes with filters |
| `/admin/quotes/{quoteId}` | GET | Get quote details |
| `/admin/quotes/export` | GET | Export quotes to CSV |

All endpoints require admin JWT authentication via Cognito Authorizer.

---

## File Structure

```
quotes-manager/
├── index.mjs                      # Main Lambda handler (routes + error handling)
├── queries.mjs                    # DynamoDB query logic (GSI queries, scans)
├── validation.mjs                 # Zod schemas for request validation
├── csv-export.mjs                 # CSV generation utility
├── backfill-quote-status.mjs      # One-time migration script
├── package.json                   # Dependencies (Zod, AWS SDK)
├── package-lock.json              # Locked dependency versions
├── STRUCTURE.md                   # Deployment guide (CRITICAL - read before deploying)
├── DEPLOYMENT_GUIDE.md            # Complete deployment guide (IAM, API Gateway, testing)
├── README.md                      # This file
├── test-list-quotes.json          # Test payload for list endpoint
├── test-quote-details.json        # Test payload for details endpoint
└── tests/                         # Unit tests
    ├── csv-export.test.mjs        # CSV generation tests
    └── validation.test.mjs        # Zod validation tests
```

---

## Dependencies

- `@aws-sdk/client-dynamodb` (3.621.0) - DynamoDB client
- `@aws-sdk/lib-dynamodb` (3.621.0) - DynamoDB Document client
- `zod` (3.23.8) - Request validation
- `pino` (from Lambda Layer v3) - Structured logging

**IMPORTANT:** Pino is provided by Lambda Layer. Do NOT add it to package.json.

---

## Lambda Layer Required

This function imports from `/opt/nodejs/logger.mjs`.

**Layer ARN:** `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3`

The layer MUST be attached or the function will crash.

---

## Deployment

**CRITICAL:** Read [STRUCTURE.md](./STRUCTURE.md) before deploying.

Quick deployment:

```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\quotes-manager"
npm install
powershell -Command "Compress-Archive -Path index.mjs,queries.mjs,validation.mjs,csv-export.mjs,package.json,package-lock.json,node_modules -DestinationPath function.zip -Force"
aws lambda update-function-code --function-name quotes-manager-dev --zip-file fileb://function.zip --region eu-west-2
```

For complete deployment including GSI creation, IAM permissions, and API Gateway setup, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## Testing

Run unit tests:

```bash
npm test
```

Test Lambda directly:

```bash
aws lambda invoke \
  --function-name quotes-manager-dev \
  --payload file://test-list-quotes.json \
  --cli-binary-format raw-in-base64-out \
  --region eu-west-2 \
  response.json
```

Check logs:

```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/quotes-manager-dev" --region eu-west-2 --since 5m --format short
```

---

## Structured Logging

This Lambda emits 24 structured log events using Pino:

- `lambda_invocation` - Every request
- `list_quotes_request` - List endpoint called
- `list_quotes_success` - Query successful
- `quote_details_request` - Details endpoint called
- `quote_details_success` - Quote retrieved
- `export_quotes_request` - Export endpoint called
- `export_quotes_success` - CSV generated
- `quotes_query_start` - DynamoDB query starting
- `quotes_query_complete` - Query completed
- `dynamodb_query` - GSI query
- `dynamodb_scan` - Table scan
- `unauthorized_access` - Auth failure
- `route_not_found` - Invalid route
- `lambda_error` - Error occurred
- And 10 more...

All logs are JSON-formatted with `level`, `time`, `environment`, `functionName`, `awsRequestId`, and `event` fields.

---

## DynamoDB Schema

This Lambda queries the `durdle-quotes-dev` table and uses the `status-createdAt-index` GSI.

**GSI:** `status-createdAt-index`
- **Partition Key:** `status` (String)
- **Sort Key:** `createdAt` (String, ISO datetime)
- **Projection:** ALL

**Query Patterns:**
1. Filter by status + date range → Use GSI
2. Filter all statuses + date range → Scan table
3. Price filter → FilterExpression (post-query)
4. Search → FilterExpression (contains on address/email)

---

## Performance

- GSI queries: < 100ms (status filter)
- Table scans: 200-500ms (depends on table size)
- CSV export: 2-5 seconds (1000+ quotes)
- Pagination: Cursor-based (O(1) per page)

**Optimization Notes:**
- Use status filter when possible (faster)
- Limit results to 50-100 per page
- CSV export may timeout for very large datasets (>10,000 quotes)

---

## Security

- Admin-only access (Cognito Authorizer required)
- JWT token validated by API Gateway before reaching Lambda
- No direct database access (all queries via Lambda)
- CORS configured for admin domain only
- No PII logged (customer emails are logged but not stored in logs)

---

## Known Limitations

1. CSV export may timeout for >10,000 quotes (Lambda 30s timeout)
   - **Mitigation:** Add async export via S3 in future
2. Search is case-insensitive substring match (not full-text search)
   - **Mitigation:** Good enough for MVP, add ElasticSearch if needed
3. Price filter applied after query (not indexed)
   - **Mitigation:** Acceptable for admin use (low volume)

---

## Future Enhancements

- Add async CSV export for large datasets (upload to S3, email link)
- Add quote analytics (conversion funnel, abandonment patterns)
- Add quote expiry extension (for customer support)
- Add manual quote creation (admin creates on behalf of customer)
- Add quote editing (update price, extend expiry)

---

## Support

**Questions?** Consult:
1. [BACKEND_TEAM_START_HERE.md](../../BACKEND_TEAM_START_HERE.md)
2. [STRUCTURE.md](./STRUCTURE.md)
3. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
4. CTO

**Issues?** Check CloudWatch logs first, then consult troubleshooting sections in STRUCTURE.md and DEPLOYMENT_GUIDE.md.

---

**Document Owner:** CTO
**Last Updated:** December 7, 2025
**Status:** Ready for Deployment
