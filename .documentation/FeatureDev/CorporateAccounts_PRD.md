# Corporate Accounts - Product Requirements Document

**Status**: Requirements Defined
**Priority**: Medium (DTC requirement)
**Last Updated**: December 9, 2025

---

## Context

**READ FIRST**: [PLATFORM_ARCHITECTURE.md](../.documentation/PLATFORM_ARCHITECTURE.md)

This document uses the following terminology:
- **Durdle Platform**: Multi-tenant SaaS backend
- **Tenant**: A transfer company using Durdle (e.g., DTC)
- **Tenant Admin**: DTC staff configuring their Durdle instance
- **Corporate Account**: A business customer of DTC (e.g., ACME Corp)
- **Corporate Portal**: Login area at `dorsettransfercompany.co.uk/corporate`

---

## Overview

Corporate accounts enable **DTC's business customers** to book transfers on account, receive consolidated invoices, and manage employee travel through a centralized account. This adds B2B capability to DTC's existing B2C offering.

---

## Business Value

### For DTC (The Tenant)
- **Recurring Revenue**: Corporate contracts provide predictable monthly income
- **Higher Volume**: Business accounts typically book 10-50x more than individual consumers
- **Reduced Payment Friction**: No card processing per trip (Phase 2: invoiced monthly)
- **Client Retention**: Contract relationships are stickier than transactional
- **Market Expansion**: Serve hotels, travel agents, corporate travel managers

### For Corporate Customers (DTC's B2B Clients)
- **Convenience**: Book without payment details each time (Phase 2)
- **Cost Control**: Approved bookers, spending visibility, reporting
- **Simplified Accounting**: Single monthly invoice vs. multiple receipts (Phase 2)
- **Negotiated Rates**: Volume discounts for committed spend

---

## User Personas

### 1. Tenant Admin (DTC Staff)
- **Portal**: `durdle.flowency.build/admin`
- **Role**: Configures DTC's Durdle instance
- **Can**:
  - Create corporate account records
  - Send magic link to corporate main contact
  - View all corporate accounts, bookings, revenue
  - Set pricing tiers and discounts per corporate account
  - Manage DTC's vehicles, pricing, fixed routes
- **Cannot**: Access corporate portal (separate authentication)

### 2. Corporate Admin (Company Travel Manager)
- **Portal**: `dorsettransfercompany.co.uk/corporate`
- **Role**: Manages their company's corporate account
- **Can**:
  - Receive magic link from DTC to set up account
  - Manage company details and users
  - Make bookings and pay via Stripe
  - Approve/reject requests from Requestors (if any exist)
  - View all company bookings and spending
- **Cannot**: Change pricing (set by Tenant Admin)

### 3. Corporate Booker (PA/Office Manager)
- **Portal**: `dorsettransfercompany.co.uk/corporate`
- **Role**: Books transfers for their company
- **Can**:
  - Make bookings and pay via Stripe
  - View company bookings
  - Approve/reject requests (if designated)
- **Cannot**: Add/remove users, change company details

### 4. Corporate Requestor (Employee - Optional)
- **Portal**: `dorsettransfercompany.co.uk/corporate`
- **Role**: Requests bookings (needs approval)
- **Can**:
  - Create quotes and submit booking requests
  - View only their own requests and bookings
- **Cannot**: Pay - requests go to Admin/Booker for approval
- **Note**: Many small corporate accounts will have no Requestors

### 5. Passenger
- The person being transported
- May or may not be the booker
- Receives booking confirmation if email provided

---

## User Journeys

### Journey 1: Simple Corporate (One-Person Account)

**Scenario**: Small business, one person handles all travel booking (e.g., PA, office manager, or the traveller themselves).

**What's different from consumer:**
- Logs in via `/corporate` portal
- Corporate discount applied automatically
- Bookings tracked under corporate account
- Optional: Passenger name field (if booking for someone else)

**UX Impact**: Nearly identical to consumer flow. Just login, quote, book, pay. No approval workflow, no team management needed.

```
Login → Get Quote → Enter Passenger (if different) → Select Vehicle → Pay → Booking Confirmed
```

**This is the Admin/Booker doing everything.** No Requestors involved.

### Journey 2: Requestor Submits, Admin/Booker Approves

