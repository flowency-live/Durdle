# CTO Platform Overview - Durdle

**Document Version:** 2.0
**Last Updated:** December 10, 2025
**Owner:** CTO
**Classification:** Internal - Technical Leadership

---

## Executive Summary

**Durdle** is a **white-label, multi-tenant SaaS platform** for transfer companies. Currently serving **Tenant #1 (Dorset Transfer Company)** with Tenants #2 and #3 in the pipeline.

### Platform Status (December 2025)

| Component | Status | Location |
|-----------|--------|----------|
| **DTC Public Website** | LIVE | `DorsetTransferCompany-Website` repo |
| **Durdle Admin Portal** | LIVE | `Durdle` repo (`/admin/*`) |
| **Multi-tenant Backend** | READY | 11 Lambda functions, all tenant-aware |
| **Corporate Accounts** | IN PROGRESS | Next major feature |

### Architecture Achievement
- **Frontend Decoupled**: DTC website is now a separate repo
- **Admin Portal Isolated**: Durdle repo is admin-only
- **Backend Multi-tenant**: Phase 0.5 complete, all Lambdas use tenant utilities

### Platform Mission
Enable transfer companies to offer instant online quotes, transparent pricing, and seamless digital booking - white-labeled to their brand.

### Business Model
**B2B2B SaaS**: Durdle serves transfer companies (B2B) who serve consumers (B2C) and corporate clients (B2B).

**Related Docs:**
- Architecture: [PLATFORM_ARCHITECTURE.md](../PLATFORM_ARCHITECTURE.md)
- Multi-tenant Details: [MULTI_TENANT_ARCHITECTURE.md](MULTI_TENANT_ARCHITECTURE.md)
- Corporate Accounts: [CorporateAccounts_PRD.md](../FeatureDev/CorporateAccounts_PRD.md)

---

## What Problem Does Durdle Solve?

### Customer Pain Points (Before Durdle)
1. **Manual quote process** - Phone calls, wait times, delayed responses
2. **Pricing uncertainty** - "Call for a quote" creates friction and distrust
3. **Limited transparency** - No visibility into vehicle options or journey details
4. **Poor mobile experience** - Non-mobile-friendly booking processes
5. **Payment friction** - Cash or bank transfer, no modern payment options

### Dorset Transfer Company Pain Points
1. **Operational inefficiency** - Manual quote calculations, phone-based bookings
2. **Scaling limitations** - Can't handle high quote volume without staff expansion
3. **Missed revenue** - Customers abandon when they can't get instant quotes
4. **Competitive disadvantage** - Modern competitors offer instant online booking
5. **Data gaps** - No analytics on quote patterns, popular routes, or pricing effectiveness

---

## Platform Capabilities (Current State)

### Phase 1: Customer Quote Journey (LIVE)
- **Landing Page**: Service showcase, trust signals, clear CTA to get quotes
- **Quote Wizard**: 2-step mobile-optimized form
  - Step 1: Pickup, dropoff, waypoints (Google Places Autocomplete)
  - Step 2: Date, time, passenger count, luggage
- **Quote Results**: Instant pricing for all vehicle types with:
  - Pricing breakdown (base fare + distance + wait time)
  - Journey visualization (map preview with route)
  - Vehicle comparison (Standard, Executive, Minibus)
  - 15-minute quote timer (creates urgency)

### Phase 2: Admin Management Portal (LIVE)
- **Authentication**: JWT-based admin login with role-based access
- **Variable Pricing Management**:
  - Edit base fare, per-mile rate, per-minute wait time for each vehicle type
  - Real-time pricing preview before saving
- **Fixed Route Management**:
  - Create pre-configured origin-destination routes with fixed prices
  - Override variable pricing for popular/strategic routes
- **Vehicle Management**:
  - Edit vehicle metadata (name, capacity, features)
  - Upload vehicle images to S3 with presigned URLs

### Phase 3: Bookings & Payments (NOT STARTED)
- Customer booking confirmation from valid quotes
- Stripe payment processing integration
- Email/SMS booking confirmations
- Quote retrieval by reference ID

