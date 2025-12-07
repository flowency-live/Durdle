Dorset Transfer Company -- Platform Requirements

**Last Updated:** December 6, 2025
**Implementation Status:** Phase 1 & 2 Complete | Phase 3 & 4 Planned

------------------------------------------------------------------------

## IMPLEMENTATION STATUS SUMMARY

| Phase | Status | Completion Date |
|-------|--------|----------------|
| Phase 1: Customer Quote System | ✅ COMPLETE | Q4 2025 |
| Phase 2: Admin Operations Dashboard | ✅ COMPLETE | Q4 2025 |
| Phase 3: Payments & Booking Workflow | 📋 PLANNED | Q1 2026 Target |
| Phase 4: Driver Portal & Automation | 📋 PLANNED | Q2-Q3 2026 Target |

**Legend:**
- ✅ COMPLETE - Deployed to production, tested, documented
- ⚠️ PARTIAL - Backend ready, frontend incomplete
- ❌ NOT STARTED - Requirements defined, development not started
- 📋 PLANNED - Scoped and scheduled for future phase

------------------------------------------------------------------------

## 1. Market Requirements Document (MRD)

### 1.1 Market Overview

Dorset Transfer Company is a newly launched transport service operating
across the Dorset region. The company caters to: - Retail customers -
Local businesses

The market is highly competitive with traditional taxi services,
app-based ride-hailing, and local private hire operators.

### 1.2 Customer Needs

  -----------------------------------------------------------------------
  Segment                       Key Needs
  ----------------------------- -----------------------------------------
  Public / Retail Customers     Transparent pricing, digital payments,
                                quick quoting, visibility of driver,
                                notifications

  Local Businesses              Account management, reliable transport,
                                invoicing

  Company Administrator         Dashboard, analytics, dispatch tools

  Drivers                       Job clarity, navigation, ratings,
                                compliance tracking
  -----------------------------------------------------------------------

### 1.3 Market Opportunity

Dorset has growing tourism and logistics demand with increasing
expectations for digital-first transport services.

### 1.4 Competitive Landscape

Local competition lacks analytics, integrated compliance systems,
automated dispatching, and modern booking tools.

------------------------------------------------------------------------

## 2. Product Requirements (PRD)

### 2.1 Product Vision

A unified ecosystem consisting of: - A *public-facing website* for
quoting, booking, payments, and customer interaction. - An **internal
operations dashboard** for dispatch, analytics, pricing, and
compliance. - A *driver app/portal* for job receipt, navigation, and
status reporting.

------------------------------------------------------------------------

## 3. Functional Requirements

------------------------------------------------------------------------

## 3.1 Website (Customer-Facing)

### 3.1.1 Core Features

-   ✅ **COMPLETE** Pricing visibility
-   ✅ **COMPLETE** Quote generator (Google Maps API)
-   ⚠️ **PARTIAL** Quote retrieval (backend API exists, frontend UI not built)
-   ❌ **NOT STARTED** Booking workflow
-   ❌ **NOT STARTED** Stripe payments
-   ❌ **NOT STARTED** Notifications (Email, SMS, WhatsApp)
-   ❌ **NOT STARTED** Analytics tracking (visitors, conversion rate, time on site)

### 3.1.2 Booking Workflow Details

**Booking Type**
-   ✅ **COMPLETE** Pre-booked transfers ONLY (no immediate/ride-hail bookings)
-   ✅ **COMPLETE** Minimum advance booking time (24 hours enforced at UI level)
-   ✅ **COMPLETE** Date and time selection required for all bookings

**Multi-Stop Journey Support**
-   ✅ **COMPLETE** Waypoint functionality for additional stops during journey
-   ✅ **COMPLETE** Add multiple pickup or drop-off locations
-   ✅ **COMPLETE** Dynamic pricing calculation based on total route including waypoints
-   ✅ **COMPLETE** Clear visual representation of journey route with all stops
-   Reference workflow: https://www.jewels-airport-transfers.co.uk/airport-taxis/heathrow

