# PHASE 1 IMPLEMENTATION PLAN

**Durdle Platform - Quote Calculator & Core Infrastructure**

**Version**: 1.2
**Date**: December 4, 2025
**Status**: ✓ COMPLETE
**Actual Duration**: ~4 hours

---

## CURRENT STATUS (December 4, 2025 14:05 UTC)

**Progress**: 100% Complete

**Phase 1 Summary**:
- DynamoDB table created with proper tags and TTL enabled ✓
- S3 bucket for Lambda deployments configured ✓
- IAM role with scoped permissions created ✓
- Secrets Manager storing API key ✓
- Lambda function deployed successfully (quotes-calculator-dev) ✓
- API Gateway REST API configured with CORS ✓
- End-to-end quote generation working ✓
- Quotes stored in DynamoDB with 15-minute TTL ✓

**API Endpoint**: `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/v1/quotes`

**Test Results**:
```
Route: Bournemouth Railway Station → Poole Harbour
Distance: 8.8 miles (14,172 meters)
Duration: 47 minutes
Price: £18.61 (standard vehicle)
Quote ID: quote_372802d6d7a94e17aa43cd429e19bf17
Status: Stored in DynamoDB, expires in 15 minutes
```

**Ready for Phase 2**:
- Quote retrieval endpoint
- Booking creation
- Payment integration (Stripe)
- Admin dashboard backend

---

## Table of Contents

