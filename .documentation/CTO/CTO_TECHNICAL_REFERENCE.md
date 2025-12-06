# CTO Technical Reference - Durdle Platform

**Document Version:** 1.0
**Last Updated:** December 6, 2025
**Purpose:** Quick lookup guide for developers - all services, APIs, schemas, and configurations

---

## Quick Navigation

- [Lambda Functions](#lambda-functions-reference)
- [API Endpoints](#api-endpoints-reference)
- [DynamoDB Tables](#dynamodb-tables-reference)
- [Environment Variables](#environment-variables-secrets)
- [AWS Resources](#aws-resources-registry)
- [Google Maps Integration](#google-maps-apis)
- [Frontend Components](#frontend-components-reference)
- [Common Workflows](#common-development-workflows)

---

## Lambda Functions Reference

### 1. quotes-calculator

**Purpose**: Core business logic for quote generation
**Memory**: 512MB
**Runtime**: Node.js 20.x (arm64)
**Timeout**: 10 seconds

**Responsibilities**:
- Calculate quotes using 3 pricing models (fixed route, simple variable, waypoint variable)
- Call Google Maps Distance Matrix API for route data
- Query fixed routes table for price overrides
- Query pricing config table for vehicle rates
- Store quotes in DynamoDB with 15-minute TTL
- Return quote with breakdown (base + distance + wait time)

**Key Dependencies**:
- Google Maps Distance Matrix API
- durdle-pricing-config-dev table
- durdle-fixed-routes-dev table
- durdle-main-table-dev table
- AWS Secrets Manager (Google Maps API key)

**Environment Variables**:
```
GOOGLE_MAPS_API_KEY_SECRET_NAME=durdle/google-maps-api-key
PRICING_TABLE_NAME=durdle-pricing-config-dev
FIXED_ROUTES_TABLE_NAME=durdle-fixed-routes-dev
MAIN_TABLE_NAME=durdle-main-table-dev
```

**API Endpoint**: `POST /v1/quotes`

**When to modify**:
- Adding new pricing models (e.g., surge pricing)
- Changing quote calculation logic
- Adding promotional discounts
- Implementing route optimization

---

### 2. pricing-manager

**Purpose**: Admin CRUD for vehicle pricing rates
**Memory**: 256MB
**Runtime**: Node.js 20.x (arm64)
**Timeout**: 5 seconds

**Responsibilities**:
- Get all vehicle pricing configurations
- Update vehicle pricing rates (base fare, per-mile, per-minute)
- Validate pricing inputs (no negative values, reasonable ranges)
- Return updated pricing to admin portal

**Key Dependencies**:
- durdle-pricing-config-dev table
- JWT authentication middleware (admin-auth Lambda)

**Environment Variables**:
```
PRICING_TABLE_NAME=durdle-pricing-config-dev
```

**API Endpoints**:
- `GET /admin/pricing/vehicles`
- `PUT /admin/pricing/vehicles/:vehicleId`

**When to modify**:
- Adding new vehicle types
- Implementing pricing history/versioning
- Adding bulk pricing updates
- Implementing pricing approval workflows

---

### 3. fixed-routes-manager

**Purpose**: Admin management of pre-configured routes with fixed prices
**Memory**: 512MB
**Runtime**: Node.js 20.x (arm64)
**Timeout**: 10 seconds

**Responsibilities**:
- Create new fixed route with origin, destination, vehicle type, price
- Update existing fixed route pricing
- Delete fixed routes
- List all configured fixed routes
- Validate route data (origin/destination place IDs must be valid)

**Key Dependencies**:
- durdle-fixed-routes-dev table
- Google Maps Places API (for place ID validation)
- JWT authentication middleware

**Environment Variables**:
```
FIXED_ROUTES_TABLE_NAME=durdle-fixed-routes-dev
GOOGLE_MAPS_API_KEY_SECRET_NAME=durdle/google-maps-api-key
```

**API Endpoints**:
- `GET /admin/pricing/fixed-routes`
- `POST /admin/pricing/fixed-routes`
- `PUT /admin/pricing/fixed-routes/:routeId`
- `DELETE /admin/pricing/fixed-routes/:routeId`

**When to modify**:
- Adding route popularity tracking
- Implementing seasonal route pricing
- Adding route approval workflows
- Implementing route analytics

---

### 4. vehicle-manager

**Purpose**: Manage vehicle metadata (name, capacity, features, images)
**Memory**: 256MB
**Runtime**: Node.js 20.x (arm64)
**Timeout**: 5 seconds

**Responsibilities**:
- Get all vehicles (public endpoint for quote wizard)
- Get single vehicle details
- Update vehicle metadata (admin)
- Upload vehicle images to S3 (admin)
- Return vehicle data with image URLs

**Key Dependencies**:
- durdle-pricing-config-dev table
- S3 bucket (durdle-vehicle-images-dev)
- JWT authentication middleware (admin endpoints only)

**Environment Variables**:
```
PRICING_TABLE_NAME=durdle-pricing-config-dev
S3_BUCKET_NAME=durdle-vehicle-images-dev
```

**API Endpoints**:
- `GET /v1/vehicles` (public)
- `GET /admin/vehicles/:vehicleId` (admin)
- `PUT /admin/vehicles/:vehicleId` (admin)

**When to modify**:
- Adding vehicle availability tracking
- Implementing vehicle feature filtering
- Adding vehicle ratings/reviews
- Implementing vehicle maintenance tracking

---

### 5. locations-lookup

**Purpose**: Google Places Autocomplete proxy with CORS handling
**Memory**: 256MB
**Runtime**: Node.js 20.x (arm64)
**Timeout**: 5 seconds

**Responsibilities**:
- Proxy Google Places Autocomplete API requests
- Handle CORS preflight requests (OPTIONS)
- Restrict autocomplete to UK locations
- Return place predictions with place IDs
- Cache common locations (future optimization)

**Key Dependencies**:
- Google Maps Places API
- AWS Secrets Manager (Google Maps API key)

**Environment Variables**:
```
GOOGLE_MAPS_API_KEY_SECRET_NAME=durdle/google-maps-api-key
```

**API Endpoint**: `GET /v1/locations/autocomplete?input={query}`

**When to modify**:
- Adding location search filters (e.g., airports only)
- Implementing location caching
- Adding recent/favorite locations
- Implementing location analytics

---

### 6. uploads-presigned

**Purpose**: Generate S3 presigned URLs for secure vehicle image uploads
**Memory**: 128MB
**Runtime**: Node.js 20.x (arm64)
**Timeout**: 5 seconds

**Responsibilities**:
- Generate S3 presigned POST URLs with secure policies
- Validate file types (images only: jpg, png, webp)
- Enforce file size limits (max 5MB)
- Set 15-minute expiry on presigned URLs
- Return upload URL and required form fields

**Key Dependencies**:
- S3 bucket (durdle-vehicle-images-dev)
- JWT authentication middleware

**Environment Variables**:
```
S3_BUCKET_NAME=durdle-vehicle-images-dev
```

**API Endpoint**: `POST /admin/uploads/presigned`

**When to modify**:
- Adding image compression
- Implementing CDN integration
- Adding watermarking
- Implementing image moderation (AI content filtering)

---

### 7. admin-auth

**Purpose**: JWT token generation and admin session management
**Memory**: 256MB
**Runtime**: Node.js 20.x (arm64)
**Timeout**: 5 seconds

**Responsibilities**:
- Authenticate admin login (username + password)
- Hash passwords with bcryptjs (10 rounds)
- Generate JWT tokens with 8-hour expiry
- Verify JWT tokens on protected endpoints
- Handle logout (client-side token deletion)

**Key Dependencies**:
- durdle-admin-users-dev table
- AWS Secrets Manager (JWT secret)

**Environment Variables**:
```
ADMIN_USERS_TABLE_NAME=durdle-admin-users-dev
JWT_SECRET_NAME=durdle/jwt-secret
```

**API Endpoints**:
- `POST /admin/auth/login`
- `POST /admin/auth/logout`
- `GET /admin/auth/session`

**When to modify**:
- Adding multi-factor authentication (MFA)
- Implementing session refresh tokens
- Adding role-based permissions
- Implementing password reset flow

---

### 8. feedback-manager

**Purpose**: Customer feedback collection (future feature - Phase 3)
**Memory**: 256MB
**Runtime**: Node.js 20.x (arm64)
**Timeout**: 5 seconds

**Responsibilities**:
- Store customer feedback with ratings
- Associate feedback with bookings
- Flag negative feedback for review
- Send feedback notifications to admin

**Status**: **NOT YET IMPLEMENTED**

**API Endpoints** (planned):
- `POST /v1/feedback`
- `GET /admin/feedback`

---

## API Endpoints Reference

### Public Endpoints (No Auth Required)

#### POST /v1/quotes
Generate instant quote for transport journey

**Request Body**:
```json
{
  "pickup": {
    "placeId": "ChIJ...",
    "name": "Bournemouth Train Station"
  },
  "dropoff": {
    "placeId": "ChIJ...",
    "name": "Heathrow Airport"
  },
  "waypoints": [
    {
      "placeId": "ChIJ...",
      "name": "Southampton",
      "waitTime": 30
    }
  ],
  "datetime": "2025-12-25T10:00:00Z",
  "passengers": 2,
  "luggage": 3
}
```

**Response**:
```json
{
  "quoteId": "Q1234567890",
  "quotes": [
    {
      "vehicleType": "standard",
      "vehicleName": "Standard Sedan",
      "totalPrice": 1750,
      "breakdown": {
        "baseFare": 500,
        "distanceCharge": 1000,
        "waitTimeCharge": 250
      },
      "distance": 10.5,
      "duration": 25,
      "pricingModel": "simple-variable"
    }
  ],
  "expiresAt": "2025-12-25T10:15:00Z"
}
```

**Error Responses**:
- `400`: Invalid request (missing fields, invalid place IDs)
- `500`: Google Maps API failure, DynamoDB error

---

#### GET /v1/vehicles
List all available vehicle types

**Response**:
```json
{
  "vehicles": [
    {
      "id": "standard",
      "name": "Standard Sedan",
      "capacity": 4,
      "luggage": 3,
      "features": ["Air Conditioning", "Child Seat Available"],
      "imageUrl": "https://s3.eu-west-2.amazonaws.com/durdle-vehicle-images-dev/standard.jpg",
      "baseFare": 500,
      "perMile": 100,
      "perMinute": 10
    }
  ]
}
```

---

#### GET /v1/locations/autocomplete
Google Places Autocomplete proxy

**Query Parameters**:
- `input` (required): Search query (e.g., "Bournemouth")
- `types`: Place types to filter (e.g., "geocode", "establishment")

**Response**:
```json
{
  "predictions": [
    {
      "placeId": "ChIJ...",
      "description": "Bournemouth, UK",
      "mainText": "Bournemouth",
      "secondaryText": "UK"
    }
  ]
}
```

---

### Admin Endpoints (JWT Auth Required)

#### POST /admin/auth/login
Admin login with username/password

**Request Body**:
```json
{
  "username": "admin",
  "password": "secure_password"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin",
    "email": "admin@durdle.com"
  }
}
```

**Sets Cookie**: `durdle_admin_token` (httpOnly, secure, 8-hour expiry)

---

#### GET /admin/pricing/vehicles
Get all vehicle pricing configurations

**Response**:
```json
{
  "vehicles": [
    {
      "id": "standard",
      "name": "Standard Sedan",
      "baseFare": 500,
      "perMile": 100,
      "perMinute": 10,
      "capacity": 4
    }
  ]
}
```

---

#### PUT /admin/pricing/vehicles/:vehicleId
Update vehicle pricing rates

**Request Body**:
```json
{
  "baseFare": 600,
  "perMile": 120,
  "perMinute": 12
}
```

**Response**:
```json
{
  "message": "Vehicle pricing updated successfully",
  "vehicle": {
    "id": "standard",
    "baseFare": 600,
    "perMile": 120,
    "perMinute": 12
  }
}
```

---

#### POST /admin/pricing/fixed-routes
Create new fixed route

**Request Body**:
```json
{
  "origin": {
    "placeId": "ChIJ...",
    "name": "Bournemouth Train Station"
  },
  "destination": {
    "placeId": "ChIJ...",
    "name": "Heathrow Airport"
  },
  "vehicleId": "standard",
  "price": 12000,
  "distance": 115.2,
  "duration": 140
}
```

**Response**:
```json
{
  "message": "Fixed route created successfully",
  "route": {
    "id": "ROUTE#ChIJ...+DEST#ChIJ...#standard",
    "price": 12000
  }
}
```

---

## DynamoDB Tables Reference

### 1. durdle-pricing-config-dev

**Purpose**: Vehicle types with pricing rates and metadata

**Primary Key**: `id` (String) - Vehicle ID (e.g., "standard", "executive", "minibus")

**Attributes**:
```
id: "standard"
name: "Standard Sedan"
baseFare: 500 (pence)
perMile: 100 (pence)
perMinute: 10 (pence)
capacity: 4 (passengers)
luggage: 3 (bags)
features: ["Air Conditioning", "Child Seat Available"]
imageUrl: "https://s3.amazonaws.com/..."
active: true
```

**Access Patterns**:
- Get all vehicles: `Scan` (low volume, acceptable)
- Get single vehicle: `GetItem` by `id`
- Update vehicle pricing: `UpdateItem` by `id`

**Indexes**: None (primary key only)

---

### 2. durdle-fixed-routes-dev

**Purpose**: Pre-configured origin-destination pairs with fixed prices

**Primary Key**: Composite
- **Partition Key**: `routeKey` (String) - Format: `ROUTE#{origin_place_id}+DEST#{dest_place_id}#{vehicle_id}`
- **Sort Key**: None

**Attributes**:
```
routeKey: "ROUTE#ChIJ...+DEST#ChIJ...#standard"
origin: {
  placeId: "ChIJ...",
  name: "Bournemouth Train Station"
}
destination: {
  placeId: "ChIJ...",
  name: "Heathrow Airport"
}
vehicleId: "standard"
price: 12000 (pence)
distance: 115.2 (miles)
duration: 140 (minutes)
active: true
createdAt: "2025-12-01T10:00:00Z"
updatedAt: "2025-12-01T10:00:00Z"
```

**Access Patterns**:
- Lookup fixed route: `GetItem` by `routeKey`
- List all routes: `Scan` (admin portal only)
- Delete route: `DeleteItem` by `routeKey`

**Composite Key Construction**:
```javascript
const routeKey = `ROUTE#${originPlaceId}+DEST#${destPlaceId}#${vehicleId}`;
```

---

### 3. durdle-admin-users-dev

**Purpose**: Admin credentials with bcryptjs hashed passwords

**Primary Key**: `username` (String)

**Attributes**:
```
username: "admin"
passwordHash: "$2b$10$..." (bcryptjs hash)
role: "admin" | "superadmin"
email: "admin@durdle.com"
lastLogin: "2025-12-06T09:30:00Z"
createdAt: "2025-11-01T10:00:00Z"
active: true
```

**Access Patterns**:
- Login: `GetItem` by `username`, then bcryptjs.compare(password, passwordHash)
- Update last login: `UpdateItem` by `username`

**Security Notes**:
- Passwords NEVER stored in plaintext
- bcryptjs with 10 rounds (industry standard)
- No password reset flow yet (Phase 3)

---

### 4. durdle-main-table-dev

**Purpose**: General application data (quotes, future: bookings, payments)

**Primary Key**: Composite
- **Partition Key**: `PK` (String) - Entity type prefix (e.g., `QUOTE#`, `BOOKING#`)
- **Sort Key**: `SK` (String) - Entity ID or timestamp

**Current Entities**:

#### Quotes
```
PK: "QUOTE#Q1234567890"
SK: "METADATA"
quoteId: "Q1234567890"
pickup: { placeId: "...", name: "..." }
dropoff: { placeId: "...", name: "..." }
waypoints: [...]
quotes: [...]
createdAt: "2025-12-06T10:00:00Z"
expiresAt: "2025-12-06T10:15:00Z"
ttl: 1733482500 (DynamoDB TTL for auto-deletion)
```

**Access Patterns**:
- Store quote: `PutItem`
- Retrieve quote: `GetItem` by `PK` and `SK`
- Auto-expiry: TTL attribute (15 minutes)

**Future Entities** (Phase 3):
- `BOOKING#{bookingId}` - Customer bookings
- `PAYMENT#{paymentId}` - Stripe payment records
- `CUSTOMER#{customerId}` - Customer profiles

---

## Environment Variables & Secrets

### Lambda Environment Variables (Common)

**AWS Secrets Manager References**:
```
GOOGLE_MAPS_API_KEY_SECRET_NAME=durdle/google-maps-api-key
JWT_SECRET_NAME=durdle/jwt-secret
```

**DynamoDB Table Names**:
```
PRICING_TABLE_NAME=durdle-pricing-config-dev
FIXED_ROUTES_TABLE_NAME=durdle-fixed-routes-dev
ADMIN_USERS_TABLE_NAME=durdle-admin-users-dev
MAIN_TABLE_NAME=durdle-main-table-dev
```

**S3 Bucket**:
```
S3_BUCKET_NAME=durdle-vehicle-images-dev
```

**AWS Region**:
```
AWS_REGION=eu-west-2
```

### Secrets in AWS Secrets Manager

#### durdle/google-maps-api-key
```json
{
  "apiKey": "AIzaSy..."
}
```

**Used by**:
- quotes-calculator (Distance Matrix API)
- locations-lookup (Places Autocomplete API)
- fixed-routes-manager (Places API validation)

**Retrieval**:
```javascript
const secret = await secretsManager.getSecretValue({
  SecretId: process.env.GOOGLE_MAPS_API_KEY_SECRET_NAME
}).promise();
const { apiKey } = JSON.parse(secret.SecretString);
```

---

#### durdle/jwt-secret
```json
{
  "secret": "super_secret_jwt_key_min_32_chars"
}
```

**Used by**:
- admin-auth (JWT signing and verification)

**Retrieval**:
```javascript
const secret = await secretsManager.getSecretValue({
  SecretId: process.env.JWT_SECRET_NAME
}).promise();
const { secret: jwtSecret } = JSON.parse(secret.SecretString);
```

---

## AWS Resources Registry

### Lambda Functions

| Function Name | ARN | Memory | Timeout |
|--------------|-----|--------|---------|
| quotes-calculator-dev | arn:aws:lambda:eu-west-2:...:function:quotes-calculator-dev | 512MB | 10s |
| pricing-manager-dev | arn:aws:lambda:eu-west-2:...:function:pricing-manager-dev | 256MB | 5s |
| fixed-routes-manager-dev | arn:aws:lambda:eu-west-2:...:function:fixed-routes-manager-dev | 512MB | 10s |
| vehicle-manager-dev | arn:aws:lambda:eu-west-2:...:function:vehicle-manager-dev | 256MB | 5s |
| locations-lookup-dev | arn:aws:lambda:eu-west-2:...:function:locations-lookup-dev | 256MB | 5s |
| uploads-presigned-dev | arn:aws:lambda:eu-west-2:...:function:uploads-presigned-dev | 128MB | 5s |
| admin-auth-dev | arn:aws:lambda:eu-west-2:...:function:admin-auth-dev | 256MB | 5s |
| feedback-manager-dev | arn:aws:lambda:eu-west-2:...:function:feedback-manager-dev | 256MB | 5s |

### DynamoDB Tables

| Table Name | ARN | Billing Mode |
|-----------|-----|--------------|
| durdle-pricing-config-dev | arn:aws:dynamodb:eu-west-2:...:table/durdle-pricing-config-dev | On-Demand |
| durdle-fixed-routes-dev | arn:aws:dynamodb:eu-west-2:...:table/durdle-fixed-routes-dev | On-Demand |
| durdle-admin-users-dev | arn:aws:dynamodb:eu-west-2:...:table/durdle-admin-users-dev | On-Demand |
| durdle-main-table-dev | arn:aws:dynamodb:eu-west-2:...:table/durdle-main-table-dev | On-Demand |

### S3 Buckets

| Bucket Name | Purpose | Region |
|------------|---------|--------|
| durdle-vehicle-images-dev | Vehicle images, presigned uploads | eu-west-2 |
| durdle-lambda-deployments-dev | Lambda function ZIP files | eu-west-2 |

### API Gateway

| Name | ID | Stage | URL |
|------|----|----|-----|
| durdle-api-dev | TBD | dev | TBD |

### Secrets Manager

| Secret Name | Description |
|------------|-------------|
| durdle/google-maps-api-key | Google Maps API key |
| durdle/jwt-secret | JWT signing secret |

---

## Google Maps APIs

### Distance Matrix API

**Purpose**: Calculate distance and duration between origin and destination

**Usage**: quotes-calculator Lambda

**Request**:
```
GET https://maps.googleapis.com/maps/api/distancematrix/json?
  origins=place_id:ChIJ...&
  destinations=place_id:ChIJ...&
  key=AIzaSy...
```

**Response**:
```json
{
  "rows": [
    {
      "elements": [
        {
          "distance": { "value": 16897 },
          "duration": { "value": 1500 }
        }
      ]
    }
  ]
}
```

**Cost**: $5 per 1000 requests

---

### Places Autocomplete API

**Purpose**: Location search with autocomplete suggestions

**Usage**: locations-lookup Lambda (proxy for frontend)

**Request**:
```
GET https://maps.googleapis.com/maps/api/place/autocomplete/json?
  input=Bournemouth&
  components=country:gb&
  key=AIzaSy...
```

**Response**:
```json
{
  "predictions": [
    {
      "place_id": "ChIJ...",
      "description": "Bournemouth, UK"
    }
  ]
}
```

**Cost**: $2.83 per 1000 requests (Autocomplete - Per Session)

---

### Directions API

**Purpose**: Get route waypoints for map visualization (future use)

**Usage**: Not yet implemented (Phase 3 - map display)

**Cost**: $5 per 1000 requests

---

## Frontend Components Reference

### Core Pages

**Landing Page**: [`app/page.tsx`](../../app/page.tsx)
- Hero with CTA to /quote
- Service showcase
- Trust signals

**Quote Wizard**: [`app/quote/page.tsx`](../../app/quote/page.tsx)
- 2-step form (locations, then details)
- Google Places Autocomplete
- Mobile-optimized

**Quote Results**: [`app/quote/results/page.tsx`](../../app/quote/results/page.tsx)
- Pricing breakdown
- Vehicle comparison
- 15-minute timer

**Admin Login**: [`app/admin/login/page.tsx`](../../app/admin/login/page.tsx)
- JWT authentication
- Remember me (future)

**Admin Pricing**: [`app/admin/pricing/page.tsx`](../../app/admin/pricing/page.tsx)
- Variable rate management
- Fixed route management

---

### Key Components

**LocationInput**: [`app/quote/components/LocationInput.tsx`](../../app/quote/components/LocationInput.tsx)
- Google Places Autocomplete
- Debounced search
- Place ID capture

**VehicleSelector**: [`app/quote/components/VehicleSelector.tsx`](../../app/quote/components/VehicleSelector.tsx)
- Vehicle cards with images
- Feature badges
- Capacity indicators

**PricingBreakdown**: [`app/quote/results/components/PricingBreakdown.tsx`](../../app/quote/results/components/PricingBreakdown.tsx)
- Base fare + distance + wait time
- Total with currency formatting

**Button**: [`components/ui/button.tsx`](../../components/ui/button.tsx)
- Base button component
- Variants: primary, secondary, outline

---

## Common Development Workflows

### Adding a New Lambda Function

1. **Create function directory**:
   ```bash
   mkdir durdle-serverless-api/functions/new-function
   cd durdle-serverless-api/functions/new-function
   npm init -y
   npm install aws-sdk
   ```

2. **Write handler** (`index.js`):
   ```javascript
   exports.handler = async (event) => {
     // Business logic
     return {
       statusCode: 200,
       body: JSON.stringify({ message: 'Success' })
     };
   };
   ```

3. **Create IAM policy** (`durdle-serverless-api/iam-policies/new-function-policy.json`)

4. **Deploy**:
   ```bash
   zip -r new-function.zip .
   aws lambda create-function \
     --function-name new-function-dev \
     --runtime nodejs20.x \
     --role arn:aws:iam::...:role/lambda-execution-role \
     --handler index.handler \
     --zip-file fileb://new-function.zip \
     --region eu-west-2
   ```

---

### Adding a New API Endpoint

1. **Add route to API Gateway** (currently manual via AWS Console)

2. **Create Lambda integration**

3. **Configure CORS**:
   ```json
   {
     "Access-Control-Allow-Origin": "https://yourdomain.com",
     "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE",
     "Access-Control-Allow-Headers": "Content-Type,Authorization"
   }
   ```

4. **Add endpoint to frontend API client** (`lib/api.ts`)

---

### Adding a New Pricing Model

1. **Update quotes-calculator Lambda** logic in `calculateQuote()` function

2. **Add new pricing model type** to DynamoDB schema

3. **Update frontend** to display new pricing breakdown

4. **Update documentation** (Pricing_Engine_Logic.md)

5. **Add test cases** for new model

---

### Modifying DynamoDB Schema

1. **Create migration script** (future: use AWS DynamoDB Streams)

2. **Update seed data** (`durdle-serverless-api/seed-data/`)

3. **Deploy Lambda functions** with new schema references

4. **Update documentation** (DatabaseSchema.md)

---

### Testing Quote Flow End-to-End

1. **Frontend**:
   - Navigate to `/quote`
   - Enter pickup: "Bournemouth Train Station"
   - Enter dropoff: "Heathrow Airport"
   - Add waypoint: "Southampton" with 30 min wait
   - Select date/time, passengers, luggage
   - Submit

2. **Backend Validation**:
   - Check CloudWatch logs for quotes-calculator Lambda
   - Verify Google Maps API calls
   - Check DynamoDB for quote storage

3. **Expected Result**:
   - Quote results page with 3 vehicle options
   - Pricing breakdown showing base + distance + wait time
   - 15-minute timer started

---

## Performance Benchmarks

### Lambda Cold Start Times (arm64)
- quotes-calculator: ~600ms
- pricing-manager: ~400ms
- locations-lookup: ~350ms
- admin-auth: ~450ms

### Lambda Warm Invocation Times
- quotes-calculator: ~800ms (incl. Google Maps API call)
- pricing-manager: ~50ms
- locations-lookup: ~200ms (incl. Google Maps API call)

### API Latency (p95)
- POST /v1/quotes: <2s
- GET /v1/vehicles: <300ms
- GET /v1/locations/autocomplete: <500ms

---

## Troubleshooting Guide

### Quote Calculation Returns Error

**Symptom**: 500 error on POST /v1/quotes

**Common Causes**:
1. Invalid Google Maps API key
2. DynamoDB table not found
3. Invalid place IDs

**Debug Steps**:
1. Check CloudWatch logs for quotes-calculator Lambda
2. Verify Google Maps API key in Secrets Manager
3. Confirm DynamoDB table names match environment variables
4. Test place IDs manually with Google Maps API

---

### Admin Login Fails

**Symptom**: 401 Unauthorized on POST /admin/auth/login

**Common Causes**:
1. Wrong username/password
2. JWT secret not configured
3. DynamoDB admin users table empty

**Debug Steps**:
1. Check CloudWatch logs for admin-auth Lambda
2. Verify JWT secret exists in Secrets Manager
3. Query durdle-admin-users-dev table for username
4. Test bcryptjs hash comparison manually

---

### Vehicle Images Not Loading

**Symptom**: Broken image URLs in quote results

**Common Causes**:
1. S3 bucket not public
2. Invalid image URLs in DynamoDB
3. CORS issue with S3

**Debug Steps**:
1. Check S3 bucket policy
2. Verify image URLs in durdle-pricing-config-dev table
3. Test image URL directly in browser
4. Check S3 CORS configuration

---

## Quick Commands

### Deploy Lambda Function
```bash
cd functions/quotes-calculator/dist
zip -r quotes-calculator.zip .
aws lambda update-function-code \
  --function-name quotes-calculator-dev \
  --zip-file fileb://quotes-calculator.zip \
  --region eu-west-2
```

### Query DynamoDB Table
```bash
aws dynamodb scan \
  --table-name durdle-pricing-config-dev \
  --region eu-west-2
```

### Get Lambda Logs
```bash
aws logs tail /aws/lambda/quotes-calculator-dev \
  --follow \
  --region eu-west-2
```

### Update Secret
```bash
aws secretsmanager update-secret \
  --secret-id durdle/google-maps-api-key \
  --secret-string '{"apiKey":"AIzaSy..."}' \
  --region eu-west-2
```

---

**END OF TECHNICAL REFERENCE**

*For high-level platform overview, see [CTO_PLATFORM_OVERVIEW.md](CTO_PLATFORM_OVERVIEW.md)*
*For architecture decisions, see [CTO_ARCHITECTURE_DECISIONS.md](CTO_ARCHITECTURE_DECISIONS.md)*
*For development guidelines, see [CTO_DEVELOPMENT_GUIDE.md](CTO_DEVELOPMENT_GUIDE.md)*
