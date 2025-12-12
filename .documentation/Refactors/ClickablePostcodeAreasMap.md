# Clickable Postcode Areas Map - Refactor Plan

**Status**: Approved for Implementation
**Date**: December 12, 2025
**Replaces**: Polygon drawing approach in ZoneMap.tsx

---

## Problem Statement

The current polygon drawing approach is impractical:
- Difficult to visualize overlapping zones
- Cannot see which postcodes belong to which zone at a glance
- Hard to make precise selections along irregular postcode boundaries
- Polygon drawing is a "gimmick" - not production-ready UX

---

## Solution Overview

Replace polygon drawing with **clickable/paintable postcode district shapes** using real UK boundary GeoJSON data, with **tenant-configurable coverage areas**.

---

## Data Source

**GitHub: missinglink/uk-postcode-polygons**
- URL: https://github.com/missinglink/uk-postcode-polygons
- Format: GeoJSON files organized by postcode AREA (BH, DT, SP, etc.)
- Each file contains a FeatureCollection with one Feature per DISTRICT (BH1, BH2, BH23, etc.)
- License: Data derived from Wikipedia/OpenStreetMap - free to use
- ~120 postcode areas in UK total

**Verified BH.geojson structure:**
- 31 districts (BH1, BH2, BH3... BH31)
- ~185KB file size
- Properties: `name` (e.g., "BH1"), `description` (e.g., "BH1 postcode district")
- Standard GeoJSON FeatureCollection with Polygon geometries

---

## Cost Analysis

### S3 Storage (Most Cost-Effective)

| Item | Size | Monthly Cost |
|------|------|--------------|
| ~120 GeoJSON files | ~15MB total | $0.00035/month |
| GET requests (1000/month) | - | $0.0004/month |
| **Total** | - | **< $0.01/month** |

### Why S3 is Optimal

1. **No Lambda compute costs** - Static file serving
2. **No API Gateway costs** - Direct S3 access
3. **Browser caching** - Files rarely change, cache for 30 days
4. **CloudFront optional** - Only if high traffic (adds ~$0.085/GB)

### Alternative Considered: Bundle in Lambda

- Would increase Lambda package size by 15MB
- Cold start penalty
- Redeployment needed to update boundary data
- **Rejected**: S3 is simpler and cheaper

---

## Multi-Tenant Architecture

### Tenant Configuration

Each tenant specifies which postcode AREAS they cover using just the letters:

```
DorsetTC:      ["BH", "DT", "SP", "SO", "BA", "TA", "EX"]
OxfordshireTC: ["OX", "HP", "MK", "NN", "CV"]
ManchesterTC:  ["M", "SK", "OL", "BL", "WN", "WA", "CW"]
```

### S3 Bucket Structure

```
s3://durdle-assets-dev/
  postcode-boundaries/
    BH.geojson      (~185KB)
    DT.geojson      (~80KB)
    M.geojson       (~200KB)
    OX.geojson      (~150KB)
    ... (all ~120 UK areas)
```

### Dynamic Loading Flow

1. Admin loads zone management page
2. Frontend fetches tenant config -> gets `["BH", "DT", "SP", ...]`
3. Frontend fetches only those GeoJSON files from S3 in parallel
4. Merges into single FeatureCollection for map display

---

## Implementation Phases

### Phase 1: S3 Boundary Data Setup

1. Download ALL UK postcode area GeoJSON files from GitHub repo
2. Upload to S3 bucket `durdle-assets-dev/postcode-boundaries/`
3. Set public read access with CORS for frontend
4. Set Cache-Control headers (30 days)

### Phase 2: Tenant Configuration

**DynamoDB Record** (durdle-pricing-config-dev):
```json
{
  "PK": "TENANT#001",
  "SK": "CONFIG",
  "tenantId": "001",
  "name": "Dorset Transfer Company",
  "postcodeAreas": ["BH", "DT", "SP", "SO", "BA", "TA", "EX"],
  "mapCenter": { "lat": 50.75, "lon": -2.0 },
  "defaultZoom": 9
}
```

**New API Endpoint**: `GET /admin/tenant-config`
- Returns tenant's postcode areas and map settings
- Used by frontend to know which GeoJSON files to fetch

### Phase 3: New Map Component

**File**: `components/admin/ZoneMapClickable.tsx`

**Features**:
1. Fetch tenant config -> get list of postcode areas
2. Fetch GeoJSON files from S3 for those areas (parallel)
3. Render postcode boundaries as Leaflet GeoJSON layer
4. Click to select: Click a district to toggle selection
5. Paint mode: Hold Shift + drag to "paint" over multiple districts
6. Visual states:
   - Unselected: Light gray fill, darker border
   - Selected (current zone): Blue fill
   - Assigned to OTHER zone: Different color + zone name tooltip
   - Hovering: Highlight effect