### Phase 4: Driver Operations (NOT STARTED)
- Driver mobile app/PWA
- Real-time job dispatch
- GPS tracking and route optimization
- Driver earnings dashboard

---

## Technology Philosophy

### Core Principles

1. **100% Serverless**
   No servers to manage, patch, or scale. AWS handles infrastructure, we focus on business logic.

2. **Cost-Optimized for Scale**
   Pay only for actual usage. MVP costs £28/month; scales to £150/month at 10x volume (not 10x cost).

3. **Mobile-First Design**
   Majority of customers book on mobile. Every UI is optimized for touch, small screens, and slow networks.

4. **Security by Default**
   HTTPS everywhere, JWT authentication, secrets in AWS Secrets Manager, IAM least privilege, input validation on every endpoint.

5. **One Lambda = One Responsibility**
   **SACRED PRINCIPLE**: Each Lambda function does ONE thing and does it well. No monoliths.

6. **Production-Grade from Day 1**
   No hacks, no workarounds, no "we'll fix it later". Every line of code is production-ready.

---

## Architecture at a Glance

```
Customer Journey:
  Browser/Mobile → Next.js App (Amplify) → API Gateway → Lambda Functions → DynamoDB
                                                       ↓
                                                 Google Maps APIs
                                                 Secrets Manager
                                                 S3 (images)

Admin Journey:
  Browser → Next.js Admin Portal → JWT Auth → Admin Lambda → DynamoDB
```

### Technology Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14 (App Router, TypeScript) | Server components, SEO, Amplify integration |
| **Styling** | Tailwind CSS | Rapid development, small bundle, no runtime CSS |
| **Backend** | AWS Lambda (Node.js 20.x, arm64) | Serverless, auto-scaling, 20% cost savings with arm64 |
| **API** | AWS API Gateway (REST) | Native AWS integration, request/response transformation |
| **Database** | DynamoDB (single-table design) | £8/month vs £40/month SQL; millisecond latency; atomic operations |
| **Auth** | JWT + bcryptjs | Lightweight, no extra infrastructure (vs Cognito £) |
| **Storage** | S3 Standard | Vehicle images, Lambda deployment packages |
| **Secrets** | AWS Secrets Manager | Encrypted storage for API keys, JWT secrets |
| **Maps** | Google Maps (Distance Matrix, Places, Directions) | Best UK data quality, comprehensive API suite |
| **Hosting** | AWS Amplify | CloudFront CDN, auto-scaling, native AWS integration |
| **Region** | eu-west-2 (London) | GDPR compliance, low latency for UK customers |

---

## Platform Metrics & Scale

### Current Status (MVP - December 2025)
- **Traffic**: ~500 quotes/month expected
- **Cost**: £28/month total infrastructure
- **Latency**: <2s quote generation (incl. Google Maps API calls)
- **Availability**: 99.9% (AWS Lambda + Amplify SLA)
- **Cold Start**: ~500-800ms (arm64 optimization)

### Scale Projections (5000 quotes/month)
- **Cost**: £153/month (5.5x volume = 5.5x cost, linear scaling)
- **Latency**: <2s (DynamoDB auto-scales; Lambda concurrency unlimited)
- **Database**: On-demand billing handles spikes automatically

### Cost Breakdown (MVP)
```
Lambda Functions:        £5
DynamoDB:                £8
API Gateway:             £3
S3 Storage:              £1
Secrets Manager:         £1
Google Maps APIs:       £10
Amplify Hosting:         £0 (free tier)
----------------------------------
TOTAL:                  £28/month
```

---

## Platform Services Overview

### 11 Lambda Functions (All Tenant-Aware)

Each Lambda uses Lambda Layer v4 for shared logger and tenant utilities:

| Function | Memory | Purpose |
|----------|--------|---------|
| `quotes-calculator` | 512MB | Core pricing engine with 3 pricing models |
| `quotes-manager` | 256MB | Admin quote listing, search, CSV export |
| `bookings-manager` | 256MB | Booking CRUD, status management |
| `pricing-manager` | 256MB | Vehicle pricing configuration |
| `vehicle-manager` | 256MB | Vehicle metadata management |
| `fixed-routes-manager` | 512MB | Pre-configured route pricing |
| `admin-auth` | 256MB | JWT authentication, session management |
| `locations-lookup` | 256MB | Google Places Autocomplete proxy |
| `uploads-presigned` | 128MB | S3 presigned URL generation |
| `document-comments` | 256MB | Quote/booking comments |
| `feedback-manager` | 256MB | Customer feedback collection |

**Lambda Layer v4**: All functions import from `/opt/nodejs/` for:
- `logger.mjs` - Pino structured logging
- `tenant.mjs` - Multi-tenant utilities (getTenantId, buildTenantPK)

### 4 DynamoDB Tables

1. **durdle-pricing-config-dev**
   Vehicle types with pricing rates, capacity, features

2. **durdle-fixed-routes-dev**
   Pre-configured origin-destination pairs with fixed prices

3. **durdle-admin-users-dev**
   Admin credentials (bcryptjs hashed passwords)

4. **durdle-main-table-dev**
   General application data (quotes with 15-min TTL, future: bookings, payments)

---

## Critical Business Logic: Pricing Engine

### Three Pricing Models (Decision Tree)

**Model 1: Fixed Route** (Highest Priority)
- **When**: Journey matches pre-configured route AND no waypoints
- **Formula**: `Total = Fixed Price`
- **Example**: Heathrow Airport → Bournemouth = £120.00 (always)
- **Use Case**: Strategic routes, airport transfers, high-demand corridors

**Model 2: Simple Variable** (Direct Journey)
- **When**: Pickup → Dropoff with no intermediate stops
- **Formula**: `Total = baseFare + (distance × perMile)`
- **Example**: Standard Sedan, 12.5 miles = £5.00 + (12.5 × £1.00) = £17.50
- **Key**: Driving time is NOT charged (only wait time at stops)

**Model 3: Waypoint Variable** (Multi-Stop Journey)
- **When**: Journey with waypoints and explicit wait times
- **Formula**: `Total = baseFare + (totalDistance × perMile) + (totalWaitTime × perMinute)`
- **Example**: £8 base + (18.2 mi × £1.50) + (150 min wait × £0.15) = £57.80
- **Key**: All segment distances summed; wait time charged separately from driving time

### Vehicle Pricing Tiers (Default Rates)

| Vehicle Type | Base Fare | Per Mile | Per Minute Wait | Capacity |
|-------------|-----------|----------|----------------|----------|
| Standard Sedan | £5.00 | £1.00 | £0.10 | 4 passengers |
| Executive Sedan | £8.00 | £1.50 | £0.15 | 4 passengers |
| Minibus | £10.00 | £1.20 | £0.12 | 8 passengers |

**Admin Portal**: These rates are fully editable in real-time via admin portal

---

## Security & Compliance

### Authentication & Authorization
- **Customer**: No auth yet (Phase 3: Cognito or custom JWT)
- **Admin**: JWT with 8-hour expiry, httpOnly cookies, bcryptjs password hashing
- **Role-Based Access**: Admin vs Superadmin (future: driver, customer roles)

### Data Protection
- **Encryption at Rest**: AES-256 on DynamoDB, S3, Secrets Manager
- **Encryption in Transit**: TLS 1.2+ on all endpoints (HTTPS only)
- **PII Handling**: Minimal collection; no storage without consent; GDPR right to deletion
- **Secrets Management**: Zero hardcoded secrets; all in AWS Secrets Manager

### AWS Security
- **IAM**: Least privilege policies; service roles for Lambda; no root access
- **API Gateway**: CORS configured per endpoint; input validation (Zod schemas)
- **Lambda**: VPC not required (public services only); CloudWatch logs encrypted

### Compliance Readiness
- **GDPR**: Data retention policies, consent management, right to deletion
- **PCI DSS**: Level SAQ-A (Stripe handles all card data - no PCI scope for us)
- **UK Data Protection**: eu-west-2 region; no data transfer outside UK/EU

