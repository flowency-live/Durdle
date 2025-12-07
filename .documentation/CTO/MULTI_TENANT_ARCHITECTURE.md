# Multi-Tenant Backend Architecture - Durdle Platform

**Status**: Planning Phase (6-month timeline)
**Priority**: Medium (required before Client #2 onboarding)
**Last Updated**: December 6, 2025

---

## Business Model

**Platform**: Durdle - White-label transfer booking infrastructure
**Go-to-Market**: Multiple independent transfer company clients

### Current State (Single Client)
- **Client #1**: Dorset Transfer Company (dorsettransfercompany.co.uk)
- **Frontend**: durdle-web (Next.js) - tightly coupled to Dorset TC branding
- **Backend**: durdle-serverless-api - no tenant isolation
- **Timeline**: 6 months to prove business case before scaling

### Target State (Multi-Client Platform)
- **Client #1**: Dorset Transfer Company (dorsettransfercompany.co.uk)
- **Client #2**: TBD Transfer Company (client2domain.com)
- **Client #N**: Additional transfer companies

**Frontend Strategy**: One Next.js app per client
- Each client gets dedicated codebase (durdle-web-dorset, durdle-web-client2)
- Custom branding, styling, domain per client
- "Powered by Durdle" footer
- No shared frontend code (each is independent)

**Backend Strategy**: Single multi-tenant serverless API
- All clients share same Lambda functions
- Tenant isolation via API keys and DynamoDB partition keys
- Centralized pricing, vehicle, route management per tenant
- Shared infrastructure, isolated data

---

## Architecture Changes Required

### 1. Tenant Identification & Authentication

**Current**: No tenant context in API requests

**Required**: API Gateway API Keys with tenant mapping

```javascript
// API Gateway Custom Authorizer Response
{
  "principalId": "user-123",
  "context": {
    "tenantId": "TENANT#dorset-tc",
    "tenantName": "Dorset Transfer Company",
    "tier": "premium"
  }
}
```

**Implementation**:
- Create API key per client in API Gateway
- Custom authorizer Lambda extracts tenant from API key
- Inject `tenantId` into Lambda event context
- All Lambda functions read `event.requestContext.authorizer.tenantId`

### 2. DynamoDB Schema Changes

**Current**: Single-tenant partition keys

```
PK: QUOTE#DTS1206_001
PK: VEHICLE#standard
PK: ROUTE#ChIJAb...
```

**Required**: Tenant-prefixed partition keys

```
PK: TENANT#dorset-tc#QUOTE#DTS1206_001
PK: TENANT#dorset-tc#VEHICLE#standard
PK: TENANT#dorset-tc#ROUTE#ChIJAb...
```

**Migration Strategy**:
1. Add `tenantId` field to all existing items (`TENANT#dorset-tc`)
2. Create new GSI: `GSI-Tenant` with PK=tenantId, SK=EntityType#CreatedAt
3. Update all Lambda functions to include tenantId in PK
4. Backfill existing data with default tenant
5. Deploy data access layer changes
6. Enable tenant-aware queries

**Tables Affected**:
- durdle-quotes-dev (quotes, bookings)
- durdle-pricing-config-dev (vehicle rates)
- durdle-fixed-routes-dev (pre-configured routes)
- durdle-vehicles-dev (fleet management)
- durdle-admin-users-dev (admin authentication)

### 3. Lambda Function Changes

**Current**: Direct database access without tenant filtering

```javascript
// BEFORE (single tenant)
const quote = await docClient.send(new GetCommand({
  TableName: TABLE_NAME,
  Key: {
    PK: `QUOTE#${quoteId}`,
    SK: 'METADATA'
  }
}));
```

**Required**: Tenant-scoped database access

```javascript
// AFTER (multi-tenant)
const tenantId = event.requestContext.authorizer.tenantId;

const quote = await docClient.send(new GetCommand({
  TableName: TABLE_NAME,
  Key: {
    PK: `${tenantId}#QUOTE#${quoteId}`,
    SK: 'METADATA'
  }
}));

// Validate tenant ownership
if (quote.Item && quote.Item.tenantId !== tenantId) {
  throw new Error('Unauthorized: Cross-tenant access denied');
}
```

**All 9 Lambda Functions Require Updates**:
- quotes-calculator
- pricing-manager
- vehicle-manager
- fixed-routes-manager
- locations-lookup (tenant-specific API keys for Google Maps)
- uploads-presigned (S3 prefix per tenant)
- feedback-manager
- document-comments
- admin-auth

### 4. Pricing & Configuration Isolation

**Current**: Global vehicle pricing and fixed routes

**Required**: Per-tenant pricing configuration

```javascript
// Tenant-specific pricing
PK: TENANT#dorset-tc#VEHICLE#standard
Data: {
  tenantId: 'TENANT#dorset-tc',
  vehicleId: 'standard',
  baseFare: 500,    // Dorset TC charges £5 base
  perMile: 100,
  perMinute: 10
}

PK: TENANT#client2#VEHICLE#standard
Data: {
  tenantId: 'TENANT#client2',
  vehicleId: 'standard',
  baseFare: 700,    // Client 2 charges £7 base
  perMile: 120,
  perMinute: 12
}
```

**Benefits**:
- Each client sets own pricing
- Different vehicle types per client
- Custom fixed routes per geography
- Independent pricing strategy

### 5. S3 Upload Isolation

**Current**: Flat S3 bucket structure

```
bndy-images/
  documents/quote-123.pdf
  vehicles/sedan.jpg
