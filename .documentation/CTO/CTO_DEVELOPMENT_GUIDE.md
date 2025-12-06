# CTO Development Guide - Durdle Platform

**Document Version:** 1.0
**Last Updated:** December 6, 2025
**Purpose:** Practical guide for developers to add features safely without breaking existing functionality

---

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Code Standards & Best Practices](#code-standards--best-practices)
- [Adding New Features](#adding-new-features)
- [Testing Guidelines](#testing-guidelines)
- [Deployment Process](#deployment-process)
- [Debugging & Troubleshooting](#debugging--troubleshooting)
- [Common Development Tasks](#common-development-tasks)
- [Security Checklist](#security-checklist)
- [Performance Optimization](#performance-optimization)

---

## Development Environment Setup

### Prerequisites

**Required Software**:
- Node.js 20.x or higher
- npm 10.x or higher
- Git
- AWS CLI (configured with credentials)
- Code editor (VS Code recommended)

**Recommended VS Code Extensions**:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- AWS Toolkit
- TypeScript and JavaScript Language Features

### Local Development Setup

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd durdle
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

3. **Install Backend Dependencies** (each Lambda):
   ```bash
   cd durdle-serverless-api/functions/quotes-calculator
   npm install
   # Repeat for each Lambda function
   ```

4. **Configure Environment Variables**:
   Create `.env.local` in frontend root:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.eu-west-2.amazonaws.com/dev
   ```

5. **Run Frontend Locally**:
   ```bash
   npm run dev
   # Access at http://localhost:3000
   ```

6. **Test Lambda Functions Locally** (AWS SAM CLI):
   ```bash
   cd durdle-serverless-api
   sam local start-api
   # Access at http://localhost:3001
   ```

---

## Code Standards & Best Practices

### Sacred Principles (NEVER VIOLATE)

1. **No Emojis in Code**
   - CloudWatch logs fail with emoji encoding
   - Zero emojis in: code, comments, console.log, commit messages
   - Exception: Documentation .md files only

2. **One Lambda = One Responsibility**
   - Each Lambda function does ONE thing
   - No multi-purpose Lambda functions
   - Example: quotes-calculator ONLY calculates quotes; does NOT handle payments

3. **TypeScript Strict Mode**
   - All types explicit; no `any` type
   - Compile errors = deployment blocked

4. **Production-Grade from Day 1**
   - No hacks, no "TODO: fix later"
   - Every line of code is production-ready

### TypeScript Standards

**Good Example**:
```typescript
interface QuoteRequest {
  pickup: Location;
  dropoff: Location;
  waypoints?: Waypoint[];
  datetime: string;
  passengers: number;
  luggage: number;
}

async function calculateQuote(request: QuoteRequest): Promise<Quote> {
  // Explicit types, clear function signature
}
```

**Bad Example**:
```typescript
function calculateQuote(request: any) {
  // NO: 'any' type not allowed
}

function calculate(req) {
  // NO: Missing type annotations
}
```

### Naming Conventions

**Variables**: camelCase
```typescript
const totalPrice = 1750;
const vehicleType = 'standard';
```

**Functions**: camelCase, verb-first
```typescript
function calculateQuote() {}
function validateLocation() {}
function formatPrice() {}
```

**Components**: PascalCase
```typescript
function QuoteWizard() {}
function LocationInput() {}
```

**Constants**: SCREAMING_SNAKE_CASE
```typescript
const MAX_PASSENGERS = 8;
const DEFAULT_WAIT_TIME = 15;
```

**Files**:
- Components: PascalCase.tsx (e.g., QuoteWizard.tsx)
- Utilities: camelCase.ts (e.g., formatPrice.ts)
- Lambda handlers: index.js or handler.js

### Git Commit Messages

**Format**: One line, clear, concise, imperative mood

**Good Examples**:
```
Fix quote calculation for multi-waypoint journeys
Add vehicle image upload to admin portal
Update pricing engine to handle zero wait time
Remove debug logging from quotes calculator
```

**Bad Examples**:
```
Fixed stuff                          (too vague)
WIP                                  (not descriptive)
Added new feature for quotes that... (too long; one line only)
Update pricing engine (emoji)        (NO EMOJIS)
```

**Format Rules**:
- Start with verb (Add, Fix, Update, Remove, Refactor)
- No period at end
- Max 72 characters
- Describe WHAT changed, not WHY (use code comments for why)

### Code Comments

**When to Comment**:
- Complex business logic (e.g., pricing formulas)
- Non-obvious edge cases
- Security considerations
- Performance optimizations

**Example**:
```typescript
// Pricing Model 1: Fixed Route
// Check if journey matches pre-configured route with no waypoints
// This takes priority over variable pricing for strategic routes
if (!waypoints.length) {
  const fixedRoute = await getFixedRoute(pickup.placeId, dropoff.placeId, vehicleId);
  if (fixedRoute) {
    return fixedRoute.price;
  }
}

// Pricing Model 2: Simple Variable
// Distance-based pricing with no wait time charges
// Formula: baseFare + (distance * perMile)
const price = vehicle.baseFare + (distance * vehicle.perMile);
```

**Avoid Obvious Comments**:
```typescript
// BAD: Comment states the obvious
let total = 0; // Set total to zero

// GOOD: Comment explains WHY
let total = 0; // Initialize running total for all waypoint segments
```

---

## Adding New Features

### Feature Development Workflow

1. **Understand the Requirement**
   - Read user story or PRD
   - Identify affected components (frontend, backend, database)
   - Sketch data flow diagram

2. **Design the Solution**
   - Determine which Lambda functions to modify or create
   - Define API contract (request/response schemas)
   - Design DynamoDB access patterns
   - Identify security considerations

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/surge-pricing
   ```

4. **Implement Backend First**
   - Write Lambda function logic
   - Update DynamoDB schema if needed
   - Add input validation (Zod schemas)
   - Test with sample data

5. **Implement Frontend**
   - Create/update Next.js components
   - Add API client functions
   - Update UI with new data
   - Test user flows

6. **Test End-to-End**
   - Manual testing (happy path + edge cases)
   - Check error handling
   - Verify security (auth, input validation)

7. **Deploy to Dev**
   - Deploy Lambda functions
   - Deploy frontend to Amplify
   - Smoke test in dev environment

8. **Create Pull Request**
   - Clear description of changes
   - Screenshots for UI changes
   - Link to user story or PRD

9. **Code Review**
   - Address feedback
   - Merge to main

10. **Monitor Production**
    - Check CloudWatch logs
    - Verify metrics (latency, error rate)
    - Watch for customer issues

### Example: Adding Surge Pricing

**Requirement**: Charge 1.5x pricing during peak hours (Friday 5-7pm, Saturday 10am-12pm)

**Step 1: Backend - Update quotes-calculator Lambda**

File: `durdle-serverless-api/functions/quotes-calculator/index.js`

```javascript
// Add surge multiplier calculation
function getSurgeMultiplier(datetime) {
  const date = new Date(datetime);
  const day = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  const hour = date.getHours();

  // Friday 5-7pm
  if (day === 5 && hour >= 17 && hour < 19) {
    return 1.5;
  }

  // Saturday 10am-12pm
  if (day === 6 && hour >= 10 && hour < 12) {
    return 1.5;
  }

  return 1.0; // No surge
}

// Update quote calculation
async function calculateQuote(request) {
  // ... existing pricing logic ...

  const basePrice = vehicle.baseFare + (distance * vehicle.perMile);
  const surgeMultiplier = getSurgeMultiplier(request.datetime);
  const finalPrice = Math.round(basePrice * surgeMultiplier);

  return {
    totalPrice: finalPrice,
    breakdown: {
      baseFare: vehicle.baseFare,
      distanceCharge: distance * vehicle.perMile,
      surgeMultiplier: surgeMultiplier,
      surgeAmount: Math.round(basePrice * (surgeMultiplier - 1))
    }
  };
}
```

**Step 2: Update DynamoDB Schema** (if needed)

No schema changes needed; surge calculation is runtime-only.

**Step 3: Frontend - Update Quote Results UI**

File: `app/quote/results/components/PricingBreakdown.tsx`

```typescript
interface PricingBreakdownProps {
  breakdown: {
    baseFare: number;
    distanceCharge: number;
    surgeMultiplier?: number;
    surgeAmount?: number;
  };
}

export function PricingBreakdown({ breakdown }: PricingBreakdownProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Base Fare</span>
        <span>{formatPrice(breakdown.baseFare)}</span>
      </div>
      <div className="flex justify-between">
        <span>Distance Charge</span>
        <span>{formatPrice(breakdown.distanceCharge)}</span>
      </div>
      {breakdown.surgeMultiplier && breakdown.surgeMultiplier > 1 && (
        <div className="flex justify-between text-orange-600">
          <span>Peak Hours Surge ({breakdown.surgeMultiplier}x)</span>
          <span>+{formatPrice(breakdown.surgeAmount)}</span>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Test**

1. Generate quote for Friday 6pm → should show surge
2. Generate quote for Monday 6pm → should NOT show surge
3. Verify pricing breakdown displays correctly

**Step 5: Deploy**

```bash
# Deploy Lambda
cd durdle-serverless-api/functions/quotes-calculator
npm run build
cd dist
zip -r quotes-calculator.zip .
aws lambda update-function-code \
  --function-name quotes-calculator-dev \
  --zip-file fileb://quotes-calculator.zip \
  --region eu-west-2

# Deploy Frontend
git push origin feature/surge-pricing
# Amplify auto-deploys on push
```

**Step 6: Document**

Update `Pricing_Engine_Logic.md` with surge pricing details.

---

## Testing Guidelines

### Manual Testing Checklist

**Before Every Deployment**:
- [ ] Happy path works (normal user flow)
- [ ] Error handling tested (invalid inputs)
- [ ] Edge cases handled (zero values, max values, empty arrays)
- [ ] Security validated (auth required, input sanitized)
- [ ] Mobile responsive (test on real device or Chrome DevTools)

### Testing Quote Flow

**Test Case 1: Simple Quote**
```
Input:
  Pickup: Bournemouth Train Station (ChIJ...)
  Dropoff: Heathrow Airport (ChIJ...)
  No waypoints
  Date: Tomorrow 10am
  Passengers: 2
  Luggage: 3

Expected:
  - 3 vehicle options (Standard, Executive, Minibus)
  - Pricing breakdown (base + distance)
  - No wait time charge
  - 15-minute timer starts
```

**Test Case 2: Multi-Waypoint Quote**
```
Input:
  Pickup: Bournemouth
  Waypoint 1: Southampton (30 min wait)
  Waypoint 2: Winchester (15 min wait)
  Dropoff: London
  Date: Tomorrow 10am
  Passengers: 4
  Luggage: 2

Expected:
  - Total distance = sum of all segments
  - Wait time charge = (30 + 15) * perMinute
  - Pricing model = waypoint-variable
```

**Test Case 3: Fixed Route**
```
Input:
  Pickup: Heathrow Airport
  Dropoff: Bournemouth
  No waypoints

Expected:
  - If fixed route exists: Use fixed price
  - Pricing model = fixed-route
  - Price should match DynamoDB fixed route exactly
```

### Testing Error Handling

**Invalid Place IDs**:
```javascript
// Should return 400 Bad Request
POST /v1/quotes
{
  "pickup": { "placeId": "invalid" },
  "dropoff": { "placeId": "ChIJ..." }
}
```

**Missing Required Fields**:
```javascript
// Should return 400 Bad Request
POST /v1/quotes
{
  "pickup": { "placeId": "ChIJ..." }
  // Missing dropoff
}
```

**Google Maps API Failure**:
```javascript
// Simulate by using invalid API key in Secrets Manager
// Should return 500 Internal Server Error with generic message
// Should NOT expose API key in error response
```

### Testing Admin Portal

**Test Case 1: Admin Login**
```
Input:
  Username: admin
  Password: correct_password

Expected:
  - JWT token returned
  - Cookie set (durdle_admin_token)
  - Redirect to /admin/pricing
```

**Test Case 2: Update Vehicle Pricing**
```
Input:
  Vehicle: standard
  Base Fare: 600 (increased from 500)
  Per Mile: 120 (increased from 100)

Expected:
  - DynamoDB updated
  - Next quote uses new pricing
  - Old quotes remain unchanged (snapshot pricing)
```

---

## Deployment Process

### Pre-Deployment Checklist

- [ ] Code compiles (TypeScript errors resolved)
- [ ] All tests pass (manual testing complete)
- [ ] No console.log with sensitive data (API keys, passwords)
- [ ] No emojis in code or logs
- [ ] Environment variables verified (Secrets Manager values correct)
- [ ] DynamoDB table names match Lambda env vars
- [ ] API Gateway routes configured correctly

### Deploying Lambda Functions

**Step 1: Build**
```bash
cd durdle-serverless-api/functions/quotes-calculator
npm run build
```

**Step 2: Package**
```bash
cd dist
zip -r quotes-calculator.zip .
```

**Step 3: Deploy**
```bash
aws lambda update-function-code \
  --function-name quotes-calculator-dev \
  --zip-file fileb://quotes-calculator.zip \
  --region eu-west-2
```

**Step 4: Verify**
```bash
# Check function updated
aws lambda get-function --function-name quotes-calculator-dev

# Tail logs
aws logs tail /aws/lambda/quotes-calculator-dev --follow
```

**Step 5: Test**
```bash
# Invoke Lambda directly
aws lambda invoke \
  --function-name quotes-calculator-dev \
  --payload '{"body": "{\"pickup\":{\"placeId\":\"ChIJ...\"}}"}' \
  response.json
```

### Deploying Frontend (Amplify)

**Auto-Deploy** (default):
```bash
git push origin main
# Amplify detects push and auto-deploys
# Monitor at https://console.aws.amazon.com/amplify
```

**Manual Deploy**:
```bash
# Build locally
npm run build

# Deploy via Amplify CLI
amplify publish
```

### Rollback Procedure

**Lambda Rollback**:
```bash
# List versions
aws lambda list-versions-by-function --function-name quotes-calculator-dev

# Rollback to previous version
aws lambda update-alias \
  --function-name quotes-calculator-dev \
  --name live \
  --function-version 5  # Previous version number
```

**Frontend Rollback**:
```bash
# Via Amplify Console
# Navigate to: Amplify > App > Hosting > Previous Deployments > Redeploy
```

---

## Debugging & Troubleshooting

### CloudWatch Logs

**View Logs in AWS Console**:
1. Navigate to CloudWatch → Log Groups
2. Find `/aws/lambda/quotes-calculator-dev`
3. View Log Streams (sorted by Last Event Time)

**View Logs via AWS CLI**:
```bash
# Tail logs in real-time
aws logs tail /aws/lambda/quotes-calculator-dev --follow

# Filter for errors
aws logs tail /aws/lambda/quotes-calculator-dev --follow --filter-pattern "ERROR"

# Search for specific quote ID
aws logs tail /aws/lambda/quotes-calculator-dev --follow --filter-pattern "Q1234567890"
```

### Common Errors

**Error 1: "Cannot find module 'aws-sdk'"**

**Cause**: Missing npm install in Lambda function directory

**Solution**:
```bash
cd durdle-serverless-api/functions/quotes-calculator
npm install
npm run build
# Redeploy
```

---

**Error 2: "The security token included in the request is invalid"**

**Cause**: AWS CLI credentials expired or incorrect

**Solution**:
```bash
# Reconfigure AWS CLI
aws configure
# Enter Access Key ID, Secret Access Key, Region (eu-west-2)
```

---

**Error 3: "ResourceNotFoundException: Requested resource not found"**

**Cause**: DynamoDB table name mismatch between Lambda env var and actual table

**Solution**:
```bash
# Check Lambda environment variables
aws lambda get-function-configuration --function-name quotes-calculator-dev

# Verify table exists
aws dynamodb list-tables --region eu-west-2

# Update Lambda env var if mismatch
aws lambda update-function-configuration \
  --function-name quotes-calculator-dev \
  --environment Variables={PRICING_TABLE_NAME=durdle-pricing-config-dev}
```

---

**Error 4: "CORS policy: No 'Access-Control-Allow-Origin' header"**

**Cause**: Lambda not returning CORS headers or API Gateway CORS not configured

**Solution**:
```javascript
// Add to Lambda response
return {
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': 'https://yourdomain.com',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  },
  body: JSON.stringify({ data })
};
```

---

**Error 5: "Task timed out after 5.00 seconds"**

**Cause**: Lambda timeout too low for Google Maps API calls

**Solution**:
```bash
# Increase Lambda timeout
aws lambda update-function-configuration \
  --function-name quotes-calculator-dev \
  --timeout 10
```

### Debugging Lambda Functions Locally

**AWS SAM Local**:
```bash
# Start local API Gateway
cd durdle-serverless-api
sam local start-api

# Invoke specific function
sam local invoke quotes-calculator-dev \
  --event events/quote-request.json
```

**Manual Testing**:
```javascript
// Add to Lambda handler for debugging
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // ... existing logic ...

  console.log('Response:', JSON.stringify(response, null, 2));
  return response;
};
```

---

## Common Development Tasks

### Adding a New Vehicle Type

**Step 1: Update DynamoDB**
```bash
# Insert new vehicle into durdle-pricing-config-dev
aws dynamodb put-item \
  --table-name durdle-pricing-config-dev \
  --item '{
    "id": {"S": "luxury"},
    "name": {"S": "Luxury Sedan"},
    "baseFare": {"N": "1000"},
    "perMile": {"N": "200"},
    "perMinute": {"N": "20"},
    "capacity": {"N": "4"},
    "luggage": {"N": "3"},
    "features": {"L": [{"S": "Leather Seats"}, {"S": "Premium Sound"}]},
    "imageUrl": {"S": "https://s3.amazonaws.com/..."},
    "active": {"BOOL": true}
  }' \
  --region eu-west-2
```

**Step 2: Upload Vehicle Image**
1. Navigate to Admin Portal → Vehicles
2. Select new vehicle
3. Upload image (generates S3 presigned URL)

**Step 3: Test**
1. Generate quote → should show new vehicle option
2. Verify pricing uses correct rates

### Adding a Fixed Route

**Via Admin Portal**:
1. Login to /admin
2. Navigate to Pricing → Fixed Routes
3. Click "Add Fixed Route"
4. Enter:
   - Origin: Bournemouth Train Station
   - Destination: Heathrow Airport
   - Vehicle: Standard
   - Price: £120.00
5. Save

**Via AWS CLI**:
```bash
aws dynamodb put-item \
  --table-name durdle-fixed-routes-dev \
  --item '{
    "routeKey": {"S": "ROUTE#ChIJ...+DEST#ChIJ...#standard"},
    "origin": {"M": {
      "placeId": {"S": "ChIJ..."},
      "name": {"S": "Bournemouth Train Station"}
    }},
    "destination": {"M": {
      "placeId": {"S": "ChIJ..."},
      "name": {"S": "Heathrow Airport"}
    }},
    "vehicleId": {"S": "standard"},
    "price": {"N": "12000"},
    "distance": {"N": "115.2"},
    "duration": {"N": "140"},
    "active": {"BOOL": true}
  }' \
  --region eu-west-2
```

### Adding a New Admin User

**Step 1: Hash Password**
```javascript
// Use Node.js REPL
const bcrypt = require('bcryptjs');
const password = 'secure_password_123';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
// Output: $2b$10$... (copy this)
```

**Step 2: Insert into DynamoDB**
```bash
aws dynamodb put-item \
  --table-name durdle-admin-users-dev \
  --item '{
    "username": {"S": "newadmin"},
    "passwordHash": {"S": "$2b$10$..."},
    "role": {"S": "admin"},
    "email": {"S": "newadmin@durdle.com"},
    "active": {"BOOL": true},
    "createdAt": {"S": "2025-12-06T10:00:00Z"}
  }' \
  --region eu-west-2
```

**Step 3: Test Login**
1. Navigate to /admin/login
2. Enter username: newadmin, password: secure_password_123
3. Verify JWT token returned

### Updating Environment Variables

**Lambda Function**:
```bash
aws lambda update-function-configuration \
  --function-name quotes-calculator-dev \
  --environment Variables={
    PRICING_TABLE_NAME=durdle-pricing-config-dev,
    GOOGLE_MAPS_API_KEY_SECRET_NAME=durdle/google-maps-api-key,
    NEW_VAR=new_value
  } \
  --region eu-west-2
```

**Frontend (Amplify)**:
1. Navigate to Amplify Console → Environment Variables
2. Add: `NEXT_PUBLIC_NEW_VAR=value`
3. Redeploy app

### Rotating Secrets

**Google Maps API Key**:
```bash
# Generate new key in Google Cloud Console
# Update Secrets Manager
aws secretsmanager update-secret \
  --secret-id durdle/google-maps-api-key \
  --secret-string '{"apiKey":"AIzaSyNEW..."}' \
  --region eu-west-2

# No Lambda restart needed; next invocation pulls new secret
```

**JWT Secret**:
```bash
# Generate new secret (32+ characters)
NEW_SECRET=$(openssl rand -base64 32)

# Update Secrets Manager
aws secretsmanager update-secret \
  --secret-id durdle/jwt-secret \
  --secret-string "{\"secret\":\"$NEW_SECRET\"}" \
  --region eu-west-2

# WARNING: All existing JWT tokens will be invalid
# All admin users must re-login
```

---

## Security Checklist

**Before Every Feature Launch**:

- [ ] **Input Validation**: All user inputs validated with Zod schemas
- [ ] **Authentication**: Protected endpoints require JWT
- [ ] **Authorization**: Users can only access their own data
- [ ] **SQL Injection**: N/A (using DynamoDB; no raw SQL)
- [ ] **XSS**: All user inputs sanitized before rendering
- [ ] **CSRF**: httpOnly cookies; SameSite=Strict
- [ ] **Secrets**: No hardcoded API keys; all in Secrets Manager
- [ ] **Error Messages**: No sensitive data in error responses (no stack traces to client)
- [ ] **Logging**: No PII in CloudWatch logs (passwords, API keys, email addresses)
- [ ] **HTTPS**: All endpoints HTTPS only (API Gateway enforces TLS 1.2+)
- [ ] **CORS**: Restricted to approved domains (not wildcard *)

### Example: Input Validation with Zod

```typescript
import { z } from 'zod';

const QuoteRequestSchema = z.object({
  pickup: z.object({
    placeId: z.string().min(10),
    name: z.string().min(1)
  }),
  dropoff: z.object({
    placeId: z.string().min(10),
    name: z.string().min(1)
  }),
  waypoints: z.array(z.object({
    placeId: z.string().min(10),
    name: z.string().min(1),
    waitTime: z.number().min(0).max(300)
  })).optional(),
  datetime: z.string().datetime(),
  passengers: z.number().min(1).max(8),
  luggage: z.number().min(0).max(10)
});

// In Lambda handler
exports.handler = async (event) => {
  const body = JSON.parse(event.body);

  // Validate input
  const result = QuoteRequestSchema.safeParse(body);
  if (!result.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Invalid request',
        details: result.error.errors  // Return validation errors
      })
    };
  }

  // Proceed with validated data
  const validatedRequest = result.data;
  // ...
};
```

---

## Performance Optimization

### Lambda Performance

**Cold Start Optimization**:
1. Use arm64 architecture (15-20% faster)
2. Minimize Lambda package size (exclude dev dependencies)
3. Lazy-load heavy libraries (load only when needed)
4. Consider provisioned concurrency for critical endpoints (costs $$$)

**Example: Lazy Loading**
```javascript
// BAD: Load Google Maps SDK on every invocation
const { Client } = require('@googlemaps/google-maps-services-js');
const client = new Client({});

// GOOD: Only load when needed
let mapsClient;
function getMapsClient() {
  if (!mapsClient) {
    const { Client } = require('@googlemaps/google-maps-services-js');
    mapsClient = new Client({});
  }
  return mapsClient;
}
```

**Reduce Lambda Package Size**:
```bash
# Use npm prune to remove dev dependencies
cd durdle-serverless-api/functions/quotes-calculator
npm prune --production

# Verify size
du -sh node_modules/
```

### DynamoDB Performance

**Use GetItem Instead of Scan**:
```javascript
// BAD: Scan entire table (slow, expensive)
const result = await dynamodb.scan({
  TableName: 'durdle-pricing-config-dev',
  FilterExpression: 'id = :vehicleId',
  ExpressionAttributeValues: { ':vehicleId': 'standard' }
}).promise();

// GOOD: GetItem by primary key (fast, cheap)
const result = await dynamodb.getItem({
  TableName: 'durdle-pricing-config-dev',
  Key: { id: { S: 'standard' } }
}).promise();
```

**Batch Operations**:
```javascript
// BAD: Multiple GetItem calls (high latency)
const vehicle1 = await getVehicle('standard');
const vehicle2 = await getVehicle('executive');

// GOOD: BatchGetItem (single request)
const result = await dynamodb.batchGetItem({
  RequestItems: {
    'durdle-pricing-config-dev': {
      Keys: [
        { id: { S: 'standard' } },
        { id: { S: 'executive' } }
      ]
    }
  }
}).promise();
```

### Frontend Performance

**Image Optimization**:
```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/vehicles/standard.jpg"
  alt="Standard Sedan"
  width={400}
  height={300}
  loading="lazy"  // Lazy load images below fold
  quality={80}     // Compress to 80% quality
/>
```

**Code Splitting**:
```typescript
// Lazy load admin portal components
import dynamic from 'next/dynamic';

const AdminPricing = dynamic(() => import('./AdminPricing'), {
  loading: () => <p>Loading...</p>,
  ssr: false  // Disable server-side rendering for admin components
});
```

**Minimize Bundle Size**:
```bash
# Analyze bundle
npm run build
# Check .next/analyze/ for bundle size breakdown

# Remove unused dependencies
npm prune
```

---

## Summary: Development Best Practices

1. **Read Documentation First**: Review relevant docs before starting work
2. **Design Before Code**: Sketch data flow; identify affected components
3. **Backend First**: Build API endpoints before frontend
4. **Test Incrementally**: Test after every small change, not at the end
5. **Security by Default**: Input validation, auth, secrets management on every endpoint
6. **No Emojis**: CloudWatch logs fail with emoji encoding
7. **One Lambda = One Job**: Never combine responsibilities
8. **TypeScript Strict**: No `any` types; explicit types everywhere
9. **Clear Commits**: One-line, imperative, descriptive
10. **Monitor Production**: Check CloudWatch logs after every deployment

---

**END OF DEVELOPMENT GUIDE**

*For platform overview, see [CTO_PLATFORM_OVERVIEW.md](CTO_PLATFORM_OVERVIEW.md)*
*For technical reference, see [CTO_TECHNICAL_REFERENCE.md](CTO_TECHNICAL_REFERENCE.md)*
*For architecture decisions, see [CTO_ARCHITECTURE_DECISIONS.md](CTO_ARCHITECTURE_DECISIONS.md)*