1. [Phase 1 Goals](#phase-1-goals)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites](#prerequisites)
4. [Implementation Steps](#implementation-steps)
5. [Testing Strategy](#testing-strategy)
6. [Success Criteria](#success-criteria)
7. [Next Steps (Phase 2)](#next-steps-phase-2)

---

## Phase 1 Goals

### Primary Objective
Build and deploy a working quote calculator that:
- Accepts pickup/dropoff locations
- Calculates distance and duration via Google Maps API
- Computes pricing based on configurable rules
- Stores quotes in DynamoDB with 15-minute TTL
- Returns quote to customer website

### Secondary Objectives
- Establish AWS infrastructure foundation
- Create reusable Lambda patterns
- Set up development workflow
- Document everything for team handoff

### Out of Scope (Phase 2+)
- User authentication (Cognito)
- Booking creation
- Payment processing
- Admin dashboard
- Driver portal

---

## Architecture Overview

### Phase 1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 1 SCOPE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐                                         │
│  │  Next.js Site  │                                         │
│  │  (Amplify)     │                                         │
│  └────────┬───────┘                                         │
│           │                                                  │
│           │ HTTPS POST /v1/quotes                           │
│           │                                                  │
│  ┌────────▼────────────────────────────┐                   │
│  │     API Gateway (REST)              │                   │
│  │     - CORS enabled                  │                   │
│  │     - Rate limiting (WAF)           │                   │
│  │     - No auth required (public)     │                   │
│  └────────┬────────────────────────────┘                   │
│           │                                                  │
│           │ Invoke                                           │
│           │                                                  │
│  ┌────────▼────────────────────────────┐                   │
│  │  quotes-calculator Lambda           │                   │
│  │  - Node.js 20.x (arm64)             │                   │
│  │  - 512MB memory, 10s timeout        │                   │
│  │  - IAM role with DynamoDB + Secrets │                   │
│  └────────┬────────┬───────────────────┘                   │
│           │        │                                         │
│           │        │ Get API key                             │
│           │        │                                         │
│           │  ┌─────▼────────────┐                           │
│           │  │ Secrets Manager  │                           │
│           │  │ - Google Maps    │                           │
│           │  │   API key        │                           │
│           │  └──────────────────┘                           │
│           │                                                  │
│           │ Call Distance Matrix API                         │
│           │                                                  │
│           │  ┌─────────────────────────────┐                │
│           │  │  Google Maps Platform       │                │
│           │  │  - Distance Matrix API      │                │
│           │  │  - Geocoding API (future)   │                │
│           │  └─────────────────────────────┘                │
│           │                                                  │
│           │ Write quote                                      │
│           │                                                  │
│  ┌────────▼─────────────────────┐                           │
│  │  DynamoDB                    │                           │
│  │  - nots-main-table-dev       │                           │
│  │  - TTL: 15 minutes           │                           │
│  │  - On-demand billing         │                           │
│  └──────────────────────────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Customer enters journey details** on website
2. **Website sends POST** to `/v1/quotes`
3. **API Gateway** receives request, validates, invokes Lambda
4. **Lambda function**:
   - Validates input
   - Gets Google Maps API key from Secrets Manager
   - Calls Distance Matrix API
   - Calculates pricing
   - Generates quote ID
   - Stores in DynamoDB with TTL
5. **Returns quote** to website
6. **Website displays** quote to customer

---

## Prerequisites

### 1. AWS Account & Credentials

```bash
# Create IAM user: nots-dev-user
# Attach policies:
# - DynamoDBFullAccess (for now, will scope down later)
# - SecretsManagerReadWrite
# - IAMFullAccess (to create roles)
# - AWSLambda_FullAccess

# Configure AWS CLI
aws configure --profile durdle-dev
# AWS Access Key ID: [from IAM console]
# AWS Secret Access Key: [from IAM console]
# Default region: eu-west-2
# Default output format: json

# Test access
aws sts get-caller-identity --profile durdle-dev
```

### 2. Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Durdle Transport"
3. Enable APIs:
   - Distance Matrix API
   - Geocoding API (for future)
   - Places API (for future autocomplete)
4. Create API key
5. Restrict API key:
   - **API restrictions**: Distance Matrix API only (for now)
   - **Application restrictions**: HTTP referrers (durdle.co.uk/*)
   - **Note key**: Save for Secrets Manager

### 3. Development Environment

```bash
# Node.js 20.x
node -v  # v20.x

# AWS CLI v2
aws --version  # aws-cli/2.x

# Project structure
cd C:\VSProjects\_Websites\Durdle
mkdir -p durdle-serverless-api
cd durdle-serverless-api
```

---

## Implementation Steps

### STEP 1: Set Up AWS Core Infrastructure (30 minutes)

#### 1.1 Create DynamoDB Table

```bash
# Set environment
export AWS_PROFILE=durdle-dev
export AWS_REGION=eu-west-2

# Create table
aws dynamodb create-table \
  --table-name durdle-main-table-dev \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    '[{
      "IndexName": "GSI1",
      "KeySchema": [
        {"AttributeName":"GSI1PK","KeyType":"HASH"},
        {"AttributeName":"GSI1SK","KeyType":"RANGE"}
      ],
      "Projection":{"ProjectionType":"ALL"}
    }]' \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --tags Key=Environment,Value=dev Key=Project,Value=Durdle \
  --region eu-west-2

# Enable TTL
aws dynamodb update-time-to-live \
  --table-name durdle-main-table-dev \
  --time-to-live-specification "Enabled=true, AttributeName=TTL" \
  --region eu-west-2

# Enable Point-in-Time Recovery
aws dynamodb update-continuous-backups \
  --table-name durdle-main-table-dev \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region eu-west-2

# Verify table created
aws dynamodb describe-table \
  --table-name durdle-main-table-dev \
  --region eu-west-2 \
  --query "Table.[TableName,TableStatus,BillingModeSummary]"
```

#### 1.2 Store Google Maps API Key in Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name durdle/google-maps-api-key \
  --description "Google Maps API key for Durdle platform" \
  --secret-string "YOUR_GOOGLE_MAPS_API_KEY_HERE" \
  --region eu-west-2

# Verify secret
aws secretsmanager get-secret-value \
  --secret-id durdle/google-maps-api-key \
  --region eu-west-2 \
  --query "SecretString"
```

#### 1.3 Create S3 Bucket for Lambda Deployments

```bash
# Create bucket
aws s3 mb s3://durdle-lambda-deployments-dev \
  --region eu-west-2

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket durdle-lambda-deployments-dev \
  --versioning-configuration Status=Enabled \
  --region eu-west-2

# Block public access
aws s3api put-public-access-block \
  --bucket durdle-lambda-deployments-dev \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region eu-west-2
```

#### 1.4 Create IAM Role for Lambda

Create file: `lambda-trust-policy.json`

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

Create file: `lambda-execution-policy.json`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:eu-west-2:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:eu-west-2:*:table/durdle-main-table-dev",
        "arn:aws:dynamodb:eu-west-2:*:table/durdle-main-table-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:eu-west-2:*:secret:durdle/*"
    }
  ]
}
```

```bash
# Create IAM role
aws iam create-role \
  --role-name durdle-lambda-execution-role-dev \
  --assume-role-policy-document file://lambda-trust-policy.json \
  --region eu-west-2

# Attach custom policy
aws iam put-role-policy \
  --role-name durdle-lambda-execution-role-dev \
  --policy-name DurdleLambdaExecutionPolicy \
  --policy-document file://lambda-execution-policy.json

# Verify role
aws iam get-role \
  --role-name durdle-lambda-execution-role-dev \
  --query "Role.Arn"
```

**Expected Output**:
```
arn:aws:iam::123456789012:role/durdle-lambda-execution-role-dev
```

---

### STEP 2: Build Quote Calculator Lambda (1-2 hours)

#### 2.1 Create Project Structure

```bash
# Navigate to repo root
cd C:\VSProjects\_Websites\Durdle

# Create Lambda function directory
mkdir -p durdle-serverless-api/functions/quotes-calculator
cd durdle-serverless-api/functions/quotes-calculator

# Initialize npm project
npm init -y

# Install dependencies
npm install @aws-sdk/client-dynamodb @aws-sdk/client-secrets-manager @aws-sdk/lib-dynamodb axios uuid
```

#### 2.2 Create Lambda Handler

File: `durdle-serverless-api/functions/quotes-calculator/index.mjs`

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';
import { randomUUID } from 'crypto';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME;
const GOOGLE_MAPS_SECRET_NAME = 'durdle/google-maps-api-key';

// Cache API key (Lambda container reuse)
let cachedApiKey = null;

async function getGoogleMapsApiKey() {
  if (cachedApiKey) return cachedApiKey;

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: GOOGLE_MAPS_SECRET_NAME })
    );
    cachedApiKey = response.SecretString;
    return cachedApiKey;
  } catch (error) {
    console.error('Failed to retrieve Google Maps API key:', error);
    throw new Error('Configuration error');
  }
}

async function calculateDistance(origin, destination, apiKey) {
  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';

  try {
    const response = await axios.get(url, {
      params: {
        origins: origin,
        destinations: destination,
        key: apiKey,
        units: 'imperial', // miles
      },
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const element = response.data.rows[0].elements[0];

    if (element.status !== 'OK') {
      throw new Error(`Route calculation failed: ${element.status}`);
    }

    return {
      distance: {
        meters: element.distance.value,
        miles: (element.distance.value / 1609.34).toFixed(2),
        text: element.distance.text,
      },
      duration: {
        seconds: element.duration.value,
        minutes: Math.ceil(element.duration.value / 60),
        text: element.duration.text,
      },
    };
  } catch (error) {
    console.error('Distance calculation failed:', error);
    throw new Error('Unable to calculate route');
  }
}

function calculatePricing(distanceMiles, durationMinutes, vehicleType = 'standard') {
  // Pricing configuration (in pence)
  const pricing = {
    standard: {
      baseFare: 500,        // £5.00
      perMile: 100,         // £1.00 per mile
      perMinute: 10,        // £0.10 per minute
    },
    executive: {
      baseFare: 800,        // £8.00
      perMile: 150,         // £1.50 per mile
      perMinute: 15,        // £0.15 per minute
    },
    minibus: {
      baseFare: 1000,       // £10.00
      perMile: 120,         // £1.20 per mile
      perMinute: 12,        // £0.12 per minute
    },
  };

  const rates = pricing[vehicleType] || pricing.standard;

  const baseFare = rates.baseFare;
  const distanceCharge = Math.round(distanceMiles * rates.perMile);
  const timeCharge = Math.round(durationMinutes * rates.perMinute);
  const subtotal = baseFare + distanceCharge + timeCharge;
  const tax = 0; // No VAT on private hire (currently)
  const total = subtotal + tax;

  return {
    currency: 'GBP',
    breakdown: {
      baseFare,
      distanceCharge,
      timeCharge,
      subtotal,
      tax,
      total,
    },
    displayTotal: `£${(total / 100).toFixed(2)}`,
  };
}

async function storeQuote(quote) {
  const ttl = Math.floor(Date.now() / 1000) + (15 * 60); // 15 minutes from now

  const item = {
    PK: `QUOTE#${quote.quoteId}`,
    SK: 'METADATA',
    EntityType: 'Quote',
    GSI1PK: `STATUS#${quote.status}`,
    GSI1SK: `CREATED#${quote.createdAt}`,
    TTL: ttl,
    Data: quote,
    CreatedAt: Math.floor(new Date(quote.createdAt).getTime() / 1000),
    UpdatedAt: Math.floor(new Date(quote.createdAt).getTime() / 1000),
  };

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));
  } catch (error) {
    console.error('Failed to store quote:', error);
    throw new Error('Failed to save quote');
  }
}

export const handler = async (event) => {
  console.log('Quote calculator invoked:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.pickupLocation?.address || !body.dropoffLocation?.address) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Pickup and dropoff locations are required',
          },
        }),
      };
    }

    if (!body.pickupTime) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Pickup time is required',
          },
        }),
      };
    }

    if (!body.passengers || body.passengers < 1 || body.passengers > 8) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Passengers must be between 1 and 8',
          },
        }),
      };
    }

    // Get Google Maps API key
    const apiKey = await getGoogleMapsApiKey();

    // Calculate distance and duration
    const route = await calculateDistance(
      body.pickupLocation.address,
      body.dropoffLocation.address,
      apiKey
    );

    // Calculate pricing
    const vehicleType = body.vehicleType || 'standard';
    const pricing = calculatePricing(
      parseFloat(route.distance.miles),
      route.duration.minutes,
      vehicleType
    );

    // Generate quote
    const quoteId = `quote_${randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const quote = {
      quoteId,
      status: 'valid',
      expiresAt,
      journey: {
        distance: route.distance,
        duration: route.duration,
        route: {
          polyline: null, // Future: get from Directions API
        },
      },
      pricing,
      vehicleType,
      pickupLocation: body.pickupLocation,
      dropoffLocation: body.dropoffLocation,
      pickupTime: body.pickupTime,
      passengers: body.passengers,
      returnJourney: body.returnJourney || false,
      createdAt: now,
    };

    // Store quote in DynamoDB
    await storeQuote(quote);

    // Return success response
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(quote),
    };
  } catch (error) {
    console.error('Error processing quote:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to calculate quote',
          details: error.message,
        },
      }),
    };
  }
};
```

#### 2.3 Create package.json

File: `durdle-serverless-api/functions/quotes-calculator/package.json`

```json
{
  "name": "quotes-calculator",
  "version": "1.0.0",
  "description": "Durdle quote calculator Lambda function",
  "main": "index.mjs",
  "type": "module",
  "scripts": {
    "test": "echo \"No tests yet\" && exit 0"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.700.0",
    "@aws-sdk/client-secrets-manager": "^3.700.0",
    "@aws-sdk/lib-dynamodb": "^3.700.0",
    "axios": "^1.7.0"
  }
}
```

---

### STEP 3: Deploy Lambda Function (30 minutes)

#### 3.1 Build and Package Lambda

```bash
cd C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\quotes-calculator

# Install production dependencies
npm install --production

# Create deployment package
# Windows PowerShell:
Compress-Archive -Path * -DestinationPath function.zip -Force

# Or use 7zip/WinRAR to create function.zip with all files
```

#### 3.2 Deploy to AWS Lambda

```bash
# Get IAM role ARN (from Step 1.4)
aws iam get-role \
  --role-name durdle-lambda-execution-role-dev \
  --query "Role.Arn" \
  --output text

# Create Lambda function
aws lambda create-function \
  --function-name quotes-calculator-dev \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/durdle-lambda-execution-role-dev \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --memory-size 512 \
  --architectures arm64 \
  --environment Variables="{TABLE_NAME=durdle-main-table-dev,AWS_REGION=eu-west-2}" \
  --region eu-west-2

# Verify function created
aws lambda get-function \
  --function-name quotes-calculator-dev \
  --region eu-west-2 \
  --query "Configuration.[FunctionName,Runtime,Handler,Timeout,MemorySize]"
```

#### 3.3 Test Lambda Locally (Optional)

Create test event: `test-event.json`

```json
{
  "body": "{\"pickupLocation\":{\"address\":\"Bournemouth Railway Station, UK\"},\"dropoffLocation\":{\"address\":\"Poole Harbour, UK\"},\"pickupTime\":\"2025-12-10T14:30:00Z\",\"passengers\":2,\"vehicleType\":\"standard\"}"
}
```

```bash
# Invoke Lambda function
aws lambda invoke \
  --function-name quotes-calculator-dev \
  --payload file://test-event.json \
  --region eu-west-2 \
  response.json

# View response
cat response.json
```

---

### STEP 4: Set Up API Gateway (45 minutes)

#### 4.1 Create REST API

```bash
# Create API
aws apigateway create-rest-api \
  --name durdle-api-dev \
  --description "Durdle Platform API - Development" \
  --region eu-west-2

# Save API ID from output
export API_ID=<your-api-id>

# Get root resource ID
aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region eu-west-2 \
  --query "items[?path=='/'].id" \
  --output text
export ROOT_RESOURCE_ID=<root-resource-id>
```

#### 4.2 Create /v1 Resource

```bash
# Create /v1 resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part v1 \
  --region eu-west-2

export V1_RESOURCE_ID=<v1-resource-id>
```

#### 4.3 Create /v1/quotes Resource

```bash
# Create /quotes resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $V1_RESOURCE_ID \
  --path-part quotes \
  --region eu-west-2

export QUOTES_RESOURCE_ID=<quotes-resource-id>
```

#### 4.4 Create POST Method

```bash
# Create POST method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  --region eu-west-2

# Get Lambda ARN
export LAMBDA_ARN=$(aws lambda get-function \
  --function-name quotes-calculator-dev \
  --region eu-west-2 \
  --query "Configuration.FunctionArn" \
  --output text)

# Integrate with Lambda
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:eu-west-2:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region eu-west-2
```

#### 4.5 Add Lambda Permission

```bash
# Allow API Gateway to invoke Lambda
aws lambda add-permission \
  --function-name quotes-calculator-dev \
  --statement-id apigateway-invoke-quotes \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:eu-west-2:*:$API_ID/*/POST/v1/quotes" \
  --region eu-west-2
```

#### 4.6 Enable CORS

```bash
# Create OPTIONS method for CORS preflight
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region eu-west-2

# Create mock integration for OPTIONS
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
  --region eu-west-2

# Set OPTIONS method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    'method.response.header.Access-Control-Allow-Headers=true,method.response.header.Access-Control-Allow-Methods=true,method.response.header.Access-Control-Allow-Origin=true' \
  --region eu-west-2

# Set OPTIONS integration response
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $QUOTES_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    'method.response.header.Access-Control-Allow-Headers="'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'",method.response.header.Access-Control-Allow-Methods="'"'"'GET,POST,OPTIONS'"'"'",method.response.header.Access-Control-Allow-Origin="'"'"'*'"'"'"' \
  --region eu-west-2
```

#### 4.7 Deploy API

```bash
# Create deployment
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name dev \
  --stage-description "Development environment" \
  --description "Initial deployment" \
  --region eu-west-2

# Get API endpoint
echo "API Endpoint: https://$API_ID.execute-api.eu-west-2.amazonaws.com/dev"
```

---

### STEP 5: Test End-to-End (30 minutes)

#### 5.1 Test with cURL

```bash
# Set API endpoint
export API_ENDPOINT="https://$API_ID.execute-api.eu-west-2.amazonaws.com/dev"

# Test quote calculator
curl -X POST $API_ENDPOINT/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {
      "address": "Bournemouth Railway Station, UK"
    },
    "dropoffLocation": {
      "address": "Poole Harbour, UK"
    },
    "pickupTime": "2025-12-10T14:30:00Z",
    "passengers": 2,
    "vehicleType": "standard"
  }'
```

Expected response:
```json
{
  "quoteId": "quote_abc123...",
  "status": "valid",
  "expiresAt": "2025-12-04T15:30:00Z",
  "journey": {
    "distance": { "meters": 8500, "miles": "5.28", "text": "5.3 mi" },
    "duration": { "seconds": 1200, "minutes": 20, "text": "20 mins" }
  },
  "pricing": {
    "currency": "GBP",
    "breakdown": { "baseFare": 500, "distanceCharge": 528, "timeCharge": 200, "total": 1228 },
    "displayTotal": "£12.28"
  }
}
```

#### 5.2 Test with Postman

1. Open Postman
2. Create new request: `POST {API_ENDPOINT}/v1/quotes`
3. Set body (raw JSON):
```json
{
  "pickupLocation": {
    "address": "Weymouth Beach, UK"
  },
  "dropoffLocation": {
    "address": "Durdle Door, UK"
  },
  "pickupTime": "2025-12-15T10:00:00Z",
  "passengers": 4,
  "vehicleType": "executive"
}
```
4. Send request and verify response

#### 5.3 Verify DynamoDB Storage

```bash
# Query DynamoDB for quotes
aws dynamodb scan \
  --table-name durdle-main-table-dev \
  --filter-expression "EntityType = :type" \
  --expression-attribute-values '{":type":{"S":"Quote"}}' \
  --region eu-west-2
```

#### 5.4 Test Error Handling

```bash
# Test missing fields
curl -X POST $API_ENDPOINT/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{"pickupLocation":{"address":"Test"}}'

# Expected: 400 error with validation message

# Test invalid passengers
curl -X POST $API_ENDPOINT/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {"address": "Bournemouth, UK"},
    "dropoffLocation": {"address": "Poole, UK"},
    "pickupTime": "2025-12-10T14:30:00Z",
    "passengers": 10
  }'

# Expected: 400 error about passenger count
```

---

## Testing Strategy

### Unit Tests (Future - Phase 1.5)

```javascript
// tests/quotes-calculator.test.js
describe('Quote Calculator', () => {
  it('should calculate correct pricing for standard vehicle');
  it('should validate required fields');
  it('should handle Google Maps API errors');
  it('should store quote in DynamoDB');
  it('should set correct TTL');
});
```

### Integration Tests

- API Gateway → Lambda integration
- Lambda → DynamoDB writes
- Lambda → Secrets Manager reads
- Lambda → Google Maps API calls

### Load Tests (Future - Phase 2)

```bash
# Artillery load test
artillery quick --count 100 --num 10 $API_ENDPOINT/v1/quotes
```

---

## Success Criteria

### Phase 1 Complete When:

- [x] DynamoDB table created and configured
- [x] IAM roles and policies configured
- [x] Google Maps API key stored in Secrets Manager
- [x] Lambda function deployed and working
- [x] API Gateway configured with CORS
- [x] End-to-end quote generation works
- [x] Quotes stored in DynamoDB with TTL
- [x] Error handling returns proper status codes
- [x] API endpoint accessible and tested
- [x] Documentation updated with API endpoint
- [x] CloudWatch logs show successful executions

**✓ ALL CRITERIA MET - PHASE 1 COMPLETE**

### Performance Metrics

- API response time: < 2 seconds (p95)
- Lambda cold start: < 500ms
- Lambda warm start: < 200ms
- Google Maps API latency: < 1 second

### Cost Estimates (First Month)

- Lambda invocations: 1,000 quotes = £0.02
- DynamoDB: 1,000 writes = £1.25
- API Gateway: 1,000 requests = £0.003
- Secrets Manager: 1 secret = £0.40
- Google Maps API: 1,000 requests = $5 (£4)
- **Total**: ~£6/month

---

## Next Steps (Phase 2)

After Phase 1 is complete and tested:

1. **Retrieve Quote Endpoint**
   - `GET /v1/quotes/:quoteId`
   - Lambda function: quotes-retrieve

2. **Booking Creation**
   - `POST /v1/bookings`
   - Lambda function: bookings-create
   - Stripe Payment Intent integration

3. **Cognito Authentication**
   - User Pool creation
   - Sign up / Sign in flows
   - JWT validation in API Gateway

4. **Admin Dashboard Backend**
   - List bookings endpoint
   - Update booking status
   - Driver management

5. **Notifications**
   - SES email setup
   - SNS SMS setup
   - Booking confirmation emails

---

## Troubleshooting

### Lambda Function Errors

**Error**: "Unable to import module 'index'"
**Solution**: Ensure handler is set to `index.handler` and file is `index.mjs`

**Error**: "Task timed out after 3.00 seconds"
**Solution**: Increase timeout in Lambda configuration

**Error**: "AccessDeniedException" from DynamoDB
**Solution**: Check IAM role has DynamoDB permissions

### API Gateway Issues

**Error**: CORS errors in browser
**Solution**: Verify OPTIONS method configured correctly

**Error**: 403 Forbidden
**Solution**: Check Lambda permission for API Gateway invoke

### Google Maps API Issues

**Error**: "REQUEST_DENIED" with "API keys with referer restrictions cannot be used with this API"
**Solution**: The API key has HTTP referrer restrictions which only work for browser-based requests. For Lambda functions (server-side), you need an API key with:
- Application restrictions set to "None", OR
- IP address restrictions (if Lambda uses static IPs), OR
- A separate API key for server-side use
To fix: Create a new API key in Google Cloud Console without HTTP referrer restrictions

**Error**: "REQUEST_DENIED" (general)
**Solution**: Verify API key is valid and Distance Matrix API is enabled in Google Cloud Console

**Error**: "OVER_QUERY_LIMIT"
**Solution**: Check billing is enabled in Google Cloud Console

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-04 | Initial Phase 1 implementation plan |
| 1.1 | 2025-12-04 | Added blocking issue details (Google Maps API key restrictions) |
| 1.2 | 2025-12-04 | Phase 1 complete - all infrastructure deployed and tested |

---

**Ready to start implementation? Begin with STEP 1!**
