# Corporate Accounts - Product Requirements Document

**Status**: Requirements Gathering
**Priority**: Medium (Client #1 requirement)
**Last Updated**: December 9, 2025

---

## Overview

Corporate accounts enable businesses to book transfers on credit, receive consolidated invoices, and manage employee travel through a centralized account. This converts Durdle from a consumer-only platform to a B2B service offering.

---

## Business Value

### For Transfer Companies (Durdle Clients)
- **Recurring Revenue**: Corporate contracts provide predictable monthly income
- **Higher Volume**: Business accounts typically book 10-50x more than individual consumers
- **Reduced Payment Friction**: No card processing per trip (invoiced monthly)
- **Client Retention**: Contract relationships are stickier than transactional

### For Corporate Customers
- **Convenience**: Book without payment details each time
- **Cost Control**: Approved bookers, spending limits, reporting
- **Simplified Accounting**: Single monthly invoice vs. multiple receipts
- **Negotiated Rates**: Volume discounts for committed spend

---

## User Personas

### 1. Corporate Admin
- Sets up account, manages users, reviews invoices
- Typically: Office Manager, Travel Manager, Finance

### 2. Authorized Booker
- Makes bookings on behalf of the company
- May have spending limits or approval requirements
- Typically: PA, Executive Assistant, Employee

### 3. Passenger
- The person being transported
- May or may not be the booker

### 4. Transfer Company Admin (Durdle Client)
- Creates corporate accounts
- Sets pricing tiers
- Manages invoicing

---

## Core Features

### 1. Corporate Account Setup

**Account Creation** (by Transfer Company Admin)
```
Account Details:
- Company name
- Company registration number (optional)
- Billing address
- Primary contact (name, email, phone)
- Payment terms (e.g., Net 30)
- Credit limit (optional)
- Pricing tier (standard, discounted, custom)
```

**Account Status**
- Active: Can book freely
- On Hold: Outstanding balance, new bookings blocked
- Suspended: Account frozen
- Closed: Archived, no access

### 2. User Management

**Roles within Corporate Account**
| Role | Permissions |
|------|------------|
| Account Admin | Full access: add/remove users, view all bookings, receive invoices |
| Booker | Can book transfers, view own bookings |
| Viewer | Read-only access to bookings |

**User Invitation Flow**
1. Account Admin adds user email + role
2. System sends invite email with magic link
3. User creates password or links to existing account
4. User inherits corporate account permissions

**Spending Controls**
- Per-booking limit (e.g., max 100 per trip)
- Monthly limit per user
- Require approval above threshold
- Restrict vehicle types (e.g., no Executive class)

### 3. Booking Flow (Corporate)

**Identification**
- Option A: User logs in, corporate account auto-applied
- Option B: User enters "account code" during booking
- Option C: Subdomain per corporate (acme.dorsettransfers.com)

**Booking Fields (Additional)**
- Passenger name (if different from booker)
- Cost center / department code (optional)
- Project/matter reference (optional)
- Reason for travel (optional)

**Payment**
- No card required at booking
- Charge added to corporate account balance
- Confirmation shows "Billed to: ACME Corp"

### 4. Pricing & Discounts

**Pricing Tiers**
```
Standard:     0% discount (public rates)
Bronze:       5% discount
Silver:       10% discount
Gold:         15% discount
Custom:       Per-account negotiated rates
```

**Discount Application**
- Applied automatically at checkout
- Shown on quote: "Corporate Rate: -15%"
- Reflected in invoice line items

**Volume Commitments** (Optional)
- Minimum monthly spend for discount tier
- Review period (quarterly/annually)
- Automatic tier adjustment based on spend

### 5. Invoicing

**Invoice Generation**
- Frequency: Weekly / Fortnightly / Monthly
- Triggered: Automatic on schedule or manual
- Format: PDF + CSV data export

**Invoice Contents**
```
Invoice Header:
- Invoice number (sequential per tenant)
- Invoice date
- Due date
- Corporate account name/address
- Transfer company details

Line Items (per booking):
- Booking reference
- Date & time
- Route (pickup to dropoff)
- Vehicle type
- Booker name
- Passenger name
- Cost center (if provided)
- Gross amount
- Discount
- Net amount

Summary:
- Subtotal
- Total discount
- VAT (if applicable)
- Total due
- Payment instructions
```

**Invoice Delivery**
- Email to Account Admin(s)
- Available in admin portal
- Optional: CC to finance email

### 6. Reporting & Analytics

**For Corporate Admin**
- Total spend (MTD, YTD)
- Bookings by user
- Bookings by cost center
- Most common routes
- Average booking value
- Spending vs. budget

**For Transfer Company Admin**
- Revenue by corporate account
- Outstanding balances
- Aging report (30/60/90 days)
- Corporate vs. consumer split

---

## Data Model

### Corporate Account
```
PK: TENANT#001#CORP#corp-acme-001
SK: METADATA
{
  tenantId: "TENANT#001",
  corpAccountId: "corp-acme-001",
  companyName: "ACME Corporation Ltd",
  status: "active",
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
  paymentTerms: 30,  // Net 30 days
  creditLimit: 500000,  // pence (5000)
  pricingTier: "silver",  // 10% discount
  customDiscount: null,  // or override percentage
  invoiceFrequency: "monthly",
  invoiceEmail: "accounts@acme.com",
  currentBalance: 0,  // outstanding amount in pence
  createdAt: "2025-12-09T...",
  updatedAt: "2025-12-09T..."
}
```

### Corporate User
```
PK: TENANT#001#CORP#corp-acme-001
SK: USER#user-jane-123
{
  tenantId: "TENANT#001",
  corpAccountId: "corp-acme-001",
  userId: "user-jane-123",
  email: "jane@acme.com",
  name: "Jane Smith",
  role: "admin",  // admin | booker | viewer
  spendingLimit: null,  // null = unlimited
  requiresApproval: false,
  status: "active",
  invitedAt: "2025-12-09T...",
  acceptedAt: "2025-12-09T...",
  lastBookingAt: "2025-12-09T..."
}
```

### Corporate Booking (Extension)
```
// Existing booking record with additional fields
PK: TENANT#001#BOOKING#BK-12345
SK: METADATA
{
  // ... existing booking fields ...

  // Corporate extensions
  corpAccountId: "corp-acme-001",
  bookerId: "user-jane-123",
  passengerName: "John Director",  // if different
  costCenter: "SALES-UK",
  projectRef: "Q4-Conference",
  invoiceId: null,  // linked when invoiced
  corporateDiscount: 1000,  // pence saved
}
```

### Invoice
```
PK: TENANT#001#CORP#corp-acme-001
SK: INVOICE#INV-2025-001234
{
  tenantId: "TENANT#001",
  corpAccountId: "corp-acme-001",
  invoiceId: "INV-2025-001234",
  invoiceNumber: "INV-001234",  // display number
  status: "issued",  // draft | issued | paid | overdue | void
  periodStart: "2025-12-01",
  periodEnd: "2025-12-31",
  issuedAt: "2026-01-01T...",
  dueAt: "2026-01-31T...",
  subtotal: 125000,  // pence
  totalDiscount: 12500,
  vatAmount: 22500,  // if applicable
  totalDue: 135000,
  bookingIds: ["BK-12345", "BK-12346", ...],
  bookingCount: 15,
  pdfUrl: "s3://durdle-invoices/TENANT-001/corp-acme-001/INV-2025-001234.pdf",
  paidAt: null,
  paidAmount: 0,
  createdAt: "2026-01-01T..."
}
```

### GSIs for Queries

**GSI: CorpAccountLookup**
- PK: TENANT#001#CORP_EMAIL#{email}
- SK: CORP#{corpAccountId}
- Use: Find corporate account by user email

**GSI: InvoicesByStatus**
- PK: TENANT#001#INVOICE_STATUS#{status}
- SK: DUE#{dueDate}#INV#{invoiceId}
- Use: List overdue invoices, upcoming dues

---

## API Endpoints

### Corporate Account Management
```
POST   /admin/corporate-accounts                 - Create account
GET    /admin/corporate-accounts                 - List accounts
GET    /admin/corporate-accounts/{id}            - Get account details
PUT    /admin/corporate-accounts/{id}            - Update account
DELETE /admin/corporate-accounts/{id}            - Deactivate account
POST   /admin/corporate-accounts/{id}/users      - Add user
DELETE /admin/corporate-accounts/{id}/users/{uid} - Remove user
```

### Corporate Booking Flow
```
GET    /v1/corporate/account                     - Get my corporate account (authed)
POST   /v1/corporate/verify                      - Verify account code
GET    /v1/corporate/bookings                    - List my corporate bookings
```

### Invoicing
```
GET    /admin/corporate-accounts/{id}/invoices   - List invoices
POST   /admin/corporate-accounts/{id}/invoices   - Generate invoice
GET    /admin/invoices/{invoiceId}               - Get invoice details
GET    /admin/invoices/{invoiceId}/pdf           - Download PDF
PUT    /admin/invoices/{invoiceId}/status        - Mark paid/void
```

---

## Admin UI Requirements

### Corporate Accounts List
- Table: Company Name | Status | Balance | Last Booking | Users
- Filters: Status, Balance (overdue)
- Actions: View, Edit, Generate Invoice

### Corporate Account Detail
- Account info card (editable)
- Users table with add/remove
- Bookings tab (filterable)
- Invoices tab
- Balance/Payment history

### Invoice Generation
- Select corporate account
- Choose date range
- Preview bookings included
- Generate draft
- Review and issue
- Send email notification

### Reporting Dashboard
- Total corporate revenue (period)
- Outstanding balances chart
- Top corporate accounts
- Aging breakdown

---

## Frontend Integration

### Quote Flow Changes
```javascript
// If user is logged in with corporate account
if (user.corporateAccount) {
  // Show corporate indicator
  // Apply corporate discount to displayed prices
  // Add optional fields: passenger name, cost center
  // Payment step shows "Bill to account" instead of card
}
```

### Corporate Login
- Option 1: Standard login, detect corporate account from email domain
- Option 2: Separate "Corporate Login" with account code
- Option 3: SSO integration (future)

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Corporate account data model
- [ ] Admin CRUD for corporate accounts
- [ ] User management (add/remove)
- [ ] Basic discount application

### Phase 2: Booking Integration
- [ ] Corporate user authentication
- [ ] Booking flow modifications
- [ ] Cost center capture
- [ ] "Bill to account" payment option

### Phase 3: Invoicing
- [ ] Invoice generation logic
- [ ] PDF generation (template)
- [ ] Email delivery
- [ ] Payment tracking

### Phase 4: Reporting & Polish
- [ ] Corporate admin dashboard
- [ ] Transfer company reporting
- [ ] Balance alerts
- [ ] Spending controls

---

## Edge Cases

1. **User belongs to multiple corporate accounts**: Currently unsupported - one corporate account per user
2. **Corporate + personal bookings**: User can choose "personal" or "corporate" at booking time
3. **Credit limit exceeded**: Block booking, notify admin
4. **Overdue account**: Options - block new bookings, warning only, or continue
5. **Invoice dispute**: Mark invoice as "disputed", exclude from aging
6. **VAT handling**: Configurable per tenant (UK: 20% on services)
7. **Refunds**: Credit note against invoice, or reduce balance

---

## Open Questions

### Q1: Authentication Model
How should corporate users log in?
- A) Email/password (same as consumer)
- B) Account code + email
- C) Email domain auto-detection
- D) SSO integration required?

