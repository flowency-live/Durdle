# NOTS Platform - Technical Architecture Document

**Version:** 1.0
**Last Updated:** 2025-12-04
**Status:** Draft

---

## 1. Executive Summary

The NOTS (Dorset Transfer Company) platform is a serverless, cloud-native transport management system built entirely on AWS infrastructure. The architecture prioritizes scalability, cost-effectiveness, and operational simplicity through managed services.

**Core Principles:**
- 100% Serverless (no EC2 instances)
- Event-driven architecture
- API-first design
- Separation of concerns (customer, admin, driver domains)
- Infrastructure as Code

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
├─────────────────┬─────────────────┬────────────────────────┤
│  NOTS Website   │  NOTS Dashboard │  NOTS Driver Portal    │
│   (Next.js)     │   (React+Vite)  │   (PWA/React)          │
│  CloudFront+S3  │  CloudFront+S3  │  CloudFront+S3         │
└────────┬────────┴────────┬────────┴────────┬───────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼──────┐
                    │  CloudFront │
                    │   (Global)  │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                                    │
    ┌────▼─────┐                    ┌────────▼────────┐
    │   API    │                    │   WebSocket     │
    │  Gateway │                    │   API Gateway   │
    │  (REST)  │                    │  (Real-time)    │
    └────┬─────┘                    └────────┬────────┘
         │                                    │
    ┌────▼────────────────────────────────────▼────┐
    │           AWS Lambda Functions               │
    │  (Bookings, Quotes, Payments, Dispatch, etc) │
    └────┬─────────────────────────────────────┬───┘
         │                                      │
    ┌────▼──────────┐                  ┌───────▼────────┐
    │   DynamoDB    │                  │  EventBridge   │
    │ (Primary DB)  │                  │ (Event Router) │
    └───────────────┘                  └───────┬────────┘
                                               │
         ┌─────────────────────────────────────┼──────────┐
         │                 │                    │          │
    ┌────▼────┐      ┌────▼────┐         ┌────▼────┐ ┌──▼───┐
    │   SQS   │      │   SNS   │         │   SES   │ │  S3  │
    │ (Queue) │      │ (Notify)│         │ (Email) │ │(Docs)│
    └─────────┘      └─────────┘         └─────────┘ └──────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14+ (App Router) | Customer website, SEO-optimized |
| **Admin** | React 18 + Vite | Internal dashboard |
| **Driver** | React PWA | Mobile-first driver portal |
| **API** | AWS Lambda (Node.js 20.x) | Business logic |
| **Database** | DynamoDB | Primary data store |
| **Cache** | ElastiCache Redis (Phase 2) | Session/state caching |
| **Auth** | AWS Cognito | User authentication |
| **Storage** | S3 | Document storage |
| **CDN** | CloudFront | Global content delivery |
| **Monitoring** | CloudWatch + X-Ray | Observability |

---

## 3. Core Services Architecture

### 3.1 Authentication & Authorization

**Service:** AWS Cognito User Pools

**User Types:**
- **Customers:** Email/password, social login (Phase 2)
- **Admins:** Email/password with MFA required
- **Drivers:** Email/password, mobile-verified

**Token Flow:**
```
Client → Cognito → JWT Token → API Gateway (Authorizer) → Lambda
```

**Authorization Levels:**
- `customer`: Read own bookings, create bookings, make payments
- `driver`: Read assigned jobs, update job status
- `dispatcher`: Assign jobs, view all bookings
- `admin`: Full platform access
- `owner`: Full access + pricing/compliance management

### 3.2 API Layer

**Service:** AWS API Gateway (REST + WebSocket)

**Base URLs:**
- REST API: `https://api.nots.co.uk/v1/*`
- WebSocket: `wss://ws.nots.co.uk/` (Phase 2)

