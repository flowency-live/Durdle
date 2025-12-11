# Corporate Accounts - Implementation Summary

**Last Updated**: December 11, 2025
**Status**: 85% Complete - Password Auth Flow Done, Corporate Booking Flow Remaining

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
- Corporate Users: **Magic link for onboarding → Email/Password for ongoing auth**
- Consumers: No authentication (unchanged)

### Corporate User Auth Flows

#### Flow 1: Initial Onboarding (Magic Link = Invitation)
```
1. Tenant Admin creates corporate account + user in Durdle admin
2. Tenant Admin clicks "Generate Invite Link" → magic link shown on screen
3. Tenant Admin manually shares link (email, WhatsApp, etc.)
4. User clicks link → /corporate/verify?token=xxx
5. Token validates → User lands on "Set up your password" page
6. User creates password (strength meter, show/hide, validation)
7. User is logged in → dashboard
```

#### Flow 2: Ongoing Login (Email + Password)
```
1. User goes to /corporate/login
2. Enters email + password
3. JWT issued → dashboard
```

#### Flow 3: Forgot Password
```
1. User clicks "Forgot password" on login page
2. Enters email → magic link generated (shown on screen for testing, email later)
3. User clicks link → "Reset your password" page
4. Sets new password → logged in
```

#### Flow 4: Corporate Admin Adding Users
```
1. Corporate admin adds user in Team page
2. Clicks "Generate Invite Link" → shown on screen
3. Optionally clicks "Send via email" (if SES configured)
4. New user clicks link → same password setup flow (Flow 1)
```

### Email Requirements (Minimal for MVP)

| Email Type | When Triggered | Deferrable? |
|------------|----------------|-------------|
| Forgot password | User requests reset | **No** - critical for go-live |
| Email verification | New account setup | Yes - can skip initially |
| Magic link send | Button click (optional) | Yes - manual copy works |

