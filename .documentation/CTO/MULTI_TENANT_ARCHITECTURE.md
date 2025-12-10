# Multi-Tenant Backend Architecture - Durdle Platform

**Status**: Phase 0.5 COMPLETE - All Lambdas Tenant-Aware
**Priority**: Ready for Client #2 onboarding (15-20 hours work)
**Last Updated**: December 10, 2025

> **See Also**: [PLATFORM_ARCHITECTURE.md](../PLATFORM_ARCHITECTURE.md) for high-level architecture overview.
> This document contains **implementation details** for multi-tenancy.

---

## Business Model

**Platform**: Durdle - White-label transfer booking infrastructure
**Go-to-Market**: Multiple independent transfer company clients

### Current State (December 2025)
- **Client #1**: Dorset Transfer Company (dorsettransfercompany.co.uk)
- **Frontend**: `DorsetTransferCompany-Website` repo (decoupled - COMPLETE)
- **Admin Portal**: `Durdle` repo at `durdle.flowency.build/admin` (COMPLETE)
- **Backend**: Multi-tenant API with Phase 0.5 tenant utilities (COMPLETE)
- **Next Step**: Corporate Accounts feature, then onboard Tenant #2

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
    "tenantId": "TENANT#001",
    "tenantName": "Client One",  // Human-readable name stored separately
    "tier": "premium"
  }
}
```

**Tenant ID Convention**: Use opaque numeric identifiers (001, 002, 003...) rather than company names. This ensures:
- No data leakage if tenant ID appears in logs/errors
- Consistent format across all tenants
- No special character handling issues
- Professional, scalable approach

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
PK: TENANT#001#QUOTE#DTS1206_001
PK: TENANT#001#VEHICLE#standard
PK: TENANT#001#ROUTE#ChIJAb...
```

**Migration Strategy**:
1. Add `tenantId` field to all existing items (`TENANT#001`)
2. Create new GSI: `GSI-Tenant` with PK=tenantId, SK=EntityType#CreatedAt
3. Update all Lambda functions to include tenantId in PK
4. Backfill existing data with default tenant (001)
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
const tenantId = event.requestContext.authorizer.tenantId; // e.g., "TENANT#001"

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
PK: TENANT#001#VEHICLE#standard
Data: {
  tenantId: 'TENANT#001',
  vehicleId: 'standard',
  baseFare: 500,    // Tenant 001 charges £5 base
  perMile: 100,
  perMinute: 10
}

