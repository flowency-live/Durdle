# Durdle Transport - Pricing Engine Logic

**Version:** 2.0
**Last Updated:** 2025-12-06
**Status:** Active

---

## Overview

The Durdle pricing engine calculates journey costs based on three factors:
1. **Base Fare** - Fixed cost per journey (vehicle-dependent)
2. **Distance Charge** - Cost per mile traveled (vehicle-dependent)
3. **Wait Time Charge** - Cost per minute of waiting at waypoints (vehicle-dependent)

---

## Pricing Models

### Model 1: Fixed Route Pricing

**Applicability:** Pre-configured origin-destination pairs for specific vehicle types

**Formula:**
```
Total = Fixed Price (stored in database)
```

**Characteristics:**
- No calculation required
- Price set by admin in fixed-routes table
- Only applies to direct journeys (pickup → dropoff)
- **Does NOT support waypoints** - if waypoints present, fallback to variable pricing

**Example:**
```
London Heathrow → Bournemouth (Standard Sedan) = £120.00 (fixed)
```

---

### Model 2: Variable Pricing (Simple Journey)

**Applicability:** Direct journeys without waypoints (pickup → dropoff)

**Formula:**
```
Total = baseFare + (totalDistance × perMile)
```

**Characteristics:**
- NO time-based charge for simple journeys
- Distance calculated via Google Maps Distance Matrix API
- Journey duration is calculated but NOT used for pricing

**Example:**
```
Vehicle: Standard Sedan
- baseFare: £5.00 (500 pence)
- perMile: £1.00 (100 pence)
- perMinute: £0.10 (10 pence) [NOT USED]

Journey: Bournemouth → Poole (12.5 miles, 25 minutes driving)
Calculation:
- Base Fare: £5.00
- Distance Charge: 12.5 miles × £1.00 = £12.50
- Wait Time Charge: £0.00 (no waypoints)
Total: £17.50
```

---

### Model 3: Variable Pricing (Journey with Waypoints)

**Applicability:** Multi-stop journeys with optional wait times

**Formula:**
```
Total = baseFare + (totalRouteDistance × perMile) + (totalWaitTime × perMinute)
```

**Characteristics:**
- Distance is calculated through ALL waypoints (not direct A to B)
- Wait time is ONLY explicit wait times at waypoints (NOT driving time)
- Driving duration between stops is NOT charged
- Uses Google Maps Directions API (supports waypoints)

**Example:**
```
Vehicle: Executive Sedan
- baseFare: £8.00 (800 pence)
- perMile: £1.50 (150 pence)
- perMinute: £0.15 (15 pence)

Journey:
- Pickup: Bournemouth Town Centre
- Waypoint 1: Bournemouth Airport (wait 30 minutes)
- Waypoint 2: Sandbanks Beach (wait 2 hours = 120 minutes)
- Dropoff: Poole Harbour

Route Distance: 18.2 miles (through all stops)
Total Wait Time: 30 + 120 = 150 minutes

Calculation:
- Base Fare: £8.00
- Distance Charge: 18.2 miles × £1.50 = £27.30
- Wait Time Charge: 150 minutes × £0.15 = £22.50
Total: £57.80
```

---

## Pricing Rules & Business Logic

### Rule 1: Fixed Route Priority
- If journey matches a fixed route (exact origin, destination, vehicle match)
- AND no waypoints are present
- THEN use fixed route price (skip variable calculation)

### Rule 2: Waypoints Disable Fixed Routes
- If waypoints are present in request
- THEN skip fixed route lookup entirely
- THEN use variable pricing Model 3

### Rule 3: Distance Calculation Method
- **Simple Journey:** Google Maps Distance Matrix API (fastest route from A to B)
- **Journey with Waypoints:** Google Maps Directions API with waypoints parameter
- Distance is TOTAL route through all stops, not direct distance

### Rule 4: Wait Time Inclusion
- Wait time charge applies ONLY when `waitTime > 0` for at least one waypoint
- If waypoints exist but all have `waitTime = 0`, no wait time charge
- Maximum wait time per waypoint: 480 minutes (8 hours)
- Maximum number of waypoints: 3