**Quote Management**
-   ✅ **COMPLETE** Quote validity period: 15 minutes (implemented)
-   ⚠️ **PARTIAL** Quote retrieval via unique reference code (backend API exists, frontend UI not built)
-   ✅ **COMPLETE** Pricing locked at time of quote generation
-   ✅ **COMPLETE** Quote includes all waypoints and route details

**Cancellation Policy** ❌ **NOT STARTED - PHASE 3**
-   24-hour cancellation policy (free cancellation up to 24 hours before pickup)
-   Cancellations within 24 hours: subject to terms (partial/no refund)
-   Refunds processed via Stripe
-   Customer-initiated cancellation via booking reference
-   Admin override capability for exceptional circumstances

**Booking Modifications** ❌ **NOT STARTED - PHASE 3**
-   Phase 1: Contact dispatch for changes (manual process)
-   Customer provides booking reference to request changes
-   Admin can modify: pickup time, location, waypoints, passenger details

**Future Enhancements (Post Phase 1)**
-   Self-service booking modifications (before 24-hour window)\
-   Recurring bookings for business accounts\
-   Automated cancellation processing\
-   Real-time pricing updates for modifications

------------------------------------------------------------------------

## 3.2 Operational Dashboard (Admin / Dispatcher)

### 3.2.1 Dashboard Home

-   ❌ **NOT STARTED** Live bookings (requires Phase 3 booking system)
-   ❌ **NOT STARTED** Unassigned jobs
-   ❌ **NOT STARTED** Driver availability
-   ❌ **NOT STARTED** KPI overview
-   ❌ **NOT STARTED** Expired/expiring driver documents

### 3.2.2 Dispatch & Job Management

❌ **NOT STARTED - PHASE 3** (Requires booking system to be implemented first)

**Phase 1: Manual Dispatch**
-   Manual driver assignment by dispatcher\
-   Initial driver pool: Up to 10 drivers recruited prior to launch\
-   Dispatcher views available drivers and assigns jobs based on:\
    -   Driver availability/schedule\
    -   Driver location/proximity\
    -   Driver vehicle class match\
    -   Driver performance scores
-   Jobs remain unassigned until manually allocated\
-   Driver notified of assignment via WhatsApp/SMS/phone

**Job Management Features**
-   View all bookings (upcoming, active, completed)\
-   Edit booking details (time, location, waypoints, customer info)\
-   Job status tracking via driver communication\
-   Manifests and job logs for record-keeping\
-   Reassign jobs if needed (driver unavailable, vehicle breakdown)

**Future Enhancements (Post Phase 1)**
-   Auto-assignment algorithm based on:\
    -   Proximity to pickup location\
    -   Driver availability windows\
    -   Performance score weighting\
    -   Vehicle type requirements\
    -   Historical acceptance patterns
-   Driver mobile app for instant job acceptance/decline\
-   Real-time driver location for optimal routing\
-   Load balancing across driver fleet

### 3.2.3 Pricing Management

✅ **COMPLETE** Backend API operational | ⚠️ **PARTIAL** Admin UI in development

**Dual Pricing Model**

The platform uses two pricing calculation methods:

**1. Fixed Route Pricing (Popular Airport Transfers)** ✅ **COMPLETE**
-   ✅ Set rates configured for common airport destinations:\
    -   LHR (London Heathrow)\
    -   LGW (London Gatwick)\
    -   STN (London Stansted)\
    -   BHX (Birmingham)\
    -   BRS (Bristol)\
    -   SOU (Southampton)\
    -   BOU (Bournemouth)\
    -   EXT (Exeter)\
    -   NQY (Newquay)
-   ✅ Pricing stratified by vehicle class/type\
-   ✅ Rates maintained in DynamoDB via backend API\
-   ✅ Quote engine checks origin/destination against fixed route matrix

**2. Variable Pricing (All Other Routes)** ✅ **COMPLETE**
-   ✅ Calculation: Standing Charge + (Distance × Per-Mile Rate)\
-   ✅ Standing charge: base fee per vehicle class\
-   ✅ Per-mile rate: configurable per vehicle class\
-   ✅ Distance calculated via Google Maps API (actual driving distance)\
-   ✅ Includes waypoint distances when applicable

