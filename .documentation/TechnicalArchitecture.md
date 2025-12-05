# Durdle Transport Platform - Technical Architecture Document

**Version:** 2.0
**Last Updated:** 2025-12-05
**Status:** Phase 2 Complete
**Platform:** The Dorset Transfer Company (Durdle)

---

## 1. Executive Summary

Durdle is a serverless transport booking platform built entirely on AWS infrastructure. The platform prioritizes scalability, cost-effectiveness, and operational simplicity through managed services.

**Core Principles:**
- 100% Serverless (no EC2 instances)
- API-first design
- Database-driven pricing (no hardcoded values)
- Admin-configurable pricing and routes
- Infrastructure as Code

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
├─────────────────┬───────────────────────────────────────────┤
│  Durdle Website │  Durdle Admin Portal                      │
│   (Next.js 14)  │  (Next.js 14 - /admin routes)            │
│  Amplify Hosting│  Amplify Hosting                          │
└────────┬────────┴────────┬──────────────────────────────────┘
         │                 │
         └─────────────────┼─────────────────┐
                           │                 │
                    ┌──────▼──────┐   ┌──────▼──────┐
                    │  Public API │   │  Admin API  │
                    │   Gateway   │   │   Gateway   │
                    │ /v1/*       │   │ /admin/*    │
                    └──────┬──────┘   └──────┬──────┘
                           │                 │
    ┌──────────────────────┴─────────────────┴────────────────┐
    │           AWS Lambda Functions (Node.js 20.x)            │
    │  quotes-calculator | pricing-manager | fixed-routes     │
    │  vehicle-manager | locations-lookup | uploads-presigned │
    │  admin-auth                                              │
    └────┬─────────────────────────────────┬─────────────┬───┘
         │                                  │             │
    ┌────▼──────────┐              ┌───────▼────────┐   │
    │   DynamoDB    │              │  Secrets Mgr   │   │
    │  (4 tables)   │              │  (API keys)    │   │
    └───────────────┘              └────────────────┘   │
                                                         │
                                                    ┌────▼────┐
                                                    │   S3    │
                                                    │ (Images)│
                                                    └─────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14+ (App Router) | Customer website + Admin portal |
| **Hosting** | AWS Amplify | Next.js SSR hosting with CI/CD |
| **API** | AWS API Gateway (REST) | HTTP endpoints |
| **Compute** | AWS Lambda (Node.js 20.x) | Business logic |
| **Database** | DynamoDB | Primary data store |
| **Auth** | JWT (bcryptjs) | Admin authentication (Phase 2) |
| **Storage** | S3 | Vehicle images |
| **Secrets** | AWS Secrets Manager | API keys (Google Maps, JWT secret) |
| **Region** | eu-west-2 (London) | Primary region |

---

## 3. Backend Infrastructure (Phase 2 - Complete)

### 3.1 DynamoDB Tables

#### Table 1: `durdle-pricing-config-dev`
**Purpose:** Variable pricing configuration for vehicle types

**Structure:**
```
PK: VEHICLE#{vehicle_id}
SK: METADATA

Attributes:
- vehicleId: string (e.g., "standard")
- name: string (e.g., "Standard Sedan")
- description: string
- capacity: number (1-8 passengers)
- features: list<string> (e.g., ["WiFi", "Phone Charger"])
- baseFare: number (pence)
- perMile: number (pence per mile)
- perMinute: number (pence per minute)
- active: boolean
- imageUrl: string (S3 public URL)
- createdAt: string (ISO 8601)
- updatedAt: string (ISO 8601)
- updatedBy: string (admin username)
```

**Current Data:** 3 vehicle types (standard, executive, minibus) seeded

---

#### Table 2: `durdle-fixed-routes-dev`
**Purpose:** Fixed pricing for specific origin-destination pairs

**Structure:**
```
PK: ROUTE#{origin_place_id}
SK: DEST#{destination_place_id}#{vehicle_id}

GSI1:
- GSI1PK: VEHICLE#{vehicle_id}
- GSI1SK: ROUTE#{routeId}

Attributes:
- routeId: string (UUID)
- originPlaceId: string (Google Maps place_id)
- originName: string (human-readable)
- destinationPlaceId: string
- destinationName: string
- vehicleId: string
- vehicleName: string
- price: number (pence - total fixed price)
- distance: number (miles from Google Maps)
- estimatedDuration: number (minutes from Google Maps)
- active: boolean
- createdAt: string (ISO 8601)
- updatedAt: string (ISO 8601)
- updatedBy: string (admin username)
```

**Current Data:** Admin-populated as needed

---

#### Table 3: `durdle-admin-users-dev`
**Purpose:** Admin user authentication

**Structure:**
```
PK: USER#{username}
SK: METADATA

Attributes:
- username: string (lowercase)
- passwordHash: string (bcryptjs hash, 10 rounds)
- role: string (admin/superadmin)
- email: string
- fullName: string
- active: boolean
- lastLogin: string (ISO 8601)
- createdAt: string (ISO 8601)
```

**Security:**
- Passwords hashed with bcryptjs
- JWT tokens with 8-hour expiry
- httpOnly cookies for session storage

**Current Data:** 2 admin users (james.aspin, finn.murray)

---

#### Table 4: `durdle-main-table-dev`
**Purpose:** General application data (quotes, bookings - Phase 1)

**Structure:**
```
PK: QUOTE#{quote_id}
SK: METADATA

Attributes:
- quoteId: string (UUID)
- origin: object
- destination: object
- vehicleId: string
- distance: number (miles)
- duration: number (minutes)
- price: number (pence)
- breakdown: object (baseFare, distanceCharge, timeCharge)
- isFixedRoute: boolean
- routeId: string (if fixed route)
- createdAt: string (ISO 8601)
- expiresAt: string (ISO 8601)
```

**Current Data:** Populated from Phase 1 quote functionality

---

### 3.2 Lambda Functions

| Function Name | Purpose | Timeout | Memory | Tables Accessed |
|--------------|---------|---------|--------|-----------------|
| `quotes-calculator-dev` | Generate quote (checks fixed routes first, then variable pricing) | 10s | 512MB | durdle-fixed-routes-dev<br>durdle-pricing-config-dev<br>durdle-main-table-dev |
| `pricing-manager-dev` | Admin CRUD for vehicle pricing | 10s | 256MB | durdle-pricing-config-dev |
| `fixed-routes-manager-dev` | Admin CRUD for fixed routes | 15s | 512MB | durdle-fixed-routes-dev |
| `locations-lookup-dev` | Google Maps Places Autocomplete proxy | 10s | 256MB | None |
| `vehicle-manager-dev` | Vehicle metadata management | 10s | 256MB | durdle-pricing-config-dev |
| `uploads-presigned-dev` | Generate S3 presigned URLs for image uploads | 5s | 128MB | None |
| `admin-auth-dev` | Admin authentication (login/session/logout) | 5s | 256MB | durdle-admin-users-dev |

**Configuration Standards:**
- **Runtime:** Node.js 20.x
- **Architecture:** arm64 (Graviton2 for cost savings)
- **IAM Role:** `durdle-lambda-execution-role-dev`
- **Environment Variables:** Set per function via AWS CLI

---

### 3.3 S3 Buckets

#### Bucket: `durdle-vehicle-images-dev`
**Purpose:** Store vehicle type images

**Configuration:**
- **Region:** eu-west-2
- **Versioning:** Enabled
- **Public Access:** Blocked (use presigned URLs for uploads, public URLs for display)
- **CORS:** Enabled for localhost:3000 and durdle.co.uk
- **Encryption:** AES-256 (SSE-S3)

**Folder Structure:**
```
/vehicles/
  - standard-sedan.jpg
  - executive-sedan.jpg
  - minibus.jpg
```

**Access Pattern:**
- Uploads: Admin gets presigned URL from `uploads-presigned-dev` Lambda
- Display: Public URLs stored in DynamoDB `imageUrl` field

---

### 3.4 API Gateway Routes

**API ID:** `qcfd5p4514`
**Base URL:** `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev`

#### Public Endpoints (Customer-facing)

| Method | Path | Lambda Function | Purpose |
|--------|------|-----------------|---------|
| POST | `/v1/quotes` | quotes-calculator-dev | Generate quote |
| GET | `/v1/vehicles` | pricing-manager-dev | List active vehicles with images |

#### Admin Endpoints (Auth required)

| Method | Path | Lambda Function | Purpose |
|--------|------|-----------------|---------|
| POST | `/admin/auth/login` | admin-auth-dev | Admin login |
| POST | `/admin/auth/logout` | admin-auth-dev | Admin logout |
| GET | `/admin/auth/session` | admin-auth-dev | Verify session |
| GET | `/admin/pricing/vehicles` | pricing-manager-dev | List all vehicle pricing |
| PUT | `/admin/pricing/vehicles/{vehicleId}` | pricing-manager-dev | Update vehicle pricing |
| GET | `/admin/pricing/fixed-routes` | fixed-routes-manager-dev | List fixed routes |
| POST | `/admin/pricing/fixed-routes` | fixed-routes-manager-dev | Create fixed route |
| PUT | `/admin/pricing/fixed-routes/{routeId}` | fixed-routes-manager-dev | Update fixed route |
| DELETE | `/admin/pricing/fixed-routes/{routeId}` | fixed-routes-manager-dev | Delete fixed route |
| GET | `/admin/locations/autocomplete` | locations-lookup-dev | Google Maps autocomplete |
| POST | `/admin/uploads/presigned` | uploads-presigned-dev | Generate S3 presigned URL |

**CORS Configuration:**
- Allowed Origins: `http://localhost:3000`, `https://durdle.co.uk`
- Allowed Methods: `GET, POST, PUT, DELETE, OPTIONS`
- Allowed Headers: `Content-Type, Authorization`

---

### 3.5 External Integrations

#### Google Maps API
**APIs Used:**
- Distance Matrix API (quote calculations - distance and duration)
- Places Autocomplete API (location search for admin)

**API Key Storage:** AWS Secrets Manager (`durdle/google-maps-api-key`)

**Caching:**
- Vehicle pricing: 5-minute cache in Lambda container
- Fixed routes: No cache (query DynamoDB each time)

**Cost Optimization:**
- Session tokens used for autocomplete (billed per session, not per keystroke)
- Distance/duration stored in DynamoDB for fixed routes (no repeated API calls)

---

### 3.6 Secrets Management

**Service:** AWS Secrets Manager

| Secret Name | Purpose | Rotation |
|------------|---------|----------|
| `durdle/google-maps-api-key` | Google Maps API key | Manual |
| `durdle/jwt-secret` | JWT signing secret (256-bit hex) | Manual |

**Access Pattern:**
- Lambda functions fetch secrets on cold start
- Secrets cached in Lambda container memory for reuse

---

## 4. Quote Calculation Logic (Customer-facing)

### 4.1 Quote Flow

```
Customer Request (origin, destination, vehicleId)
        ↓
POST /v1/quotes → quotes-calculator Lambda
        ↓
1. Resolve origin/destination to place_ids (if not provided)
        ↓
2. Check durdle-fixed-routes-dev for matching route
        ├─ Found? → Return fixed price immediately
        └─ Not found? → Continue to variable pricing
        ↓
3. Fetch vehicle pricing from durdle-pricing-config-dev
        ↓
4. Call Google Maps Distance Matrix API
        ↓
5. Calculate: baseFare + (distance × perMile) + (duration × perMinute)
        ↓
6. Store quote in durdle-main-table-dev (15-min expiry)
        ↓
7. Return quote to customer
```

### 4.2 Quote Response Format

```json
{
  "quoteId": "uuid-123",
  "origin": {
    "name": "London Heathrow Airport",
    "placeId": "ChIJ..."
  },
  "destination": {
    "name": "Bournemouth, UK",
    "placeId": "ChIJ..."
  },
  "vehicle": {
    "vehicleId": "standard",
    "name": "Standard Sedan",
    "capacity": 4,
    "features": ["WiFi", "Phone Charger"],
    "imageUrl": "https://durdle-vehicle-images-dev.s3.eu-west-2.amazonaws.com/vehicles/standard-sedan.jpg"
  },
  "distance": 98.5,
  "duration": 115,
  "price": 12000,
  "breakdown": {
    "baseFare": 500,
    "distanceCharge": 9850,
    "timeCharge": 1150
  },
  "isFixedRoute": false,
  "createdAt": "2025-12-05T10:00:00Z",
  "expiresAt": "2025-12-05T10:15:00Z"
}
```

---

## 5. Admin Portal (Phase 2 - Complete)

### 5.1 Admin Pages

| Route | Purpose | Features |
|-------|---------|----------|
| `/admin/login` | Admin login | Username/password with JWT tokens |
| `/admin` | Dashboard | Quick stats, navigation to management pages |
| `/admin/pricing` | Variable Pricing | Inline editing of vehicle rates, pricing calculator |
| `/admin/fixed-routes` | Fixed Routes | Create/edit/delete routes with Google Maps autocomplete |
| `/admin/vehicles` | Vehicle Types | Upload images, edit metadata (name, capacity, description, features) |

### 5.2 Admin Authentication

**Authentication Method:** JWT with bcryptjs password hashing

**Flow:**
1. Admin enters username/password
2. POST /admin/auth/login → Verifies credentials, generates JWT
3. JWT stored in httpOnly cookie + localStorage
4. All admin routes verify JWT via GET /admin/auth/session
5. JWT expires after 8 hours

**Protected Routes:** All `/admin/*` routes except `/admin/login` require valid JWT

---

## 6. Infrastructure Readiness for "Get Quote" Feature

### ✅ **READY - All Backend Infrastructure Complete**

**What's Available:**

1. **Vehicle Data with Images**
   - GET /v1/vehicles - Lists all active vehicles with name, description, capacity, features, imageUrl
   - Vehicle images stored in S3, public URLs in database
   - Frontend can display vehicle cards with images

2. **Quote Generation**
   - POST /v1/quotes - Generates quote based on origin, destination, vehicleId
   - Checks fixed routes first for guaranteed pricing
   - Falls back to variable pricing (distance × perMile + duration × perMinute + baseFare)
   - Returns detailed quote with breakdown

3. **Location Autocomplete**
   - GET /admin/locations/autocomplete - Google Maps Places Autocomplete
   - Currently admin-only, but can be:
     - Made public by removing auth requirement, OR
     - Proxied via Next.js API route to keep it protected

4. **Quote Storage**
   - Quotes stored in durdle-main-table-dev with 15-minute expiry
   - Can be retrieved by quoteId (if retrieval endpoint exists)

**What's Needed for Frontend:**

1. **Location Autocomplete Component**
   - Debounced search input (min 3 chars)
   - Dropdown with suggestions
   - Stores place_id for accurate geocoding

2. **Date/Time Picker Component**
   - Calendar for date selection
   - Time dropdown (15-minute intervals)
   - Validation for min booking time (e.g., +2 hours)

3. **Vehicle Selector Component**
   - Cards displaying vehicle options
   - Shows name, capacity, features, image
   - Radio button or click-to-select

4. **Quote Results Component**
   - Displays price breakdown
   - Shows vehicle details
   - "Book Now" button (Phase 3)

**API Integration Pattern (Next.js):**
```typescript
// app/api/quotes/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(
    'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/v1/quotes',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return Response.json(await response.json());
}
```

---

## 7. Performance & Scalability

### 7.1 Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| API Response Time (p95) | < 500ms | TBD (Phase 2G testing) |
| Quote Calculation | < 3s | TBD (Phase 2G testing) |
| Admin Page Load | < 2s | TBD (Phase 2G testing) |

### 7.2 Auto-Scaling

**DynamoDB:** On-Demand billing mode (auto-scales with traffic)

**Lambda:**
- No reserved concurrency (uses account-level concurrency)
- Cold start mitigation: Small function sizes, minimal dependencies

**Amplify Hosting:**
- Auto-scales with traffic
- Global CDN via CloudFront

---

## 8. Cost Optimization

### 8.1 Estimated Monthly Costs (Phase 2 - 500 quotes/month)

| Service | Cost |
|---------|------|
| Lambda (7 functions) | ~£5 |
| DynamoDB (4 tables, on-demand) | ~£8 |
| API Gateway (REST) | ~£3 |
| S3 (vehicle images) | ~£1 |
| Secrets Manager (2 secrets) | ~£1 |
| Amplify Hosting | ~£0 (free tier) |
| Google Maps API | ~£10 (500 quotes × £0.02) |
| **Total** | **~£28/month** |

**Scaling:** Costs scale linearly with usage (serverless pricing model)

---

## 9. Security Architecture

### 9.1 API Security

- **CORS:** Restricted to durdle.co.uk and localhost:3000
- **Rate Limiting:** Not yet implemented (Phase 2.5)
- **Input Validation:** Lambda functions validate all inputs
- **SQL Injection:** Not applicable (DynamoDB NoSQL)

### 9.2 Data Protection

- **Encryption at Rest:** All DynamoDB tables use AWS-managed keys
- **Encryption in Transit:** TLS 1.2+ for all API calls
- **Password Security:** bcryptjs hashing with 10 rounds
- **JWT Security:** 8-hour expiry, httpOnly cookies

### 9.3 Admin Authentication

- **No Cognito (Phase 2):** Simple username/password with JWT
- **Future (Phase 3):** Migrate to AWS Cognito for MFA, SSO, better UX

---

## 10. Deployment Architecture

### 10.1 Environments

| Environment | Purpose | URL | Status |
|------------|---------|-----|--------|
| `dev` | Development + Staging | https://main.d3v9k8h9k8h9k8.amplifyapp.com | Active |
| `production` | Live system | https://durdle.co.uk | Phase 3 |

### 10.2 CI/CD Pipeline

**Frontend (Next.js):**
- GitHub → AWS Amplify (auto-deploy on push to main)
- Build triggers on commit
- Environment variables set in Amplify console

**Backend (Lambda):**
- Manual deployment via AWS CLI (Phase 2)
- SAM template exists but not used during active development
- Deployment: zip → aws lambda update-function-code

**Future (Phase 3):** GitHub Actions for automated Lambda deployments

---

## 11. Monitoring & Observability

### 11.1 CloudWatch Logs

- All Lambda functions log to CloudWatch
- Log Groups: `/aws/lambda/{function-name}`
- Retention: 7 days (dev environment)

### 11.2 Metrics (Phase 2G - To Be Configured)

- Lambda invocations, duration, errors
- API Gateway requests, latency, 4xx/5xx errors
- DynamoDB consumed capacity, throttles

### 11.3 Alarms (Phase 3)

- API 5xx errors > 10 in 5 minutes
- Lambda error rate > 5%
- DynamoDB throttles > 0

---

## 12. Known Limitations & Future Enhancements

### 12.1 Phase 2 Limitations

- Admin authentication is basic (no MFA, no SSO)
- Location autocomplete is admin-only endpoint
- No quote retrieval by ID (customer can't reload quote)
- No surge pricing support
- No booking functionality (Phase 3)

### 12.2 Phase 2.5 Enhancements (Fast Followers)

- Surge pricing (date/time-based multipliers)
- Public location autocomplete endpoint
- Quote retrieval by ID
- Rate limiting on API Gateway
- CloudWatch alarms

### 12.3 Phase 3 Features

- Customer authentication (Cognito)
- Booking creation and management
- Payment processing (Stripe)
- Email notifications (SES)
- SMS notifications (Pinpoint)
- Driver portal

---

## 13. Architecture Diagrams

### 13.1 Quote Generation Flow

```
Customer → Next.js → API Gateway → quotes-calculator Lambda
                                         ↓
                                   1. Check fixed routes (DynamoDB)
                                         ↓
                                   2. If not found, fetch vehicle pricing (DynamoDB)
                                         ↓
                                   3. Call Google Maps API
                                         ↓
                                   4. Calculate price
                                         ↓
                                   5. Store quote (DynamoDB)
                                         ↓
                                   6. Return quote to customer
```

### 13.2 Admin Pricing Update Flow

```
Admin → Next.js (/admin/pricing) → API Gateway → pricing-manager Lambda
                                                       ↓
                                                 Update DynamoDB
                                                       ↓
                                                 Clear pricing cache
                                                       ↓
                                                 Return success
                                                       ↓
                                    Next customer quote uses new pricing
```

---

## 14. References

- [PHASE2_PRICING_AND_ADMIN.md](FeatureDev/PHASE2_PRICING_AND_ADMIN.md) - Phase 2 implementation plan
- AWS Lambda Functions: `durdle-serverless-api/functions/`
- Admin Portal: `app/admin/`
- Next.js Config: `next.config.mjs`

---

**Document Owner:** Claude Code
**Review Cycle:** After each phase completion
**Last Review:** 2025-12-05 (Phase 2 Complete)
