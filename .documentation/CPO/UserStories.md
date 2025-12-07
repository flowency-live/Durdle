# NOTS Platform - User Stories & Acceptance Criteria (MVP)

**Version:** 1.0
**Last Updated:** 2025-12-04
**Status:** Draft
**Sprint:** MVP Release (Weeks 1-6)

---

## 1. Overview

This document defines user stories and acceptance criteria for the NOTS MVP release. Stories are organized by user persona and prioritized using MoSCoW method.

**Personas:**
- **Customer (C):** Public users booking transport
- **Admin (A):** Platform administrator
- **Dispatcher (D):** Job assignment operator
- **Driver (DR):** Transport service provider

**Priority:**
- **Must Have:** Critical for MVP
- **Should Have:** Important but not critical
- **Could Have:** Nice to have if time permits
- **Won't Have:** Deferred to Phase 2

---

## 2. Customer Stories

### C-001: View Pricing Information

**As a** customer
**I want to** see transparent pricing on the website
**So that** I know how fares are calculated before booking

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Pricing page displays base fare, per-mile rate, per-minute rate
- [ ] Clear explanation of surge pricing (if applicable)
- [ ] Examples of common routes with estimated prices
- [ ] Vehicle type pricing differences shown
- [ ] Page loads in under 2 seconds
- [ ] Mobile responsive design

**Technical Notes:**
- Static page in Next.js
- Fetch pricing from DynamoDB (admin-configurable)

---

### C-002: Calculate Journey Quote

**As a** customer
**I want to** enter pickup/dropoff locations and get an instant quote
**So that** I know exactly how much my journey will cost

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Form has pickup location field with address autocomplete (Phase 2)
- [ ] Form has dropoff location field with address autocomplete (Phase 2)
- [ ] Pickup date/time selector (minimum 30 minutes in future)
- [ ] Passenger count dropdown (1-8)
- [ ] Vehicle type selector (standard, executive, minibus)
- [ ] Return journey checkbox
- [ ] Quote calculates in under 3 seconds
- [ ] Quote displays: distance, duration, price breakdown, total price
- [ ] Quote shows route map visualization
- [ ] Quote valid for 15 minutes
- [ ] Error handling for invalid addresses
- [ ] Quote can be saved and retrieved via unique URL

**API Endpoint:** `POST /v1/quotes`

**Error States:**
- Invalid address
- Google Maps API failure
- Route not possible (e.g., overseas location)

---

### C-003: Retrieve Saved Quote

**As a** customer
**I want to** retrieve a previously generated quote via URL
**So that** I can share it or return to complete booking later

**Priority:** Should Have

**Acceptance Criteria:**
- [ ] Quote URL format: `nots.co.uk/quote/{quoteId}`
- [ ] Quote displays all original details
- [ ] Shows "Quote expires in X minutes" countdown
- [ ] If expired, offers "Recalculate" button
- [ ] Button to proceed to booking

**API Endpoint:** `GET /v1/quotes/:quoteId`

---

### C-004: Book a Journey

**As a** customer
**I want to** book a journey based on my quote
**So that** I can secure transport for my trip

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Booking form pre-filled from quote
- [ ] Customer details form: first name, last name, email, phone
- [ ] Phone validation (UK format)
- [ ] Email validation
- [ ] Pickup instructions field (optional)
- [ ] Dropoff instructions field (optional)
- [ ] Special requirements field (wheelchair, child seat, etc.) - optional
- [ ] Luggage count field
- [ ] Terms and conditions checkbox (required)
- [ ] Proceed to payment button
- [ ] Form validation with clear error messages
- [ ] Booking created with status "pending" until payment confirmed

**API Endpoint:** `POST /v1/bookings`

**Validation Rules:**
- Phone must be valid UK mobile number
- Email must be valid format
- All required fields must be completed
- Quote must not be expired

---

### C-005: Pay for Booking

**As a** customer
**I want to** pay securely via credit/debit card
**So that** I can confirm my booking

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Stripe payment integration
- [ ] Payment form accepts: card number, expiry, CVC, postal code
- [ ] Real-time card validation
- [ ] Payment processes in under 5 seconds
- [ ] Loading state shown during processing
- [ ] Payment success confirmation page
- [ ] Payment failure error message with retry option
- [ ] Booking status changes to "confirmed" after successful payment
- [ ] PCI DSS compliant (Stripe handles card data, not NOTS)