**Testing approach**: Show all links on screen. SES email integration comes before go-live.

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
  "type": "corporate",
  "userId": "corp-user-001",
  "email": "jane@acmecorp.com",
  "tenantId": "TENANT#001",
  "corpAccountId": "corp-001",
  "role": "admin",  // or "booker" or "requestor"
  "userName": "Jane Smith",
  "companyName": "ACME Corp"
}
```

**Key difference**: Corporate tokens include `corpAccountId` for data filtering and `type: "corporate"` to distinguish from admin tokens.

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
POST   /corporate/auth/magic-link      # Generate magic link (returns URL for testing)
POST   /corporate/auth/verify          # Verify token → redirect to set-password or dashboard
POST   /corporate/auth/login           # Email + password login
POST   /corporate/auth/set-password    # Set password (first time or reset)
POST   /corporate/auth/forgot-password # Request password reset magic link
GET    /corporate/auth/session         # Verify JWT session is valid
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

### Phase 1A: Foundation - COMPLETE
- [x] Create `durdle-corporate-dev` DynamoDB table with TTL
- [x] Create `corporate-accounts-manager` Lambda for admin CRUD
- [x] Add API Gateway routes for /admin/corporate/*
- [x] Build admin portal pages (list, new, detail) in Durdle repo

### Phase 1B: Corporate Authentication - COMPLETE
- [x] Create `corporate-auth` Lambda for magic link auth
- [x] Add API Gateway routes for /corporate/auth/*
- [x] Build `/corporate/login` page in DTC repo
- [x] Build `/corporate/verify` page in DTC repo
- [x] **COMPLETE**: Password-based auth flow:
  - [x] Add `passwordHash` field to user records (bcrypt, 12 rounds)
  - [x] Add `/corporate/auth/login` endpoint (email + password)
  - [x] Add `/corporate/auth/set-password` endpoint
  - [x] Add `/corporate/auth/forgot-password` endpoint
  - [x] Update `/corporate/auth/verify` to redirect to set-password if `needsPassword`
  - [x] Magic link shown on screen when adding users in admin portal
  - [x] Build set-password page (strength meter, show/hide, real-time validation)
  - [x] Update login page to email + password form
  - [x] Build forgot-password flow with magic link
- [ ] **DEFERRED**: SES email integration (show magic link on screen for now)

### Phase 1C: Corporate Portal - COMPLETE
- [x] Create `corporate-portal-api` Lambda
- [x] Add API Gateway routes for /corporate/*
- [x] Build corporate portal layout in DTC repo
- [x] Build dashboard page (role-aware stats, recent bookings)
- [x] Build team management page (admin only)
- [x] Create `corporateApi.ts` service and `useCorporateAuth.ts` hook

### Phase 1D: Corporate Booking Flow - NOT STARTED
- [ ] Modify quotes-calculator to apply corporate discounts
- [ ] Build corporate quote page with discount badge
- [ ] Link bookings to corporate accounts
- [ ] Show booking history in dashboard

### Phase 1E: Tenant Admin Tools - PARTIAL
- [x] Corporate account CRUD in admin portal
- [ ] Companies House API integration (deferred)
- [x] Corporate accounts list page
- [ ] Basic revenue reporting (deferred)

### Phase 2: Approval Workflow - DEFERRED (Fast Follower)
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

### Completed: Password-Based Auth (Phase 1B)
All password authentication work is complete. See Implementation Inventory below.

### Next Priority: Corporate Booking Flow (Phase 1D)
- Modify quotes-calculator to detect corporate JWT and apply discount
- Create corporate quote page with "Corporate Rate Applied" badge
- Link bookings to corporate accounts in DynamoDB

### Deferred (Before Go-Live)
1. **SES Email Integration**
   - Verify durdle.co.uk domain in SES
   - Configure corporate-auth to send magic link emails
   - Design email templates (magic link, forgot password)

2. **Companies House Integration** (Optional)
   - API key setup
   - Company lookup Lambda
   - Integration with admin create account form

3. **Reporting**
   - Corporate revenue reports for tenant admin
   - Spending reports for corporate admins

### After Phase 1 Complete
1. User acceptance testing with DTC
2. Onboard first corporate account (pilot)
3. Gather feedback
4. Plan Phase 2 (approval workflow with Requestor role)

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
- [x] DTC Tenant Admin can create corporate accounts
- [x] Corporate Admin can login via magic link -> set password -> dashboard
- [x] Corporate Admin can login with email + password (ongoing)
- [x] Corporate Admin can add/remove users
- [x] "Add User" shows magic link URL on screen for sharing
- [ ] Corporate users can book transfers with corporate pricing
- [ ] Bookings show corporate context in Tenant Admin portal
- [x] All data properly tenant-isolated
- [x] No impact on existing consumer booking flow

### Business Success When:
- [ ] DTC onboards 5+ corporate accounts
- [ ] Corporate bookings represent 20%+ of DTC revenue
- [ ] Zero cross-tenant data leaks
- [ ] Corporate users report positive experience

---

**Document Owner**: CTO
**Last Updated**: December 11, 2025
**Next Action**: Corporate booking flow with pricing (Phase 1D)

---

## Implementation Inventory

### Lambda Functions Created
| Function | Status | Purpose |
|----------|--------|---------|
| `corporate-accounts-manager-dev` | Deployed | Admin CRUD for corporate accounts |
| `corporate-auth-dev` | Deployed | Magic link auth + JWT |
| `corporate-portal-api-dev` | Deployed | Dashboard, users, company |

### API Gateway Routes Added
| Route | Methods | Lambda | Status |
|-------|---------|--------|--------|
| /admin/corporate | GET, POST, OPTIONS | corporate-accounts-manager | Deployed |
| /admin/corporate/{corpId} | GET, PUT, OPTIONS | corporate-accounts-manager | Deployed |
| /admin/corporate/{corpId}/users | GET, POST, OPTIONS | corporate-accounts-manager | Deployed |
| /admin/corporate/{corpId}/users/{userId} | PUT, DELETE, OPTIONS | corporate-accounts-manager | Deployed |
| /admin/corporate/{corpId}/invite | POST, OPTIONS | corporate-accounts-manager | Deployed |
| /corporate/auth/magic-link | POST, OPTIONS | corporate-auth | Deployed |
| /corporate/auth/verify | POST, OPTIONS | corporate-auth | Deployed |
| /corporate/auth/session | GET, OPTIONS | corporate-auth | Deployed |
| /corporate/auth/login | POST, OPTIONS | corporate-auth | Deployed |
| /corporate/auth/set-password | POST, OPTIONS | corporate-auth | Deployed |
| /corporate/auth/forgot-password | POST, OPTIONS | corporate-auth | Deployed |
| /corporate/me | GET, OPTIONS | corporate-portal-api | Deployed |
| /corporate/me/notifications | PUT, OPTIONS | corporate-portal-api | Deployed |
| /corporate/dashboard | GET, OPTIONS | corporate-portal-api | Deployed |
| /corporate/company | GET, PUT, OPTIONS | corporate-portal-api | Deployed |
| /corporate/users | GET, POST, OPTIONS | corporate-portal-api | Deployed |
| /corporate/users/{userId} | PUT, DELETE, OPTIONS | corporate-portal-api | Deployed |

### Frontend Pages Created
**Durdle Admin Portal** (`C:\VSProjects\_Websites\Durdle`):
- `app/admin/corporate/page.tsx` - Corporate accounts list
- `app/admin/corporate/new/page.tsx` - Create corporate account
- `app/admin/corporate/[corpId]/page.tsx` - Corporate account detail (with magic link modal)

**DTC Website** (`C:\VSProjects\_Websites\DorsetTransferCompany-Website`):
- `app/corporate/page.tsx` - Index redirect
- `app/corporate/login/page.tsx` - Email + password login
- `app/corporate/verify/page.tsx` - Token verification (redirects to set-password if needed)
- `app/corporate/set-password/page.tsx` - Password setup with strength validation
- `app/corporate/forgot-password/page.tsx` - Request password reset
- `app/corporate/dashboard/page.tsx` - Dashboard
- `app/corporate/team/page.tsx` - Team management
- `lib/services/corporateApi.ts` - API service (includes password auth functions)
- `lib/config/api.ts` - API endpoints configuration