---

## Development Workflow

### Code Standards (ENFORCED)
- **No Emojis**: CloudWatch logs fail with emoji encoding; zero emojis in code/commits
- **TypeScript**: Strict mode; all types explicit; no `any`
- **Commit Messages**: One-line, clear, concise (e.g., "Fix quote calculation for multi-waypoint journeys")
- **Linting**: ESLint + Prettier; auto-format on save

### Deployment Process (Current: Manual)
```bash
# Build Lambda
cd functions/quotes-calculator
npm run build

# Deploy to AWS
cd dist
zip -r quotes-calculator.zip .
aws lambda update-function-code \
  --function-name quotes-calculator-dev \
  --zip-file fileb://quotes-calculator.zip \
  --region eu-west-2
```

**Roadmap**: GitHub Actions + AWS SAM for automated CI/CD (Phase 3)

### Branching Strategy
- `main`: Production-ready code (auto-deploys to dev environment currently)
- Feature branches: `feature/[description]`
- Hotfix branches: `hotfix/[issue-id]`

---

## Roadmap & Strategic Direction

### Completed (Phase 1 & 2)
- Landing page with service showcase
- Quote wizard (2-step form, Google Places, mobile-optimized)
- Quote results with pricing breakdown
- Admin authentication (JWT)
- Admin pricing management (variable rates, fixed routes, vehicle metadata)
- 8 Lambda microservices deployed
- DynamoDB schema and seed data

### Next: Phase 3 (Bookings & Payments) - Q1 2026
- Customer booking confirmation from quotes
- Stripe payment integration (card + Apple Pay + Google Pay)
- Email confirmations (AWS SES)
- SMS notifications (AWS SNS)
- Quote retrieval by reference ID
- Customer account creation (Cognito User Pools)
- Automated CI/CD pipeline (GitHub Actions + SAM)

### Future: Phase 4 (Driver Operations) - Q2/Q3 2026
- Driver mobile app (PWA)
- Real-time job dispatch
- GPS tracking
- Route optimization
- Driver earnings dashboard
- Customer ride tracking

### Strategic Opportunities (12+ months)
- **Surge Pricing**: Dynamic pricing based on demand, time of day, events
- **Corporate Accounts**: Business customer portal, invoicing, account managers
- **API for Partners**: White-label API for travel agents, hotels, event organizers
- **Multi-Region Expansion**: Deploy to other UK regions or international markets
- **Fleet Management**: Vehicle maintenance tracking, fuel costs, driver performance analytics

---

## Risk Register & Mitigations

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Google Maps API cost overrun | High | Medium | Set billing alerts at £50, £100, £150; cache common routes |
| DynamoDB hot partition | Medium | Low | Single-table design distributes load; on-demand handles spikes |
| Lambda cold start latency | Low | High | Arm64 reduces cold start; consider provisioned concurrency if needed |
| Stripe payment failures | High | Low | Implement retry logic, webhook handling, manual reconciliation |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Low quote conversion rate | High | Medium | A/B test quote UI, add social proof, limited-time discounts |
| Competitor undercutting price | High | Low | Monitor competitor pricing; differentiate on service quality |
| Driver availability issues | High | Low | Phase 4 driver portal enables flexible driver onboarding |
| Regulatory changes (transport licenses) | Medium | Low | Monitor UK transport regulations; legal compliance review |

---

## Success Metrics & KPIs

### North Star Metric
**Quote-to-Booking Conversion Rate** (Target: 15% by end of Q1 2026)

### Key Performance Indicators

**Product Metrics**:
- Quote generation volume (daily, weekly, monthly)
- Quote completion rate (users who finish wizard)
- Quote conversion rate (quotes → bookings)
- Average quote value (£)
- Vehicle mix (% Standard vs Executive vs Minibus)

**Technical Metrics**:
- API latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Lambda cold start frequency
- DynamoDB read/write capacity utilization
- Monthly AWS cost vs budget

**Business Metrics**:
- Revenue per booking
- Customer acquisition cost (CAC)
- Customer lifetime value (LTV)
- Net Promoter Score (NPS)

