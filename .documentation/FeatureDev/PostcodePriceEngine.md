# Postcode Zone Pricing Engine

**Status**: Requirements Gathering
**Priority**: High (Client #1 requirement)
**Last Updated**: December 9, 2025

---

## Overview

Fixed-price routes based on UK postcode zones rather than point-to-point locations. Allows transfer companies to set predictable pricing for common routes (e.g., Bournemouth area to Heathrow).

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

**Key Requirement**: Admin UI must show a MAP so operators can visualize postcode geography. DT7 (Lyme Regis) is much further west than DT11 (Blandford), affecting pricing.

### Destinations

Destinations are specific places (airports, stations, ports) selected via Google Places lookup.

**Challenge**: Google Places returns multiple listings for same location (e.g., 4 different "Manchester Airport" entries). System must normalize to canonical destination.

**Solution**: When admin adds destination, we:
1. Use Places API to search
2. Store the `place_id` as canonical identifier
3. Also store normalized name for display
4. When matching customer bookings, match on `place_id`

### Pricing Structure

- **Per vehicle type**: Standard, Executive, Minibus each have different prices
- **Per zone-destination pair**: Zone A to Heathrow = different price than Zone B to Heathrow
- **Return discount**: Apply platform-wide return discount (currently 15%)
- **One-way price stored**: Return calculated automatically

---

## Data Model

### Zone Definition

```
PK: TENANT#001#ZONE#zone-bournemouth-urban
SK: METADATA
{
  tenantId: "TENANT#001",
  zoneId: "zone-bournemouth-urban",
  name: "Bournemouth Urban",
  outwardCodes: ["BH1", "BH2", "BH3", "BH4", "BH5", "BH6", "BH7", "BH8"],
  description: "Central Bournemouth and immediate surrounds",
  active: true,
  createdAt: "2025-12-09T...",
  updatedAt: "2025-12-09T..."
}
```

### Destination Definition

```
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

### Zone Pricing (per vehicle)

```
PK: TENANT#001#ZONE#zone-bournemouth-urban
SK: DEST#dest-heathrow#VEHICLE#standard
{
  tenantId: "TENANT#001",
  zoneId: "zone-bournemouth-urban",
  destinationId: "dest-heathrow",
  vehicleType: "standard",
  oneWayPrice: 12500,  // pence (£125.00)
  active: true,
  createdAt: "2025-12-09T...",
  updatedAt: "2025-12-09T..."
}
```

### GSI for Postcode Lookup

To quickly find which zone a postcode belongs to:

```
GSI: PostcodeLookup
PK: TENANT#001#POSTCODE#BH1
SK: ZONE#zone-bournemouth-urban
{
  tenantId: "TENANT#001",
  outwardCode: "BH1",
  zoneId: "zone-bournemouth-urban"
}
```

This allows O(1) lookup: "What zone is BH1 in?" without scanning all zones.

---

## Frontend Quote Flow Integration

### Step 1: User enters pickup location

```javascript
// Extract postcode from Google Places result
const postcode = extractPostcode(pickupLocation.address);
// e.g., "BH1 2AB" -> outwardCode = "BH1"

// Check if outward code has zone pricing
const zoneCheck = await checkPostcodeZone(tenantId, outwardCode);
// Returns: { hasZonePricing: true, zoneId: "zone-bournemouth-urban" } or { hasZonePricing: false }
```

### Step 2: User enters destination

```javascript
// Check if destination has zone pricing configured
const destCheck = await checkDestination(tenantId, dropoffPlaceId);
// Returns: { hasZonePricing: true, destinationId: "dest-heathrow" } or { hasZonePricing: false }
```

### Step 3: Price calculation

```javascript
if (zoneCheck.hasZonePricing && destCheck.hasZonePricing) {
  // Use fixed zone pricing
  const zonePricing = await getZonePricing(tenantId, zoneCheck.zoneId, destCheck.destinationId);
  // Returns prices for all vehicle types
} else {
  // Fall back to variable pricing (distance-based)
  const variablePricing = await calculateVariablePricing(...);
}
```

---

## Admin UI Requirements

### Zone Management Screen

1. **Zone List View**
   - Table: Zone Name | Outward Codes | Destinations Priced | Active
   - Actions: Edit, Delete, Duplicate

2. **Zone Editor**
   - Zone name (text input)
   - Postcode selector (MAP-BASED)
     - Display UK postcode district map
     - Click to select/deselect outward codes
     - Show selected codes highlighted
     - Group select tools (e.g., "Select all BH")
   - Active toggle

3. **Map Component Requirements**
   - Interactive UK postcode boundary map
   - Zoom to relevant region
   - Click polygons to select
   - Visual feedback (color coding) for selected zones
   - Consider: Leaflet + UK postcode GeoJSON boundaries

### Destination Management Screen

1. **Destination List View**
   - Table: Name | Type | Place ID | Zones Priced | Active

2. **Destination Editor**
   - Google Places autocomplete search
   - Display selected location on map
   - Location type dropdown (airport, train_station, port, other)
   - Handle duplicate Places: "We found multiple listings for this location. Please confirm the correct one."

### Pricing Matrix Screen

1. **Grid View**
   - Rows: Zones
   - Columns: Destinations
   - Cells: Price (click to edit)
   - Vehicle type tabs (Standard | Executive | Minibus)

2. **Bulk Edit**
   - Select multiple cells
   - Apply percentage adjustment
   - Copy prices between vehicle types

---

## API Endpoints

### Zone Management

```
GET    /admin/zones                    - List all zones
POST   /admin/zones                    - Create zone
GET    /admin/zones/{zoneId}           - Get zone details
PUT    /admin/zones/{zoneId}           - Update zone
DELETE /admin/zones/{zoneId}           - Delete zone (soft delete)
```

### Destination Management

```
GET    /admin/destinations             - List all destinations
POST   /admin/destinations             - Create destination
GET    /admin/destinations/{destId}    - Get destination details
PUT    /admin/destinations/{destId}    - Update destination
DELETE /admin/destinations/{destId}    - Delete destination (soft delete)
```

### Zone Pricing

```
GET    /admin/zones/{zoneId}/pricing                           - Get all pricing for zone
PUT    /admin/zones/{zoneId}/pricing/{destId}/{vehicleType}    - Set price
DELETE /admin/zones/{zoneId}/pricing/{destId}/{vehicleType}    - Remove price
POST   /admin/zones/{zoneId}/pricing/bulk                      - Bulk update prices
```

### Public Quote Integration

```
GET    /v1/zones/check?postcode={outwardCode}                  - Check if postcode has zone pricing
GET    /v1/zones/{zoneId}/destinations/{destId}/pricing        - Get zone pricing for quote
```

---

## Implementation Phases

### Phase 1: Backend Foundation (Priority)
- [ ] Create DynamoDB table/schema for zones
- [ ] Create zone-manager Lambda function
- [ ] Implement CRUD operations
- [ ] Implement postcode lookup GSI
- [ ] Add zone pricing check to quotes-calculator

### Phase 2: Admin UI - Basic
- [ ] Zone list view
- [ ] Zone CRUD (text-based postcode input initially)
- [ ] Destination management
- [ ] Pricing matrix grid

### Phase 3: Admin UI - Map Enhancement
- [ ] Integrate UK postcode boundary map
- [ ] Click-to-select zone editor
- [ ] Visual zone coverage display

### Phase 4: Frontend Integration
- [ ] Postcode extraction from addresses
- [ ] Zone pricing detection in quote flow
- [ ] Display "Fixed Price Route" indicator to users

---

## Edge Cases

1. **Postcode not found**: Fall back to variable pricing
2. **Destination not configured**: Fall back to variable pricing
3. **Zone exists but no price for vehicle type**: Fall back to variable pricing
4. **Multiple zones match postcode**: Error - admin must fix overlapping zones
5. **Postcode extraction fails**: Fall back to variable pricing
6. **Surge pricing**: Apply surge multiplier to zone prices (same as variable)

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

- Multi-tenant foundation (tenantId in all records)
- UK postcode boundary GeoJSON data
- Map library (Leaflet recommended)

---

## Open Questions

1. Should surge pricing apply to zone prices? (Assumed: Yes)
2. Should we support bi-directional pricing? (Zone A to Heathrow vs Heathrow to Zone A)
3. Maximum zones per tenant? (Suggested: 50)
4. Maximum destinations per tenant? (Suggested: 100)

---

**Document Owner**: CTO
**Next Review**: After tenant foundation implementation