**API Structure:**
```
/v1/
├── /quotes          (POST, GET)
├── /bookings        (POST, GET, PATCH, DELETE)
├── /payments        (POST, GET)
├── /drivers         (GET, PATCH) [admin only]
├── /vehicles        (GET, POST, PATCH)
├── /compliance      (POST, GET) [admin only]
├── /analytics       (GET) [admin only]
└── /dispatch        (POST, PATCH) [dispatcher only]
```

### 3.3 Data Layer

**Primary Database:** DynamoDB

**Table Strategy:** Single-table design with GSIs

**Table: `nots-main-table`**

See [DatabaseSchema.md](DatabaseSchema.md) for detailed schema design.

**File Storage:** S3 Bucket `nots-documents-{env}`
- Driver compliance documents
- Incident reports
- Customer uploaded files (Phase 2)

---

## 4. Lambda Functions (MVP)

| Function Name | Trigger | Purpose | Timeout |
|--------------|---------|---------|---------|
| `quotes-calculator` | API Gateway | Calculate quote using Google Maps | 10s |
| `quotes-retrieve` | API Gateway | Retrieve saved quote | 3s |
| `bookings-create` | API Gateway | Create new booking | 10s |
| `bookings-get` | API Gateway | Get booking details | 3s |
| `bookings-list` | API Gateway | List bookings (paginated) | 5s |
| `bookings-update` | API Gateway | Update booking | 5s |
| `payments-process` | API Gateway | Process Stripe payment | 15s |
| `payments-webhook` | API Gateway | Handle Stripe webhooks | 10s |
| `dispatch-assign` | API Gateway | Assign job to driver | 5s |
| `drivers-list` | API Gateway | List drivers | 3s |
| `drivers-update` | API Gateway | Update driver info | 5s |
| `notifications-send` | SQS | Send email/SMS notifications | 10s |
| `compliance-upload` | API Gateway | Upload driver documents to S3 | 15s |

**Lambda Configuration Standards:**
- **Memory:** 512MB (adjust per function)
- **Runtime:** Node.js 20.x
- **Architecture:** arm64 (Graviton for cost savings)
- **Environment Variables:** See [DeploymentRunbook.md](DeploymentRunbook.md)

---

## 5. External Integrations

### 5.1 Google Maps API

**APIs Used:**
- Distance Matrix API (quote calculations)
- Geocoding API (address validation)
- Places API (address autocomplete - Phase 2)

**Caching:** Quote results cached in DynamoDB for 15 minutes

### 5.2 Stripe

**Products:**
- Stripe Checkout (immediate payments)
- Stripe Payment Intents (Phase 2)
- Stripe Webhooks (payment confirmation)

**Webhook Endpoint:** `https://api.nots.co.uk/v1/webhooks/stripe`

### 5.3 Notifications

**Email:** AWS SES (verified domain: nots.co.uk)
**SMS:** AWS SNS + Pinpoint (UK SMS)
**WhatsApp:** Phase 3 - Twilio WhatsApp Business API

---

## 6. Security Architecture

### 6.1 Network Security

- **API Gateway:** AWS WAF enabled (rate limiting, SQL injection protection)
- **Lambda:** VPC deployment NOT required (DynamoDB uses VPC endpoints if needed)
- **S3:** Bucket policies enforce HTTPS only
- **CloudFront:** TLS 1.2+ only

### 6.2 Secrets Management

**Service:** AWS Secrets Manager

**Secrets:**
- `nots/stripe/secret-key`
- `nots/google/maps-api-key`
- `nots/twilio/auth-token` (Phase 3)

**Rotation:** Automatic 90-day rotation where supported

### 6.3 Data Protection

- **Encryption at Rest:** All DynamoDB tables, S3 buckets
- **Encryption in Transit:** TLS 1.2+ for all API calls
- **PII Handling:** Customer data encrypted, limited retention
- **GDPR Compliance:** Data deletion workflows, audit logs

---

## 7. Monitoring & Observability

### 7.1 CloudWatch Dashboards