**Vehicle Classes** ✅ **COMPLETE**
-   ✅ Standard Sedan (e.g., 1-4 passengers)\
-   ✅ Executive/Premium (e.g., 1-4 passengers, luxury vehicle)\
-   ✅ MPV/Large Vehicle (e.g., 5-8 passengers)\
-   ✅ Each class has distinct pricing for both fixed and variable models

**Pricing Adjustments** ❌ **NOT STARTED**

Surge Pricing:
-   Manual percentage increase option (e.g., +10%, +25%, +50%)\
-   Applied to base calculation for high-demand periods\
-   Configurable by admin in dashboard\
-   Surge rules based on time/date (future: auto-trigger based on demand)

Return Trip Discounts:
-   Discount percentage for round-trip bookings\
-   Applied when customer books outbound + return journey together\
-   Configurable discount rate per vehicle class

**Future Enhancements (Post Phase 1)** 📋 **PLANNED**
-   Promotional codes and coupon system\
-   Business account volume discounts\
-   Time-based pricing multipliers (night surcharge, weekend rates)\
-   Automated surge pricing based on real-time demand\
-   Competitor price monitoring and dynamic adjustment

### 3.2.4 Driver Management & Compliance

⚠️ **PARTIAL** Backend APIs exist (uploads-presigned, document-comments, vehicle-manager) | ❌ **NOT STARTED** Admin UI not built

-   ⚠️ Upload & store DBS, MOT, insurance, PHV license, tax docs (backend API ready)\
-   ❌ Expiration reminders (not implemented)\
-   ⚠️ Complaint & rating history (feedback-manager API exists, UI not built)\
-   ❌ Compliance status dashboard (not implemented)

### 3.2.5 Analytics & Reports

❌ **NOT STARTED** (Requires booking system and data collection from Phase 3)

-   Busiest times, days, weeks, months\
-   Revenue & booking trends\
-   Conversion funnels\
-   Driver performance metrics

### 3.2.6 Communication Integrations

❌ **NOT STARTED - PHASE 3**

-   WhatsApp Business\
-   SMS Gateway\
-   Email (SendGrid/Mailgun)

### 3.2.7 Real-Time Communication Strategy

❌ **NOT STARTED - PHASE 3** (Requires booking system and communication integrations)

**Phase 1 Approach: Manual Messaging**

Driver-to-passenger communication via WhatsApp/SMS for key milestones:
-   Driver messages passenger when en route\
-   Driver messages passenger when outside/onsite\
-   Direct passenger-driver contact for coordination

Driver-to-dispatch communication:
-   Driver confirms onsite arrival to dispatch\
-   Driver confirms passenger pickup\
-   Driver confirms passenger drop-off completion\
-   Manual status updates logged in dispatch dashboard

**Future Enhancements (Post Phase 1)** 📋 **PLANNED - PHASE 4**

-   Automated live GPS tracking for customers\
-   Real-time ETA updates\
-   Driver location sharing with configurable privacy\
-   WebSocket-based live dashboard updates\
-   Automated status change notifications\
-   Location updates every 10s during active jobs\
-   Push notification with SMS fallback

------------------------------------------------------------------------

## 3.3 Driver System

📋 **PLANNED - PHASE 4** (Q2/Q3 2026 Target)

### Phase 1 Approach

-   Job assignment via dispatch (phone/WhatsApp)\
-   Navigation via Google Maps\
-   Manual status updates via WhatsApp/SMS to dispatch and passenger:\
    -   En-route notification\
    -   Arrived/onsite confirmation\
    -   Passenger onboard confirmation\
    -   Trip completed confirmation

### Future Enhancements (Post Phase 1) 📋 **PLANNED - PHASE 4**

-   Dedicated driver app or mobile web portal\
-   In-app job acceptance/decline\
-   Automated status updates\
-   Integrated navigation with ETA sharing\
-   Digital signature capture for completions