```

**Required**: Tenant-prefixed S3 keys

```
bndy-images/
  TENANT-dorset-tc/
    documents/quote-123.pdf
    vehicles/sedan.jpg
  TENANT-client2/
    documents/quote-456.pdf
    vehicles/minivan.jpg
```

**Implementation**:
- Update uploads-presigned Lambda to inject tenant prefix
- Bucket policy restricts cross-tenant access
- CloudFront distribution serves tenant-scoped paths

### 6. Admin Portal Multi-Tenancy

**Current**: Single admin portal (durdle-admin)

**Options**:

**Option A: Single Admin Portal with Tenant Switcher**
- Admin users can belong to multiple tenants
- Dropdown to switch active tenant context
- All queries filtered by selected tenant

**Option B: Dedicated Admin Portal per Client**
- Each client gets own admin subdomain (admin-dorset.durdle.com)
- Tenant ID derived from subdomain
- Simpler security model (no cross-tenant access)

**Recommendation**: Option B (dedicated portal per client)
- Clearer security boundaries
- Easier compliance (data isolation)
- No risk of accidental cross-tenant operations

---

## Migration Plan (6-Month Timeline)

### Phase 1: Foundation (Month 1-2)
- Design tenant-aware DynamoDB schema
- Create API Gateway custom authorizer
- Build tenant context middleware for Lambda
- Document data access patterns

### Phase 2: Backend Refactor (Month 3-4)
- Update all 9 Lambda functions with tenant filtering
- Migrate DynamoDB schema (add tenant prefix to PKs)
- Create GSI for tenant-scoped queries
- Backfill existing data with `TENANT#dorset-tc`

### Phase 3: Testing & Validation (Month 5)
- Integration tests with multi-tenant scenarios
- Verify data isolation (no cross-tenant leaks)
- Load testing with 2+ simulated tenants
- Security audit of tenant boundaries

### Phase 4: Client #2 Onboarding (Month 6)
- Create new frontend app (durdle-web-client2)
- Generate API key for Client #2
- Configure Client #2 pricing in DynamoDB
- Deploy and monitor

---

## Security Considerations

### Tenant Data Isolation
- **Lambda Level**: Always filter by `tenantId` from authorizer context
- **Database Level**: Partition key includes tenant prefix
- **S3 Level**: Bucket policies enforce tenant prefix access
- **API Level**: API Gateway validates API key before routing

### Preventing Cross-Tenant Access
```javascript
// Example guard in every Lambda function
function validateTenantAccess(requestTenantId, resourceTenantId) {
  if (requestTenantId !== resourceTenantId) {
    throw new Error('FORBIDDEN: Cross-tenant access denied');
  }
}

// Usage
const tenantId = event.requestContext.authorizer.tenantId;
const quote = await getQuote(quoteId);
validateTenantAccess(tenantId, quote.tenantId);
```

### Audit Logging
- Log all tenant switches in admin portal
- CloudWatch log tenant ID in every request
- Alert on any cross-tenant query attempts

---

## Cost Implications

### Current (Single Tenant)
- DynamoDB: ~$10/month (low traffic)
- Lambda: ~$5/month
- API Gateway: ~$3/month
- Total: ~$18/month

### Multi-Tenant (10 Clients)
- DynamoDB: ~$40/month (10x data, but shared tables)
- Lambda: ~$15/month (shared functions, more invocations)
- API Gateway: ~$10/month (10x requests)
- Total: ~$65/month (vs. $180 if each client had isolated infrastructure)

**Savings**: 64% reduction vs. isolated infrastructure per client

---

## Technical Debt

**Created During Initial Build**:
- No tenant context in original design
- Assumed single-client deployment
- DynamoDB schema lacks tenant isolation

**Remediation Required**:
- Schema migration (breaking change)
- Lambda function refactor (all 9 functions)
- Testing infrastructure for multi-tenancy

**Estimated Effort**: 80-100 hours (2-3 sprints)

---

## Reference Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT FRONTENDS                         │
├─────────────────────┬───────────────────┬───────────────────┤
│ dorsettc.co.uk      │ client2.com       │ client3.com       │
│ (Next.js - Dorset)  │ (Next.js - C2)    │ (Next.js - C3)    │
└──────────┬──────────┴─────────┬─────────┴─────────┬─────────┘
           │                    │                   │
           │ API Key: dorset-tc │ API Key: client2  │ API Key: client3
           └────────────────────┴───────────────────┴─────────┘
                                │
                    ┌───────────▼────────────┐
                    │   API Gateway          │
                    │   Custom Authorizer    │
                    │   (Extract Tenant ID)  │
                    └───────────┬────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
         ┌────▼─────┐     ┌────▼─────┐     ┌────▼─────┐
         │ Lambda 1 │     │ Lambda 2 │ ... │ Lambda 9 │
         │ +tenantId│     │ +tenantId│     │ +tenantId│
         └────┬─────┘     └────┬─────┘     └────┬─────┘
              │                │                 │
              └────────────────┼─────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │     DynamoDB         │
                    │  (Tenant-prefixed)   │
                    ├──────────────────────┤
                    │ TENANT#dorset-tc#... │
                    │ TENANT#client2#...   │
                    │ TENANT#client3#...   │
                    └──────────────────────┘
```

---

## Next Steps (When Client #2 Approaches)

1. Review this document with development team
2. Allocate 2-3 sprint capacity for migration
3. Create test tenant in DynamoDB for validation
4. Execute Phase 1-3 of migration plan
5. Deploy Client #2 frontend + API key

**Estimated Timeline**: 6-8 weeks from decision to production

---

**Document Owner**: CTO
**Status**: Architecture Documented, Implementation Pending
**Review Date**: When Client #2 sales discussions begin