**Dashboard: `NOTS-Operations`**
- API Gateway requests/errors (5xx, 4xx)
- Lambda invocations, duration, errors
- DynamoDB consumed capacity, throttles
- SQS queue depth

### 7.2 Alarms

| Metric | Threshold | Action |
|--------|----------|--------|
| API 5xx errors | > 10 in 5 min | SNS alert to ops team |
| Lambda errors | > 5% error rate | SNS alert |
| DynamoDB throttles | > 0 | SNS alert |
| SQS DLQ messages | > 0 | SNS alert |

### 7.3 X-Ray Tracing

- Enabled on all Lambda functions
- Trace API calls through entire request lifecycle
- Identify bottlenecks in Google Maps/Stripe integrations

---

## 8. Scalability & Performance

### 8.1 Auto-Scaling

**DynamoDB:**
- On-Demand billing mode (auto-scales)
- Switch to Provisioned if predictable traffic

**Lambda:**
- Reserved Concurrency: NOT set (allows full account concurrency)
- Provisioned Concurrency: Phase 2 for latency-sensitive functions

### 8.2 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 500ms | CloudWatch |
| Quote Calculation | < 2s | Custom metric |
| Booking Creation | < 3s | Custom metric |
| Payment Processing | < 5s | Custom metric |

---

## 9. Disaster Recovery

### 9.1 Backup Strategy

**DynamoDB:**
- Point-in-time recovery: ENABLED
- Backup retention: 35 days
- Cross-region replication: Phase 3 (DR region: eu-west-1)

**S3:**
- Versioning: ENABLED
- Cross-region replication: Phase 3

### 9.2 RTO/RPO

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 1 hour

---

## 10. Cost Optimization

### 10.1 Estimated Monthly Costs (MVP - 1000 bookings/month)

| Service | Cost |
|---------|------|
| Lambda | ~£10 |
| DynamoDB | ~£15 |
| API Gateway | ~£5 |
| CloudFront + S3 | ~£10 |
| Cognito | ~£5 |
| SES/SNS | ~£5 |
| **Total** | **~£50/month** |

**Scaling:** Costs scale linearly with usage (serverless pricing model)

---

## 11. Development Workflow

### 11.1 Environments

| Environment | Purpose | AWS Account | Domain |
|------------|---------|-------------|--------|
| `dev` | Local development | Shared dev account | localhost:3000 |
| `staging` | Pre-production testing | Shared dev account | staging.nots.co.uk |
| `production` | Live system | Production account | nots.co.uk |

### 11.2 Infrastructure as Code

**Tool:** AWS SAM (Serverless Application Model)

**Repo Structure:**
```
nots-serverless-api/
├── template.yaml           (SAM template)
├── functions/
│   ├── quotes-calculator/
│   ├── bookings-create/
│   └── ...
└── layers/
    └── shared-libs/
```

**Deployment:**
```bash
sam build
sam deploy --config-env production
```

---

## 12. Phase 2 Enhancements

**Additions:**
- Real-time tracking (WebSocket API + DynamoDB Streams)
- ElastiCache Redis (session caching, rate limiting)
- Aurora Serverless (complex analytics queries)
- Step Functions (complex booking workflows)

---

## 13. Open Questions

- [ ] Use API Gateway HTTP API (cheaper) vs REST API (more features)?
- [ ] Single AWS account or multi-account strategy?
- [ ] CI/CD tool: GitHub Actions or AWS CodePipeline?
- [ ] Custom domain SSL certificates via ACM?

---

## 14. References

- [InitialPRD.md](InitialPRD.md) - Product requirements
- [DatabaseSchema.md](DatabaseSchema.md) - Detailed data model
- [APISpecification.md](APISpecification.md) - API contracts
- [DeploymentRunbook.md](DeploymentRunbook.md) - Deployment procedures
- [SecurityCompliance.md](SecurityCompliance.md) - Security checklist

---

**Document Owner:** Tech Lead
**Review Cycle:** Monthly or after major architecture changes
