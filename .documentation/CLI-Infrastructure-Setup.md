# NOTS Platform - CLI Infrastructure Setup Guide

**Version:** 1.0
**Last Updated:** 2025-12-04
**Approach:** Direct AWS CLI (No SAM/CloudFormation)
**Purpose:** Rapid MVP deployment, convert to IaC later

---

## Overview

This guide builds NOTS infrastructure directly using AWS CLI. No YAML, no SAM wrestling. Just working infrastructure.

**Philosophy:**
- Build it manually first
- Get it working
- Document everything
- Convert to IaC when stable (Phase 2)

**Estimated Time:** 2-3 hours for complete infrastructure setup

---

## Prerequisites

**Required:**
```bash
# Verify installations
aws --version              # AWS CLI v2
node --version             # v20.x
npm --version              # v10.x
```

**AWS Profile Setup:**
```bash
aws configure --profile nots-dev
# AWS Access Key ID: [from IAM]
# AWS Secret Access Key: [from IAM]
# Default region: eu-west-2
# Default output format: json

# Test it
aws sts get-caller-identity --profile nots-dev
```

**Environment Variables (save in .env.local):**
```bash
export AWS_PROFILE=nots-dev
export AWS_REGION=eu-west-2
export NOTS_ENV=dev
```

---

## Step 1: Core Infrastructure (15 minutes)

### 1.1 Create DynamoDB Table

**Command:**
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
    '[
      {
        "IndexName": "GSI1",
        "KeySchema": [
          {"AttributeName":"GSI1PK","KeyType":"HASH"},
          {"AttributeName":"GSI1SK","KeyType":"RANGE"}
        ],
        "Projection":{"ProjectionType":"ALL"}
      },
      {
        "IndexName": "GSI2",
        "KeySchema": [
          {"AttributeName":"GSI2PK","KeyType":"HASH"},
          {"AttributeName":"GSI2SK","KeyType":"RANGE"}
        ],
        "Projection":{"ProjectionType":"ALL"}
      },
      {
        "IndexName": "GSI3",
        "KeySchema": [
          {"AttributeName":"GSI3PK","KeyType":"HASH"},
          {"AttributeName":"GSI3SK","KeyType":"RANGE"}
        ],
        "Projection":{"ProjectionType":"ALL"}
      }
    ]' \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --sse-specification Enabled=true \
  --tags Key=Environment,Value=dev Key=Project,Value=NOTS \
  --region eu-west-2 \
  --profile nots-dev

# Wait for table to be active
aws dynamodb wait table-exists --table-name nots-main-table-dev --profile nots-dev

# Verify
aws dynamodb describe-table --table-name nots-main-table-dev --profile nots-dev | grep TableStatus
```

**Save table ARN:**
```bash
aws dynamodb describe-table --table-name nots-main-table-dev --query 'Table.TableArn' --output text --profile nots-dev
# Save this: arn:aws:dynamodb:eu-west-2:123456789012:table/nots-main-table-dev
```

---

### 1.2 Create S3 Buckets

**Documents Bucket:**
```bash
# Create bucket
aws s3 mb s3://nots-documents-dev --region eu-west-2 --profile nots-dev

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket nots-documents-dev \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --profile nots-dev

# Block public access
aws s3api put-public-access-block \
  --bucket nots-documents-dev \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile nots-dev

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket nots-documents-dev \
  --versioning-configuration Status=Enabled \
  --profile nots-dev

# Add tags
aws s3api put-bucket-tagging \
  --bucket nots-documents-dev \
  --tagging 'TagSet=[{Key=Environment,Value=dev},{Key=Project,Value=NOTS}]' \
  --profile nots-dev

echo "Documents bucket created: s3://nots-documents-dev"
```

**Lambda Deployment Bucket:**
```bash
aws s3 mb s3://nots-lambda-deployments-dev --region eu-west-2 --profile nots-dev
aws s3api put-bucket-encryption \
  --bucket nots-lambda-deployments-dev \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --profile nots-dev

echo "Lambda deployment bucket created: s3://nots-lambda-deployments-dev"
```

---

### 1.3 Create Cognito User Pool

**Create User Pool:**
```bash
aws cognito-idp create-user-pool \
  --pool-name nots-users-dev \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  }' \
  --auto-verified-attributes email \
  --mfa-configuration OPTIONAL \
  --email-configuration EmailSendingAccount=COGNITO_DEFAULT \
  --user-pool-tags Environment=dev,Project=NOTS \
  --region eu-west-2 \
  --profile nots-dev \
  --output json > cognito-pool.json