PK: TENANT#002#VEHICLE#standard
Data: {
  tenantId: 'TENANT#002',
  vehicleId: 'standard',
  baseFare: 700,    // Tenant 002 charges £7 base
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
durdle-uploads/
  TENANT-001/
    documents/quote-123.pdf
    vehicles/sedan.jpg
  TENANT-002/
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

## Phase 0.5: Lightweight Tenant-Awareness (COMPLETED December 9, 2025)

**Rationale**: We don't need full multi-tenancy until Client #2, but we're building admin features (postcode zones, destinations, pricing matrices) that MUST be tenant-aware from day one. Retrofitting tenant isolation later is painful and risky.

### Implementation Status

**Lambda Layer v4** deployed with `tenant.mjs` utilities:
- `getTenantId(event)` - Returns hardcoded `TENANT#001` (until authorizer is built)
- `buildTenantPK(tenantId, entityType, entityId)` - Builds prefixed PK
- `buildTenantS3Key(tenantId, folder, filename)` - Builds S3 path with hyphens
- `logTenantContext(logger, tenantId, lambdaName)` - Structured tenant logging
- `validateTenantAccess(requestTenant, resourceTenant)` - Cross-tenant guard

### Lambda Functions Updated

| Lambda | Status | Changes |
|--------|--------|---------|
| pricing-manager | DONE | Dual-format PK queries, tenant attribute on new records |
| vehicle-manager | DONE | Dual-format PK queries for vehicle listing |
| quotes-calculator | DONE | Tenant-aware pricing, routes, quote storage |
| quotes-manager | DONE | Tenant-aware queries and exports |
| bookings-manager | DONE | Tenant-prefixed booking PKs, GSI filters |
| fixed-routes-manager | DONE | Tenant-prefixed route PKs |
| feedback-manager | DONE | Tenant-prefixed feedback PKs |
| document-comments | DONE | Tenant-prefixed documentPath |
| admin-auth | DONE | Tenant-prefixed user PKs, tenantId in JWT |
| uploads-presigned | DONE | S3 keys: `TENANT-001/folder/filename` |
| locations-lookup | DONE | Tenant context logging (no DynamoDB) |

### Key Patterns Implemented

1. **Dual-Format PK Support** - All read operations try tenant-prefixed PK first, fall back to old format
   ```javascript
   // Try new format first
   let result = await docClient.send(new GetCommand({
     Key: { PK: buildTenantPK(tenantId, 'ENTITY', id), SK: 'METADATA' }
   }));
   // Fallback to old format if not found
   if (!result.Item) {
     result = await docClient.send(new GetCommand({
       Key: { PK: `ENTITY#${id}`, SK: 'METADATA' }
     }));
   }
   ```

2. **Tenant Filter for GSI Queries** - GSI keys don't include tenant, so filter on attribute
   ```javascript
   FilterExpression: 'attribute_not_exists(tenantId) OR tenantId = :tenantId'
   ```

3. **New Records Always Include Tenant**
   ```javascript
   const item = {
     PK: buildTenantPK(tenantId, 'ENTITY', id),
     SK: 'METADATA',
     tenantId, // Always include tenant attribute
     // ... other fields
   };
   ```

### What We Defer (Until Client #2 Sales)

- API Gateway custom authorizer
- Multiple API keys
- Tenant management UI
- Migration of existing data (backfill)

### Benefits of This Approach

- **Zero extra cost** - just disciplined data modeling
- **No throwaway work** - everything built now works in multi-tenant future
- **Fast Client #2 onboarding** - just add authorizer and new API key
- **Clean separation** - tenant boundary enforced from day one
- **Backward compatible** - existing data continues to work

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
- Backfill existing data with `TENANT#001`

### Phase 3: Testing & Validation (Month 5)
- Integration tests with multi-tenant scenarios
- Verify data isolation (no cross-tenant leaks)
- Load testing with 2+ simulated tenants
- Security audit of tenant boundaries

### Phase 4: Client #2 Onboarding (Month 6)
- Create new frontend app (durdle-web-002)
- Generate API key for Tenant 002
- Configure Tenant 002 pricing in DynamoDB
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
│ client1.com         │ client2.com       │ client3.com       │
│ (Next.js - T001)    │ (Next.js - T002)  │ (Next.js - T003)  │
└──────────┬──────────┴─────────┬─────────┴─────────┬─────────┘
           │                    │                   │
           │ API Key: key-001   │ API Key: key-002  │ API Key: key-003
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
                    │ TENANT#001#...       │
                    │ TENANT#002#...       │
                    │ TENANT#003#...       │
                    └──────────────────────┘
```

---

## Next Steps (When Client #2 Approaches)

1. Review this document with development team
2. Allocate 2-3 sprint capacity for migration
3. Create test tenant (TENANT#999) in DynamoDB for validation
4. Execute Phase 1-3 of migration plan
5. Deploy Tenant 002 frontend + API key

**Estimated Timeline**: 6-8 weeks from decision to production

---

**Document Owner**: CTO
**Status**: Phase 0.5 COMPLETE - All Lambda functions tenant-aware
**Last Updated**: December 9, 2025
**Review Date**: When Client #2 sales discussions begin

---

## Next Steps for Client #2 Onboarding

When ready to onboard Client #2, the following work remains:

1. **Build API Gateway Custom Authorizer** (~4 hours)
   - Extract tenantId from API key
   - Replace hardcoded `CURRENT_TENANT` with authorizer context

2. **Create Tenant 002 API Key** (~1 hour)
   - Generate API key in API Gateway
   - Map to `TENANT#002` in authorizer

3. **Backfill Existing Data** (~2 hours)
   - Add `tenantId: "TENANT#001"` attribute to existing records
   - Update PKs from `ENTITY#id` to `TENANT#001#ENTITY#id` (optional - dual-format works)

4. **Deploy Client #2 Frontend** (~8 hours)
   - Clone durdle-web to durdle-web-002
   - Update branding, domain, API key

**Estimated Total**: 15-20 hours when Client #2 is ready