---

## Team & Ownership

### Current Team Structure
- **CTO/Tech Lead**: Platform architecture, code reviews, AWS infrastructure
- **Full-Stack Developer**: Frontend (Next.js) + Backend (Lambda) development
- **Product Owner**: Requirements, user stories, roadmap prioritization
- **QA/Testing**: Manual testing, bug reporting (automated testing in Phase 3)

### Key Contacts
- **AWS Account Owner**: CTO
- **Google Maps API Key**: Stored in AWS Secrets Manager
- **Stripe Account**: (Phase 3 - not yet configured)
- **Domain Registrar**: (Not yet configured - using Amplify default domain)

---

## Documentation Index

All documentation located in: `C:\VSProjects\_Websites\Durdle\.documentation\`

### Essential Reading (Start Here)
1. **CTO_PLATFORM_OVERVIEW.md** (this document) - Executive summary
2. **CTO_TECHNICAL_REFERENCE.md** - Quick lookup for all services/APIs
3. **CTO_ARCHITECTURE_DECISIONS.md** - Why we chose each technology
4. **CTO_DEVELOPMENT_GUIDE.md** - How to add features safely

### Detailed Technical Specs
- **TechnicalArchitecture.md** (673 lines) - Full system design
- **Pricing_Engine_Logic.md** (453 lines) - Pricing formulas and edge cases
- **APISpecification.md** (869 lines) - Complete REST API documentation
- **DatabaseSchema.md** (500+ lines) - DynamoDB table schemas and access patterns

### Implementation Guides
- **QUOTE_WIZARD_IMPLEMENTATION_SPEC.md** - Frontend component architecture
- **PHASE2_PRICING_AND_ADMIN.md** - Admin portal implementation details
- **DeploymentRunbook.md** - Step-by-step deployment procedures

### Compliance & Security
- **SecurityCompliance.md** - GDPR, PCI DSS, AWS security policies

### Product Requirements
- **InitialPRD.md** - Original product requirements
- **UserStories.md** - Customer journey maps

---

## CTO Priorities (Next 30 Days)

### Technical Excellence
1. Review AWS cost optimization opportunities (Reserved Capacity vs On-Demand)
2. Implement CloudWatch dashboards for all Lambda functions
3. Set up automated alerting (error rate, latency thresholds)
4. Conduct security audit (penetration testing, vulnerability scanning)
5. Define SLA targets (99.9% uptime, <2s latency)

### Product Strategy
1. Finalize Phase 3 scope and timeline (bookings + payments)
2. Evaluate Stripe vs alternative payment processors
3. Define customer authentication strategy (Cognito vs custom JWT)
4. Plan A/B testing framework for quote conversion optimization
5. Review competitive landscape and pricing strategy

### Team Development
1. Schedule knowledge transfer sessions (platform architecture)
2. Document onboarding guide for new developers
3. Establish code review process and standards
4. Plan automated testing strategy (unit, integration, e2e)
5. Set up development/staging/production environment separation

---

## Appendix: Quick Reference

### AWS Resources
- **Region**: eu-west-2 (London)
- **API Gateway ID**: TBD (not yet deployed)
- **S3 Bucket**: durdle-vehicle-images-dev
- **Secrets Manager**: durdle/google-maps-api-key, durdle/jwt-secret

### External Services
- **Google Maps API Key**: Stored in AWS Secrets Manager
- **Stripe**: Not yet configured (Phase 3)
- **Domain**: TBD (currently using Amplify default)

### Development URLs
- **Frontend (Dev)**: [Amplify auto-generated URL]
- **API Gateway (Dev)**: [TBD after deployment]
- **Admin Portal**: /admin (same domain as frontend)

---

**END OF CTO PLATFORM OVERVIEW**

*For detailed technical implementation, see CTO_TECHNICAL_REFERENCE.md*
*For architecture decision rationale, see CTO_ARCHITECTURE_DECISIONS.md*
*For development guidelines, see CTO_DEVELOPMENT_GUIDE.md*