# Extract User Pool ID
USER_POOL_ID=$(cat cognito-pool.json | grep -o '"Id": "[^"]*"' | head -1 | sed 's/"Id": "\(.*\)"/\1/')
echo "User Pool ID: $USER_POOL_ID"
echo "Save this: $USER_POOL_ID"
```

**Create User Pool Client:**
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-name nots-web-client-dev \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --read-attributes email given_name family_name phone_number \
  --write-attributes email given_name family_name phone_number \
  --region eu-west-2 \
  --profile nots-dev \
  --output json > cognito-client.json

# Extract Client ID
CLIENT_ID=$(cat cognito-client.json | grep -o '"ClientId": "[^"]*"' | sed 's/"ClientId": "\(.*\)"/\1/')
echo "Client ID: $CLIENT_ID"
echo "Save this: $CLIENT_ID"
```

**Create User Groups:**
```bash
# Customer group
aws cognito-idp create-group \
  --group-name customers \
  --user-pool-id $USER_POOL_ID \
  --description "Regular customers" \
  --region eu-west-2 \
  --profile nots-dev

# Driver group
aws cognito-idp create-group \
  --group-name drivers \
  --user-pool-id $USER_POOL_ID \
  --description "Drivers" \
  --region eu-west-2 \
  --profile nots-dev

# Admin group
aws cognito-idp create-group \
  --group-name admins \
  --user-pool-id $USER_POOL_ID \
  --description "Platform administrators" \
  --region eu-west-2 \
  --profile nots-dev

echo "Cognito User Pool created with 3 groups"
```

---

### 1.4 Store Secrets in Secrets Manager

**Stripe Secret Key:**
```bash
aws secretsmanager create-secret \
  --name nots/stripe/secret-key-dev \
  --description "Stripe secret key for dev environment" \
  --secret-string "sk_test_YOUR_STRIPE_TEST_KEY_HERE" \
  --tags Key=Environment,Value=dev Key=Project,Value=NOTS \
  --region eu-west-2 \
  --profile nots-dev

echo "Stripe secret stored (update with real key later)"
```

**Google Maps API Key:**
```bash
aws secretsmanager create-secret \
  --name nots/google/maps-api-key-dev \
  --description "Google Maps API key" \
  --secret-string "YOUR_GOOGLE_MAPS_API_KEY_HERE" \
  --tags Key=Environment,Value=dev Key=Project,Value=NOTS \
  --region eu-west-2 \
  --profile nots-dev

echo "Google Maps secret stored (update with real key later)"
```

**Update secrets later:**
```bash
# When you have real keys
aws secretsmanager update-secret \
  --secret-id nots/stripe/secret-key-dev \
  --secret-string "sk_test_actual_key" \
  --profile nots-dev
```

---

## Step 2: IAM Roles for Lambda (10 minutes)

### 2.1 Create Lambda Execution Role

