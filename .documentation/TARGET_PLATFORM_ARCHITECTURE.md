# Durdle Platform Architecture

**Last Updated**: December 9, 2025
**Owner**: CTO
**Purpose**: Define the multi-tenant B2B2B architecture and terminology

---

## Overview

Durdle is a **multi-tenant SaaS platform** for transfer companies. Each tenant (transfer company) serves:
1. **B2C**: Direct consumers booking transfers
2. **B2B**: Corporate accounts with multiple users

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ DURDLE PLATFORM (Multi-tenant SaaS Backend)                     │
│ - Quotes engine, bookings, pricing, vehicles, DynamoDB          │
│ - Serverless API (Lambda + API Gateway)                         │
│ - Tenant-aware data isolation (TENANT#001, TENANT#002...)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Serves multiple tenants
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────────┐                 ┌───────────────────────┐
│ TENANT #1: DTC        │                 │ TENANT #2: MTC        │
│ Dorset Transfer Co.   │                 │ Manchester Transfer   │
└───────────────────────┘                 └───────────────────────┘
        │                                           │
        │                                           │
        ├─── DTC Public Site (B2C)                 ├─── MTC Public Site (B2C)
        │    dorsettransfercompany.co.uk           │    manchestertransfercompany.co.uk
        │    - Consumer quote & booking            │    - Consumer quote & booking
        │    - No login required                   │    - No login required
        │                                           │
        ├─── DTC Corporate Portal (B2B)            ├─── MTC Corporate Portal (B2B)
        │    dorsettransfercompany.co.uk/corporate │    manchestertransfercompany.co.uk/corporate
        │    - Corporate account login             │    - Corporate account login
        │    - Multiple corporate accounts         │    - Multiple corporate accounts
        │    - User management per account         │    - User management per account
        │                                           │
        └─── DTC Tenant Admin                      └─── MTC Tenant Admin
             durdle.flowency.build/admin                durdle.flowency.build/admin
             - Configure pricing, vehicles               - Configure pricing, vehicles
             - View all bookings & quotes                - View all bookings & quotes
             - Manage corporate accounts                 - Manage corporate accounts
             (Tenant context from login)                 (Tenant context from login)
```

---

## Terminology

### Platform Level

| Term | Description | Example |
|------|-------------|---------|
| **Durdle Platform** | Multi-tenant SaaS backend | The serverless API, DynamoDB, Lambda functions |
| **Tenant** | A transfer company using Durdle | DTC, MTC |
| **Tenant ID** | Unique identifier for tenant | `TENANT#001` (DTC), `TENANT#002` (MTC) |
| **Platform Admin** | You - manages Durdle infrastructure | CTO/Developer |

### Tenant Level

| Term | Description | Example |
|------|-------------|---------|
| **Tenant Admin** | Transfer company staff configuring their Durdle instance | DTC operations manager |
| **Tenant Admin Portal** | Configuration dashboard at `durdle.flowency.build/admin` | Where DTC staff manage pricing, vehicles, bookings |
| **Tenant Frontend** | Public-facing website for the transfer company | `dorsettransfercompany.co.uk` |
| **Consumer** | Public user booking a transfer (B2C) | Random person booking airport transfer |

### Corporate Account Level (B2B)

| Term | Description | Example |
|------|-------------|---------|
| **Corporate Account** | A business customer of the tenant | ACME Corporation, Hotel XYZ |
| **Corporate Account ID** | Unique identifier | `corp-001`, `corp-002` |
| **Corporate Portal** | Login area for corporate users | `dorsettransfercompany.co.uk/corporate` |
| **Corporate Admin** | Manages their company's account | ACME Corp travel manager |
| **Corporate Booker** | Can book & pay for their company | ACME Corp PA/office manager |
| **Corporate Requestor** | Can request bookings (needs approval) | ACME Corp employee |

---

## User Roles & Permissions

### Platform Admin (You)
- **Access**: All tenants, all data
- **Can**:
  - Create new tenants
  - Access AWS infrastructure
  - Deploy Lambda functions
  - View all DynamoDB data
- **Cannot**: Accessed by customers (internal only)

### Tenant Admin (DTC Staff)
- **Access**: Single tenant only (DTC)
- **Login**: `durdle.flowency.build/admin` (tenant context from JWT)
- **Can**:
  - Configure pricing & vehicles
  - View all bookings & quotes (consumer + corporate)
  - Create/manage corporate accounts
  - Set corporate discounts
  - View revenue reports
- **Cannot**: Access other tenants' data (MTC)

### Corporate Admin (Company Travel Manager)
- **Access**: Single corporate account only
- **Login**: `dorsettransfercompany.co.uk/corporate`
- **Can**:
  - View/manage company bookings
  - Add/remove users from their company
  - Approve/reject booking requests
  - View spending reports
  - Update company details
  - Book & pay for transfers
- **Cannot**: 
  - Change pricing (set by Tenant Admin)
  - Access other corporate accounts
  - Access Tenant Admin portal

### Corporate Booker (PA/Office Manager)
- **Access**: Single corporate account only
- **Login**: `dorsettransfercompany.co.uk/corporate`
- **Can**:
  - Book & pay for transfers
  - View company bookings
  - Approve/reject requests (if designated)
- **Cannot**:
  - Add/remove users
  - Change company details
  - View other users' personal settings

### Corporate Requestor (Employee)
- **Access**: Single corporate account only
- **Login**: `dorsettransfercompany.co.uk/corporate`
- **Can**:
  - Create quote requests
  - View own requests & bookings
- **Cannot**:
  - Book & pay directly
  - View other users' bookings
  - Manage company settings

### Consumer (Public)
- **Access**: Public site only
- **Login**: Not required
- **Can**:
  - Get quotes
  - Book & pay for transfers
- **Cannot**: Access any admin or corporate portals

---

## Domain & Routing Strategy

### Tenant Admin Portal (Shared)
- **Domain**: `durdle.flowency.build`
- **Routes**: `/admin/*`
- **Tenant Context**: Extracted from JWT token after login
- **Why shared**: Easier to maintain one admin UI, tenant isolation via authentication

### Tenant Frontend (Separate Repos)
- **DTC**: `dorsettransfercompany.co.uk`
- **MTC**: `manchestertransfercompany.co.uk` (future)
- **Why separate**: Different branding, marketing, content per tenant

### Corporate Portal (Path-based)
- **DTC**: `dorsettransfercompany.co.uk/corporate`
- **MTC**: `manchestertransfercompany.co.uk/corporate`
- **Why path-based**: 
  - Simpler SSL/DNS management
  - Shares tenant branding
  - Easier to maintain than subdomains
  - Standard practice for B2B portals

---

## Repository Structure

### Current State (DTC Only)
```
durdle/                           # This repo
├── durdle-serverless-api/        # Platform backend (multi-tenant)
├── app/                          # DTC frontend (public + corporate)
├── components/                   # DTC components
└── .documentation/               # Platform docs
```

### Future State (Multi-Tenant)
```
durdle-platform/                  # Backend repo (multi-tenant)
├── functions/                    # Lambda functions
├── layers/                       # Lambda layers
└── .documentation/               # Platform docs

dtc-frontend/                     # DTC frontend repo
├── app/
│   ├── page.tsx                 # Public homepage
│   ├── quote/                   # Consumer quote flow
│   ├── corporate/               # Corporate portal
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── quote/
│   │   └── bookings/
│   └── admin/                   # Redirect to durdle.flowency.build/admin
└── components/

mtc-frontend/                     # MTC frontend repo (future)
├── app/
│   ├── page.tsx                 # Public homepage (MTC branding)
│   ├── quote/                   # Consumer quote flow
│   └── corporate/               # Corporate portal
└── components/
```

---

## Authentication Boundaries

### Tenant Admin Authentication
- **Method**: JWT tokens (existing `admin-auth` Lambda)
- **JWT Payload**:
  ```json
  {
    "userId": "admin-user-001",
    "email": "manager@dorsettransfercompany.co.uk",
    "userType": "tenant_admin",
    "tenantId": "TENANT#001",
    "role": "admin"
  }
  ```
- **Storage**: localStorage `durdle_admin_token`
- **Expiry**: 8 hours

### Corporate User Authentication
- **Method**: Magic link + optional password (new)
- **JWT Payload**:
  ```json
  {
    "userId": "corp-user-001",
    "email": "jane@acmecorp.com",
    "userType": "corporate",
    "tenantId": "TENANT#001",
    "corpAccountId": "corp-001",
    "role": "admin"  // "admin" | "booker" | "requestor"
  }
  ```
- **Storage**: localStorage `durdle_corporate_token`
- **Expiry**: 24 hours

### Consumer (No Authentication)
- **Method**: None (public access)
- **Quote Retrieval**: Magic link with quote token (existing)

---

## Data Isolation

### DynamoDB Partition Key Strategy

All records include tenant prefix for isolation:

```javascript
// Tenant Admin user
PK: "TENANT#001#ADMIN#admin-user-001"
SK: "METADATA"

// Corporate Account
PK: "TENANT#001#CORP#corp-001"
SK: "METADATA"

// Corporate User
PK: "TENANT#001#CORP#corp-001"
SK: "USER#corp-user-001"

// Corporate Booking
PK: "TENANT#001#BOOKING#BK-12345"
SK: "METADATA"
{
  tenantId: "TENANT#001",
  corpAccountId: "corp-001",  // Links to corporate account
  bookerId: "corp-user-001",
  // ... other fields
}

// Consumer Booking (no corporate account)
PK: "TENANT#001#BOOKING#BK-12346"
SK: "METADATA"
{
  tenantId: "TENANT#001",
  corpAccountId: null,  // Consumer booking
  // ... other fields
}
```

---

## API Routing

### Platform Backend (Shared)
- **Base URL**: `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev`
- **Tenant Context**: From JWT token in `Authorization` header

### Public Endpoints (No Auth)
```
POST   /v1/quotes              # Calculate quote (any tenant)
GET    /v1/vehicles            # List vehicles (tenant-filtered)
POST   /v1/bookings            # Create booking (any tenant)
GET    /v1/locations/autocomplete  # Location search
```

### Tenant Admin Endpoints (JWT Required)
```
GET    /admin/quotes           # List quotes (tenant-filtered)
GET    /admin/bookings         # List bookings (tenant-filtered)
POST   /admin/corporate        # Create corporate account
GET    /admin/corporate        # List corporate accounts (tenant-filtered)
PUT    /admin/pricing/vehicles # Update pricing (tenant-specific)
```

### Corporate Portal Endpoints (JWT Required)
```
POST   /corporate/auth/magic-link      # Request magic link
POST   /corporate/auth/verify          # Verify magic link
GET    /corporate/dashboard            # Dashboard data (corp-filtered)
GET    /corporate/bookings             # List bookings (corp-filtered)
POST   /corporate/bookings             # Create booking (corp context)
GET    /corporate/requests             # List requests (corp-filtered)
POST   /corporate/requests/{id}/approve # Approve request
```

---

## Branding & White-Labeling

### Tenant Admin Portal
- **Branding**: Durdle platform branding (neutral)
- **Logo**: Durdle logo
- **Colors**: Platform colors
- **Why**: Shared admin UI for all tenants

### Tenant Frontend (DTC)
- **Branding**: DTC branding
- **Logo**: DTC logo (`/dtc-logo-wave2.png`)
- **Colors**: Sage, Navy (DTC brand colors)
- **Domain**: `dorsettransfercompany.co.uk`

### Corporate Portal (DTC)
- **Branding**: DTC branding (same as public site)
- **Logo**: DTC logo
- **Colors**: Sage, Navy
- **Domain**: `dorsettransfercompany.co.uk/corporate`
- **Why**: Corporate users are DTC customers, should see DTC branding

---

## Migration Path

### Phase 0: Current State (December 2025)
- Single repo with DTC frontend + Durdle backend
- Tenant-aware backend (Phase 0.5 complete)
- No corporate accounts yet

### Phase 1: Corporate Accounts (Q1 2026)
- Add corporate portal to DTC frontend (`/corporate/*`)
- Extend `admin-auth` Lambda for corporate users
- Keep single repo (DTC + backend together)

### Phase 2: Multi-Tenant Preparation (Q2 2026)
- Split backend into separate repo (`durdle-platform`)
- Keep DTC frontend as `dtc-frontend` repo
- Backend serves both DTC and future tenants

### Phase 3: Second Tenant (Q3 2026)
- Create `mtc-frontend` repo
- MTC uses same Durdle backend
- Tenant Admin portal serves both DTC and MTC

---

## Key Principles

1. **Backend is multi-tenant from day one** (Phase 0.5 complete)
2. **Frontends are tenant-specific** (separate repos, separate branding)
3. **Tenant Admin portal is shared** (one UI, tenant context from auth)
4. **Corporate portals are tenant-branded** (part of tenant frontend)
5. **Data isolation via tenant prefix** (TENANT#001, TENANT#002)
6. **Authentication determines access** (JWT payload contains tenant + corp context)

---

## Questions & Answers

**Q: Why not use subdomains for corporate portals?**
A: Path-based (`/corporate`) is simpler for SSL, DNS, and maintenance. Standard practice for B2B portals.

**Q: Why separate repos for tenant frontends?**
A: Different branding, marketing, content. Easier to deploy independently. No risk of DTC changes affecting MTC.

**Q: Why shared Tenant Admin portal?**
A: Easier to maintain one admin UI. Tenant isolation via authentication. Reduces code duplication.

**Q: Can a corporate user access multiple corporate accounts?**
A: No. Each user belongs to one corporate account. If they need access to multiple, create separate user accounts.

**Q: Can a Tenant Admin access corporate portals?**
A: No. Tenant Admins use `/admin` portal. Corporate users use `/corporate` portal. Separate authentication systems.

---

**Document Owner**: CTO
**Last Updated**: December 9, 2025
**Next Review**: After Phase 1 (Corporate Accounts) implementation
