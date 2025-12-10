# DURDLE PLATFORM BIBLE

**Durdle Transport Management Platform - Technical Reference & Standards**

**Version**: 1.0
**Last Updated**: December 4, 2025
**Status**: Active Development - MVP Phase

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Architecture Principles](#architecture-principles)
3. [Technology Stack](#technology-stack)
4. [Repository Structure](#repository-structure)
5. [Deployment Process](#deployment-process)
6. [Code Standards](#code-standards)
7. [Development Workflow](#development-workflow)
8. [Infrastructure & AWS Resources](#infrastructure--aws-resources)
9. [Environment Management](#environment-management)
10. [Key Design Decisions](#key-design-decisions)
11. [Security & Compliance](#security--compliance)
12. [Testing Strategy](#testing-strategy)
13. [Monitoring & Observability](#monitoring--observability)
14. [Troubleshooting Guide](#troubleshooting-guide)

---

## Platform Overview

### Project Name: Durdle (NOTS Platform)

**Business**: Dorset Transfer Company
**Mission**: Modern, digital-first transport booking and operations platform for Dorset region
**Architecture**: 100% Serverless AWS-native platform

### Platform Components

```
┌─────────────────────────────────────────────────────────────┐
│                    DURDLE PLATFORM                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │  Customer Site   │  │  Ops Dashboard   │  │  Driver   │ │
│  │    (Next.js)     │  │  (React + Vite)  │  │  Portal   │ │
│  │                  │  │                  │  │   (PWA)   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬─────┘ │
│           │                     │                   │        │
│           └─────────────────────┼───────────────────┘        │
│                                 │                            │
│                    ┌────────────▼────────────┐               │
│                    │    API Gateway (REST)   │               │
│                    │   api.durdle.co.uk      │               │
│                    └────────────┬────────────┘               │
│                                 │                            │
│                    ┌────────────▼────────────┐               │
│                    │   AWS Lambda Functions  │               │
│                    │  (Node.js 20.x, arm64)  │               │
│                    └────────────┬────────────┘               │
│                                 │                            │
│           ┌─────────────────────┼─────────────────────┐      │
│           │                     │                     │      │
│     ┌─────▼─────┐      ┌────────▼────────┐   ┌──────▼─────┐│
│     │ DynamoDB  │      │   S3 (Docs)     │   │  Cognito   ││
│     │(Main Data)│      │   & Images      │   │   (Auth)   ││
│     └───────────┘      └─────────────────┘   └────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Current Status

- **MVP Phase**: Landing page complete, ready for AWS infrastructure setup
- **GitHub**: [https://github.com/flowency-live/Durdle](https://github.com/flowency-live/Durdle)
- **Production URL**: TBD (awaiting Amplify setup)

---

## Architecture Principles

### Sacred Principles (NEVER COMPROMISE)

1. **100% Serverless**
   - No EC2 instances
   - No containers (except local dev)
   - AWS Lambda for all compute
   - Auto-scaling built-in

2. **One Lambda = One Responsibility**
   - Each Lambda function does ONE thing
   - No monolithic Lambda functions
   - Clear separation of concerns
   - Example: `quotes-calculator` vs `quotes-retrieve`

3. **No Hacks or Workarounds**
   - Production-grade solutions only
   - If it feels hacky, it's wrong
   - Proper error handling everywhere
   - No temporary fixes that become permanent

4. **Infrastructure as Code (Eventually)**
   - Manual AWS CLI for rapid MVP
   - Convert to AWS SAM after Phase 1
   - All infrastructure changes documented
   - Repeatable, versioned deployments

5. **Security First**
   - GDPR compliant from day 1
   - PCI DSS compliant (via Stripe)
   - HTTPS only, no exceptions
   - Principle of least privilege

---

## Technology Stack

### Frontend

#### Customer Website (This Repository)
```yaml
Framework: Next.js 14 (App Router)
Language: TypeScript
Styling: Tailwind CSS
Icons: Lucide React
Hosting: AWS Amplify (CloudFront + S3)
Build: Static Site Generation (SSG)
```

**Why Next.js 14 App Router?**
- Server components for better performance
- Built-in SEO optimization
- Image optimization out of the box
- Static generation for fast page loads
- Easy Amplify deployment

**Why Tailwind CSS?**
- Rapid UI development
- Consistent design system
- Small bundle size (unused classes purged)
- Dark mode support built-in
- Responsive utilities

#### Operations Dashboard (Future)
```yaml
Framework: React 18 + Vite
State Management: Zustand or React Context
Routing: React Router v6
UI Library: Tailwind CSS + Headless UI
Charts: Recharts or Chart.js
Hosting: AWS Amplify
```

#### Driver Portal (Future - Phase 2)
```yaml
Framework: React 18 + Vite PWA
Offline Support: Service Workers
Maps: Google Maps SDK
Hosting: AWS Amplify
```

### Backend

#### Compute
```yaml
Runtime: Node.js 20.x
Architecture: arm64 (Graviton2 - 20% cost savings)
Framework: None (native AWS SDK v3)
Deployment: ZIP files or AWS SAM
Timeout: 3s-15s (function-specific)
Memory: 256MB-1024MB (function-specific)
```

**Why Node.js 20?**
- Native ES modules support
- Top-level await
- Performance improvements
- AWS SDK v3 compatibility
- TypeScript support

**Why arm64?**
- 20% cost reduction vs x86
- Better price/performance ratio
- AWS optimized silicon

#### API
```yaml
Service: API Gateway (REST)
Authentication: AWS Cognito JWT
CORS: Configured per environment
Rate Limiting: AWS WAF
Custom Domain: api.durdle.co.uk
```

#### Database
```yaml
Primary: DynamoDB
Pattern: Single-table design
Indexes: 3 Global Secondary Indexes (GSI1-3)
Backup: Point-in-time recovery (PITR)
TTL: Enabled for quotes (15 min expiration)
```

**Why DynamoDB?**
- True serverless (no server management)
- Pay-per-request pricing
- Automatic scaling
- Single-digit millisecond latency
- Built-in replication for DR

**Why Single-Table Design?**
- Reduced costs (one table vs many)
- Better performance (atomic transactions)
- Simpler Lambda code
- Industry best practice for DynamoDB

#### Storage
```yaml
Service: S3
Buckets:
  - durdle-documents-{env} (Driver compliance docs)
  - durdle-images-{env} (Vehicle photos, etc.)
  - durdle-lambda-deployments-{env} (Lambda ZIP files)
Lifecycle: 90-day archive to Glacier
Versioning: Enabled
Encryption: AES-256 (SSE-S3)
```

#### Authentication
```yaml
Service: AWS Cognito User Pools
JWT: httpOnly cookies + Authorization header
MFA: Optional for admins
Social: Future (Google, Apple)
Session: 1 hour access token, 7-day refresh token
```

#### Secrets Management
```yaml
Service: AWS Secrets Manager
Path: durdle/*
Rotation: Enabled for API keys
Access: Lambda execution role only
```

#### Email & SMS
```yaml
Email: AWS SES (transactional)
SMS: AWS SNS (notifications)
WhatsApp: Twilio (Phase 3)
```

### External Integrations

```yaml
Maps: Google Maps Platform
  - Distance Matrix API (quote calculation)
  - Geocoding API (address validation)
  - Places API (autocomplete)
  - Maps JavaScript API (customer site)

Payments: Stripe
  - Payment Intents
  - Webhooks (payment confirmation)
  - Customer portal (future)
  - Invoicing (business accounts)

Analytics: Google Analytics 4
  - Conversion tracking
  - Event tracking
  - User behavior analysis
```

---

## Repository Structure

### Current Repository: Customer Website

```
Durdle/
├── app/
│   ├── page.tsx              # Main landing page (V1 - two-color)
│   ├── v2/
│   │   └── page.tsx          # Alternate landing (V2 - four-color)
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles + CSS variables
│   └── fonts/                # Geist font files
│
├── components/
│   └── ui/
│       └── button.tsx        # Reusable button component
│
├── lib/
│   └── utils.ts              # Utility functions (cn helper)
│
├── public/
│   └── images/
│       └── hero-bg.svg       # Hero background image
│
├── .documentation/           # Technical documentation
│   ├── InitialPRD.md
│   ├── TechnicalArchitecture.md
│   ├── APISpecification.md
│   ├── DatabaseSchema.md
│   ├── UserStories.md
│   ├── SecurityCompliance.md
│   ├── DeploymentRunbook.md
│   ├── CLI-Infrastructure-Setup.md
│   ├── LANDING_PAGE_PRD_ANALYSIS.md
│   └── EXAMPLES/
│       ├── Landing1.tsx
│       └── Landing2.tsx
│
├── amplify.yml               # AWS Amplify build config
├── next.config.mjs           # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS config
├── tsconfig.json             # TypeScript config
├── package.json              # Dependencies
├── DURDLE_PLATFORM_BIBLE.md  # This file
└── README.md                 # Project README

```

### Future Repositories

```
durdle-serverless-api/        # Lambda functions + SAM template
durdle-ops-dashboard/         # Operations dashboard (React + Vite)
durdle-driver-portal/         # Driver PWA (React + Vite)
durdle-infrastructure/        # Terraform/CDK (Phase 2+)
```

---

## Deployment Process

### Current Status: Manual AWS CLI (MVP Phase)

**Philosophy**: Rapid iteration during MVP. Convert to Infrastructure as Code after Phase 1.

### Customer Website (This Repo)

#### Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# View at http://localhost:3000
# V1: http://localhost:3000
# V2: http://localhost:3000/v2

# Build for production
npm run build

# Preview production build
npm run start
```

#### Deployment to AWS Amplify

**Method**: GitHub integration (automatic deployment on push)

**Steps**:
1. Push code to GitHub main branch
2. AWS Amplify detects changes automatically
3. Amplify reads `amplify.yml` configuration
4. Runs `npm ci && npm run build`
5. Deploys `.next` folder to CloudFront + S3
6. Invalidates CloudFront cache
7. Deployment complete (typically 3-5 minutes)

**Configuration File**: `amplify.yml`

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

#### Manual Amplify Setup (First Time)

```bash
# 1. Create Amplify app via AWS Console
# 2. Connect to GitHub repository: flowency-live/Durdle
# 3. Select branch: main
# 4. Amplify auto-detects Next.js and uses amplify.yml
# 5. Deploy

# Optional: Add custom domain
# AWS Console → Amplify → Domain Management
# Add: durdle.co.uk
# Follow DNS configuration steps
```

### Lambda Functions (Future)

**Deployment**: Direct AWS CLI during MVP

```bash
# Example: Deploy quotes-calculator Lambda
cd durdle-serverless-api/functions/quotes-calculator
npm install --production
zip -r function.zip .
aws lambda update-function-code \
  --function-name quotes-calculator-prod \
  --zip-file fileb://function.zip \
  --region eu-west-2

# Verify deployment
aws lambda get-function \
  --function-name quotes-calculator-prod \
  --region eu-west-2
```

**Future**: AWS SAM deployment (Phase 2)

```bash
# Build all Lambdas
sam build

# Deploy to environment
sam deploy --config-env prod

# Automatically handles:
# - Lambda function creation/updates
# - API Gateway configuration
# - IAM role management
# - Environment variables
```

### Infrastructure Deployment

**Current**: Manual AWS CLI commands (see `.documentation/CLI-Infrastructure-Setup.md`)

**Phase 2**: AWS SAM or Terraform

---

## Code Standards

### General Principles

1. **No Emojis**
   - NEVER use emojis in code, comments, or console.log statements
   - NEVER use emojis in git commit messages
   - CloudWatch logs fail with emoji encoding errors
   - AWS Lambda logs cannot process emojis
   - Exception: Documentation markdown files only

2. **No Em Dashes in UI**
   - NEVER use em dashes (—) in rendered user interfaces
   - Use hyphens (-) or commas instead
   - Em dashes can cause encoding issues
   - Exception: Long-form content in documentation or blog posts

3. **Clear, Concise Commits**
   - One line commit messages
   - Describe WHAT changed, not WHY (use PR for context)
   - Examples:
     - Good: "Fix venue search to handle empty results"
     - Bad: "Fixed stuff" or multi-line verbose messages

3. **TypeScript Everywhere**
   - All new code must be TypeScript
   - No `any` types (use `unknown` if truly dynamic)
   - Strict mode enabled

4. **Functional Over OOP**
   - Prefer pure functions
   - Avoid classes unless necessary
   - Immutable data patterns

### TypeScript Standards

```typescript
// GOOD: Explicit types, clear naming
interface BookingRequest {
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: Date;
  passengerCount: number;
}

async function createBooking(request: BookingRequest): Promise<Booking> {
  // Implementation
}

// BAD: Implicit any, unclear naming
function doStuff(data: any) {
  // Don't do this
}
```

### Next.js / React Standards

```typescript
// GOOD: Server component (default in App Router)
export default function Page() {
  return <div>Content</div>;
}

// GOOD: Client component when needed
'use client';
import { useState } from 'react';

export default function InteractiveComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// GOOD: Proper metadata export
export const metadata: Metadata = {
  title: "Page Title",
  description: "Page description",
};
```

### Tailwind CSS Standards

```typescript
// GOOD: Use cn() utility for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "primary" && "primary-class"
)} />

// GOOD: Consistent spacing, responsive breakpoints
<div className="px-4 py-6 md:px-6 lg:px-8" />

// BAD: Inline styles (avoid unless absolutely necessary)
<div style={{ color: 'red' }} />
```

### File Naming Conventions

```
Components: PascalCase.tsx
  ✓ Button.tsx
  ✓ BookingForm.tsx

Pages (Next.js): lowercase kebab-case or route segments
  ✓ page.tsx
  ✓ layout.tsx
  ✓ [id]/page.tsx

Utilities: camelCase.ts
  ✓ utils.ts
  ✓ formatDate.ts

Constants: SCREAMING_SNAKE_CASE.ts
  ✓ API_ENDPOINTS.ts
  ✓ VALIDATION_RULES.ts
```

### Import Order

```typescript
// 1. React/Next.js imports
import { useState } from 'react';
import Image from 'next/image';

// 2. External libraries
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

// 3. Internal utilities
import { cn } from '@/lib/utils';

// 4. Types
import type { Booking } from '@/types';
```

### Lambda Function Standards

```javascript
// GOOD: Clear handler structure
export const handler = async (event, context) => {
  try {
    // 1. Parse and validate input
    const body = JSON.parse(event.body);

    // 2. Business logic
    const result = await processRequest(body);

    // 3. Return success response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// BAD: No error handling, unclear structure
export const handler = async (event) => {
  const data = JSON.parse(event.body);
  return { statusCode: 200, body: JSON.stringify(data) };
};
```

---

## Development Workflow

### Git Workflow

**Branch Strategy**: Simple feature branches during MVP

```bash
main (protected)
├── feature/quote-calculator
├── feature/booking-form
└── feature/payment-integration
```

**Workflow**:
1. Create feature branch from main
2. Develop and test locally
3. Commit with clear messages
4. Push to GitHub
5. Create Pull Request (optional during MVP)
6. Merge to main (triggers Amplify deployment)

### Commit Message Format

```
Clear one-line description of change

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

Examples:
- "Initial Durdle landing page with V1 and V2 variants"
- "Add quote calculator Lambda function"
- "Fix mobile navigation overflow issue"
- "Update DynamoDB schema for booking status tracking"

### Pull Request Process (Optional for MVP)

1. Create PR with descriptive title
2. Include context and screenshots if UI change
3. Link to related documentation or tickets
4. Self-review before requesting review
5. Merge after approval (or self-merge during MVP)

### Local Testing Checklist

**Before Commit**:
- [ ] Code compiles without TypeScript errors
- [ ] `npm run build` succeeds
- [ ] No console.log statements left in code
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Accessibility: keyboard navigation works
- [ ] Links and buttons have correct hrefs/onClick handlers

**Before Production Deployment**:
- [ ] Build tested locally
- [ ] Environment variables verified
- [ ] API endpoints tested (if applicable)
- [ ] Error states handled gracefully
- [ ] Loading states implemented

---

## Infrastructure & AWS Resources

### AWS Account Setup

**Region**: eu-west-2 (London)

**Why London?**
- Closest to Dorset (low latency)
- UK data residency (GDPR)
- Full service availability

### AWS Resources (MVP Phase)

#### Customer Website
```
Service: AWS Amplify
App Name: durdle-website-prod
Domain: TBD (awaiting setup)
Branch: main (auto-deploy)
Build: amplify.yml
CDN: CloudFront (automatic)
SSL: Automatic (AWS Certificate Manager)
```

#### Future Resources (Phase 1+)

**DynamoDB**:
```
Table: durdle-main-table-prod
Billing: On-demand (pay per request)
Encryption: AWS managed keys
Backup: PITR enabled (35-day retention)
GSIs: GSI1, GSI2, GSI3
TTL: Enabled on expiresAt attribute (quotes)
```

**API Gateway**:
```
Name: durdle-api-prod
Type: REST API
Authorization: Cognito User Pools
CORS: Enabled for durdle.co.uk
Custom Domain: api.durdle.co.uk
```

**Cognito**:
```
User Pool: durdle-users-prod
MFA: Optional (required for admins)
Password Policy: Min 8 chars, uppercase, number, symbol
Email Verification: Required
```

**Lambda Functions** (examples):
```
quotes-calculator-prod
  - Memory: 512 MB
  - Timeout: 10s
  - Runtime: Node.js 20.x arm64

bookings-create-prod
  - Memory: 1024 MB
  - Timeout: 15s
  - Runtime: Node.js 20.x arm64

payments-process-prod
  - Memory: 512 MB
  - Timeout: 15s
  - Runtime: Node.js 20.x arm64
```

**S3 Buckets**:
```
durdle-documents-prod
durdle-images-prod
durdle-lambda-deployments-prod
```

**Secrets Manager**:
```
durdle/stripe-api-key
durdle/google-maps-api-key
durdle/jwt-secret
```

### Cost Estimates (MVP)

```
AWS Amplify:         £5-10/month
DynamoDB:           £10-15/month
Lambda:              £5-10/month
API Gateway:         £3-5/month
S3:                  £2-5/month
Cognito:             £3-5/month
SES/SNS:             £2-5/month
CloudWatch Logs:     £2-3/month
Secrets Manager:     £1-2/month
────────────────────────────────
TOTAL:              ~£35-60/month
```

**At Scale** (1000 bookings/month):
```
Lambda (increased usage):     £15-20/month
DynamoDB (increased writes):  £25-35/month
API Gateway:                  £8-12/month
Other services:               £15-20/month
────────────────────────────────────────
TOTAL:                       ~£65-90/month
```

---

## Environment Management

### Environments

```
Local:      localhost:3000
Dev:        dev.durdle.co.uk (future)
Staging:    staging.durdle.co.uk (future)
Production: durdle.co.uk (TBD)
```

### Environment Variables

#### Customer Website (Amplify)
```bash
# Build-time variables
NEXT_PUBLIC_API_URL=https://api.durdle.co.uk
NEXT_PUBLIC_GOOGLE_MAPS_KEY=xxx
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_xxx
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Not exposed to client
API_SECRET_KEY=xxx
```

**Setting Amplify Environment Variables**:
1. AWS Console → Amplify → durdle-website-prod
2. Environment variables
3. Add key-value pairs
4. Save (triggers rebuild)

#### Lambda Functions (Future)
```bash
# Stored in AWS Systems Manager Parameter Store or Secrets Manager
DYNAMODB_TABLE_NAME=durdle-main-table-prod
STRIPE_API_KEY=sk_live_xxx (from Secrets Manager)
GOOGLE_MAPS_API_KEY=xxx (from Secrets Manager)
JWT_SECRET=xxx (from Secrets Manager)
```

---

## Key Design Decisions

### Decision Log

**Date**: December 4, 2025

#### 1. Next.js 14 App Router vs Pages Router
**Decision**: Use App Router
**Rationale**:
- Server components improve performance
- Better SEO out of the box
- Future-proof (Pages Router is legacy)
- Streaming and Suspense support
- Co-located data fetching

#### 2. Tailwind CSS vs styled-components
**Decision**: Tailwind CSS
**Rationale**:
- Faster development velocity
- Smaller bundle size
- No runtime CSS-in-JS overhead
- Consistent design system via config
- Better DX with autocomplete

#### 3. Single Repository vs Monorepo
**Decision**: Separate repos for each frontend
**Rationale**:
- Simpler deployment (each app independent)
- Easier to reason about during MVP
- Can move to monorepo later if needed
- Amplify works better with single-app repos

#### 4. DynamoDB Single-Table vs Multi-Table
**Decision**: Single-table design
**Rationale**:
- Industry best practice for DynamoDB
- Lower costs (one table vs many)
- Atomic transactions across entities
- Better performance for complex queries
- Aligns with AWS recommendations

#### 5. Manual CLI vs Infrastructure as Code (Phase 1)
**Decision**: Manual CLI for MVP, SAM for Phase 2
**Rationale**:
- Faster iteration during development
- Learn infrastructure requirements first
- Convert to IaC once stable
- Avoid premature optimization

#### 6. AWS Amplify vs Vercel
**Decision**: AWS Amplify
**Rationale**:
- Keep everything in AWS ecosystem
- Easier integration with API Gateway, Cognito
- No vendor lock-in concerns
- Lower costs at scale
- Same performance as Vercel (CloudFront CDN)

#### 7. Stripe vs Custom Payment Processing
**Decision**: Stripe
**Rationale**:
- PCI DSS compliance handled by Stripe
- No raw card data storage needed
- Simple integration (Payment Intents)
- Built-in fraud detection
- Future features: subscriptions, invoicing

#### 8. Google Maps vs Mapbox
**Decision**: Google Maps Platform
**Rationale**:
- Better UK address data
- Distance Matrix API for quote calculation
- Familiar UX for customers
- Places API for autocomplete
- Driver-facing navigation (Google Maps app)

---

## Security & Compliance

### GDPR Compliance

**Requirements**:
- Privacy policy published
- Cookie consent banner
- Data retention policies documented
- User data export capability (future)
- Right to deletion (future)
- Data breach notification process

**Implementation Status**:
- [ ] Privacy policy drafted
- [ ] Cookie consent banner (future)
- [ ] Data retention: 7 years bookings, 3 years inactive accounts
- [ ] DPIA completed (future)

### PCI DSS Compliance

**Level**: SAQ A (simplest)
**Why**: No card data stored (Stripe handles all card processing)

**Requirements**:
- [x] HTTPS only (enforced by Amplify/CloudFront)
- [x] No card data in logs or database
- [x] Stripe webhook signature verification
- [ ] Annual compliance review

### AWS Security

**IAM Principles**:
- Least privilege access
- No root account usage
- MFA on all admin accounts
- Service roles for Lambda (no API keys)

**Encryption**:
- DynamoDB: AES-256 at rest
- S3: AES-256 at rest
- Transit: TLS 1.2+ only
- Secrets: AWS Secrets Manager with rotation

**API Gateway Security**:
- Cognito JWT validation
- Rate limiting via AWS WAF
- CORS restricted to durdle.co.uk
- Input validation on all endpoints

**Lambda Security**:
- No environment variables for secrets
- AWS SDK v3 with IAM roles
- Input validation and sanitization
- Error messages don't leak sensitive data

### Audit Logging

**CloudTrail**: All AWS API calls logged
**CloudWatch Logs**: All Lambda function logs retained 30 days
**Application Logs**: Structured JSON logs for easy parsing

---

## Testing Strategy

### Current Status (MVP)

**Manual Testing**:
- Visual testing in browser (Chrome DevTools)
- Responsive design testing (mobile, tablet, desktop)
- Accessibility testing (keyboard navigation, screen reader)

### Phase 1+ Testing Strategy

**Unit Tests**:
```bash
# Jest + React Testing Library
npm run test
```

**Integration Tests**:
- API endpoint testing (Postman collections)
- Lambda function testing (local sam invoke)
- Database query testing

**E2E Tests** (Phase 2):
```bash
# Playwright
npm run test:e2e
```

**Performance Testing**:
- Lighthouse CI for frontend
- Load testing for Lambda functions (Artillery)

---

## Monitoring & Observability

### Current Status (MVP)

**Basic Monitoring**:
- AWS Amplify console (build status, deployments)
- CloudWatch Logs (Lambda logs)
- Manual error checking

### Phase 1+ Monitoring

**Application Monitoring**:
- CloudWatch Dashboards (Lambda metrics, API Gateway)
- CloudWatch Alarms (error rates, latency)
- X-Ray tracing (distributed tracing)

**User Analytics**:
- Google Analytics 4 (user behavior)
- Conversion tracking (quote → booking)
- Page performance metrics

**Error Tracking**:
- CloudWatch Logs Insights (error queries)
- Future: Sentry or similar (Phase 2)

**Alerts**:
- Lambda error rate > 5%
- API Gateway 5xx errors
- DynamoDB throttling
- Cognito failed auth attempts

---

## Troubleshooting Guide

### Common Issues

#### Build Failures

**Issue**: Next.js build fails on Amplify

```bash
# Check Amplify build logs
AWS Console → Amplify → Build History → View Logs

# Common causes:
# - Missing environment variables
# - TypeScript errors
# - Missing dependencies

# Fix: Ensure package-lock.json is committed
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

**Issue**: Tailwind classes not applying

```bash
# Ensure tailwind.config.ts includes app directory
content: [
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
  "./components/**/*.{js,ts,jsx,tsx,mdx}",
]

# Rebuild
npm run build
```

#### Deployment Issues

**Issue**: Amplify deployment stuck

```bash
# Cancel and retry
AWS Console → Amplify → Redeploy this version

# If persists, check:
# - GitHub connection status
# - IAM permissions
# - Build logs for errors
```

**Issue**: CloudFront cache not invalidating

```bash
# Manual invalidation
AWS Console → CloudFront → Invalidations
Create invalidation: /*

# Or via CLI
aws cloudfront create-invalidation \
  --distribution-id XXXXX \
  --paths "/*"
```

#### Local Development Issues

**Issue**: `npm install` fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# If persists, check Node.js version
node -v  # Should be 18.x or 20.x
```

**Issue**: Port 3000 already in use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or run on different port
npm run dev -- -p 3001
```

---

## Version History

### Version 1.0 - December 4, 2025
- Initial Platform Bible created
- Landing page V1 and V2 completed
- AWS Amplify configuration documented
- Technology stack finalized
- Code standards established

---

## Future Updates

This document should be updated whenever:
- New technology is introduced
- Architecture decisions are made
- Deployment processes change
- New AWS resources are created
- Code standards evolve
- Major features are implemented

**Update Procedure**:
1. Make changes to DURDLE_PLATFORM_BIBLE.md
2. Update "Last Updated" date at top
3. Add entry to Version History
4. Commit with message: "Update Platform Bible: [brief description]"
5. Review with team (if applicable)

---

## Contact & Support

**Repository**: [https://github.com/flowency-live/Durdle](https://github.com/flowency-live/Durdle)
**Documentation**: `.documentation/` folder in repo
**AWS Account**: TBD
**Domain**: durdle.co.uk (TBD)

---

**END OF DURDLE PLATFORM BIBLE v1.0**

*This is a living document. Keep it updated as the platform evolves.*