**Scenario**: Larger company with multiple employees who need travel, but one person controls the budget/payments.

**Flow:**
1. Requestor logs in, creates quote, enters passenger details
2. Clicks "Submit Request" (no payment)
3. Admin/Booker receives notification of pending request
4. Admin/Booker reviews, approves/rejects
5. If approved, Admin/Booker completes payment
6. Booking confirmed, all parties notified

**This requires at least 2 users**: one Admin/Booker + one or more Requestors.

---

## Authentication

### Magic Link as Primary Auth

**Recommendation**: Magic link primary, optional password for convenience.

**Flow:**
1. User clicks "Log in" on corporate portal
2. Enters corporate email address
3. Receives magic link (expires in 15 minutes)
4. Clicks link → authenticated and logged in
5. First-time prompt: "Want to set a password for faster access?" (optional)
6. Users who set password can choose either method going forward

**Benefits:**
- Zero password fatigue
- No forgot-password flow needed (just request new magic link)
- Secure if email is secure
- Simpler onboarding

**Technical:**
- Magic link tokens stored in DynamoDB with 15-minute TTL
- Token invalidated after single use
- Rate limiting on magic link requests (max 3 per hour per email)

---

## Account Setup Flow

### Step 1: Tenant Admin Creates Corporate Account

In Tenant Admin portal (`durdle.flowency.build/admin/corporate`):

1. **Company Lookup** (Companies House API - free)
   - Admin types company name
   - Search Companies House, show matches
   - Admin selects correct company
   - Auto-fills: Company name, Company number, Registered address

2. **Manual Entry**
   - Billing address (if different from registered)
   - Main contact: Name, Email, Phone
   - Pricing tier / discount percentage
   - Notes

3. **Save** → Corporate account created with status "Pending Setup"

### Step 2: Corporate Admin Onboarding

1. Tenant Admin clicks "Send Invite" → magic link email sent to main contact
2. Main contact clicks link → lands on corporate portal (`dorsettransfercompany.co.uk/corporate/verify`)
3. Completes setup:
   - Confirm/edit company details
   - Set notification preferences
   - Optionally set password
4. Account status → "Active"

---

## Corporate Portal

### Access Point

**Separate route**: `dorsettransfercompany.co.uk/corporate`

**Why separate route:**
- Corporate pricing applied automatically
- Business rules enforced (allowed destinations, times, vehicle types - future)
- UI adapts based on role (Admin/Booker vs Requestor)
- Clear separation without duplicate codebase
- Foundation for per-corporate customization

### Corporate Dashboard

**For Admin/Booker:**
| Section | Description |
|---------|-------------|
| Pending Requests | Requests awaiting approval (with Approve/Reject actions) |
| Upcoming Bookings | Confirmed bookings in the future |
| Past Bookings | Booking history with search/filter |
| Team Members | Users in the account (add/remove) |
| Spending Summary | Total spend MTD/YTD, breakdown by user |
| Company Details | View/edit company info, billing address |
| Notification Settings | Configure email/SMS preferences |

**For Requestor:**
| Section | Description |
|---------|-------------|
| My Requests | Pending, approved, rejected requests |
| My Bookings | Bookings they requested (approved and completed) |
| Notification Settings | Personal notification preferences |

---

## Booking Flow

### Admin/Booker Flow (Simple - most common)

This is the default corporate experience. Identical to consumer except:
- Corporate discount applied
- Bookings tracked under corporate account
- Optional passenger name field