### Q2: Booking Approval Workflow
Is approval workflow needed?
- A) No - all authorized bookers can book freely
- B) Yes - bookings above X require admin approval
- C) Yes - all bookings need approval

### Q3: Payment Collection
How will corporate invoices be paid?
- A) Bank transfer only (manual reconciliation)
- B) Saved card on file (auto-charge on due date)
- C) Direct debit
- D) Integration with accounting software?

### Q4: Self-Service vs Admin-Only
Can corporate admins manage their own account?
- A) Yes - full self-service portal
- B) Partial - view bookings/invoices, manage users
- C) No - all changes through transfer company

### Q5: Minimum Viable Scope
For Client #1 (Dorset Transfer Company), what's essential vs. nice-to-have?
- Essential: ???
- Nice-to-have: ???

### Q6: Existing Corporate Customers?
Does Client #1 already have corporate accounts?
- If yes, what's their current process?
- Migration requirements?

---

## Dependencies

- Multi-tenant foundation (tenantId in all records) - **Phase 0.5**
- Admin authentication (existing)
- PDF generation capability (new)
- Email service integration (existing via SES?)

---

## Competitive Reference

Standard features in competitor platforms:
- Bolt Business, Uber for Business, Addison Lee Corporate
- Account codes for guest booking
- Receipt forwarding to expense systems
- API for booking integration
- Traveler profiles

---

**Document Owner**: CTO
**Next Review**: After Q&A session with Client #1