**API Endpoint:** `POST /v1/payments/intents`

**Payment Success Flow:**
1. Create Stripe Payment Intent
2. Customer completes payment
3. Stripe webhook confirms payment
4. Booking status updated to "confirmed"
5. Confirmation email sent

---

### C-006: Receive Booking Confirmation

**As a** customer
**I want to** receive confirmation via email and SMS
**So that** I have proof of booking and journey details

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Confirmation email sent within 30 seconds of payment
- [ ] Email contains: booking reference, pickup/dropoff details, price, date/time
- [ ] Email includes link to view booking details
- [ ] SMS sent to customer phone with booking reference and pickup time
- [ ] SMS character limit respected (160 chars)
- [ ] Email sent from noreply@nots.co.uk with NOTS branding
- [ ] Unsubscribe link in email footer (GDPR)

**Email Template Fields:**
- Booking reference (e.g., NOTS-12345)
- Customer name
- Pickup location and time
- Dropoff location
- Vehicle type
- Price
- Link to manage booking

**SMS Template:**
```
NOTS Booking NOTS-12345 confirmed. Pickup: Bournemouth Station on 10 Dec at 14:30. £12.28 paid. View: nots.co.uk/booking/abc123
```

---

### C-007: View Booking Details

**As a** customer
**I want to** view my booking details online
**So that** I can check journey information and driver details

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Booking page URL: `nots.co.uk/booking/{bookingId}`
- [ ] No authentication required (secure link)
- [ ] Displays: booking reference, status, pickup/dropoff, date/time, price
- [ ] If driver assigned: driver name, vehicle details (make, model, color, registration)
- [ ] If driver assigned: driver photo (Phase 2)
- [ ] Contact driver button (phone call) - shown only when assigned
- [ ] Cancel booking button (if more than 2 hours before pickup)
- [ ] Page updates automatically when status changes (polling every 30s or WebSocket Phase 2)

**API Endpoint:** `GET /v1/bookings/:bookingId`

---

### C-008: Cancel Booking

**As a** customer
**I want to** cancel my booking if plans change
**So that** I don't pay for unused service

**Priority:** Should Have

**Acceptance Criteria:**
- [ ] Cancel button visible on booking page
- [ ] Confirmation modal: "Are you sure you want to cancel?"
- [ ] Cancellation policy displayed (e.g., "Free cancellation up to 2 hours before pickup")
- [ ] If within cancellation window: booking cancelled, refund processed
- [ ] If outside window: cancellation fee warning shown
- [ ] Booking status changes to "cancelled"
- [ ] Cancellation confirmation email sent
- [ ] Driver notified if already assigned
- [ ] Refund processed within 5-7 business days (Stripe)

**API Endpoint:** `DELETE /v1/bookings/:bookingId`

**Cancellation Policy (MVP):**
- More than 2 hours before: Full refund
- Less than 2 hours before: 50% charge
- After driver en route: No refund

---

## 3. Admin Stories

### A-001: View Dashboard Overview

**As an** admin
**I want to** see a dashboard of key metrics
**So that** I can monitor platform performance

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Dashboard shows: total bookings today, revenue today, active drivers, pending jobs
- [ ] KPI cards with current values and % change from yesterday
- [ ] Upcoming bookings list (next 24 hours)
- [ ] Unassigned bookings alert (red badge)
- [ ] Expiring driver documents alert
- [ ] Quick action buttons: Create booking, Assign driver, View reports
- [ ] Dashboard loads in under 2 seconds
- [ ] Auto-refreshes every 60 seconds

**API Endpoint:** `GET /v1/analytics/overview`

---

### A-002: View All Bookings

**As an** admin
**I want to** see a list of all bookings
**So that** I can monitor and manage customer journeys

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Bookings table with columns: Reference, Status, Customer, Pickup Time, Pickup Location, Driver, Price
- [ ] Filter by status: All, Pending, Confirmed, Assigned, In Progress, Completed, Cancelled
- [ ] Filter by date range: Today, This Week, This Month, Custom Range
- [ ] Search by: booking reference, customer name, phone
- [ ] Sort by: pickup time, created date, price
- [ ] Pagination (20 bookings per page)
- [ ] Click row to view booking details
- [ ] Export to CSV button (Phase 2)
- [ ] Refresh button

**API Endpoint:** `GET /v1/bookings?limit=20&cursor={cursor}&status={status}`

