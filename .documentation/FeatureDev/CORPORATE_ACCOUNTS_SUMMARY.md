# Corporate Accounts - Implementation Summary

**Last Updated**: December 9, 2025
**Status**: Ready for Technical Design

---

## Quick Reference

### Key Documents
1. **[PLATFORM_ARCHITECTURE.md](../PLATFORM_ARCHITECTURE.md)** - Read this FIRST
   - Defines Durdle platform, tenants, corporate accounts
   - Clarifies terminology and user roles
   - Explains multi-tenant B2B2B model

2. **[CorporateAccounts_PRD.md](./CorporateAccounts_PRD.md)** - Product requirements
   - User journeys and workflows
   - Data models and API endpoints
   - Implementation phases

3. **This document** - Quick reference and next steps

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│ DURDLE PLATFORM (Backend)                                   │
│ - Multi-tenant SaaS                                         │
│ - Serverless API (Lambda + DynamoDB)                        │
│ - Tenant-aware data isolation                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Serves
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TENANT: Dorset Transfer Company (DTC)                       │
│ - tenantId: TENANT#001                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Has 3 user types
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│ Consumers    │  │ Corporate Users  │  │ Tenant Admin │
│ (B2C)        │  │ (B2B)            │  │ (DTC Staff)  │
├──────────────┤  ├──────────────────┤  ├──────────────┤
│ Public site  │  │ Corporate portal │  │ Admin portal │
│ No login     │  │ Magic link auth  │  │ Password auth│
│ Quote & book │  │ Quote & book     │  │ Configure    │
│              │  │ User management  │  │ View reports │
└──────────────┘  └──────────────────┘  └──────────────┘
```

---

## What We're Building

### Phase 1: Corporate Accounts for DTC

**Goal**: Enable DTC to serve business customers (hotels, travel agents, corporates)

**What changes**:
1. **New portal**: `dorsettransfercompany.co.uk/corporate`
2. **New authentication**: Magic link + optional password
3. **New user types**: Corporate Admin, Booker, Requestor
4. **New features**: 
   - Corporate pricing (discounts)
   - User management per corporate account
   - Approval workflow (optional)
   - Spending reports

**What stays the same**:
- Consumer booking flow (unchanged)
- Tenant Admin portal (add corporate account management)
- Backend API (extend with corporate endpoints)

---

## Key Terminology

| Term | What It Means | Example |
|------|---------------|---------|
| **Durdle Platform** | The multi-tenant backend | Lambda functions, DynamoDB |
| **Tenant** | A transfer company using Durdle | DTC, MTC (future) |
| **Tenant Admin** | Transfer company staff | DTC operations manager |
| **Corporate Account** | A business customer of DTC | ACME Corp, Hotel XYZ |
| **Corporate Admin** | Manages their company's account | ACME Corp travel manager |
| **Corporate Booker** | Books transfers for their company | ACME Corp PA |
| **Corporate Requestor** | Requests bookings (needs approval) | ACME Corp employee |
| **Consumer** | Public user (B2C) | Random person booking transfer |

---

## User Portals

### 1. Consumer (Public) - No Change
- **URL**: `dorsettransfercompany.co.uk`
- **Auth**: None required
- **Flow**: Quote → Book → Pay → Confirmation

### 2. Corporate Portal - NEW
- **URL**: `dorsettransfercompany.co.uk/corporate`
- **Auth**: Magic link + optional password
- **Users**: Corporate Admin, Booker, Requestor
- **Features**:
  - Login/verify pages
  - Dashboard (role-specific)
  - Quote & booking (corporate pricing)
  - User management (Admin only)
  - Approval workflow (optional)
  - Spending reports

### 3. Tenant Admin Portal - Extended
- **URL**: `durdle.flowency.build/admin`
- **Auth**: Password + JWT (existing)
- **Users**: DTC staff only
- **New features**:
  - Create/manage corporate accounts
  - Set corporate pricing/discounts
  - View corporate bookings & revenue
  - Send invites to corporate admins

---

## Authentication Architecture

### Current State
- Tenant Admin: Password-based JWT via `admin-auth` Lambda
- Consumers: No authentication

### New State (Phase 1)
- Tenant Admin: Password-based JWT (unchanged)
- Corporate Users: Magic link JWT (extend `admin-auth` Lambda)
- Consumers: No authentication (unchanged)

### JWT Token Comparison

**Tenant Admin Token**:
```json
{
  "userId": "admin-001",
  "email": "manager@dorsettransfercompany.co.uk",
  "userType": "tenant_admin",
  "tenantId": "TENANT#001",
  "role": "admin"
}
```

**Corporate User Token** (NEW):
```json
{
  "userId": "corp-user-001",
  "email": "jane@acmecorp.com",
  "userType": "corporate",
  "tenantId": "TENANT#001",
  "corpAccountId": "corp-001",
  "role": "admin"  // or "booker" or "requestor"
}
```

**Key difference**: Corporate tokens include `corpAccountId` for data filtering.

---

## Data Model Changes

### New Tables/Records

**Corporate Account**:
```javascript
PK: "TENANT#001#CORP#corp-001"
SK: "METADATA"
{
  tenantId: "TENANT#001",
  corpAccountId: "corp-001",
  companyName: "ACME Corporation Ltd",
  companyNumber: "12345678",  // Companies House
  discountPercent: 10,
  status: "active",
  // ... other fields
}
```

**Corporate User**:
```javascript
PK: "TENANT#001#CORP#corp-001"
SK: "USER#corp-user-001"
{
  tenantId: "TENANT#001",
  corpAccountId: "corp-001",
  userId: "corp-user-001",
  email: "jane@acmecorp.com",
  role: "admin",  // admin | booker | requestor
  passwordHash: null,  // Optional
  // ... other fields
}
```

**Magic Link Token**:
```javascript
PK: "TENANT#001#MAGIC#token-uuid"
SK: "METADATA"
{
  tenantId: "TENANT#001",
  token: "uuid-v4",
  email: "jane@acmecorp.com",
  corpAccountId: "corp-001",
  expiresAt: "2025-12-09T12:15:00Z",  // 15 minutes
  // ... other fields
}
TTL: expiresAt (auto-delete)
```

### Extended Records

**Booking** (add corporate context):
```javascript
PK: "TENANT#001#BOOKING#BK-12345"
SK: "METADATA"
{
  // ... existing fields ...
  corpAccountId: "corp-001",  // NEW: null for consumer bookings
  bookerId: "corp-user-001",  // NEW: who booked
  passengerName: "John Director",  // NEW: if different from booker
  corporateDiscount: 1250,  // NEW: pence saved
}
```

---

## API Endpoints (New)

### Corporate Portal - Auth
```
POST   /corporate/auth/magic-link      # Request magic link
POST   /corporate/auth/verify          # Verify token
POST   /corporate/auth/login           # Password login (if set)
POST   /corporate/auth/set-password    # Set optional password
POST   /corporate/auth/logout          # Logout
```

### Corporate Portal - Dashboard
```
GET    /corporate/me                   # Current user + account
GET    /corporate/dashboard            # Dashboard data
GET    /corporate/bookings             # List bookings (corp-filtered)
POST   /corporate/bookings             # Create booking
GET    /corporate/requests             # List requests (if Requestor)
POST   /corporate/requests             # Submit request
POST   /corporate/requests/{id}/approve # Approve (Admin only)
POST   /corporate/requests/{id}/reject  # Reject (Admin only)
```

### Corporate Portal - Management
```
GET    /corporate/users                # List team members
POST   /corporate/users                # Add user (Admin only)
DELETE /corporate/users/{id}           # Remove user (Admin only)
GET    /corporate/company              # Company details
PUT    /corporate/company              # Update company (Admin only)
```

### Tenant Admin - Corporate Management
```
POST   /admin/corporate                # Create corporate account
GET    /admin/corporate                # List accounts (tenant-filtered)
GET    /admin/corporate/{id}           # Get account details
PUT    /admin/corporate/{id}           # Update account
POST   /admin/corporate/{id}/invite    # Send invite
GET    /admin/reports/corporate-revenue # Revenue reports
```

---

## Implementation Phases

### Phase 1A: Foundation (Weeks 1-2)
- [ ] Extend `admin-auth` Lambda for magic link support
- [ ] Create corporate account data model
- [ ] Build `/corporate/login` and `/corporate/verify` pages
- [ ] Test authentication end-to-end

### Phase 1B: Corporate Dashboard (Weeks 3-4)
- [ ] Create corporate portal layout
- [ ] Build dashboard (role-aware)
- [ ] Implement user management
- [ ] Add company details page

### Phase 1C: Booking Flow (Weeks 5-6)
- [ ] Extend quote calculator for corporate pricing
- [ ] Build corporate quote page
- [ ] Implement direct booking for Admin/Booker
- [ ] Test payment flow

### Phase 1D: Tenant Admin Tools (Weeks 7-8)
- [ ] Build corporate account CRUD in admin portal
- [ ] Integrate Companies House API
- [ ] Add corporate accounts list
- [ ] Build basic reporting

### Phase 2: Approval Workflow (Future)
- [ ] Implement Requestor role
- [ ] Build approval dashboard
- [ ] Add email notifications
- [ ] Test multi-user scenarios

---

## What's NOT Changing

1. **Consumer booking flow** - Stays exactly the same
2. **Existing bookings** - No migration needed (backward compatible)
3. **Tenant Admin authentication** - Password-based JWT unchanged
4. **Backend infrastructure** - Same Lambda functions, extend with new endpoints
5. **DynamoDB tables** - Same tables, new record types added

---

## Next Steps

### Before Implementation
1. **Technical Design Document** - Detailed implementation plan
   - Lambda function changes (extend `admin-auth`)
   - Frontend component architecture
   - Database migration plan (none needed, but document)
   - Testing strategy

2. **Email Templates** - Design magic link emails
   - Welcome email with magic link
   - Password reset email
   - Booking confirmation (corporate version)

3. **Companies House Integration** - Create lookup Lambda
   - API key setup
   - Rate limiting strategy
   - Caching approach

### During Implementation
1. Start with Phase 1A (authentication)
2. Test thoroughly before moving to next phase
3. Deploy to dev environment first
4. Get DTC feedback on each phase

### After Phase 1
1. User acceptance testing with DTC
2. Onboard first corporate account (pilot)
3. Gather feedback
4. Plan Phase 2 (approval workflow)

---

## Questions to Resolve

1. **Email template design** - Who designs the magic link emails?
2. **Companies House API key** - Do we have one, or need to register?
3. **Corporate pricing strategy** - Flat discount or tiered pricing?
4. **Pilot corporate account** - Which DTC customer will be first?
5. **Go-live timeline** - When does DTC need this live?

---

## Success Criteria

### Phase 1 Complete When:
- [ ] DTC Tenant Admin can create corporate accounts
- [ ] Corporate Admin can login via magic link
- [ ] Corporate Admin can add/remove users
- [ ] Corporate users can book transfers with corporate pricing
- [ ] Bookings show corporate context in Tenant Admin portal
- [ ] All data properly tenant-isolated
- [ ] No impact on existing consumer booking flow

### Business Success When:
- [ ] DTC onboards 5+ corporate accounts
- [ ] Corporate bookings represent 20%+ of DTC revenue
- [ ] Zero cross-tenant data leaks
- [ ] Corporate users report positive experience

---

**Document Owner**: CTO
**Last Updated**: December 9, 2025
**Next Action**: Create Technical Design Document