**Implementation approach**:
```typescript
// 1. Fetch tenant config
const config = await fetch('/api/admin/tenant-config');
const { postcodeAreas } = await config.json();

// 2. Fetch GeoJSON files in parallel
const S3_BASE = 'https://durdle-assets-dev.s3.eu-west-2.amazonaws.com/postcode-boundaries';
const boundaries = await Promise.all(
  postcodeAreas.map(area => fetch(`${S3_BASE}/${area}.geojson`).then(r => r.json()))
);

// 3. Merge into single FeatureCollection
const merged = {
  type: 'FeatureCollection',
  features: boundaries.flatMap(fc => fc.features)
};

// 4. Render each district as interactive polygon
L.geoJSON(merged, {
  style: (feature) => getDistrictStyle(feature.properties.name, selectedCodes, zoneAssignments),
  onEachFeature: (feature, layer) => {
    layer.on('click', () => toggleSelection(feature.properties.name));
    layer.on('mouseover', () => highlightDistrict(layer));
    layer.on('mouseout', () => unhighlightDistrict(layer));
  }
});
```

### Phase 4: Paint/Brush Selection Mode

**UX Flow**:
1. User clicks "Paint Mode" button (or holds Shift)
2. Cursor changes to brush icon
3. As user drags over map, any district touched gets selected
4. Release to finish painting
5. Click "Paint Mode" again to exit

**Technical approach**:
- Track mouse position on `mousemove`
- Use Leaflet's `map.containerPointToLatLng()` to get coordinates
- Use Turf.js `booleanPointInPolygon` to check which district contains point
- Add to selection set

### Phase 5: Zone Assignment Visualization

**Show existing zone assignments**:
- Query all zones on page load
- Build lookup: `{ [outwardCode]: zoneId }`
- Color-code districts by zone
- Add legend showing zone colors
- Tooltip shows: "BH1 - Bournemouth Central (Zone: Bournemouth Urban)"

### Phase 6: Update Zone Pages

**Modify**:
- `app/admin/zones/new/page.tsx`
- `app/admin/zones/[zoneId]/page.tsx`

**Changes**:
- Replace `ZoneMapLoader` with new `ZoneMapClickable`
- Remove polygon-related state
- Remove Geoman dependency (no longer drawing polygons)
- Keep manual entry mode as fallback

### Phase 7: Backend Updates

**zone-manager Lambda**:
- Add `GET /admin/tenant-config` endpoint
- Remove `/admin/zones/resolve-polygon` endpoint (no longer needed)
- Remove Turf.js dependency from Lambda (move to frontend if needed for paint mode)

---

## File Changes Summary

| File | Action |
|------|--------|
| `s3://durdle-assets-dev/postcode-boundaries/*.geojson` | CREATE - All ~120 UK area files |
| `components/admin/ZoneMapClickable.tsx` | CREATE - New map component |
| `components/admin/ZoneMapLoader.tsx` | MODIFY - Load new component |
| `app/admin/zones/new/page.tsx` | MODIFY - Use new map |
| `app/admin/zones/[zoneId]/page.tsx` | MODIFY - Use new map |
| `durdle-serverless-api/functions/zone-manager/index.mjs` | MODIFY - Add tenant-config endpoint |
| `components/admin/ZoneMap.tsx` | DELETE (after migration) |

---

## Benefits

1. **Multi-tenant ready**: Each tenant just configures their postcode areas
2. **No code changes for new tenants**: Just add config + they're live
3. **Efficient loading**: Only fetch GeoJSON files tenant needs
4. **Centralized data**: One S3 bucket serves all tenants
5. **Easy updates**: Replace GeoJSON files without code deploy
6. **Cost-effective**: < $0.01/month for storage and requests

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| S3 request costs at scale | CloudFront caching, browser cache headers |
| Missing areas in source data | Manual entry fallback always available |
| Large area files (London) | Gzip compression, lazy load if needed |
| CORS issues | Configure S3 bucket CORS policy |

---

## New Tenant Onboarding Checklist

When a new tenant signs up:

1. Create DynamoDB config record with their postcode areas
2. Set map center coordinates for their region
3. Done - no code deployment needed

---

## Estimated Effort

| Task | Time |
|------|------|
| S3 setup & data upload | 1 hour |
| Tenant config endpoint | 30 min |
| New map component | 2-3 hours |
| Paint mode | 1 hour |
| Zone assignment visualization | 1 hour |
| Integration & testing | 1 hour |
| **Total** | **~7 hours** |
