# Postcode Zone Pricing Engine

**Status**: Implementation Ready
**Priority**: High (Client #1 requirement)
**Last Updated**: December 12, 2025

---

## Progress Tracker

| Phase | Task | Status | Started | Completed | Notes |
|-------|------|--------|---------|-----------|-------|
| 1.1 | Create UK postcodes table | DONE | Dec 12 | Dec 12 | 60 postcodes loaded (37 Dorset, 23 neighboring) |
| 1.2 | Add GSI1 to pricing table | DONE | Dec 12 | Dec 12 | GSI1 created on durdle-pricing-config-dev |
| 1.3 | zone-manager Lambda | DONE | Dec 12 | Dec 12 | Lambda created with Layer v5 |
| 1.4 | destination-manager Lambda | DONE | Dec 12 | Dec 12 | Lambda created with Layer v5 |
| 1.5 | zone-pricing-manager Lambda | DONE | Dec 12 | Dec 12 | Lambda created with Layer v5 |
| 1.6 | API Gateway routes | DONE | Dec 12 | Dec 12 | All routes configured, deployed to dev |
| 2.1 | Zone list page | IN PROGRESS | Dec 12 | - | Building UI |
| 2.2 | Zone CRUD form | NOT STARTED | - | - | - |
| 2.3 | Destination list page | NOT STARTED | - | - | - |
| 2.4 | Destination CRUD form | NOT STARTED | - | - | - |
| 2.5 | Pricing matrix page | NOT STARTED | - | - | - |
| 3.1 | Leaflet dependencies | NOT STARTED | - | - | - |
| 3.2 | ZoneMap component | NOT STARTED | - | - | - |
| 3.3 | Map integration | NOT STARTED | - | - | - |
| 3.4 | Outward code overlay | NOT STARTED | - | - | - |
| 3.5 | Zone coverage display | NOT STARTED | - | - | - |
| 4.1 | extractOutwardCode() | NOT STARTED | - | - | - |
| 4.2 | checkZonePricing() | NOT STARTED | - | - | - |
| 4.3 | GSI query in quote flow | NOT STARTED | - | - | - |
| 4.4 | Apply zone pricing | NOT STARTED | - | - | - |
| 4.5 | Variable pricing fallback | NOT STARTED | - | - | - |
| 4.6 | compareMode update | NOT STARTED | - | - | - |
| 4.7 | Bidirectional lookups | NOT STARTED | - | - | - |
| 5.1 | Fixed Price badge | NOT STARTED | - | - | - |
| 5.2 | Zone name display | NOT STARTED | - | - | - |
| 5.3 | DTC pricing page | NOT STARTED | - | - | - |
| 5.4 | Remove old fixed routes UI | NOT STARTED | - | - | - |
| 6.1 | Delete fixed routes data | NOT STARTED | - | - | - |
| 6.2 | Deprecate fixed-routes-manager | NOT STARTED | - | - | - |
| 6.3 | Remove old admin UI | NOT STARTED | - | - | - |
| 6.4 | Update documentation | NOT STARTED | - | - | - |

---

## Overview

Fixed-price routes based on UK postcode zones rather than point-to-point locations. Allows transfer companies to set predictable pricing for common routes (e.g., Bournemouth area to Heathrow).

This replaces the current `fixed-routes-manager` system which has limitations:
- Requires separate record per vehicle type per route
- No intelligent postcode matching
- Point-to-point placeId matching only

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | DynamoDB (serverless) | Maintain 100% serverless principle |
| Geo Processing | turf.js in Lambda | No RDS/PostGIS needed |
| Postcode Granularity | Outward codes only (~3000 UK) | Sufficient for zone pricing |
| Zone Definition | Draw polygon -> resolve to outward codes | Visual + efficient storage |
| Backend Pattern | Lambda functions | NOT Next.js API routes |
| Pricing Structure | Single record with all vehicle prices | Simpler admin experience |
| Bidirectional | Same price default, optional different return | Flexibility for airport pickups |

---

## Stack Alignment (CRITICAL - Read Before Implementing)

### Lambda Layer (REQUIRED)
- **Layer ARN**: `arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5`
- **Contains**: `logger.mjs` + `tenant.mjs` + Pino
- **All new Lambdas MUST**:
  - Import from `/opt/nodejs/logger.mjs` and `/opt/nodejs/tenant.mjs`
  - NOT include logger.mjs or tenant.mjs in deployment ZIP
  - Attach Layer v5 before deployment

### Tenant Utilities (REQUIRED - from Lambda Layer)
```javascript
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantPK, logTenantContext } from '/opt/nodejs/tenant.mjs';

export const handler = async (event, context) => {
  const logger = createLogger(event, context);
  const tenantId = getTenantId(event);  // Returns "TENANT#001"
  logTenantContext(logger, tenantId, 'zone-manager');

  // Build tenant-prefixed PK
  const pk = buildTenantPK(tenantId, 'ZONE', zoneId);
  // Result: "TENANT#001#ZONE#zone-bh-urban"
};
```

### CORS Configuration (REQUIRED for admin endpoints)
**READ**: `durdle-serverless-api/ADMIN_ENDPOINT_STANDARD.md` before implementing.

Copy this EXACT code into every new admin Lambda:
```javascript
const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://durdle.flowency.build',
  'https://durdle.co.uk',
  'https://dorsettransfercompany.flowency.build',
  'https://dorsettransfercompany.co.uk'
];

const getHeaders = (origin) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};
```

### Deployment Standard
Each new Lambda MUST have:
1. `STRUCTURE.md` file (follow `pricing-manager/STRUCTURE.md` as template)
2. `deploy.sh` script for one-command deployment
3. `package.json` with production dependencies only (NO pino - it's in layer)

---

## Input Validation Rules

### Zone Creation/Update
| Field | Required | Validation |
|-------|----------|------------|
| name | Yes | 3-100 characters |
| description | No | Max 500 characters |
| outwardCodes | Yes | Min 1 code, each must match UK outward format `^[A-Z]{1,2}\d{1,2}[A-Z]?$` |
| polygon | No | Valid GeoJSON Polygon or MultiPolygon |
| active | No | Boolean, defaults to true |

### Destination Creation/Update
| Field | Required | Validation |
|-------|----------|------------|
| name | Yes | 3-100 characters |
| placeId | Yes | Must start with "ChIJ" (Google Place ID format) |
| locationType | Yes | Enum: `airport`, `train_station`, `port`, `other` |
| alternativePlaceIds | No | Array of valid Place IDs |
| active | No | Boolean, defaults to true |

### Zone Pricing Creation/Update
| Field | Required | Validation |
|-------|----------|------------|
| name | Yes | 3-100 characters (e.g., "BH Zone 1 - Heathrow") |
| prices.standard.outbound | Yes | Positive integer (pence), min 100 |
| prices.standard.return | Yes | Positive integer (pence), min 100 |
| prices.executive.outbound | Yes | Positive integer (pence), min 100 |
| prices.executive.return | Yes | Positive integer (pence), min 100 |
| prices.minibus.outbound | Yes | Positive integer (pence), min 100 |
| prices.minibus.return | Yes | Positive integer (pence), min 100 |
| active | No | Boolean, defaults to true |

---

## Business Requirements

### Source Zones (Pickup Areas)

Clients define **postcode zones** - groups of UK outward codes that share pricing to a destination.

**Example for Client #1 (Dorset):**
- Zone A: BH1, BH2, BH3, BH4, BH5, BH6, BH7, BH8 (Bournemouth urban)
- Zone B: BH9, BH10, BH11, BH12, BH13, BH14, BH15 (Poole area)
- Zone C: BH16, BH17, BH18, BH19, BH20, BH21 (Rural Dorset)
- Zone D: DT1, DT2, DT3, DT4, DT5 (Dorchester/Weymouth)
- Zone E: DT6, DT7, DT8, DT9, DT10, DT11 (West Dorset)
- Zone F: SO41, SO42, SO43 (New Forest fringe)

**Key Requirement**: Admin UI must show a MAP so operators can visualize postcode geography.

### Destinations

Destinations are specific places (airports, stations, ports) selected via Google Places lookup.

**Challenge**: Google Places returns multiple listings for same location.
**Solution**: Store canonical `place_id` as identifier, match on placeId when processing quotes.

### Pricing Structure

- **Per vehicle type**: Standard, Executive, Minibus prices in single record
- **Per zone-destination pair**: Zone A to Heathrow = different price than Zone B to Heathrow
- **Named records**: Admin can name routes (e.g., "BH Zone 1 - Gatwick")
- **Bidirectional**: Same price default, allow different return price
- **Return discount**: Platform-wide return discount still applies

---

## Data Model

### Table Strategy

**Decision**: Use existing `durdle-pricing-config-dev` table
- Zones, destinations, and zone pricing are pricing-related entities
- Keeps all pricing config in one table
- No new table creation required

### Environment Variables for New Lambdas
```javascript
// All zone pricing Lambdas should use:
const PRICING_TABLE_NAME = process.env.PRICING_TABLE_NAME || 'durdle-pricing-config-dev';
const UK_POSTCODES_TABLE_NAME = process.env.UK_POSTCODES_TABLE_NAME || 'durdle-uk-postcodes-dev';
```

### Zone Definition

```
Table: durdle-pricing-config-dev
PK: TENANT#001#ZONE#zone-bh-urban
SK: METADATA
{
  tenantId: "TENANT#001",
  zoneId: "zone-bh-urban",
  name: "Bournemouth Urban",
  outwardCodes: ["BH1", "BH2", "BH3", "BH4", "BH5", "BH6", "BH7", "BH8"],
  polygon: { /* GeoJSON for visual editing */ },
  description: "Central Bournemouth and immediate surrounds",
  active: true,
  createdAt: "2025-12-09T...",
  updatedAt: "2025-12-09T..."
}
```

### Destination Definition

```
Table: durdle-pricing-config-dev
PK: TENANT#001#DESTINATION#dest-heathrow
SK: METADATA
{
  tenantId: "TENANT#001",
  destinationId: "dest-heathrow",
  name: "Heathrow Airport",
  placeId: "ChIJJ9cBhSUQdkgRNMX7WxK3x5c",  // Canonical Google Place ID
  alternativePlaceIds: [                     // Other Google listings for same place
    "ChIJLQE...",
    "ChIJABC..."
  ],
  locationType: "airport",
  active: true,
  createdAt: "2025-12-09T..."
}
```

### Zone Pricing (Single Record, All Vehicles)

```
Table: durdle-pricing-config-dev
PK: TENANT#001#ZONE#zone-bh-urban
SK: PRICING#dest-heathrow
{
  tenantId: "TENANT#001",
  zoneId: "zone-bh-urban",
  destinationId: "dest-heathrow",
  name: "BH Zone 1 - Heathrow",              // Named record for admin display
  prices: {
    standard: { outbound: 12500, return: 12500 },   // pence
    executive: { outbound: 17500, return: 17500 },
    minibus: { outbound: 22500, return: 22500 }
  },
  active: true,
  createdAt: "2025-12-09T...",
  updatedAt: "2025-12-09T..."
}
```

### Postcode Lookup Index (GSI1)

To quickly find which zone a postcode belongs to:

```
Table: durdle-pricing-config-dev
GSI Name: GSI1 (NEW - must be created)
GSI1PK: TENANT#001#POSTCODE#BH1
GSI1SK: ZONE#zone-bh-urban
{
  PK: TENANT#001#POSTCODE#BH1
  SK: ZONE#zone-bh-urban
  tenantId: "TENANT#001",
  outwardCode: "BH1",
  zoneId: "zone-bh-urban"
}
```

This allows O(1) lookup: "What zone is BH1 in?" without scanning all zones.

### PostcodeLookup Record Lifecycle (CRITICAL)

PostcodeLookup records MUST be managed atomically with zone operations:

**On Zone CREATE:**
```javascript
// After creating zone record, create PostcodeLookup records for each outward code
for (const code of outwardCodes) {
  await docClient.send(new PutCommand({
    TableName: PRICING_TABLE_NAME,
    Item: {
      PK: buildTenantPK(tenantId, 'POSTCODE', code),
      SK: `ZONE#${zoneId}`,
      GSI1PK: buildTenantPK(tenantId, 'POSTCODE', code),
      GSI1SK: `ZONE#${zoneId}`,
      tenantId,
      outwardCode: code,
      zoneId,
    }
  }));
}
```

**On Zone UPDATE (if outwardCodes changed):**
```javascript
// 1. Delete old PostcodeLookup records for removed codes
const removedCodes = oldCodes.filter(c => !newCodes.includes(c));
for (const code of removedCodes) {
  await docClient.send(new DeleteCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'POSTCODE', code),
      SK: `ZONE#${zoneId}`,
    }
  }));
}