**Trust Policy (save as lambda-trust-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Create Role:**
```bash
# Create trust policy file
cat > lambda-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name nots-lambda-execution-role-dev \
  --assume-role-policy-document file://lambda-trust-policy.json \
  --tags Key=Environment,Value=dev Key=Project,Value=NOTS \
  --profile nots-dev

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name nots-lambda-execution-role-dev \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  --profile nots-dev

# Attach X-Ray daemon write access
aws iam attach-role-policy \
  --role-name nots-lambda-execution-role-dev \
  --policy-arn arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess \
  --profile nots-dev

echo "Lambda execution role created"
```

### 2.2 Create Custom Policy for DynamoDB + Secrets

**Policy Document (save as lambda-permissions-policy.json):**
```bash
cat > lambda-permissions-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:eu-west-2:*:table/nots-main-table-dev",
        "arn:aws:dynamodb:eu-west-2:*:table/nots-main-table-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:eu-west-2:*:secret:nots/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::nots-documents-dev/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name nots-lambda-permissions-dev \
  --policy-document file://lambda-permissions-policy.json \
  --description "Permissions for NOTS Lambda functions" \
  --tags Key=Environment,Value=dev Key=Project,Value=NOTS \
  --profile nots-dev \
  --output json > lambda-policy.json

# Get policy ARN
POLICY_ARN=$(cat lambda-policy.json | grep -o '"Arn": "[^"]*"' | sed 's/"Arn": "\(.*\)"/\1/')
echo "Policy ARN: $POLICY_ARN"

# Attach to role
aws iam attach-role-policy \
  --role-name nots-lambda-execution-role-dev \
  --policy-arn $POLICY_ARN \
  --profile nots-dev

echo "Lambda permissions policy attached"
```

**Get Role ARN (save this):**
```bash
aws iam get-role \
  --role-name nots-lambda-execution-role-dev \
  --query 'Role.Arn' \
  --output text \
  --profile nots-dev

# Save this: arn:aws:iam::123456789012:role/nots-lambda-execution-role-dev
```

---

## Step 3: Create API Gateway (15 minutes)

### 3.1 Create REST API

```bash
# Create API
aws apigateway create-rest-api \
  --name nots-api-dev \
  --description "NOTS Platform API - Dev Environment" \
  --endpoint-configuration types=REGIONAL \
  --tags Environment=dev,Project=NOTS \
  --region eu-west-2 \
  --profile nots-dev \
  --output json > api-gateway.json

# Get API ID
API_ID=$(cat api-gateway.json | grep -o '"id": "[^"]*"' | head -1 | sed 's/"id": "\(.*\)"/\1/')
echo "API Gateway ID: $API_ID"
echo "Save this: $API_ID"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region eu-west-2 --profile nots-dev | grep -o '"id": "[^"]*"' | head -1 | sed 's/"id": "\(.*\)"/\1/')
echo "Root Resource ID: $ROOT_RESOURCE_ID"
```

### 3.2 Create /v1 Resource

```bash
# Create /v1 resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part v1 \
  --region eu-west-2 \
  --profile nots-dev \
  --output json > v1-resource.json

V1_RESOURCE_ID=$(cat v1-resource.json | grep -o '"id": "[^"]*"' | sed 's/"id": "\(.*\)"/\1/')
echo "V1 Resource ID: $V1_RESOURCE_ID"
```

### 3.3 Create /v1/quotes Resource

```bash
# Create /quotes resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $V1_RESOURCE_ID \
  --path-part quotes \
  --region eu-west-2 \
  --profile nots-dev \
  --output json > quotes-resource.json

QUOTES_RESOURCE_ID=$(cat quotes-resource.json | grep -o '"id": "[^"]*"' | sed 's/"id": "\(.*\)"/\1/')
echo "Quotes Resource ID: $QUOTES_RESOURCE_ID"
```

**Note:** We'll connect Lambda functions to API Gateway in Step 5 after creating the Lambdas

---

## Step 4: Create Your First Lambda Function (20 minutes)

### 4.1 Create Quote Calculator Lambda

**Project Structure:**
```bash
mkdir -p ~/nots-lambdas/quotes-calculator
cd ~/nots-lambdas/quotes-calculator
```

**Initialize NPM:**
```bash
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-secrets-manager axios
```

**Create index.js:**
```javascript
// index.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const axios = require('axios');

const dynamoClient = new DynamoDBClient({ region: 'eu-west-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: 'eu-west-2' });

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'nots-main-table-dev';

// Cache for API key
let googleMapsApiKey = null;

async function getGoogleMapsApiKey() {
  if (googleMapsApiKey) return googleMapsApiKey;

  const command = new GetSecretValueCommand({
    SecretId: process.env.GOOGLE_MAPS_SECRET_NAME || 'nots/google/maps-api-key-dev'
  });

  const response = await secretsClient.send(command);
  googleMapsApiKey = response.SecretString;
  return googleMapsApiKey;
}

async function calculateRoute(origin, destination) {
  const apiKey = await getGoogleMapsApiKey();

  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  const params = {
    origins: origin,
    destinations: destination,
    key: apiKey,
    units: 'imperial'
  };

  const response = await axios.get(url, { params });

  if (response.data.rows[0].elements[0].status !== 'OK') {
    throw new Error('Invalid address or route not possible');
  }

  const element = response.data.rows[0].elements[0];

  return {
    distance: {
      meters: element.distance.value,
      miles: Math.round(element.distance.value * 0.000621371 * 100) / 100,
      text: element.distance.text
    },
    duration: {
      seconds: element.duration.value,
      minutes: Math.round(element.duration.value / 60),
      text: element.duration.text
    }
  };
}

function calculatePricing(distance, duration, vehicleType = 'standard') {
  // Pricing configuration
  const baseFare = 500; // £5.00 in pence
  const perMileRate = 100; // £1.00 per mile
  const perMinuteRate = 10; // £0.10 per minute
  const minimumFare = 800; // £8.00

  const vehicleMultipliers = {
    standard: 1.0,
    executive: 1.5,
    minibus: 2.0
  };

  const multiplier = vehicleMultipliers[vehicleType] || 1.0;

  const distanceCharge = Math.round(distance.miles * perMileRate);
  const timeCharge = Math.round(duration.minutes * perMinuteRate);
  const subtotal = Math.round((baseFare + distanceCharge + timeCharge) * multiplier);
  const total = Math.max(subtotal, minimumFare);

  return {
    currency: 'GBP',
    breakdown: {
      baseFare,
      distanceCharge,
      timeCharge,
      subtotal,
      tax: 0,
      total
    },
    displayTotal: `£${(total / 100).toFixed(2)}`
  };
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.pickupLocation?.address || !body.dropoffLocation?.address) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Pickup and dropoff locations are required'
          }
        })
      };
    }

    // Calculate route
    const journey = await calculateRoute(
      body.pickupLocation.address,
      body.dropoffLocation.address
    );

    // Calculate pricing
    const pricing = calculatePricing(
      journey.distance,
      journey.duration,
      body.vehicleType || 'standard'
    );

    // Generate quote ID
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 900; // 15 minutes

    // Save quote to DynamoDB
    const quote = {
      PK: `QUOTE#${quoteId}`,
      SK: 'METADATA',
      EntityType: 'Quote',
      Data: {
        quoteId,
        status: 'valid',
        pickupLocation: body.pickupLocation,
        dropoffLocation: body.dropoffLocation,
        pickupTime: body.pickupTime,
        journey,
        pricing,
        vehicleType: body.vehicleType || 'standard',
        passengers: body.passengers || 1,
        returnJourney: body.returnJourney || false
      },
      CreatedAt: now,
      UpdatedAt: now,
      TTL: expiresAt
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: quote
    }));

    // Return response
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        quoteId,
        status: 'valid',
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        journey,
        pricing,
        vehicleType: body.vehicleType || 'standard',
        returnJourney: body.returnJourney || false,
        createdAt: new Date(now * 1000).toISOString()
      })
    };

  } catch (error) {
    console.error('Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      })
    };
  }
};
```

**Package and Deploy:**
```bash
# Package
zip -r function.zip index.js node_modules package.json