---

### A-003: View Booking Details

**As an** admin
**I want to** view full booking details
**So that** I can help customers and resolve issues

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] View all customer details: name, email, phone, pickup/dropoff instructions
- [ ] View journey details: locations, distance, duration, route map
- [ ] View pricing breakdown
- [ ] View payment status and transaction details
- [ ] View assigned driver and vehicle (if assigned)
- [ ] View booking timeline: created, confirmed, assigned, completed
- [ ] View internal notes field
- [ ] Edit booking button
- [ ] Cancel booking button
- [ ] Assign driver button (if not assigned)
- [ ] Send notification button (email/SMS)

**API Endpoint:** `GET /v1/bookings/:bookingId`

---

### A-004: Manually Create Booking

**As an** admin
**I want to** create a booking on behalf of a customer
**So that** I can handle phone/email bookings

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Same form as customer booking flow
- [ ] Additional payment method option: "Pay by cash" or "Account customer"
- [ ] If cash: booking created as "confirmed" without payment
- [ ] If account: select business customer from dropdown
- [ ] Bypass email/SMS confirmation requirement
- [ ] Add internal notes field
- [ ] Booking created with status "confirmed"
- [ ] Option to immediately assign driver

**API Endpoint:** `POST /v1/bookings` (with admin flag)

---

### A-005: Assign Driver to Booking

**As a** dispatcher
**I want to** manually assign a driver to a booking
**So that** the job is fulfilled

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] List of available drivers shown with: name, current location, rating, vehicle details
- [ ] Driver availability status: Available, On Job, Offline
- [ ] Distance from pickup location shown for each driver
- [ ] Select driver from list
- [ ] Select vehicle from driver's assigned vehicles
- [ ] Add internal dispatch notes (optional)
- [ ] Notify driver checkbox (default: checked)
- [ ] Booking status changes to "assigned"
- [ ] Driver receives SMS/app notification with job details
- [ ] Customer receives notification with driver details

**API Endpoint:** `POST /v1/dispatch/assign`

**Driver Notification (SMS):**
```
New Job: NOTS-12345. Pickup: Bournemouth Station at 14:30. Dropoff: Poole Harbour. £12.28. Accept: nots.co.uk/driver/job/abc123
```

---

### A-006: View Driver List

**As an** admin
**I want to** see a list of all drivers
**So that** I can manage the driver pool

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Drivers table with columns: Name, Status, Vehicle, Rating, Total Trips, Compliance Status
- [ ] Filter by status: Active, Inactive, Suspended
- [ ] Filter by availability: Available, On Job, Offline
- [ ] Search by name or phone
- [ ] Compliance status indicator: Green (all docs valid), Yellow (expiring soon), Red (expired)
- [ ] Click row to view driver details
- [ ] Add driver button
- [ ] Export list button (Phase 2)

**API Endpoint:** `GET /v1/drivers`

---

### A-007: View Driver Details

**As an** admin
**I want to** view full driver profile and compliance documents
**So that** I can ensure regulatory compliance

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] View driver personal details: name, email, phone, address
- [ ] View assigned vehicle
- [ ] View compliance documents: DBS, Insurance, MOT, PHV License, Driving License
- [ ] Each document shows: status, expiry date, upload date, file preview link
- [ ] Document status: Valid (green), Expiring Soon (yellow), Expired (red), Pending Review (gray)
- [ ] Upload new document button for each type
- [ ] View driver performance: rating, total trips, completion rate, acceptance rate
- [ ] View recent trips list
- [ ] View complaints history
- [ ] Edit driver button
- [ ] Suspend/activate driver button

**API Endpoint:** `GET /v1/drivers/:driverId`

---

### A-008: Upload Driver Compliance Document

**As an** admin
**I want to** upload driver compliance documents
**So that** drivers meet legal requirements

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Select document type from dropdown (DBS, Insurance, MOT, PHV License, Driving License)
- [ ] File upload field (accept: PDF, JPG, PNG, max 10MB)
- [ ] Expiry date picker
- [ ] Document notes field (optional)
- [ ] File uploads to S3 via presigned URL
- [ ] Document stored in DynamoDB with reference to S3
- [ ] Document status set to "valid" after upload
- [ ] Driver notified via SMS/email about document update
- [ ] Old document archived (not deleted)

**API Endpoint:** `POST /v1/compliance/documents`

---

### A-009: Manage Pricing