------------------------------------------------------------------------

## 3.4 Driver Quality Tools

⚠️ **PARTIAL** Backend APIs exist (feedback-manager) | ❌ **NOT STARTED** Full system not operational

### Customer Rating System ⚠️ **PARTIAL**

-   ⚠️ 1--5 star ratings (feedback-manager API exists, UI not built)\
-   ⚠️ Optional written feedback (backend ready)\
-   ❌ Averages and trends shown in dashboard (not implemented)

### Complaint Logging ⚠️ **PARTIAL**

-   ⚠️ Customers or staff can file complaints (feedback API exists)\
-   ❌ Categorised and prioritised (not implemented)\
-   ❌ Drivers flagged if complaints exceed thresholds (not implemented)

### Incident Tracking ❌ **NOT STARTED**

-   Logs accidents, breakdowns, safety issues\
-   Severity scoring\
-   Supports photo/document uploads

### Driver Performance Score ❌ **NOT STARTED - PHASE 4**

-   Composite score (ratings, complaints, incidents, punctuality,
    acceptance rate)\
-   Shown as 0--100 with colour coding\
-   Influences dispatch priority

### Lost Property Tracker ❌ **NOT STARTED - PHASE 4**

-   Drivers log found items with job ID and item description.\
-   Customers can report missing items via form, email link, or
    dispatcher.\
-   System matches lost/found entries.\
-   Dashboard tracks status: Found → Claimed → Returned (or Unclaimed).\
-   Notifications sent to customers, drivers, and admin.\
-   Full audit trail for compliance.

------------------------------------------------------------------------

## 3.5 Authentication & User Management

### Phase 1 Approach

**Customer Bookings** ✅ **COMPLETE**
-   ✅ Guest booking flow (no account creation required)\
-   ✅ Customers provide contact details per transaction\
-   ❌ Email/phone used for booking confirmation (not yet implemented - requires Phase 3)\
-   ✅ No login or password management for customers in Phase 1

**Administrator Access** ✅ **COMPLETE**
-   ✅ Admin authentication system operational (admin-auth Lambda with JWT)\
-   ✅ Secure authentication (email/password with bcrypt hashing)\
-   ✅ Session management with JWT tokens\
-   ⚠️ MFA recommended but not yet implemented

**Driver Access** ❌ **NOT STARTED - PHASE 4**
-   Basic authentication for drivers to access job portal\
-   Driver login credentials managed by admin team\
-   Minimal onboarding flow: credentials provided by dispatcher

### Future Enhancements (Post Phase 1) 📋 **PLANNED**

**Corporate Accounts** 📋 **PLANNED - PHASE 3**
-   Business customer accounts with login capability\
-   Multi-user access for business admins\
-   Invoice history and account management\
-   Saved locations and preferences\
-   Monthly billing and reporting

**Enhanced Admin Hierarchy** 📋 **PLANNED - PHASE 3**
-   Role-based access control (Owner, Dispatcher, Analyst)\
-   Granular permissions per admin role\
-   Audit logs for admin actions

**Driver Portal Enhancements** 📋 **PLANNED - PHASE 4**
-   Self-service document upload\
-   Personal performance dashboard\
-   Shift scheduling and availability management

------------------------------------------------------------------------

## 4. Non-Functional Requirements

**Status Summary:**

-   ⚠️ **PARTIAL** GDPR compliant (data structures in place, privacy policy/consent workflows not implemented)\
-   ❌ **NOT STARTED** Stripe secure payments (Phase 3)\
-   ✅ **COMPLETE** Fast load times (Next.js 14 with optimized builds, serverless architecture)\
-   ✅ **COMPLETE** Scalable for multi-region expansion (AWS Lambda auto-scaling, DynamoDB global tables ready)\
-   ✅ **COMPLETE** 99%+ uptime (AWS infrastructure with multi-AZ deployment)\
-   ⚠️ **PARTIAL** Automated backups (DynamoDB point-in-time recovery enabled, S3 versioning not configured)

------------------------------------------------------------------------