# Upload to S3
aws s3 cp function.zip s3://nots-lambda-deployments-dev/quotes-calculator/function.zip --profile nots-dev

# Create Lambda function
LAMBDA_ROLE_ARN=$(aws iam get-role --role-name nots-lambda-execution-role-dev --query 'Role.Arn' --output text --profile nots-dev)

aws lambda create-function \
  --function-name nots-quotes-calculator-dev \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --code S3Bucket=nots-lambda-deployments-dev,S3Key=quotes-calculator/function.zip \
  --timeout 10 \
  --memory-size 512 \
  --environment "Variables={DYNAMODB_TABLE=nots-main-table-dev,GOOGLE_MAPS_SECRET_NAME=nots/google/maps-api-key-dev}" \
  --tracing-config Mode=Active \
  --tags Environment=dev,Project=NOTS \
  --region eu-west-2 \
  --profile nots-dev

echo "Lambda function created: nots-quotes-calculator-dev"
```

---

## Step 5: Connect Lambda to API Gateway (10 minutes)

### 5.1 Add POST Method to /quotes

```bash
# Create POST method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  --request-parameters method.request.header.Content-Type=true \
  --region eu-west-2 \
  --profile nots-dev

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function --function-name nots-quotes-calculator-dev --query 'Configuration.FunctionArn' --output text --region eu-west-2 --profile nots-dev)

# Set up Lambda integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:eu-west-2:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
  --region eu-west-2 \
  --profile nots-dev

# Grant API Gateway permission to invoke Lambda
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile nots-dev)

aws lambda add-permission \
  --function-name nots-quotes-calculator-dev \
  --statement-id apigateway-invoke-quotes-calculator \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:eu-west-2:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
  --region eu-west-2 \
  --profile nots-dev

echo "Lambda connected to API Gateway"
```

### 5.2 Enable CORS

```bash
# Add OPTIONS method for CORS
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region eu-west-2 \
  --profile nots-dev

# Mock integration for OPTIONS
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
  --region eu-west-2 \
  --profile nots-dev

# Method response for OPTIONS
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    method.response.header.Access-Control-Allow-Headers=true,\
method.response.header.Access-Control-Allow-Methods=true,\
method.response.header.Access-Control-Allow-Origin=true \
  --region eu-west-2 \
  --profile nots-dev

