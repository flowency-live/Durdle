Dorset Transfer Company -- Platform Requirements

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

-   Pricing visibility\
-   Quote generator (Google Maps API)\
-   Quote retrieval\
-   Booking workflow\
-   Stripe payments\
-   Notifications (Email, SMS, WhatsApp)\
-   Analytics tracking (visitors, conversion rate, time on site)

### 3.1.2 Booking Workflow Details

**Booking Type**
-   Pre-booked transfers ONLY (no immediate/ride-hail bookings)\
-   Minimum advance booking time to be defined\
-   Date and time selection required for all bookings

**Multi-Stop Journey Support**
-   Waypoint functionality for additional stops during journey\
-   Add multiple pickup or drop-off locations\
-   Dynamic pricing calculation based on total route including waypoints\
-   Clear visual representation of journey route with all stops\
-   Reference workflow: https://www.jewels-airport-transfers.co.uk/airport-taxis/heathrow

**Quote Management**
-   Quote validity period: TBD (recommend 24-48 hours)\
-   Quote retrieval via unique reference code\
-   Pricing locked at time of quote generation\
-   Quote includes all waypoints and route details

**Cancellation Policy**
-   24-hour cancellation policy (free cancellation up to 24 hours before pickup)\
-   Cancellations within 24 hours: subject to terms (partial/no refund)\
-   Refunds processed via Stripe\
-   Customer-initiated cancellation via booking reference\
-   Admin override capability for exceptional circumstances

**Booking Modifications**
-   Phase 1: Contact dispatch for changes (manual process)\
-   Customer provides booking reference to request changes\
-   Admin can modify: pickup time, location, waypoints, passenger details

**Future Enhancements (Post Phase 1)**
-   Self-service booking modifications (before 24-hour window)\
-   Recurring bookings for business accounts\
-   Automated cancellation processing\
-   Real-time pricing updates for modifications

------------------------------------------------------------------------

## 3.2 Operational Dashboard (Admin / Dispatcher)

### 3.2.1 Dashboard Home

-   Live bookings\
-   Unassigned jobs\
-   Driver availability\
-   KPI overview\
-   Expired/expiring driver documents

### 3.2.2 Dispatch & Job Management

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

**Dual Pricing Model**

The platform uses two pricing calculation methods:

**1. Fixed Route Pricing (Popular Airport Transfers)**
-   Set rates configured for common airport destinations:\
    -   LHR (London Heathrow)\
    -   LGW (London Gatwick)\
    -   STN (London Stansted)\
    -   BHX (Birmingham)\
    -   BRS (Bristol)\
    -   SOU (Southampton)\
    -   BOU (Bournemouth)\
    -   EXT (Exeter)\
    -   NQY (Newquay)
-   Pricing stratified by vehicle class/type\
-   Rates maintained in admin dashboard pricing table\
-   Quote engine checks origin/destination against fixed route matrix

**2. Variable Pricing (All Other Routes)**
-   Calculation: Standing Charge + (Distance × Per-Mile Rate)\
-   Standing charge: base fee per vehicle class\
-   Per-mile rate: configurable per vehicle class\
-   Distance calculated via Google Maps API (actual driving distance)\
-   Includes waypoint distances when applicable

**Vehicle Classes**
-   Standard Sedan (e.g., 1-4 passengers)\
-   Executive/Premium (e.g., 1-4 passengers, luxury vehicle)\
-   MPV/Large Vehicle (e.g., 5-8 passengers)\
-   Each class has distinct pricing for both fixed and variable models

**Pricing Adjustments**

Surge Pricing:
-   Manual percentage increase option (e.g., +10%, +25%, +50%)\
-   Applied to base calculation for high-demand periods\
-   Configurable by admin in dashboard\
-   Surge rules based on time/date (future: auto-trigger based on demand)

Return Trip Discounts:
-   Discount percentage for round-trip bookings\
-   Applied when customer books outbound + return journey together\
-   Configurable discount rate per vehicle class

**Future Enhancements (Post Phase 1)**
-   Promotional codes and coupon system\
-   Business account volume discounts\
-   Time-based pricing multipliers (night surcharge, weekend rates)\
-   Automated surge pricing based on real-time demand\
-   Competitor price monitoring and dynamic adjustment

### 3.2.4 Driver Management & Compliance

-   Upload & store DBS, MOT, insurance, PHV license, tax docs\
-   Expiration reminders\
-   Complaint & rating history\
-   Compliance status