**As an** admin
**I want to** configure pricing rules
**So that** quotes are calculated correctly

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Pricing configuration page
- [ ] Set base fare (£)
- [ ] Set per-mile rate (£/mile)
- [ ] Set per-minute rate (£/minute)
- [ ] Set minimum fare (£)
- [ ] Configure vehicle type multipliers: Standard (1.0x), Executive (1.5x), Minibus (2.0x)
- [ ] Save pricing button
- [ ] Confirmation message: "Pricing updated successfully"
- [ ] All new quotes use updated pricing immediately
- [ ] Existing quotes unaffected (locked at creation time)
- [ ] Audit log of pricing changes (who changed what when)

**API Endpoint:** `PATCH /v1/settings/pricing`

**Pricing Formula:**
```
Total = MAX(baseFare + (distance * perMileRate) + (duration * perMinuteRate), minimumFare) * vehicleTypeMultiplier
```

---

## 4. Driver Stories

### DR-001: View Assigned Jobs

**As a** driver
**I want to** see my assigned jobs
**So that** I know my upcoming schedule

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Driver portal shows list of assigned jobs
- [ ] Jobs sorted by pickup time (soonest first)
- [ ] Each job shows: booking reference, pickup time, pickup location, dropoff location, customer name, customer phone, price
- [ ] Job status badge: Upcoming, In Progress, Completed
- [ ] Tap job to view full details
- [ ] "Start Job" button for next upcoming job
- [ ] Navigation button (opens Google Maps)
- [ ] Contact customer button (phone call)

**API Endpoint:** `GET /v1/drivers/:driverId/jobs`

---

### DR-002: Update Job Status

**As a** driver
**I want to** update job status as I progress
**So that** customers and dispatchers know my location and ETA

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] Status workflow: Assigned → En Route → Arrived → Passenger Onboard → Completed
- [ ] "En Route" button triggers navigation to pickup
- [ ] "Arrived" button available when within 100m of pickup location
- [ ] "Passenger Onboard" button available after "Arrived"
- [ ] "Complete Job" button available after "Passenger Onboard"
- [ ] Customer receives SMS notification at each status change
- [ ] Dispatcher sees real-time status updates in dashboard
- [ ] Cannot skip status steps (validation enforced)

**API Endpoint:** `PATCH /v1/bookings/:bookingId`

**Customer Notifications:**
- En Route: "Your driver Jane is on the way. ETA 5 mins."
- Arrived: "Your driver Jane has arrived at Bournemouth Station."
- Completed: "Journey complete. Please rate your experience: [link]"

---

### DR-003: Navigate to Pickup/Dropoff

**As a** driver
**I want to** open navigation to pickup/dropoff locations
**So that** I can find the most efficient route

**Priority:** Must Have

**Acceptance Criteria:**
- [ ] "Navigate" button on job details
- [ ] Opens Google Maps app (or web) with destination pre-filled
- [ ] If en route to pickup: navigates to pickup location
- [ ] If passenger onboard: navigates to dropoff location
- [ ] Fallback to browser if Google Maps app not installed

**Implementation:**
```
Open URL: https://www.google.com/maps/dir/?api=1&destination={lat},{lng}
```

---

### DR-004: View Compliance Status

**As a** driver
**I want to** see my compliance document status
**So that** I can renew documents before they expire

**Priority:** Should Have

**Acceptance Criteria:**
- [ ] Compliance section in driver profile
- [ ] List of all required documents with expiry dates
- [ ] Status badges: Valid, Expiring Soon (< 30 days), Expired
- [ ] Upload new document button for each type
- [ ] Push notification when document expires in 7 days
- [ ] Email reminder 30 days before expiry

**API Endpoint:** `GET /v1/drivers/:driverId`

---

## 5. Non-Functional Requirements

### NFR-001: Performance

**Acceptance Criteria:**
- [ ] Website loads in under 2 seconds (Lighthouse score > 90)
- [ ] API response time p95 < 500ms
- [ ] Quote calculation < 3 seconds
- [ ] Payment processing < 5 seconds
- [ ] Database queries < 100ms

---

### NFR-002: Security

**Acceptance Criteria:**
- [ ] All API endpoints use HTTPS
- [ ] JWT tokens expire after 1 hour
- [ ] Refresh tokens expire after 30 days
- [ ] Password requirements: min 8 chars, 1 uppercase, 1 number, 1 special char
- [ ] Rate limiting: 100 requests/hour for public endpoints, 1000/hour for authenticated
- [ ] API keys stored in AWS Secrets Manager
- [ ] No sensitive data in CloudWatch logs