# Integration response for OPTIONS
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    "method.response.header.Access-Control-Allow-Headers='Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',\
method.response.header.Access-Control-Allow-Methods='POST,OPTIONS',\
method.response.header.Access-Control-Allow-Origin='*'" \
  --region eu-west-2 \
  --profile nots-dev

echo "CORS enabled"
```

---

## Step 6: Deploy API Gateway (5 minutes)

```bash
# Create deployment
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name dev \
  --stage-description "Dev environment" \
  --description "Initial deployment" \
  --region eu-west-2 \
  --profile nots-dev

# Get API endpoint
echo ""
echo "====================================="
echo "API Gateway Endpoint:"
echo "https://${API_ID}.execute-api.eu-west-2.amazonaws.com/dev"
echo "====================================="
echo ""
echo "Test endpoint:"
echo "curl -X POST https://${API_ID}.execute-api.eu-west-2.amazonaws.com/dev/v1/quotes \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{
    \"pickupLocation\": {\"address\": \"Bournemouth Railway Station, UK\"},
    \"dropoffLocation\": {\"address\": \"Poole Harbour, UK\"},
    \"pickupTime\": \"2025-12-10T14:30:00Z\",
    \"passengers\": 2,
    \"vehicleType\": \"standard\"
  }'"
```

---

## Step 7: Summary & Save Configuration

**Create config file (save as nots-config-dev.sh):**
```bash
cat > nots-config-dev.sh << EOF
#!/bin/bash
# NOTS Development Environment Configuration
# Generated: $(date)

export AWS_PROFILE=nots-dev
export AWS_REGION=eu-west-2
export NOTS_ENV=dev

# DynamoDB
export DYNAMODB_TABLE=nots-main-table-dev

# Cognito
export USER_POOL_ID=$USER_POOL_ID
export CLIENT_ID=$CLIENT_ID

# API Gateway
export API_ID=$API_ID
export API_ENDPOINT=https://${API_ID}.execute-api.eu-west-2.amazonaws.com/dev

# S3 Buckets
export DOCUMENTS_BUCKET=nots-documents-dev
export LAMBDA_BUCKET=nots-lambda-deployments-dev

# IAM
export LAMBDA_ROLE_ARN=$LAMBDA_ROLE_ARN

echo "NOTS Dev environment configured"
EOF

chmod +x nots-config-dev.sh

echo ""
echo "Configuration saved to: nots-config-dev.sh"
echo "Load it with: source nots-config-dev.sh"
```

---

## Step 8: Test Your API

```bash
# Test the quote calculator
curl -X POST https://${API_ID}.execute-api.eu-west-2.amazonaws.com/dev/v1/quotes \
  -H 'Content-Type: application/json' \
  -d '{
    "pickupLocation": {"address": "Bournemouth Railway Station, UK"},
    "dropoffLocation": {"address": "Poole Harbour, UK"},
    "pickupTime": "2025-12-10T14:30:00Z",
    "passengers": 2,
    "vehicleType": "standard"
  }'

# Should return quote with pricing
```

---

## Next Steps

**You now have:**
- ✅ DynamoDB table with 3 GSIs
- ✅ S3 buckets for documents and Lambda deployments
- ✅ Cognito User Pool with groups
- ✅ Secrets Manager with API keys
- ✅ IAM role for Lambda
- ✅ API Gateway with /v1/quotes endpoint
- ✅ Working quote calculator Lambda function

**Build next:**
1. Create more Lambda functions (bookings, payments, drivers)
2. Set up Amplify for Next.js website
3. Build React admin dashboard
4. Connect frontend to API

---

## Quick Reference Commands

**Update Lambda function:**
```bash
cd ~/nots-lambdas/quotes-calculator
zip -r function.zip index.js node_modules package.json
aws lambda update-function-code \
  --function-name nots-quotes-calculator-dev \
  --zip-file fileb://function.zip \
  --profile nots-dev
```

**View Lambda logs:**
```bash
aws logs tail /aws/lambda/nots-quotes-calculator-dev --follow --profile nots-dev
```

**Test Lambda directly:**
```bash
aws lambda invoke \
  --function-name nots-quotes-calculator-dev \
  --payload '{"body": "{\"pickupLocation\": {\"address\": \"Bournemouth, UK\"}, \"dropoffLocation\": {\"address\": \"Poole, UK\"}}"}' \
  --profile nots-dev \
  response.json

cat response.json
```

---

Ready to build! Let me know when you want to:
1. Create the next Lambda function
2. Set up the Next.js website
3. Configure Amplify hosting