### Rule 5: Driving Time Exclusion
- Journey driving/travel time is NOT charged (as of v2.0)
- Only explicit wait times at waypoints are charged
- Example: 2-hour drive + 30-minute wait = charge for 30 minutes only

---

## Vehicle Pricing Configuration

Pricing rates are stored in `durdle-pricing-config-dev` DynamoDB table.

### Standard Sedan
```json
{
  "vehicleId": "standard",
  "name": "Standard Sedan",
  "baseFare": 500,      // £5.00
  "perMile": 100,       // £1.00/mile
  "perMinute": 10,      // £0.10/minute (wait time only)
  "capacity": 4
}
```

### Executive Sedan
```json
{
  "vehicleId": "executive",
  "name": "Executive Sedan",
  "baseFare": 800,      // £8.00
  "perMile": 150,       // £1.50/mile
  "perMinute": 15,      // £0.15/minute (wait time only)
  "capacity": 4
}
```

### Minibus
```json
{
  "vehicleId": "minibus",
  "name": "Minibus",
  "baseFare": 1000,     // £10.00
  "perMile": 120,       // £1.20/mile
  "perMinute": 12,      // £0.12/minute (wait time only)
  "capacity": 8
}
```

**Note:** All prices stored in pence for precision.

---

## Price Breakdown Structure

### Simple Journey (No Waypoints)
```json
{
  "pricing": {
    "currency": "GBP",
    "breakdown": {
      "baseFare": 500,
      "distanceCharge": 1250,
      "waitTimeCharge": 0,
      "subtotal": 1750,
      "tax": 0,
      "total": 1750
    },
    "displayTotal": "£17.50"
  }
}
```

### Journey with Waypoints and Wait Times
```json
{
  "pricing": {
    "currency": "GBP",
    "breakdown": {
      "baseFare": 800,
      "distanceCharge": 2730,
      "waitTimeCharge": 2250,
      "subtotal": 5780,
      "tax": 0,
      "total": 5780
    },
    "displayTotal": "£57.80"
  }
}
```

---

## API Integration

### Google Maps Distance Matrix API
**Used for:** Simple journeys (no waypoints)

**Endpoint:**
```
https://maps.googleapis.com/maps/api/distancematrix/json
```

**Parameters:**
```
origins: pickup address or place_id
destinations: dropoff address or place_id
units: imperial
key: [API key from Secrets Manager]
```

**Returns:**
- Distance (meters) → converted to miles
- Duration (seconds) → converted to minutes (NOT charged)

---

### Google Maps Directions API
**Used for:** Journeys with waypoints

**Endpoint:**
```
https://maps.googleapis.com/maps/api/directions/json
```

**Parameters:**
```
origin: pickup place_id
destination: dropoff place_id
waypoints: optimize:false|place_id:wp1|place_id:wp2
units: imperial
key: [API key from Secrets Manager]
```

**Returns:**
- Total route distance through all waypoints (meters) → converted to miles
- Total route duration (seconds) → converted to minutes (NOT charged)
- Polyline (encoded route path)

**Note:** `optimize:false` ensures waypoints are visited in order specified

---

## Quote Request Payload

### Simple Journey
```json
{
  "pickupLocation": {
    "address": "Bournemouth Town Centre",
    "placeId": "ChIJ..."
  },
  "dropoffLocation": {
    "address": "Poole Harbour",
    "placeId": "ChIJ..."
  },
  "pickupTime": "2025-12-07T10:00:00Z",
  "passengers": 2,
  "luggage": 1,
  "vehicleType": "standard"
}
```

### Journey with Waypoints
```json
{
  "pickupLocation": {
    "address": "Bournemouth Town Centre",
    "placeId": "ChIJ..."
  },
  "dropoffLocation": {
    "address": "Poole Harbour",
    "placeId": "ChIJ..."
  },
  "waypoints": [
    {
      "address": "Bournemouth Airport",
      "placeId": "ChIJ...",
      "waitTime": 30
    },
    {
      "address": "Sandbanks Beach",
      "placeId": "ChIJ...",
      "waitTime": 120
    }
  ],
  "pickupTime": "2025-12-07T10:00:00Z",
  "passengers": 4,
  "luggage": 2,
  "vehicleType": "executive"
}
```