// 2. Create PostcodeLookup records for new codes
const addedCodes = newCodes.filter(c => !oldCodes.includes(c));
for (const code of addedCodes) {
  // Same as CREATE logic above
}
```

**On Zone DELETE:**
```javascript
// Delete all PostcodeLookup records for this zone
const zone = await getZone(zoneId);
for (const code of zone.outwardCodes) {
  await docClient.send(new DeleteCommand({
    TableName: PRICING_TABLE_NAME,
    Key: {
      PK: buildTenantPK(tenantId, 'POSTCODE', code),
      SK: `ZONE#${zoneId}`,
    }
  }));
}
// Then delete zone record
```

### UK Outward Codes Reference Table

```
Table: durdle-uk-postcodes-dev (shared, not tenant-specific)
PK: OUTWARD#BH1
SK: METADATA
{
  outwardCode: "BH1",
  lat: 50.7192,
  lon: -1.8808,
  area: "Bournemouth",
  region: "Dorset"
}
```

~3000 records, loaded once from Code-Point Open data.

---

## API Endpoints

### Zone Management (zone-manager Lambda)

```
GET    /admin/zones                         - List all zones
POST   /admin/zones                         - Create zone
GET    /admin/zones/{zoneId}                - Get zone details
PUT    /admin/zones/{zoneId}                - Update zone
DELETE /admin/zones/{zoneId}                - Delete zone (hard delete)
POST   /admin/zones/resolve-polygon         - Resolve polygon to outward codes
```

### Destination Management (destination-manager Lambda)

```
GET    /admin/destinations                  - List all destinations
POST   /admin/destinations                  - Create destination
GET    /admin/destinations/{destId}         - Get destination details
PUT    /admin/destinations/{destId}         - Update destination
DELETE /admin/destinations/{destId}         - Delete destination (hard delete)
```

### Zone Pricing (zone-pricing-manager Lambda)

```
GET    /admin/zones/{zoneId}/pricing        - Get all pricing for zone
POST   /admin/zones/{zoneId}/pricing        - Create zone-destination pricing
PUT    /admin/zones/{zoneId}/pricing/{destId} - Update pricing
DELETE /admin/zones/{zoneId}/pricing/{destId} - Remove pricing
GET    /admin/pricing-matrix                - Get full pricing matrix
```

### Public Quote Integration

```
GET    /v1/zones/check?postcode={outwardCode} - Check if postcode has zone pricing
```

---

## Quote Flow Integration

### Integration Point in quotes-calculator (CRITICAL)

Zone pricing check slots into the existing flow at a specific point. See `quotes-calculator/index.mjs`:

```javascript
// CURRENT FLOW (lines 927-1029):
// 1. Check for hourly booking -> hourly pricing
// 2. Check for fixed route (if placeIds AND no waypoints) -> fixed route pricing
// 3. Else -> variable pricing