1. Navigate to `/corporate/quote`
2. Enter journey details (same as consumer flow)
3. **New field**: Passenger name (optional - if booking for someone else)
4. Select vehicle, see corporate pricing applied
5. Confirm booking → Stripe payment (booker's card)
6. Booking confirmed → notifications sent

**Note**: If the Admin/Booker is travelling themselves, passenger name can be left blank or auto-filled from their profile.

### Requestor Flow (Request for approval)

Only relevant when the corporate account has Requestor users added.

1. Navigate to `/corporate/quote`
2. Enter journey details
3. **New field**: Passenger name (required - usually themselves or someone else)
4. Select vehicle, see corporate pricing
5. Click "Submit Request" (not "Book & Pay")
6. See "Request Submitted" confirmation screen
7. Request appears in Admin/Booker dashboard
8. Wait for approval notification

### Approval Flow

Only triggered when Requestors submit requests.

1. Admin/Booker sees pending request in dashboard
2. Reviews journey details and price
3. Clicks "Approve" or "Reject"
4. **If Approved**: Proceeds to Stripe payment (Admin/Booker's card)
5. **If Rejected**: Request marked as rejected, Requestor notified
6. Requestor cannot edit or resubmit - must create new quote if rejected

---

## Roles & Permissions

### v1 Role Matrix

| Permission | Tenant Admin | Corporate Admin | Corporate Booker | Corporate Requestor |
|------------|--------------|-----------------|------------------|---------------------|
| Create corporate accounts | Yes | No | No | No |
| Set corporate pricing | Yes | No | No | No |
| Create quotes | N/A | Yes | Yes | Yes |
| Book & pay | N/A | Yes | Yes | No |
| Submit requests | N/A | N/A (books directly) | N/A (books directly) | Yes |
| Approve/reject requests | N/A | Yes | Yes (if designated) | No |
| View all corp bookings | Yes (all corps) | Yes (own corp) | Yes (own corp) | Own only |
| View pending requests | Yes (all corps) | Yes (own corp) | Yes (own corp) | Own only |
| Add/remove users | Yes | Yes | No | No |
| Edit company details | Yes | Yes | No | No |
| View spending reports | Yes (all corps) | Yes (own corp) | No | No |
| Manage notifications | N/A | Yes (all) | Own only | Own only |

---

## User Management

### Adding Users

1. Admin/Booker clicks "Add Team Member"
2. Enters: Email, Name, Role (Admin/Booker or Requestor)
3. System sends magic link to new user
4. New user clicks link → creates account
5. User appears in Team Members list

### Removing Users

1. Admin/Booker clicks "Remove" on user row
2. Confirmation dialog
3. User removed → can no longer access corporate portal
4. Historical bookings/requests preserved for audit

---

## Notifications

### Configurable Preferences

Users can choose notification method per event type:
- **Email**: Default, always available
- **SMS**: Optional (requires phone number)
- **None**: No notification (check dashboard instead)

### Notification Types

| Event | Recipients | Default |
|-------|------------|---------|
| Magic link | User requesting | Email |
| Request submitted | All Admin/Bookers | Email |
| Request approved | Requestor | Email |
| Request rejected | Requestor | Email |
| Booking confirmed | Booker + Passenger (if different) | Email |

### Future Notifications (Phase 2)
- Monthly spending summary
- Invoice issued
- Payment reminder

---

## Pricing

### Pricing Model (Flexible)

Design to support multiple models:

| Model | Description | Implementation |
|-------|-------------|----------------|
| Standard | No discount (public rates) | `discountPercent: 0` |
| Flat discount | Same % off for all corporates | `discountPercent: 10` |
| Per-account discount | Custom % per corporate | `discountPercent: 15` on account |
| Custom pricing | Completely custom rates | Future: per-account rate overrides |

### v1 Implementation

- `discountPercent` field on corporate account (0-100)
- Applied automatically when corporate user gets quote
- Shown on quote: "Corporate Rate Applied" with discount amount
- Tenant Admin sets discount when creating account

---

## Payment

### Phase 1 (Current)

- **Payment at booking time** via Stripe
- Booker enters card details (personal or corporate card)
- Standard Stripe checkout flow
- Receipt emailed to booker

### Phase 2 (Future - larger corporates)

- **Book on account** (no payment at booking)
- Monthly invoice generated
- Payment via bank transfer / BACS
- Invoice PDF with all bookings itemized
- Payment tracking and aging reports

---

## Data Model

### Corporate Account
```
PK: TENANT#001#CORP#corp-001
SK: METADATA
{
  tenantId: "TENANT#001",
  corpAccountId: "corp-001",
  companyName: "ACME Corporation Ltd",
  companyNumber: "12345678",  // Companies House
  status: "active",  // pending_setup | active | suspended | closed
  registeredAddress: {
    line1: "10 Downing Street",
    city: "London",
    postcode: "SW1A 2AA",
    country: "UK"
  },
  billingAddress: {
    line1: "123 Business Park",
    city: "Bournemouth",
    postcode: "BH1 1AA",
    country: "UK"
  },
  primaryContact: {
    name: "Jane Smith",
    email: "jane@acme.com",
    phone: "+44 7700 900123"
  },
  discountPercent: 10,  // Corporate discount
  pricingTier: "silver",  // For display/categorization
  paymentTerms: 30,  // Future: Net 30 days for invoicing
  notes: "Key account - CEO is golf buddy",
  createdAt: "2025-12-09T...",
  updatedAt: "2025-12-09T...",
  createdBy: "dtc-admin-user-id"
}
```

### Corporate User
```
PK: TENANT#001#CORP#corp-001
SK: USER#user-001
{
  tenantId: "TENANT#001",
  corpAccountId: "corp-001",
  oderId: "user-001",
  email: "jane@acme.com",
  name: "Jane Smith",
  phone: "+44 7700 900123",
  role: "admin",  // admin | requestor
  status: "active",  // invited | active | disabled
  passwordHash: null,  // Optional - if user set password
  notificationPrefs: {
    requestSubmitted: "email",
    requestApproved: "email",
    bookingConfirmed: "email"
  },
  invitedAt: "2025-12-09T...",
  activatedAt: "2025-12-09T...",
  lastLoginAt: "2025-12-09T..."
}
```

### Magic Link Token
```
PK: TENANT#001#MAGIC#token-uuid
SK: METADATA
{
  tenantId: "TENANT#001",
  token: "uuid-v4-token",
  email: "jane@acme.com",
  corpAccountId: "corp-001",
  purpose: "login",  // login | invite | password_reset
  expiresAt: "2025-12-09T12:15:00Z",  // 15 minutes
  usedAt: null,
  createdAt: "2025-12-09T12:00:00Z"
}
TTL: expiresAt (DynamoDB auto-delete)
```

### Booking Request
```
PK: TENANT#001#CORP#corp-001
SK: REQUEST#req-001
{
  tenantId: "TENANT#001",
  corpAccountId: "corp-001",
  requestId: "req-001",
  status: "pending",  // pending | approved | rejected
  requestedBy: "user-002",  // Requestor user ID
  requestedAt: "2025-12-09T...",

  // Quote details (snapshot at request time)
  quoteSnapshot: {
    pickupLocation: {...},
    dropoffLocation: {...},
    pickupTime: "2025-12-15T09:00:00Z",
    vehicleType: "executive",
    passengers: 2,
    passengerName: "John Director",
    price: 12500,  // pence
    discountApplied: 1250,
    finalPrice: 11250
  },

  // Approval details (filled when actioned)
  actionedBy: null,
  actionedAt: null,
  bookingId: null,  // Linked if approved and booked

  createdAt: "2025-12-09T..."
}
```

### Corporate Booking (Extension to existing booking)
```
// Existing booking record with corporate extensions
PK: TENANT#001#BOOKING#BK-12345
SK: METADATA
{
  // ... existing booking fields ...

  // Corporate extensions
  corpAccountId: "corp-001",
  bookerId: "user-001",  // Who booked/paid
  requestId: "req-001",  // If originated from request
  passengerName: "John Director",
  corporateDiscount: 1250,  // pence saved
}
```

### GSIs

**GSI: CorpUserLookup**
```
PK: TENANT#001#CORP_EMAIL#jane@acme.com
SK: CORP#corp-001
```
Use: Find corporate account by user email at login

**GSI: PendingRequests**
```
PK: TENANT#001#CORP#corp-001#REQUEST_STATUS#pending
SK: REQUESTED#2025-12-09T...#req-001
```
Use: List pending requests for dashboard

---

## API Endpoints

### Tenant Admin - Corporate Management
```
POST   /admin/corporate                     - Create corporate account (tenant-filtered)
GET    /admin/corporate                     - List all corporate accounts (tenant-filtered)
GET    /admin/corporate/{corpId}            - Get account details (tenant-filtered)
PUT    /admin/corporate/{corpId}            - Update account (tenant-filtered)
DELETE /admin/corporate/{corpId}            - Deactivate account (tenant-filtered)
POST   /admin/corporate/{corpId}/invite     - Send invite to main contact
GET    /admin/corporate/{corpId}/bookings   - List bookings for account (tenant-filtered)
GET    /admin/corporate/{corpId}/users      - List users in account (tenant-filtered)
```

### Tenant Admin - Reporting
```
GET    /admin/reports/corporate-revenue     - Revenue by corporate account (tenant-filtered)
GET    /admin/reports/corporate-vs-consumer - Split analysis (tenant-filtered)
```

**Note**: All `/admin/*` endpoints are tenant-aware. Tenant context extracted from JWT token.

### Corporate Portal - Auth
```
POST   /corporate/auth/magic-link           - Request magic link
POST   /corporate/auth/verify               - Verify magic link token
POST   /corporate/auth/login                - Password login (if set)
POST   /corporate/auth/set-password         - Set optional password
POST   /corporate/auth/logout               - Logout
```

### Corporate Portal - Dashboard
```
GET    /corporate/me                        - Current user + account info
GET    /corporate/dashboard                 - Dashboard data (role-appropriate)
PUT    /corporate/me/notifications          - Update notification prefs
```

### Corporate Portal - Users (Admin only)
```
GET    /corporate/users                     - List team members
POST   /corporate/users                     - Add user (sends invite)
DELETE /corporate/users/{userId}            - Remove user
```

### Corporate Portal - Requests
```
GET    /corporate/requests                  - List requests (filtered by role)
POST   /corporate/requests                  - Create request (Requestor)
GET    /corporate/requests/{reqId}          - Get request details
POST   /corporate/requests/{reqId}/approve  - Approve (Admin only)
POST   /corporate/requests/{reqId}/reject   - Reject (Admin only)
```

### Corporate Portal - Bookings
```
GET    /corporate/bookings                  - List bookings (filtered by role + corp account)
POST   /corporate/bookings                  - Create booking (Admin/Booker only)
GET    /corporate/bookings/{bookingId}      - Get booking details (corp-filtered)
```

**Note**: All `/corporate/*` endpoints are corporate-account-aware. Corp account context extracted from JWT token.

### Corporate Portal - Company (Admin only)
```
GET    /corporate/company                   - Get company details
PUT    /corporate/company                   - Update company details
```

### Public - Companies House Lookup
```
GET    /v1/companies/search?q={query}       - Search Companies House
```

---

## Frontend Routes

### Corporate Portal (`/corporate/*`)

```
/corporate                    - Redirect to /corporate/login or /corporate/dashboard
/corporate/login              - Magic link request form
/corporate/verify?token=...   - Magic link verification
/corporate/dashboard          - Main dashboard (role-appropriate view)
/corporate/quote              - Quote journey (corporate pricing applied)
/corporate/requests           - View requests (Requestor: own, Admin: all pending)
/corporate/requests/{id}      - Request detail + approve/reject
/corporate/bookings           - Booking history
/corporate/bookings/{id}      - Booking detail
/corporate/team               - User management (Admin only)
/corporate/company            - Company details (Admin only)
/corporate/settings           - Notification preferences
```

---

## Tenant Admin UI

### Corporate Accounts Section

**List View** (`durdle.flowency.build/admin/corporate`)
- Table: Company Name | Status | Users | Bookings (30d) | Discount | Actions
- Filters: Status, Has pending requests
- Quick actions: View, Edit, Send Invite
- **Tenant-filtered**: Only shows corporate accounts for logged-in tenant

**Account Detail** (`durdle.flowency.build/admin/corporate/{id}`)
- Company info card (editable)
- Status badge with change action
- Contact details
- Pricing/discount settings
- Users table
- Recent bookings
- Pending requests

**Create Account** (`durdle.flowency.build/admin/corporate/new`)
- Companies House search
- Manual entry form
- Discount/tier selection
- Notes field

### Reporting

**Corporate Dashboard** (`durdle.flowency.build/admin/reports/corporate`)
- Total corporate revenue (MTD/YTD) - tenant-filtered
- Revenue by account (top 10) - tenant-filtered
- Corporate vs Consumer split pie chart - tenant-filtered
- Bookings trend line - tenant-filtered

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Corporate account data model (DynamoDB)
- [ ] Companies House API integration
- [ ] DTC admin CRUD for corporate accounts
- [ ] Magic link authentication system
- [ ] Corporate user data model

### Phase 2: Corporate Portal - Auth & Dashboard
- [ ] Corporate login page (magic link)
- [ ] Optional password setup
- [ ] Dashboard layout (role-aware)
- [ ] View bookings list
- [ ] Notification preferences

### Phase 3: User Management
- [ ] Add/remove users (Admin)
- [ ] User invite flow (magic link)
- [ ] Role assignment

### Phase 4: Booking Flow
- [ ] Corporate quote route with pricing
- [ ] Passenger name field
- [ ] Admin/Booker direct booking
- [ ] Requestor submit request flow
- [ ] "Request Submitted" confirmation

### Phase 5: Approval Workflow
- [ ] Pending requests dashboard widget
- [ ] Request detail view
- [ ] Approve action → payment flow
- [ ] Reject action
- [ ] Notifications (email)

### Phase 6: DTC Admin Enhancements
- [ ] Corporate accounts list in admin
- [ ] Account detail view
- [ ] Bookings by corporate
- [ ] Basic revenue reporting

---

## Edge Cases

1. **User email already exists as consumer**: Corporate account is separate - same email can have both
2. **Corporate Admin removes themselves**: Prevent - must have at least one Admin per corporate account
3. **All Corporate Admins removed**: Tenant Admin can re-invite
4. **Magic link expired**: Clear error, easy to request new one
5. **Request approved but payment fails**: Request stays approved, prompt to retry payment
6. **Corporate account suspended**: Users can't login, Tenant Admin must reactivate
7. **Requestor tries to access /corporate/team**: 403 - role-based route protection
8. **Tenant Admin tries to access /corporate portal**: 403 - separate authentication systems
9. **Corporate user tries to access /admin portal**: 403 - separate authentication systems

---

## Dependencies

- **Multi-tenant foundation** (tenantId in all records) - Phase 0.5 ✅ Complete
- **Stripe integration** (existing) ✅ Complete
- **SES email service** (existing, need magic link templates) ⚠️ Need templates
- **Companies House API** (free, rate limited) ⚠️ Need Lambda function

---

## Security Considerations

1. **Magic link tokens**: Single-use, 15-minute expiry, rate limited
2. **Role enforcement**: Backend validates role on every request
3. **Data isolation**: 
   - Tenant Admin sees only their tenant's data (via JWT tenantId)
   - Corporate users see only their corporate account's data (via JWT corpAccountId)
4. **Tenant Admin access**: Can view all corporate accounts for their tenant (logged for audit)
5. **Password storage**: bcrypt hashed if user sets password
6. **Cross-tenant protection**: All queries filter by tenantId from JWT

---

## Multi-Tenant Considerations

### Current State (DTC Only)
- Single tenant: `TENANT#001` (DTC)
- Corporate accounts belong to DTC
- All data prefixed with `TENANT#001`

### Future State (Multiple Tenants)
- Tenant #2 (MTC): `TENANT#002`
- MTC will have their own corporate accounts
- Same backend, separate frontends
- Tenant context from JWT token

### Data Isolation
```javascript
// DTC Corporate Account
PK: "TENANT#001#CORP#corp-001"
SK: "METADATA"
{ tenantId: "TENANT#001", companyName: "ACME Corp" }

// MTC Corporate Account (future)
PK: "TENANT#002#CORP#corp-001"
SK: "METADATA"
{ tenantId: "TENANT#002", companyName: "Beta Ltd" }
```

### Authentication Isolation
- Tenant Admin JWT includes `tenantId` only
- Corporate User JWT includes `tenantId` + `corpAccountId`
- Backend filters all queries by tenant context
- No cross-tenant access possible

---

## Open Items

1. **Corporate pricing model**: Design supports multiple models, decision deferred
2. **Business rules per corporate**: Future - restrict destinations, times, vehicles
3. **Phase 2 invoicing**: Separate PRD when needed
4. **SMS notifications**: Need to set up SMS provider (Twilio/SNS)
5. **Magic link email templates**: Need SES template design
6. **Companies House Lambda**: Need to create lookup function

---

**Document Owner**: CTO
**Last Q&A Session**: December 9, 2025
**Architecture Clarified**: December 9, 2025 (see PLATFORM_ARCHITECTURE.md)
**Next Step**: Technical design document for implementation

