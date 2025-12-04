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

------------------------------------------------------------------------

## 3.2 Operational Dashboard (Admin / Dispatcher)

### 3.2.1 Dashboard Home

-   Live bookings\
-   Unassigned jobs\
-   Driver availability\
-   KPI overview\
-   Expired/expiring driver documents

### 3.2.2 Dispatch & Job Management

-   Assign or auto-assign jobs\
-   Edit bookings\
-   Live ETAs and tracking\
-   Manifests and job logs

### 3.2.3 Pricing Management

-   Base prices\
-   Distance-based pricing\
-   Time-based pricing\
-   Surge pricing rules

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

------------------------------------------------------------------------

## 3.3 Driver System

-   Job receipt (app or mobile web)\
-   Accept/decline jobs\
-   Navigation via Google Maps\
-   Status updates (en-route, arrived, onboard, completed)

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