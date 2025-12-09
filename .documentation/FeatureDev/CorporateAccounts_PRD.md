# Corporate Accounts - Product Requirements Document

**Status**: Requirements Defined
**Priority**: Medium (Client #1 requirement)
**Last Updated**: December 9, 2025

---

## Overview

Corporate accounts enable businesses to book transfers on credit, receive consolidated invoices, and manage employee travel through a centralized account. This converts Durdle from a consumer-only platform to a B2B service offering.

---

## Business Value

### For Transfer Companies (DTC, future Durdle clients)
- **Recurring Revenue**: Corporate contracts provide predictable monthly income
- **Higher Volume**: Business accounts typically book 10-50x more than individual consumers
- **Reduced Payment Friction**: No card processing per trip (Phase 2: invoiced monthly)
- **Client Retention**: Contract relationships are stickier than transactional

### For Corporate Customers
- **Convenience**: Book without payment details each time (Phase 2)
- **Cost Control**: Approved bookers, spending visibility, reporting
- **Simplified Accounting**: Single monthly invoice vs. multiple receipts (Phase 2)
- **Negotiated Rates**: Volume discounts for committed spend

---

## User Personas

### 1. DTC Admin (Dorset Transfer Company staff)
- Creates corporate account records in DTC admin dashboard
- Sends magic link to corporate main contact
- Views all corporate accounts, bookings, revenue
- Sets pricing tiers and discounts

### 2. Corporate Admin/Booker (Combined role for v1)
- Receives magic link from DTC to set up account
- Manages company details and users
- Makes bookings and pays via Stripe
- Approves/rejects requests from Requestors
- Views all company bookings and spending

### 3. Requestor
- Added to corporate account by Admin/Booker
- Can create quotes and submit booking requests
- Cannot pay - requests go to Admin/Booker for approval
- Views only their own requests and bookings

### 4. Passenger
- The person being transported
- May or may not be the booker
- Receives booking confirmation if email provided

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

### Step 1: DTC Admin Creates Corporate Account

In DTC admin dashboard (`durdle.flowency.build/admin/corporate`):

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

1. DTC admin clicks "Send Invite" → magic link email sent to main contact
2. Main contact clicks link → lands on corporate portal
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

### Admin/Booker Flow (Full booking)

1. Navigate to `/corporate/quote`
2. Enter journey details (same as consumer flow)
3. **New field**: Passenger name (if different from booker)
4. Select vehicle, see corporate pricing applied
5. Confirm booking → Stripe payment (booker's card)
6. Booking confirmed → notifications sent

### Requestor Flow (Request for approval)

1. Navigate to `/corporate/quote`
2. Enter journey details
3. **New field**: Passenger name (required - usually themselves or someone else)
4. Select vehicle, see corporate pricing
5. Click "Submit Request" (not "Book & Pay")
6. See "Request Submitted" confirmation screen
7. Request appears in Admin/Booker dashboard
8. Wait for approval notification

### Approval Flow

1. Admin/Booker sees pending request in dashboard
2. Reviews journey details and price
3. Clicks "Approve" or "Reject"
4. **If Approved**: Proceeds to Stripe payment (Admin/Booker's card)
5. **If Rejected**: Request marked as rejected, Requestor notified
6. Requestor cannot edit or resubmit - must create new quote if rejected

---

## Roles & Permissions

### v1 Role Matrix

| Permission | Admin/Booker | Requestor |
|------------|--------------|-----------|
| Create quotes | Yes | Yes |
| Book & pay | Yes | No |
| Submit requests | N/A (books directly) | Yes |
| Approve/reject requests | Yes | No |
| View all bookings | Yes | Own only |
| View pending requests | Yes | Own only |
| Add/remove users | Yes | No |
| Edit company details | Yes | No |
| View spending reports | Yes | No |
| Manage notifications | Yes (all) | Own only |

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
- DTC admin sets discount when creating account

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

### DTC Admin - Corporate Management
```
POST   /admin/corporate                     - Create corporate account
GET    /admin/corporate                     - List all corporate accounts
GET    /admin/corporate/{corpId}            - Get account details
PUT    /admin/corporate/{corpId}            - Update account
DELETE /admin/corporate/{corpId}            - Deactivate account
POST   /admin/corporate/{corpId}/invite     - Send invite to main contact
GET    /admin/corporate/{corpId}/bookings   - List bookings for account
GET    /admin/corporate/{corpId}/users      - List users in account
```

### DTC Admin - Reporting
```
GET    /admin/reports/corporate-revenue     - Revenue by corporate account
GET    /admin/reports/corporate-vs-consumer - Split analysis
```

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
GET    /corporate/bookings                  - List bookings (filtered by role)
POST   /corporate/bookings                  - Create booking (Admin only)
GET    /corporate/bookings/{bookingId}      - Get booking details
```

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

## DTC Admin UI

### Corporate Accounts Section

**List View** (`/admin/corporate`)
- Table: Company Name | Status | Users | Bookings (30d) | Discount | Actions
- Filters: Status, Has pending requests
- Quick actions: View, Edit, Send Invite

**Account Detail** (`/admin/corporate/{id}`)
- Company info card (editable)
- Status badge with change action
- Contact details
- Pricing/discount settings
- Users table
- Recent bookings
- Pending requests

**Create Account** (`/admin/corporate/new`)
- Companies House search
- Manual entry form
- Discount/tier selection
- Notes field

### Reporting

**Corporate Dashboard** (`/admin/reports/corporate`)
- Total corporate revenue (MTD/YTD)
- Revenue by account (top 10)
- Corporate vs Consumer split pie chart
- Bookings trend line

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
2. **Admin removes themselves**: Prevent - must have at least one Admin
3. **All Admins removed**: DTC admin can re-invite
4. **Magic link expired**: Clear error, easy to request new one
5. **Request approved but payment fails**: Request stays approved, prompt to retry payment
6. **Corporate account suspended**: Users can't login, DTC admin must reactivate
7. **Requestor tries to access /corporate/team**: 403 - role-based route protection

---

## Dependencies

- **Multi-tenant foundation** (tenantId in all records) - Phase 0.5
- **Stripe integration** (existing)
- **SES email service** (existing, need templates)
- **Companies House API** (free, rate limited)

---

## Security Considerations

1. **Magic link tokens**: Single-use, 15-minute expiry, rate limited
2. **Role enforcement**: Backend validates role on every request
3. **Data isolation**: Corporate users only see their company's data
4. **DTC admin access**: Can view but clearly logged for audit
5. **Password storage**: bcrypt hashed if user sets password

---

## Open Items

1. **Corporate pricing model**: Design supports multiple models, decision deferred
2. **Business rules per corporate**: Future - restrict destinations, times, vehicles
3. **Phase 2 invoicing**: Separate PRD when needed
4. **SMS notifications**: Need to set up SMS provider (Twilio/SNS)

---

**Document Owner**: CTO
**Last Q&A Session**: December 9, 2025
**Next Step**: Review and approve for implementation planning