### 3.2.5 Analytics & Reports

-   Busiest times, days, weeks, months\
-   Revenue & booking trends\
-   Conversion funnels\
-   Driver performance metrics

### 3.2.6 Communication Integrations

-   WhatsApp Business\
-   SMS Gateway\
-   Email (SendGrid/Mailgun)

### 3.2.7 Real-Time Communication Strategy

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

**Future Enhancements (Post Phase 1)**

-   Automated live GPS tracking for customers\
-   Real-time ETA updates\
-   Driver location sharing with configurable privacy\
-   WebSocket-based live dashboard updates\
-   Automated status change notifications\
-   Location updates every 10s during active jobs\
-   Push notification with SMS fallback

------------------------------------------------------------------------

## 3.3 Driver System

### Phase 1 Approach

-   Job assignment via dispatch (phone/WhatsApp)\
-   Navigation via Google Maps\
-   Manual status updates via WhatsApp/SMS to dispatch and passenger:\
    -   En-route notification\
    -   Arrived/onsite confirmation\
    -   Passenger onboard confirmation\
    -   Trip completed confirmation

### Future Enhancements (Post Phase 1)

-   Dedicated driver app or mobile web portal\
-   In-app job acceptance/decline\
-   Automated status updates\
-   Integrated navigation with ETA sharing\
-   Digital signature capture for completions

------------------------------------------------------------------------

## 3.4 Driver Quality Tools

### Customer Rating System

-   1--5 star ratings collected post-trip\
-   Optional written feedback\
-   Averages and trends shown in dashboard

### Complaint Logging

-   Customers or staff can file complaints\
-   Categorised and prioritised\
-   Drivers flagged if complaints exceed thresholds

### Incident Tracking

-   Logs accidents, breakdowns, safety issues\
-   Severity scoring\
-   Supports photo/document uploads

### Driver Performance Score

-   Composite score (ratings, complaints, incidents, punctuality,
    acceptance rate)\
-   Shown as 0--100 with colour coding\
-   Influences dispatch priority

### *Lost Property Tracker (Condensed)*

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

**Customer Bookings**
-   Guest booking flow (no account creation required)\
-   Customers provide contact details per transaction\
-   Email/phone used for booking confirmation and communication\
-   No login or password management for customers in Phase 1

**Administrator Access**
-   2 admin user accounts required for initial rollout\
-   Admin roles: Full platform access (dispatch, analytics, pricing, driver management)\
-   Secure authentication required (email/password with MFA recommended)

**Driver Access**
-   Basic authentication for drivers to access job portal\
-   Driver login credentials managed by admin team\
-   Minimal onboarding flow: credentials provided by dispatcher

### Future Enhancements (Post Phase 1)

**Corporate Accounts**
-   Business customer accounts with login capability\
-   Multi-user access for business admins\
-   Invoice history and account management\
-   Saved locations and preferences\
-   Monthly billing and reporting

**Enhanced Admin Hierarchy**
-   Role-based access control (Owner, Dispatcher, Analyst)\
-   Granular permissions per admin role\
-   Audit logs for admin actions

**Driver Portal Enhancements**
-   Self-service document upload\
-   Personal performance dashboard\
-   Shift scheduling and availability management

------------------------------------------------------------------------

## 4. Non-Functional Requirements

-   GDPR compliant\
-   Stripe secure payments\
-   Fast load times\
-   Scalable for multi-region expansion\
-   99%+ uptime\
-   Automated backups

------------------------------------------------------------------------

## 5. Technical Architecture Overview

-   *Front-end:* React / Next.js\
-   *Back-end:* Node.js or Python microservices\
-   *Integrations:* Maps, Stripe, WhatsApp\
-   *Database:* PostgreSQL/MySQL, Redis cache, Object storage for
    documents

------------------------------------------------------------------------

## 6. Release Phases

### Phase 1 -- MVP

Website + Quote + Booking + Payments + Basic Dashboard

### Phase 2 -- Operations Layer

Full dispatching, analytics, driver compliance, complaints

### Phase 3 -- Automation & Scaling

Surge pricing, WhatsApp automation, multi-region support

------------------------------------------------------------------------

## 7. Success Metrics

-   Quote → Booking conversion\
-   Customer satisfaction\
-   Driver compliance rate\
-   Reduced manual dispatch time\
-   Website performance and uptime