// NEW FLOW (Phase 4):
// 1. Check for hourly booking -> hourly pricing
// 2. Check for fixed route (if placeIds AND no waypoints) -> fixed route pricing
// 3. NEW: Check for zone pricing (if no waypoints AND outward code extractable) -> zone pricing
// 4. Else -> variable pricing (unchanged fallback)
```

**Insert zone pricing check AFTER line 940** (after fixed route check, before variable pricing):

```javascript
// After fixedRoute check (around line 940)
if (fixedRoute) {
  // ... existing fixed route logic
} else {
  // NEW: Check zone pricing before variable pricing
  let zonePricing = null;
  if (!hasWaypoints && body.dropoffLocation?.placeId) {
    zonePricing = await checkZonePricing(
      body.pickupLocation.address,
      body.dropoffLocation.placeId,
      tenantId
    );
  }

  if (zonePricing) {
    // Use zone pricing
    logger.info({
      event: 'zone_pricing_selected',
      zoneName: zonePricing.name,
      zoneId: zonePricing.zoneId,
    }, 'Using zone pricing');

    // Build pricing response from zonePricing.prices[vehicleType]
    // ... zone pricing logic
  } else {
    // Existing variable pricing calculation (unchanged)
    logger.info({ event: 'variable_pricing_selected' }, 'Using variable pricing calculation');
    // ... existing code
  }
}
```

### Zone Pricing Conditions

Zone pricing ONLY applies when ALL conditions are met:
1. No fixed route match (fixed routes take priority - more specific)
2. No waypoints (zone pricing is for direct A->B routes only)
3. Pickup address contains valid UK outward code
4. Outward code is in a configured zone
5. Destination placeId matches a configured destination with pricing for that zone

If ANY condition fails -> fall back to variable pricing.

### Backend Logic (checkZonePricing function)

```javascript
async function checkZonePricing(pickupAddress, dropoffPlaceId, tenantId) {
  // 1. Extract outward code from address
  const outwardCode = extractOutwardCode(pickupAddress);
  // e.g., "123 High Street, Bournemouth BH1 2AB" -> "BH1"

  if (!outwardCode) return null;

  // 2. Find zone for this outward code via GSI1
  const zoneResult = await docClient.send(new QueryCommand({
    TableName: PRICING_TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': buildTenantPK(tenantId, 'POSTCODE', outwardCode),
    },
    Limit: 1,
  }));

  if (!zoneResult.Items || zoneResult.Items.length === 0) return null;
  const zone = zoneResult.Items[0];

  // 3. Check if destination has zone pricing
  // First, find destination by placeId (need to scan or use another GSI)
  const destResult = await docClient.send(new QueryCommand({
    TableName: PRICING_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': buildTenantPK(tenantId, 'ZONE', zone.zoneId),
      ':sk': `PRICING#${destinationId}`, // Need destinationId lookup first
    },
  }));

  // ... destination lookup and pricing retrieval logic

  // 4. Return zone pricing
  return {
    isZonePricing: true,
    name: pricing.name,
    zoneId: zone.zoneId,
    destinationId: pricing.destinationId,
    prices: pricing.prices
  };
}
```

### Postcode Extraction

```javascript
function extractOutwardCode(address) {
  // UK postcode regex: outward code is 2-4 chars before space
  const match = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d[A-Z]{2}\b/i);
  if (match) return match[1].toUpperCase();

  // Try partial postcode (just outward)
  const partialMatch = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/i);
  return partialMatch ? partialMatch[1].toUpperCase() : null;
}
```

---

## Admin UI Requirements

### 1. Zone Management Screen (/admin/zones)

**Zone List View:**
- Table: Zone Name | Outward Codes Count | Description | Active
- Actions: Edit, Delete, Duplicate

**Zone Editor:**
- Zone name (text input)
- Description (text input)
- Postcode selector (MAP-BASED):
  - Display UK postcode district map (Leaflet + leaflet.pm)
  - Draw polygon freehand
  - On save -> call `/admin/zones/resolve-polygon`
  - Display resolved outward codes as chips
  - Allow manual add/remove of codes
- Active toggle

### 2. Destination Management Screen (/admin/destinations)

**Destination List View:**
- Table: Name | Type | Place ID | Zones Priced | Active

**Destination Editor:**
- Google Places autocomplete search
- Display selected location on map
- Location type dropdown (airport, train_station, port, other)
- Handle duplicate Places: "We found multiple listings. Please confirm."
- Active toggle

### 3. Pricing Matrix Screen (/admin/zone-pricing)

**Grid View:**
- Rows: Zones
- Columns: Destinations
- Cells: Click to set pricing (shows name or price)

**Cell Editor Modal:**
- Name field (e.g., "BH Zone 1 - Gatwick")
- Standard: Outbound price / Return price
- Executive: Outbound price / Return price
- Minibus: Outbound price / Return price
- "Same for return" checkbox (default checked)
- Active toggle

**Bulk Edit:**
- Select multiple cells
- Apply percentage adjustment
- Copy prices between vehicle types

---

## Implementation Phases

### Phase 1: Data Foundation

- [ ] **1.1 Create UK outward codes reference table (durdle-uk-postcodes-dev)**
  ```bash
  aws dynamodb create-table \
    --table-name durdle-uk-postcodes-dev \
    --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
    --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region eu-west-2
  ```
  - [ ] Source Code-Point Open data from Ordnance Survey (free)
  - [ ] Create data loader script to populate ~3000 records

- [ ] **1.2 Add GSI1 to durdle-pricing-config-dev**
  ```bash
  aws dynamodb update-table \
    --table-name durdle-pricing-config-dev \
    --attribute-definitions \
      AttributeName=GSI1PK,AttributeType=S \
      AttributeName=GSI1SK,AttributeType=S \
    --global-secondary-index-updates \
      "[{\"Create\":{\"IndexName\":\"GSI1\",\"KeySchema\":[{\"AttributeName\":\"GSI1PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI1SK\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]" \
    --region eu-west-2
  ```

- [ ] **1.3 Create zone-manager Lambda function**
  - [ ] Create folder structure: `functions/zone-manager/`
  - [ ] `index.mjs` with CRUD operations + PostcodeLookup record management
  - [ ] `POST /admin/zones/resolve-polygon` endpoint (turf.js)
  - [ ] `package.json` with `@turf/boolean-point-in-polygon`, `@turf/helpers`, `zod`
  - [ ] `STRUCTURE.md` deployment documentation
  - [ ] `deploy.sh` script
  - [ ] Create Lambda in AWS with Layer v5 attached

- [ ] **1.4 Create destination-manager Lambda function**
  - [ ] Create folder structure: `functions/destination-manager/`
  - [ ] `index.mjs` with CRUD operations
  - [ ] `package.json` with `zod`
  - [ ] `STRUCTURE.md`, `deploy.sh`
  - [ ] Create Lambda in AWS with Layer v5 attached

- [ ] **1.5 Create zone-pricing-manager Lambda function**
  - [ ] Create folder structure: `functions/zone-pricing-manager/`
  - [ ] `index.mjs` with CRUD operations + pricing matrix endpoint
  - [ ] `package.json` with `zod`
  - [ ] `STRUCTURE.md`, `deploy.sh`
  - [ ] Create Lambda in AWS with Layer v5 attached

- [ ] **1.6 Configure API Gateway routes**
  - [ ] Add all `/admin/zones/*` routes
  - [ ] Add all `/admin/destinations/*` routes
  - [ ] Add all `/admin/zones/{zoneId}/pricing/*` routes
  - [ ] Add `/admin/pricing-matrix` route
  - [ ] Configure JWT authorizer for all routes
  - [ ] Configure CORS for all routes
  - [ ] Deploy API Gateway

### Phase 2: Admin UI - Basic

- [ ] **2.1 Zone list page** (`/admin/zones`)
  - [ ] Table with zone data
  - [ ] Create/Edit/Delete actions

- [ ] **2.2 Zone CRUD form** (text-based outward code input initially)
  - [ ] Name, description fields
  - [ ] Manual outward code entry (chips input)
  - [ ] Active toggle

- [ ] **2.3 Destination list page** (`/admin/destinations`)
  - [ ] Table with destination data
  - [ ] Create/Edit/Delete actions

- [ ] **2.4 Destination CRUD form**
  - [ ] Google Places autocomplete
  - [ ] Location type selector
  - [ ] Active toggle

- [ ] **2.5 Pricing matrix grid page** (`/admin/zone-pricing`)
  - [ ] Grid layout (zones x destinations)
  - [ ] Click cell to open editor modal
  - [ ] Save pricing to backend

### Phase 3: Admin UI - Map Enhancement

- [ ] **3.1** Install Leaflet + leaflet.pm dependencies
- [ ] **3.2** Create ZoneMap component
  - [ ] Leaflet map centered on UK
  - [ ] Polygon drawing controls
  - [ ] `pm:create` and `pm:edit` event handlers
- [ ] **3.3** Integrate map into zone editor
  - [ ] Load existing polygon on edit
  - [ ] Call resolve-polygon endpoint on save
  - [ ] Display resolved outward codes
- [ ] **3.4** Add outward code overlay to map
  - [ ] Show outward code boundaries
  - [ ] Click to add/remove individual codes
- [ ] **3.5** Visual zone coverage display
  - [ ] Color-coded zones on map
  - [ ] Zone overlap detection/warning

### Phase 4: Quote Integration

- [ ] **4.1** Add `extractOutwardCode()` function to quotes-calculator
- [ ] **4.2** Add `checkZonePricing()` function to quotes-calculator
- [ ] **4.3** Query GSI1 in quote flow (after fixed route check, before variable pricing)
- [ ] **4.4** Apply zone pricing when matched
  - [ ] Use outbound price for one-way
  - [ ] Use return price for return leg
- [ ] **4.5** Fall back to variable pricing when no zone match
- [ ] **4.6** Update compareMode response to include zone pricing
  - [ ] `isZonePricing` flag
  - [ ] Zone name in response
- [ ] **4.7** Handle bidirectional lookups (zone -> dest AND dest -> zone)

### Phase 5: Frontend Display

- [ ] **5.1** Show "Fixed Price Route" badge on quote results
- [ ] **5.2** Display zone name when zone pricing applies
- [ ] **5.3** Update DTC pricing page to show zone-based routes
- [ ] **5.4** Remove/deprecate old fixed routes display

### Phase 6: Cleanup

- [ ] **6.1** Delete all data from `durdle-fixed-routes-dev` table
- [ ] **6.2** Delete `fixed-routes-manager` Lambda function
- [ ] **6.3** Remove old fixed routes admin UI pages
- [ ] **6.4** Update documentation

---

## Files to Create/Modify

### New Lambda Functions

**zone-manager Lambda** (folder: `durdle-serverless-api/functions/zone-manager/`)
| File | Purpose |
|------|---------|
| `index.mjs` | Main Lambda handler - Zone CRUD + PostcodeLookup management + polygon resolution |
| `package.json` | Dependencies: @aws-sdk/*, zod, @turf/boolean-point-in-polygon, @turf/helpers |
| `deploy.sh` | One-command deployment script |
| `STRUCTURE.md` | Deployment documentation (copy pattern from pricing-manager) |

**destination-manager Lambda** (folder: `durdle-serverless-api/functions/destination-manager/`)
| File | Purpose |
|------|---------|
| `index.mjs` | Main Lambda handler - Destination CRUD |
| `package.json` | Dependencies: @aws-sdk/*, zod |
| `deploy.sh` | One-command deployment script |
| `STRUCTURE.md` | Deployment documentation |

**zone-pricing-manager Lambda** (folder: `durdle-serverless-api/functions/zone-pricing-manager/`)
| File | Purpose |
|------|---------|
| `index.mjs` | Main Lambda handler - Pricing matrix CRUD |
| `package.json` | Dependencies: @aws-sdk/*, zod |
| `deploy.sh` | One-command deployment script |
| `STRUCTURE.md` | Deployment documentation |

### Modified Lambda Functions

| File | Action | Purpose |
|------|--------|---------|
| `durdle-serverless-api/functions/quotes-calculator/index.mjs` | MODIFY | Add zone pricing check after fixed routes, before variable pricing |

### Admin UI (Durdle Repo)

| File | Purpose |
|------|---------|
| `app/admin/zones/page.tsx` | Zone management list + CRUD |
| `app/admin/destinations/page.tsx` | Destination management list + CRUD |
| `app/admin/zone-pricing/page.tsx` | Pricing matrix grid |
| `components/ZoneMap.tsx` | Leaflet + leaflet.pm map component |

### AWS Resources to Create

| Resource | Type | Purpose |
|----------|------|---------|
| `zone-manager-dev` | Lambda Function | Zone CRUD |
| `destination-manager-dev` | Lambda Function | Destination CRUD |
| `zone-pricing-manager-dev` | Lambda Function | Pricing matrix CRUD |
| `durdle-uk-postcodes-dev` | DynamoDB Table | UK outward codes reference (~3000 records) |
| `GSI1` | GSI on durdle-pricing-config-dev | O(1) postcode -> zone lookup |
| API Gateway routes | Integration | All new admin endpoints |

---

## Edge Cases

1. **Postcode not found in address**: Fall back to variable pricing
2. **Destination not configured**: Fall back to variable pricing
3. **Zone exists but no price for destination**: Fall back to variable pricing
4. **Multiple zones match postcode**: Error - admin must fix overlapping zones (validation should prevent this)
5. **Postcode extraction fails**: Fall back to variable pricing
6. **Surge pricing**: Apply surge multiplier to zone prices (same as variable)
7. **Waypoints in journey**: Zone pricing does NOT apply - use variable pricing
8. **Corporate discount**: Apply AFTER zone pricing (same as variable pricing flow)

---

## UK Postcode Reference

### Dorset Area Codes (Client #1)

**BH (Bournemouth)**
- BH1-BH11: Bournemouth
- BH12-BH17: Poole
- BH18: Broadstone
- BH19: Swanage
- BH20: Wareham
- BH21: Wimborne
- BH22-BH24: Ferndown, Ringwood
- BH25: New Milton
- BH31: Verwood

**DT (Dorchester)**
- DT1: Dorchester
- DT2: Dorchester rural
- DT3-DT5: Weymouth, Portland
- DT6: Bridport
- DT7: Lyme Regis
- DT8: Beaminster
- DT9: Sherborne
- DT10: Sturminster Newton
- DT11: Blandford Forum

**SO (Southampton - partial)**
- SO41: Lymington
- SO42: Brockenhurst
- SO43: Lyndhurst

---

## Dependencies

### Already in Place
- Multi-tenant foundation (tenantId in all records) - DONE via Lambda Layer v5
- Google Places API (already integrated in locations-lookup)
- DynamoDB durdle-pricing-config-dev table
- API Gateway JWT authorizer (durdle-jwt-authorizer)
- Lambda execution role (durdle-lambda-execution-role-dev)

### NPM Packages to Add
- `@turf/boolean-point-in-polygon` - For polygon resolution (zone-manager only)
- `@turf/helpers` - GeoJSON utilities (zone-manager only)
- `zod` - Input validation (all new Lambdas)
- `leaflet` + `@types/leaflet` - Map component (admin UI)
- `leaflet.pm` - Polygon drawing (admin UI)

### External Data
- UK outward codes dataset (Code-Point Open - free from Ordnance Survey)
  - Download: https://osdatahub.os.uk/downloads/open/CodePointOpen
  - ~3000 outward codes with lat/lon centroids

---

## Open Questions (Resolved)

| Question | Answer |
|----------|--------|
| Should surge pricing apply to zone prices? | Yes |
| Bi-directional pricing support? | Yes - same default, allow different return |
| Maximum zones per tenant? | 50 (soft limit) |
| Maximum destinations per tenant? | 100 (soft limit) |
| Database choice? | DynamoDB (stay serverless) |
| Postcode granularity? | Outward codes only (~3000) |
| Backwards compatibility? | Not needed - not live yet |

---

## Migration Notes

The current `fixed-routes-manager` Lambda and `durdle-fixed-routes-dev` table will be deleted once zone pricing is live. No data migration required - we are not live yet.

---

**Document Owner**: CTO
**Next Review**: After Phase 1 completion