---

## Validation Rules

### Input Validation
- **Pickup Location:** Required (address + optional placeId)
- **Dropoff Location:** Required (address + optional placeId)
- **Pickup and Dropoff:** Must be different locations
- **Passengers:** 1-8 (must not exceed vehicle capacity)
- **Waypoints:** Maximum 3
- **Wait Time per Waypoint:** 0-480 minutes (8 hours max)
- **Pickup Time:** Must be at least 24 hours from now

### Business Logic Validation
- If vehicle capacity < passengers → reject request
- If waypoints present + fixed route match → ignore fixed route
- If invalid placeId → fallback to address geocoding

---

## Edge Cases & Handling

### Case 1: Waypoint without Wait Time
```
Waypoint: { address: "Airport", placeId: "...", waitTime: 0 }
Result: Route includes waypoint in distance calculation, no wait time charge
```

### Case 2: Empty Waypoint Address
```
Waypoint: { address: "", placeId: "", waitTime: 60 }
Result: Waypoint filtered out before API call (frontend and backend)
```

### Case 3: Fixed Route with Waypoints
```
Request: Heathrow → Bournemouth (fixed route exists) + 1 waypoint
Result: Fixed route ignored, variable pricing applied
```

### Case 4: Google Maps API Failure
```
Error: Distance/Directions API returns error
Result: Return 500 error with message "Unable to calculate route"
```

### Case 5: Missing placeId
```
Request: Only address provided (no placeId)
Result: Google API geocodes address automatically
```

---

## Cost Optimization

### API Key Caching
- Google Maps API key cached in Lambda container memory
- Reduces Secrets Manager API calls

### Vehicle Pricing Caching
- Vehicle pricing cached for 5 minutes in Lambda memory
- Reduces DynamoDB read capacity consumption

### Fixed Route Lookup
- Direct DynamoDB query (no scan)
- O(1) lookup by PK + SK composite key

---

## Testing Scenarios

### Test 1: Simple Journey (Distance Only)
```
Input: Bournemouth → Poole, Standard, 2 passengers
Expected: baseFare + distanceCharge (NO waitTimeCharge)
```

### Test 2: Journey with Waypoints, No Wait
```
Input: A → B → C → D, all waitTime = 0
Expected: baseFare + distanceCharge (route through B, C)
```

### Test 3: Journey with Waypoints and Wait Times
```
Input: A → B (wait 30) → C (wait 60) → D
Expected: baseFare + distanceCharge + (90 × perMinute)
```

### Test 4: Fixed Route, No Waypoints
```
Input: Heathrow → Bournemouth (fixed route exists)
Expected: Fixed price from database (e.g., £120.00)
```

### Test 5: Fixed Route Bypassed by Waypoints
```
Input: Heathrow → Waypoint → Bournemouth
Expected: Variable pricing (fixed route ignored)
```

---

## Version History

### Version 2.0 (2025-12-06)
- **BREAKING CHANGE:** Removed driving time from pricing calculation
- Added waypoint support with wait time charging
- Driving duration now excluded from all journey types
- Wait time charge only applies to explicit waypoint wait times

### Version 1.0 (2025-12-05)
- Initial pricing engine
- Simple journey pricing: baseFare + distance + duration
- Fixed route support
- No waypoint support

---

## References

- [Technical Architecture Document](TechnicalArchitecture.md)
- [Quote Wizard Implementation Spec](FeatureDev/QUOTE_WIZARD_IMPLEMENTATION_SPEC.md)
- [Google Maps Distance Matrix API Docs](https://developers.google.com/maps/documentation/distance-matrix)
- [Google Maps Directions API Docs](https://developers.google.com/maps/documentation/directions)
