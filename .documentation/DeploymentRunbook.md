# NOTS Platform - Deployment & DevOps Runbook

**Version:** 1.0
**Last Updated:** 2025-12-04
**Status:** Draft
**Owner:** DevOps Lead / Technical Lead

---

## 1. Overview

This runbook documents deployment procedures, CI/CD pipelines, monitoring, and operational procedures for the NOTS platform.

**Deployment Strategy:** Blue-Green deployments for zero-downtime releases
**CI/CD Tool:** GitHub Actions (or AWS CodePipeline)
**Infrastructure as Code:** AWS SAM (Serverless Application Model)

---

## 2. Environment Setup

### 2.1 Environments

| Environment | Purpose | AWS Account | Branch | Domain |
|-------------|---------|-------------|--------|--------|
| **Local** | Developer machines | N/A | feature/* | localhost:3000 |
| **Dev** | Integration testing | Shared dev account | develop | dev.nots.co.uk |
| **Staging** | Pre-production testing | Shared dev account | staging | staging.nots.co.uk |
| **Production** | Live system | Production account | main | nots.co.uk, api.nots.co.uk |

### 2.2 AWS Account Structure

**Option 1: Single Account (MVP)**
- All environments in one AWS account
- Separate by naming convention: `nots-{env}-{resource}`
- Simpler, lower cost

**Option 2: Multi-Account (Recommended for Production)**
- Separate AWS accounts for dev/staging/prod
- AWS Organizations for centralized management
- Better security isolation

**MVP Decision:** Single account initially, migrate to multi-account in Phase 2

---

## 3. Prerequisites

### 3.1 Required Tools

**Local Development:**
```bash
node --version           # v20.x or later
npm --version            # v10.x or later
aws --version            # AWS CLI v2
sam --version            # AWS SAM CLI
git --version            # Git 2.x or later
```

**Installation:**
```bash
# Node.js (via nvm)
nvm install 20
nvm use 20

# AWS CLI
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# AWS SAM CLI
https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

### 3.2 AWS Configuration

**Configure AWS CLI:**
```bash
aws configure --profile nots-dev
# AWS Access Key ID: [from AWS Console]
# AWS Secret Access Key: [from AWS Console]
# Default region: eu-west-2
# Default output format: json

aws configure --profile nots-prod
# Repeat for production credentials
```

**Test Configuration:**
```bash
aws sts get-caller-identity --profile nots-dev
```

### 3.3 Repository Setup

**Clone Repositories:**
```bash
cd ~/projects
git clone git@github.com:your-org/nots-website.git
git clone git@github.com:your-org/nots-dashboard.git
git clone git@github.com:your-org/nots-driver-portal.git
git clone git@github.com:your-org/nots-serverless-api.git
```

**Install Dependencies:**
```bash
cd nots-website && npm install
cd nots-dashboard && npm install
cd nots-driver-portal && npm install
cd nots-serverless-api && npm install
```

---

## 4. Infrastructure Deployment

### 4.1 Initial AWS Resources Setup

**Create resources in this order:**

**1. DynamoDB Table**
```bash
aws dynamodb create-table \
  --table-name nots-main-table-dev \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
    AttributeName=GSI2SK,AttributeType=S \
    AttributeName=GSI3PK,AttributeType=S \
    AttributeName=GSI3SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"GSI1\",
        \"KeySchema\": [{\"AttributeName\":\"GSI1PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI1SK\",\"KeyType\":\"RANGE\"}],
        \"Projection\":{\"ProjectionType\":\"ALL\"}
      },
      {
        \"IndexName\": \"GSI2\",
        \"KeySchema\": [{\"AttributeName\":\"GSI2PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI2SK\",\"KeyType\":\"RANGE\"}],
        \"Projection\":{\"ProjectionType\":\"ALL\"}
      },
      {
        \"IndexName\": \"GSI3\",
        \"KeySchema\": [{\"AttributeName\":\"GSI3PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI3SK\",\"KeyType\":\"RANGE\"}],
        \"Projection\":{\"ProjectionType\":\"ALL\"}
      }
    ]" \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --sse-specification Enabled=true \
  --region eu-west-2 \
  --profile nots-dev
```

**2. S3 Buckets**
```bash
# Documents bucket
aws s3 mb s3://nots-documents-dev --region eu-west-2 --profile nots-dev
aws s3api put-bucket-encryption \
  --bucket nots-documents-dev \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  --profile nots-dev

# Website hosting bucket
aws s3 mb s3://nots-website-dev --region eu-west-2 --profile nots-dev
```

**3. Cognito User Pool**
```bash
aws cognito-idp create-user-pool \
  --pool-name nots-users-dev \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":true}}' \
  --auto-verified-attributes email \
  --mfa-configuration OPTIONAL \
  --region eu-west-2 \
  --profile nots-dev
```

**4. Secrets Manager**
```bash
aws secretsmanager create-secret \
  --name nots/stripe/secret-key-dev \
  --secret-string "sk_test_..." \
  --region eu-west-2 \
  --profile nots-dev

aws secretsmanager create-secret \
  --name nots/google/maps-api-key-dev \
  --secret-string "AIza..." \
  --region eu-west-2 \
  --profile nots-dev
```

### 4.2 SAM Template Deployment

**SAM Template Structure:**
```
nots-serverless-api/
├── template.yaml                 # SAM template
├── samconfig.toml                # Deployment config
├── functions/
│   ├── quotes-calculator/
│   │   ├── index.js
│   │   └── package.json
│   ├── bookings-create/
│   │   ├── index.js
│   │   └── package.json
│   └── ...
└── layers/
    └── shared-libs/
        └── nodejs/
            └── node_modules/
```

**Build and Deploy:**
```bash
cd nots-serverless-api

# Build Lambda functions
sam build

# Deploy to dev
sam deploy --config-env dev --profile nots-dev

# Deploy to production
sam deploy --config-env production --profile nots-prod
```

**samconfig.toml:**
```toml
version = 0.1

[dev.deploy.parameters]
stack_name = "nots-api-dev"
s3_bucket = "nots-sam-deployments-dev"
s3_prefix = "nots-api"
region = "eu-west-2"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=dev TableName=nots-main-table-dev"

[production.deploy.parameters]
stack_name = "nots-api-production"
s3_bucket = "nots-sam-deployments-prod"
s3_prefix = "nots-api"
region = "eu-west-2"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=production TableName=nots-main-table-production"
```

---

## 5. Application Deployment

### 5.1 Lambda Functions

**Manual Deployment (Single Function):**
```bash
cd nots-serverless-api/functions/quotes-calculator

# Install dependencies
npm install --production

# Create deployment package
zip -r function.zip .

# Upload to Lambda
aws lambda update-function-code \
  --function-name nots-quotes-calculator-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2 \
  --profile nots-dev

# Update environment variables
aws lambda update-function-configuration \
  --function-name nots-quotes-calculator-dev \
  --environment Variables="{DYNAMODB_TABLE=nots-main-table-dev,GOOGLE_MAPS_API_KEY=AIza...}" \
  --region eu-west-2 \
  --profile nots-dev
```

**SAM Deployment (All Functions):**
```bash
sam build && sam deploy --config-env dev --profile nots-dev
```

### 5.2 Frontend Deployment (Next.js Website)

**Build and Deploy to S3 + CloudFront:**
```bash
cd nots-website

# Install dependencies
npm install

# Build production bundle
npm run build

# Deploy to S3
aws s3 sync out/ s3://nots-website-dev --delete --profile nots-dev

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*" \
  --profile nots-dev
```

**Automated Deployment (GitHub Actions):**
See Section 6.2

### 5.3 Admin Dashboard (React + Vite)

**Build and Deploy:**
```bash
cd nots-dashboard

# Install dependencies
npm install

# Build production bundle
npm run build

# Deploy to S3
aws s3 sync dist/ s3://nots-dashboard-dev --delete --profile nots-dev

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E0987654321XYZ \
  --paths "/*" \
  --profile nots-dev
```

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Workflow

**File:** `.github/workflows/deploy-api.yml`

```yaml
name: Deploy API to AWS

on:
  push:
    branches:
      - main
      - staging
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Setup AWS SAM
        uses: aws-actions/setup-sam@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-2

      - name: Determine environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
          else
            echo "environment=dev" >> $GITHUB_OUTPUT
          fi

      - name: Run tests
        run: npm test

      - name: SAM build
        run: sam build

      - name: SAM deploy
        run: sam deploy --config-env ${{ steps.env.outputs.environment }} --no-confirm-changeset --no-fail-on-empty-changeset
```

**File:** `.github/workflows/deploy-website.yml`

```yaml
name: Deploy Website to S3

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: https://api.nots.co.uk/v1

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-2

      - name: Deploy to S3
        run: aws s3 sync out/ s3://nots-website-production --delete

      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

### 6.2 GitHub Secrets Configuration

**Required Secrets:**
- `AWS_ACCESS_KEY_ID` - AWS IAM user access key
- `AWS_SECRET_ACCESS_KEY` - AWS IAM user secret key
- `CLOUDFRONT_DISTRIBUTION_ID` - CloudFront distribution ID
- `STRIPE_SECRET_KEY` - Stripe secret key
- `GOOGLE_MAPS_API_KEY` - Google Maps API key

**Add secrets via GitHub:**
Settings → Secrets and variables → Actions → New repository secret

---

## 7. Database Operations

### 7.1 Data Migration

**Export Data from DynamoDB:**
```bash
aws dynamodb scan \
  --table-name nots-main-table-dev \
  --region eu-west-2 \
  --profile nots-dev \
  > backup.json
```

**Import Data to DynamoDB:**
```bash
aws dynamodb batch-write-item \
  --request-items file://import.json \
  --region eu-west-2 \
  --profile nots-dev
```

### 7.2 Backup and Restore

**On-Demand Backup:**
```bash
aws dynamodb create-backup \
  --table-name nots-main-table-production \
  --backup-name nots-backup-$(date +%Y%m%d-%H%M%S) \
  --region eu-west-2 \
  --profile nots-prod
```

**Restore from Backup:**
```bash
aws dynamodb restore-table-from-backup \
  --target-table-name nots-main-table-restored \
  --backup-arn arn:aws:dynamodb:eu-west-2:123456789012:table/nots-main-table-production/backup/01234567890123-abcdef12 \
  --region eu-west-2 \
  --profile nots-prod
```

**Point-in-Time Recovery (PITR):**
```bash
aws dynamodb restore-table-to-point-in-time \
  --source-table-name nots-main-table-production \
  --target-table-name nots-main-table-restored \
  --restore-date-time 2025-12-04T10:00:00Z \
  --region eu-west-2 \
  --profile nots-prod
```

### 7.3 Database Schema Updates

**Adding New Attributes:**
- No migration needed (DynamoDB is schemaless)
- Update application code to write new attributes

**Adding New GSI:**
```bash
aws dynamodb update-table \
  --table-name nots-main-table-dev \
  --attribute-definitions AttributeName=GSI4PK,AttributeType=S AttributeName=GSI4SK,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"GSI4\",\"KeySchema\":[{\"AttributeName\":\"GSI4PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI4SK\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]" \
  --region eu-west-2 \
  --profile nots-dev
```

---

## 8. Monitoring & Observability

### 8.1 CloudWatch Dashboard

**Create Dashboard:**
```bash
aws cloudwatch put-dashboard \
  --dashboard-name nots-operations \
  --dashboard-body file://dashboard.json \
  --region eu-west-2 \
  --profile nots-prod
```

**Dashboard Widgets:**
- API Gateway: Request count, error rate (4xx, 5xx), latency
- Lambda: Invocations, errors, duration, throttles
- DynamoDB: Consumed capacity, throttles
- SQS: Messages sent, received, queue depth

### 8.2 CloudWatch Alarms

**Create Alarm for API Errors:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name nots-api-5xx-errors \
  --alarm-description "Alert when API has 5xx errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=ApiName,Value=nots-api-production \
  --alarm-actions arn:aws:sns:eu-west-2:123456789012:nots-alerts \
  --region eu-west-2 \
  --profile nots-prod
```

**Create SNS Topic for Alerts:**
```bash
aws sns create-topic \
  --name nots-alerts \
  --region eu-west-2 \
  --profile nots-prod

aws sns subscribe \
  --topic-arn arn:aws:sns:eu-west-2:123456789012:nots-alerts \
  --protocol email \
  --notification-endpoint devops@nots.co.uk \
  --region eu-west-2 \
  --profile nots-prod
```

### 8.3 X-Ray Tracing

**Enable X-Ray on Lambda:**
```bash
aws lambda update-function-configuration \
  --function-name nots-quotes-calculator-production \
  --tracing-config Mode=Active \
  --region eu-west-2 \
  --profile nots-prod
```

**View Traces:**
```bash
aws xray get-trace-summaries \
  --start-time 2025-12-04T00:00:00 \
  --end-time 2025-12-04T23:59:59 \
  --region eu-west-2 \
  --profile nots-prod
```

### 8.4 Logging

**View Lambda Logs:**
```bash
aws logs tail /aws/lambda/nots-quotes-calculator-production \
  --follow \
  --region eu-west-2 \
  --profile nots-prod
```

**Query Logs with Insights:**
```bash
aws logs start-query \
  --log-group-name /aws/lambda/nots-quotes-calculator-production \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20' \
  --region eu-west-2 \
  --profile nots-prod
```

---

## 9. Operational Procedures

### 9.1 Rollback Procedure

**Lambda Rollback:**
```bash
# List function versions
aws lambda list-versions-by-function \
  --function-name nots-quotes-calculator-production \
  --region eu-west-2 \
  --profile nots-prod

# Rollback to previous version
aws lambda update-alias \
  --function-name nots-quotes-calculator-production \
  --name live \
  --function-version 23 \
  --region eu-west-2 \
  --profile nots-prod
```

**Frontend Rollback:**
```bash
# List CloudFront invalidations
aws cloudfront list-invalidations \
  --distribution-id E1234567890ABC \
  --region eu-west-2 \
  --profile nots-prod

# Redeploy previous version from Git
git checkout <previous-commit>
npm run build
aws s3 sync out/ s3://nots-website-production --delete
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
```

### 9.2 Scaling Operations

**Increase Lambda Concurrency:**
```bash
aws lambda put-function-concurrency \
  --function-name nots-quotes-calculator-production \
  --reserved-concurrent-executions 100 \
  --region eu-west-2 \
  --profile nots-prod
```

**Switch DynamoDB to Provisioned Capacity:**
```bash
aws dynamodb update-table \
  --table-name nots-main-table-production \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=50 \
  --region eu-west-2 \
  --profile nots-prod
```

### 9.3 Disaster Recovery

**Scenario: Complete Region Failure**

1. **Enable DR Region (eu-west-1):**
   - DynamoDB global tables (cross-region replication)
   - S3 cross-region replication
   - Route 53 health checks

2. **Failover Procedure:**
```bash
# Update Route 53 to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://failover.json \
  --profile nots-prod
```

**failover.json:**
```json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.nots.co.uk",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z0987654321XYZ",
          "DNSName": "d111111abcdef8.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
```

3. **Recovery Time Objective (RTO):** 4 hours
4. **Recovery Point Objective (RPO):** 1 hour (PITR)

---

## 10. Maintenance Windows

### 10.1 Scheduled Maintenance

**Frequency:** Monthly (first Sunday, 02:00-04:00 GMT)

**Pre-Maintenance Checklist:**
- [ ] Notify customers via email (7 days notice)
- [ ] Create on-demand backup of DynamoDB
- [ ] Backup CloudFormation/SAM templates
- [ ] Test rollback procedure in staging

**Maintenance Activities:**
- Dependency updates (npm packages)
- Lambda runtime updates
- Security patches
- Database optimization

**Post-Maintenance Checklist:**
- [ ] Run smoke tests
- [ ] Monitor CloudWatch alarms for 1 hour
- [ ] Update runbook with any issues encountered
- [ ] Send all-clear notification

### 10.2 Emergency Maintenance

**Trigger:** Critical security vulnerability or complete outage

**Procedure:**
1. Notify team immediately (Slack/SMS)
2. Enable maintenance mode banner on website
3. Apply fix to staging first
4. Validate fix
5. Deploy to production
6. Monitor for 30 minutes
7. Send incident report within 24 hours

---

## 11. Troubleshooting

### 11.1 Common Issues

**Issue: API Gateway returns 502 Bad Gateway**

**Cause:** Lambda function timeout or error

**Solution:**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/nots-quotes-calculator-production --follow

# Check Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=nots-quotes-calculator-production \
  --start-time 2025-12-04T14:00:00Z \
  --end-time 2025-12-04T15:00:00Z \
  --period 300 \
  --statistics Sum
```

---

**Issue: DynamoDB throttling errors**

**Cause:** Exceeded on-demand capacity limits

**Solution:**
```bash
# Check consumed capacity
aws dynamodb describe-table \
  --table-name nots-main-table-production \
  --region eu-west-2 \
  --profile nots-prod

# Implement exponential backoff in application code
# Consider switching to provisioned capacity
```

---

**Issue: Stripe webhook not received**

**Cause:** Webhook endpoint down or signature mismatch

**Solution:**
```bash
# Check webhook endpoint status
curl -X POST https://api.nots.co.uk/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verify webhook secret in Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id nots/stripe/webhook-secret-production \
  --region eu-west-2 \
  --profile nots-prod

# Resend webhook from Stripe Dashboard
```

---

**Issue: CloudFront serving stale content**

**Cause:** Cache not invalidated after deployment

**Solution:**
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*" \
  --region eu-west-2 \
  --profile nots-prod
```

---

**Issue: High Lambda costs**

**Cause:** Over-provisioned memory or high invocation count

**Solution:**
```bash
# Analyze Lambda costs
aws ce get-cost-and-usage \
  --time-period Start=2025-12-01,End=2025-12-04 \
  --granularity DAILY \
  --metrics BlendedCost \
  --filter file://lambda-filter.json

# Optimize memory allocation (use Lambda Power Tuning tool)
# Implement caching to reduce invocations
```

---

## 12. Security Operations

### 12.1 Rotate Secrets

**Rotate Stripe Secret Key:**
```bash
# Generate new key in Stripe Dashboard
# Update Secrets Manager
aws secretsmanager update-secret \
  --secret-id nots/stripe/secret-key-production \
  --secret-string "sk_live_new..." \
  --region eu-west-2 \
  --profile nots-prod

# Restart Lambda functions (or wait for next invocation)
```

### 12.2 Access Key Rotation

**Rotate IAM Access Keys:**
```bash
# Create new access key
aws iam create-access-key --user-name nots-ci-user

# Update GitHub secrets with new key
# Delete old access key
aws iam delete-access-key --user-name nots-ci-user --access-key-id AKIAIOSFODNN7EXAMPLE
```

### 12.3 Review CloudTrail Logs

**Check for suspicious activity:**
```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteTable \
  --start-time 2025-12-01T00:00:00Z \
  --end-time 2025-12-04T23:59:59Z \
  --region eu-west-2 \
  --profile nots-prod
```

---

## 13. Performance Optimization

### 13.1 Lambda Optimization

**Monitor Cold Starts:**
- Use CloudWatch Insights to identify cold start latency
- Consider Provisioned Concurrency for high-traffic functions

**Optimize Bundle Size:**
```bash
# Analyze bundle size
cd nots-serverless-api/functions/quotes-calculator
npm install --production
du -sh node_modules

# Use Lambda Layers for shared dependencies
```

### 13.2 DynamoDB Optimization

**Monitor Hot Partitions:**
- Use CloudWatch Contributor Insights
- Redesign partition key if needed

**Optimize Query Patterns:**
- Use projections to reduce data transfer
- Batch read/write operations

### 13.3 CloudFront Optimization

**Cache Hit Ratio:**
- Monitor cache hit ratio in CloudWatch
- Configure cache behaviors for static assets

---

## 14. Cost Management

### 14.1 Monthly Cost Review

**Generate Cost Report:**
```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-12-01,End=2025-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --profile nots-prod
```

### 14.2 Cost Optimization Tips

- Use S3 Intelligent-Tiering for documents
- Enable DynamoDB auto-scaling
- Use Lambda arm64 architecture (cheaper)
- Clean up unused CloudWatch log groups
- Delete old DynamoDB backups

---

## 15. Checklist: Production Deployment

**Before Deployment:**
- [ ] All tests pass (unit, integration, e2e)
- [ ] Code review approved
- [ ] Security scan completed (no critical vulnerabilities)
- [ ] Staging deployment successful
- [ ] UAT signed off
- [ ] Database backup created
- [ ] Rollback plan documented

**During Deployment:**
- [ ] Deploy Lambda functions via SAM
- [ ] Deploy frontend to S3 + invalidate CloudFront
- [ ] Run database migrations (if any)
- [ ] Update environment variables
- [ ] Verify deployment via smoke tests

**After Deployment:**
- [ ] Monitor CloudWatch alarms for 1 hour
- [ ] Check error rates and latency
- [ ] Test critical user flows (quote, booking, payment)
- [ ] Announce deployment in Slack
- [ ] Update changelog

**If Issues Occur:**
- [ ] Rollback immediately
- [ ] Notify team
- [ ] Investigate root cause
- [ ] Document incident

---

## 16. Contact Information

**On-Call Rotation:**
- **Week 1:** [Name] - [Phone] - [Email]
- **Week 2:** [Name] - [Phone] - [Email]

**Escalation:**
- **Technical Lead:** [Name] - [Phone]
- **CTO:** [Name] - [Phone]

**External Support:**
- **AWS Support:** https://console.aws.amazon.com/support/
- **Stripe Support:** https://support.stripe.com/

---

## 17. References

- [TechnicalArchitecture.md](TechnicalArchitecture.md)
- [APISpecification.md](APISpecification.md)
- [SecurityCompliance.md](SecurityCompliance.md)
- AWS SAM Documentation: https://docs.aws.amazon.com/serverless-application-model/
- AWS Lambda Best Practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html

---

**Document Owner:** DevOps Lead
**Review Cycle:** Monthly or after incidents