## 5. Technical Architecture Overview

**IMPLEMENTED ARCHITECTURE** ✅ **COMPLETE**

-   ✅ **Front-end:** Next.js 14 (React 18) with TypeScript, Tailwind CSS, hosted on Vercel\
-   ✅ **Back-end:** 9 Node.js microservices deployed as AWS Lambda functions:\
    -   quotes-calculator (quote generation with Google Maps)\
    -   admin-auth (JWT authentication)\
    -   pricing-manager (pricing configuration)\
    -   vehicle-manager (fleet management)\
    -   feedback-manager (customer feedback)\
    -   locations-lookup (Google Maps autocomplete)\
    -   uploads-presigned (S3 document uploads)\
    -   document-comments (quote/booking comments)\
    -   fixed-routes-manager (airport route pricing)
-   ✅ **API Gateway:** AWS API Gateway (REST API) with CORS enabled\
-   ✅ **Database:** DynamoDB (NoSQL) with 9 tables for microservice separation\
-   ⚠️ **Integrations:** Google Maps API (complete), Stripe (not started), WhatsApp (not started)\
-   ✅ **Object Storage:** AWS S3 for document/image storage\
-   ✅ **Monitoring:** CloudWatch Logs with structured logging (Pino), X-Ray tracing enabled\
-   ✅ **Security:** Lambda execution roles with least-privilege IAM policies, API key authentication

------------------------------------------------------------------------

## 6. Release Phases

**UPDATED PHASE DEFINITIONS:**

### Phase 1 -- Customer Quote System ✅ **COMPLETE (Q4 2025)**

-   ✅ Public website with quote generator\
-   ✅ Google Maps integration for distance/duration\
-   ✅ Multi-waypoint journey support\
-   ✅ Vehicle class selection\
-   ✅ Quote validity (15 minutes)\
-   ✅ Dual pricing model (fixed routes + variable pricing)

### Phase 2 -- Admin Operations Dashboard ✅ **COMPLETE (Q4 2025)**

-   ✅ Admin authentication system\
-   ✅ Pricing management backend APIs\
-   ✅ Vehicle fleet management backend APIs\
-   ✅ Fixed route configuration backend APIs\
-   ✅ Document upload infrastructure\
-   ✅ Feedback collection backend APIs\
-   ⚠️ Admin UI partially complete (frontend development in progress)

### Phase 3 -- Payments & Booking Workflow 📋 **PLANNED (Q1 2026 Target)**

-   Stripe payment integration\
-   Customer booking confirmation\
-   Email/SMS notifications\
-   Booking management (cancellations, modifications)\
-   Admin dispatch dashboard\
-   Job assignment interface\
-   Analytics and reporting

### Phase 4 -- Driver Portal & Automation 📋 **PLANNED (Q2-Q3 2026 Target)**

-   Driver mobile app/portal\
-   Automated job assignment\
-   Real-time GPS tracking\
-   Performance scoring system\
-   Compliance monitoring dashboard\
-   WhatsApp Business integration\
-   Multi-region expansion

------------------------------------------------------------------------

## 7. Success Metrics

**Current Status:**

-   ❌ **NOT STARTED** Quote → Booking conversion (requires Phase 3 booking system)\
-   ❌ **NOT STARTED** Customer satisfaction tracking (requires post-trip feedback system)\
-   ❌ **NOT STARTED** Driver compliance rate (requires Phase 4 compliance dashboard)\
-   ❌ **NOT STARTED** Reduced manual dispatch time (requires Phase 3 dispatch system)\
-   ✅ **COMPLETE** Website performance monitoring (Vercel analytics, CloudWatch metrics)\
-   ✅ **COMPLETE** Platform uptime tracking (AWS CloudWatch alarms configured)

**Metrics Ready for Phase 3:**
-   Infrastructure for tracking quote requests (quotes stored in DynamoDB)\
-   Structured logging across all backend operations (130+ log events)\
-   API performance monitoring (CloudWatch metrics)\
-   Error tracking and alerting (CloudWatch alarms)