---

### NFR-003: Reliability

**Acceptance Criteria:**
- [ ] 99.9% uptime SLA
- [ ] Automatic retries for failed API calls (3 retries with exponential backoff)
- [ ] Graceful degradation if Google Maps API fails
- [ ] Dead letter queue for failed notifications
- [ ] CloudWatch alarms for critical errors

---

### NFR-004: GDPR Compliance

**Acceptance Criteria:**
- [ ] Privacy policy published on website
- [ ] Cookie consent banner
- [ ] Customer data deletion request workflow (Phase 2)
- [ ] Data retention policy: bookings deleted after 7 years
- [ ] Encryption at rest for all PII in DynamoDB
- [ ] Audit logs for all admin actions

---

## 6. Definition of Done

A user story is considered "Done" when:

- [ ] Code written and passes linting/formatting checks
- [ ] Unit tests written (>80% coverage for critical paths)
- [ ] Integration tests pass
- [ ] API endpoints tested in Postman/REST client
- [ ] UI tested manually on desktop and mobile
- [ ] Acceptance criteria verified
- [ ] Code reviewed and approved
- [ ] Deployed to staging environment
- [ ] UAT (User Acceptance Testing) completed
- [ ] Documentation updated (API spec, README, etc.)
- [ ] No critical bugs

---

## 7. Testing Scenarios

### Test Scenario 1: End-to-End Booking Flow (Happy Path)

1. Customer visits website
2. Enters pickup: "Bournemouth Railway Station" and dropoff: "Poole Harbour"
3. Selects pickup time: Tomorrow at 14:30
4. Selects 2 passengers, standard vehicle
5. Clicks "Get Quote"
6. Quote displays: 5.3 miles, 20 mins, £12.28
7. Clicks "Book Now"
8. Fills in customer details
9. Clicks "Proceed to Payment"
10. Enters card details (Stripe test card: 4242 4242 4242 4242)
11. Payment succeeds
12. Confirmation page shown with booking reference NOTS-12345
13. Confirmation email received
14. SMS received
15. Booking appears in admin dashboard as "Confirmed"

**Expected Result:** All steps complete without errors

---

### Test Scenario 2: Admin Assigns Driver

1. Admin logs into dashboard
2. Views booking NOTS-12345 (status: Confirmed)
3. Clicks "Assign Driver"
4. Selects driver "Jane Smith" from available list
5. Clicks "Assign"
6. Booking status changes to "Assigned"
7. Driver receives SMS notification
8. Customer receives SMS with driver details

**Expected Result:** Driver and customer notified, booking updated

---

### Test Scenario 3: Driver Completes Job

1. Driver logs into portal
2. Sees job NOTS-12345 in "Upcoming" list
3. Clicks "Start Job"
4. Clicks "En Route" (customer receives SMS)
5. Drives to pickup location
6. Clicks "Arrived" (customer receives SMS)
7. Customer enters vehicle
8. Clicks "Passenger Onboard"
9. Drives to destination
10. Clicks "Complete Job"
11. Job status changes to "Completed"
12. Customer receives SMS with rating link

**Expected Result:** Job completed successfully, customer can rate driver

---

## 8. Out of Scope (Phase 2)

These features are explicitly NOT in MVP:

- [ ] Real-time driver tracking (live map)
- [ ] Auto-dispatch algorithm
- [ ] In-app messaging between customer and driver
- [ ] Driver mobile app (native iOS/Android)
- [ ] Customer account creation and login
- [ ] Saved payment methods
- [ ] Promotional codes and discounts
- [ ] Recurring bookings
- [ ] Multi-stop journeys
- [ ] Business account management
- [ ] Invoicing for business customers
- [ ] Advanced analytics and reporting
- [ ] WhatsApp integration
- [ ] Driver ratings and reviews (basic rating only in MVP)
- [ ] Lost property tracking
- [ ] Incident reporting

---

## References

- [InitialPRD.md](InitialPRD.md)
- [TechnicalArchitecture.md](TechnicalArchitecture.md)
- [APISpecification.md](APISpecification.md)

---

**Document Owner:** Product Manager / Scrum Master
**Review Cycle:** Sprint planning (every 2 weeks)
