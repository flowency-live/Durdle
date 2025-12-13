import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { safeValidateQuoteRequest } from './validation.mjs';
import logger, {
  createLogger,
  logQuoteCalculationStart,
  logQuoteCalculationSuccess,
  logQuoteCalculationError,
  logExternalApiCall,
  logDatabaseOperation,
  logValidationError,
  logCacheAccess,
} from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantPK, logTenantContext } from '/opt/nodejs/tenant.mjs';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME;
const FIXED_ROUTES_TABLE_NAME = process.env.FIXED_ROUTES_TABLE_NAME || 'durdle-fixed-routes-dev';
const PRICING_TABLE_NAME = process.env.PRICING_TABLE_NAME || 'durdle-pricing-config-dev';
const SURGE_TABLE_NAME = process.env.SURGE_TABLE_NAME || 'durdle-surge-rules-dev';
const CORPORATE_TABLE_NAME = process.env.CORPORATE_TABLE_NAME || 'durdle-corporate-dev';
const GOOGLE_MAPS_SECRET_NAME = 'durdle/google-maps-api-key';

let cachedApiKey = null;
let vehiclePricingCache = null;
let pricingCacheTime = null;
let surgeRulesCache = null;
let surgeRulesCacheTime = null;
const PRICING_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SURGE_CACHE_DURATION = 1 * 60 * 1000; // 1 minute for surge (more responsive to admin changes)

async function getGoogleMapsApiKey() {
  if (cachedApiKey) return cachedApiKey;

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: GOOGLE_MAPS_SECRET_NAME })
    );
    cachedApiKey = response.SecretString;
    return cachedApiKey;
  } catch (error) {
    logger.error({
      event: 'secrets_manager_error',
      secretName: GOOGLE_MAPS_SECRET_NAME,
      errorMessage: error.message,
    }, 'Failed to retrieve Google Maps API key');
    throw new Error('Configuration error');
  }
}

async function getVehiclePricing(tenantId) {
  // Check if cache is still valid
  if (vehiclePricingCache && pricingCacheTime && (Date.now() - pricingCacheTime < PRICING_CACHE_DURATION)) {
    return vehiclePricingCache;
  }

  try {
    // Dual-format filter: supports both old (VEHICLE#id) and new (TENANT#001#VEHICLE#id) PK formats
    const command = new ScanCommand({
      TableName: PRICING_TABLE_NAME,
      FilterExpression: '(begins_with(PK, :tenantPrefix) OR begins_with(PK, :oldPrefix)) AND SK = :sk AND (attribute_not_exists(tenantId) OR tenantId = :tenantId)',
      ExpressionAttributeValues: {
        ':tenantPrefix': `${tenantId}#VEHICLE#`,
        ':oldPrefix': 'VEHICLE#',
        ':sk': 'METADATA',
        ':tenantId': tenantId
      }
    });

    const result = await docClient.send(command);

    if (!result.Items || result.Items.length === 0) {
      logger.warn({ event: 'pricing_fallback' }, 'No vehicle pricing in DynamoDB, using fallback');
      return getFallbackPricing();
    }

    // Convert to lookup map
    const pricing = {};
    result.Items.forEach(item => {
      pricing[item.vehicleId] = {
        baseFare: item.baseFare,
        perMile: item.perMile,
        perMinute: item.perMinute,
        returnDiscount: item.returnDiscount ?? 0, // Default 0% discount
        name: item.name,
        description: item.description,
        capacity: item.capacity,
        features: item.features || [],
        imageUrl: item.imageUrl || ''
      };
    });

    vehiclePricingCache = pricing;
    pricingCacheTime = Date.now();
    logger.debug({ event: 'pricing_cache_updated', vehicleCount: Object.keys(pricing).length }, 'Vehicle pricing cached');

    return pricing;
  } catch (error) {
    logger.error({
      event: 'dynamodb_pricing_error',
      tableName: PRICING_TABLE_NAME,
      errorMessage: error.message,
    }, 'Failed to fetch vehicle pricing from DynamoDB');
    return getFallbackPricing();
  }
}

function getFallbackPricing() {
  return {
    standard: {
      baseFare: 500,
      perMile: 100,
      perMinute: 10,
      perHour: 3500, // £35/hour in pence
      returnDiscount: 15, // 15% discount on return journeys
      name: 'Standard Sedan',
      description: 'Comfortable sedan for up to 4 passengers',
      capacity: 4,
      features: ['Air Conditioning', 'Phone Charger'],
      imageUrl: ''
    },
    executive: {
      baseFare: 800,
      perMile: 150,
      perMinute: 15,
      perHour: 5000, // £50/hour in pence
      returnDiscount: 15, // 15% discount on return journeys
      name: 'Executive Sedan',
      description: 'Premium sedan with luxury amenities',
      capacity: 4,
      features: ['Air Conditioning', 'WiFi', 'Premium Amenities'],
      imageUrl: ''
    },
    minibus: {
      baseFare: 1000,
      perMile: 120,
      perMinute: 12,
      perHour: 7000, // £70/hour in pence
      returnDiscount: 15, // 15% discount on return journeys
      name: 'Minibus',
      description: 'Spacious minibus for up to 8 passengers',
      capacity: 8,
      features: ['Air Conditioning', 'WiFi', 'Extra Luggage Space'],
      imageUrl: ''
    }
  };
}

// Check surge pricing for a specific pickup date/time
async function checkSurgePricing(pickupDateTime, tenantId) {
  const pickupDate = new Date(pickupDateTime);
  const dayOfWeek = pickupDate.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase();
  const dateString = pickupDate.toISOString().split('T')[0]; // "2025-12-25"
  const timeString = pickupDate.toTimeString().slice(0, 5);  // "14:30"

  // Use cache if available
  if (surgeRulesCache && surgeRulesCacheTime && (Date.now() - surgeRulesCacheTime < SURGE_CACHE_DURATION)) {
    return calculateSurge(surgeRulesCache, dateString, dayOfWeek, timeString);
  }

  try {
    // Dual-format filter: supports both old (SURGE_RULE#id) and new (TENANT#001#SURGE_RULE#id) PK formats
    const command = new ScanCommand({
      TableName: SURGE_TABLE_NAME,
      FilterExpression: '(begins_with(PK, :tenantPrefix) OR begins_with(PK, :oldPrefix)) AND isActive = :active AND (attribute_not_exists(tenantId) OR tenantId = :tenantId)',
      ExpressionAttributeValues: {
        ':tenantPrefix': `${tenantId}#SURGE_RULE#`,
        ':oldPrefix': 'SURGE_RULE#',
        ':active': true,
        ':tenantId': tenantId
      }
    });

    const result = await docClient.send(command);
    const rules = result.Items || [];

    // Cache the rules
    surgeRulesCache = rules;
    surgeRulesCacheTime = Date.now();

    logger.info({
      event: 'surge_rules_fetched',
      ruleCount: rules.length,
      activeRules: rules.length,
    }, 'Fetched surge pricing rules from DynamoDB');

    return calculateSurge(rules, dateString, dayOfWeek, timeString);
  } catch (error) {
    logger.error({
      event: 'surge_pricing_error',
      errorMessage: error.message,
    }, 'Failed to check surge pricing');
    // Return no surge on error (fail open for customer benefit)
    return {
      combinedMultiplier: 1.0,
      isPeakPricing: false,
      appliedRules: [],
      wasCapped: false,
    };
  }
}

// Calculate which surge rules apply to the given date/time
function calculateSurge(rules, dateString, dayOfWeek, timeString) {
  const appliedRules = [];
  const MAX_MULTIPLIER = 3.0;

  for (const rule of rules) {
    let matches = false;

    switch (rule.ruleType) {
      case 'specific_dates':
        matches = rule.dates && rule.dates.includes(dateString);
        break;

      case 'date_range':
        matches = dateString >= rule.startDate && dateString <= rule.endDate;
        break;

      case 'day_of_week':
        if (rule.daysOfWeek && rule.daysOfWeek.includes(dayOfWeek)) {
          // Check optional date range constraint
          if (rule.startDate && rule.endDate) {
            matches = dateString >= rule.startDate && dateString <= rule.endDate;
          } else {
            matches = true;
          }
        }
        break;

      case 'time_of_day':
        if (rule.startTime && rule.endTime) {
          const timeMatches = timeString >= rule.startTime && timeString <= rule.endTime;
          if (timeMatches) {
            // Check optional day of week constraint
            if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
              matches = rule.daysOfWeek.includes(dayOfWeek);
            } else {
              matches = true;
            }
          }
        }
        break;
    }

    // Additional time constraint check for day_of_week rules
    if (matches && rule.ruleType === 'day_of_week' && rule.startTime && rule.endTime) {
      matches = timeString >= rule.startTime && timeString <= rule.endTime;
    }

    if (matches) {
      appliedRules.push({
        ruleId: rule.ruleId,
        name: rule.name,
        multiplier: rule.multiplier
      });
    }
  }

  // Calculate combined multiplier (STACK - multiply together)
  let combinedMultiplier = appliedRules.reduce(
    (acc, rule) => acc * rule.multiplier,
    1.0
  );

  // Cap at 3.0x maximum
  const wasCapped = combinedMultiplier > MAX_MULTIPLIER;
  if (wasCapped) {
    combinedMultiplier = MAX_MULTIPLIER;
  }

  return {
    combinedMultiplier,
    isPeakPricing: combinedMultiplier > 1.0,
    appliedRules,
    wasCapped,
  };
}

async function checkFixedRoute(originPlaceId, destinationPlaceId, vehicleId, tenantId) {
  if (!originPlaceId || !destinationPlaceId || !vehicleId) {
    return null;
  }

  try {
    // Try tenant-prefixed PK first
    const tenantPK = buildTenantPK(tenantId, 'ROUTE', originPlaceId);
    const command = new QueryCommand({
      TableName: FIXED_ROUTES_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': tenantPK,
        ':sk': `DEST#${destinationPlaceId}#VEHICLE#${vehicleId}`
      }
    });

    let result = await docClient.send(command);

    // Fallback to old PK format if not found
    if (!result.Items || result.Items.length === 0) {
      const oldCommand = new QueryCommand({
        TableName: FIXED_ROUTES_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `ROUTE#${originPlaceId}`,
          ':sk': `DEST#${destinationPlaceId}#VEHICLE#${vehicleId}`
        }
      });
      result = await docClient.send(oldCommand);
    }

    if (result.Items && result.Items.length > 0) {
      const route = result.Items[0];
      if (route.active) {
        return {
          routeId: route.routeId,
          price: route.price,
          distance: route.distance,
          estimatedDuration: route.estimatedDuration,
          isFixedRoute: true
        };
      }
    }

    return null;
  } catch (error) {
    logger.error({
      event: 'fixed_route_query_error',
      tableName: FIXED_ROUTES_TABLE_NAME,
      errorMessage: error.message,
    }, 'Failed to check fixed routes');
    return null;
  }
}

// Fetch corporate account discount percentage
async function getCorporateDiscount(corpAccountId, tenantId) {
  if (!corpAccountId) {
    return null;
  }

  try {
    // Look up corporate account by corpId
    const result = await docClient.send(new GetCommand({
      TableName: CORPORATE_TABLE_NAME,
      Key: {
        PK: buildTenantPK(tenantId, 'CORP', corpAccountId),
        SK: 'METADATA',
      },
    }));

    if (!result.Item) {
      logger.warn({
        event: 'corporate_account_not_found',
        corpAccountId,
        tenantId,
      }, 'Corporate account not found for discount lookup');
      return null;
    }

    // Only apply discount if account is active
    if (result.Item.status !== 'active') {
      logger.info({
        event: 'corporate_account_inactive',
        corpAccountId,
        status: result.Item.status,
      }, 'Corporate account not active, no discount applied');
      return null;
    }

    const discountPercentage = result.Item.discountPercentage || 0;

    logger.info({
      event: 'corporate_discount_found',
      corpAccountId,
      discountPercentage,
      companyName: result.Item.companyName,
    }, 'Corporate discount retrieved');

    return {
      corpAccountId,
      companyName: result.Item.companyName,
      discountPercentage,
    };
  } catch (error) {
    logger.error({
      event: 'corporate_discount_lookup_error',
      corpAccountId,
      errorMessage: error.message,
    }, 'Failed to lookup corporate discount');
    return null;
  }
}

async function calculateDistance(origin, destination, apiKey) {
  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';

  try {
    const response = await axios.get(url, {
      params: {
        origins: origin,
        destinations: destination,
        key: apiKey,
        units: 'imperial',
      },
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const element = response.data.rows[0].elements[0];

    if (element.status !== 'OK') {
      throw new Error(`Route calculation failed: ${element.status}`);
    }

    return {
      distance: {
        meters: element.distance.value,
        miles: (element.distance.value / 1609.34).toFixed(2),
        text: element.distance.text,
      },
      duration: {
        seconds: element.duration.value,
        minutes: Math.ceil(element.duration.value / 60),
        text: element.duration.text,
      },
    };
  } catch (error) {
    logger.error({
      event: 'google_maps_distance_error',
      errorMessage: error.message,
    }, 'Distance Matrix API failed');
    throw new Error('Unable to calculate route');
  }
}

async function calculateRouteWithWaypoints(origin, destination, waypoints, apiKey) {
  const url = 'https://maps.googleapis.com/maps/api/directions/json';

  try {
    // Validate and clean waypoints before sending to Google
    const validWaypoints = waypoints.filter(wp => {
      const hasValidPlaceId = wp.placeId && typeof wp.placeId === 'string' && wp.placeId.trim() !== '';
      const hasValidAddress = wp.address && typeof wp.address === 'string' && wp.address.trim() !== '';
      return hasValidPlaceId || hasValidAddress;
    });

    logger.info({
      event: 'waypoint_validation',
      originalCount: waypoints.length,
      validCount: validWaypoints.length,
      waypoints: validWaypoints.map(wp => ({
        hasPlaceId: !!wp.placeId,
        hasAddress: !!wp.address,
        addressLength: wp.address?.length || 0
      }))
    }, 'Validated waypoints for Google API');

    if (validWaypoints.length === 0) {
      throw new Error('No valid waypoints found - waypoints must have either a placeId or address');
    }

    // Build waypoints parameter for Directions API
    // Format: optimize:false|place_id:ChIJ...|place_id:ChIJ...
    const waypointsParam = validWaypoints
      .map(wp => {
        if (wp.placeId && wp.placeId.trim() !== '') {
          return `place_id:${wp.placeId.trim()}`;
        }
        // URL encode address to handle special characters
        return encodeURIComponent(wp.address.trim());
      })
      .join('|');

    // Format origin and destination - if they look like placeIds, prefix with place_id:
    const formatLocation = (location) => {
      if (location && location.startsWith('ChIJ')) {
        return `place_id:${location}`;
      }
      return location;
    };

    const formattedOrigin = formatLocation(origin);
    const formattedDestination = formatLocation(destination);

    const params = {
      origin: formattedOrigin,
      destination: formattedDestination,
      waypoints: `optimize:false|${waypointsParam}`,
      key: apiKey,
      units: 'imperial',
    };

    logger.info({
      event: 'google_directions_request',
      origin: formattedOrigin,
      destination: formattedDestination,
      waypointCount: validWaypoints.length,
      waypointsParam: waypointsParam.substring(0, 200) // Log first 200 chars
    }, 'Calling Google Directions API');

    const response = await axios.get(url, { params });

    logger.info({
      event: 'google_directions_response',
      status: response.data.status,
      routeCount: response.data.routes?.length || 0
    }, 'Google Directions API response');

    if (response.data.status !== 'OK') {
      logger.error({
        event: 'google_directions_api_error',
        status: response.data.status,
        errorMessage: response.data.error_message || 'No error message',
        availableRoutes: response.data.available_travel_modes
      }, 'Google Directions API returned non-OK status');
      throw new Error(`Google Maps Directions API error: ${response.data.status}${response.data.error_message ? ' - ' + response.data.error_message : ''}`);
    }

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    // Calculate total distance and duration across all legs
    let totalDistance = 0;
    let totalDuration = 0;

    route.legs.forEach(leg => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
    });

    return {
      distance: {
        meters: totalDistance,
        miles: (totalDistance / 1609.34).toFixed(2),
        text: `${(totalDistance / 1609.34).toFixed(1)} mi`,
      },
      duration: {
        seconds: totalDuration,
        minutes: Math.ceil(totalDuration / 60),
        text: `${Math.ceil(totalDuration / 60)} mins`,
      },
      polyline: route.overview_polyline?.points || null,
    };
  } catch (error) {
    logger.error({
      event: 'google_maps_directions_error',
      errorMessage: error.message,
      waypointCount: waypoints?.length || 0,
    }, 'Directions API failed');
    throw new Error('Unable to calculate route with waypoints');
  }
}

async function calculatePricing(distanceMiles, waitTimeMinutes, vehicleType = 'standard', tenantId) {
  const allPricing = await getVehiclePricing(tenantId);
  const rates = allPricing[vehicleType] || allPricing.standard;

  const baseFare = rates.baseFare;
  const distanceCharge = Math.round(distanceMiles * rates.perMile);
  const waitTimeCharge = Math.round(waitTimeMinutes * rates.perMinute);
  const subtotal = baseFare + distanceCharge + waitTimeCharge;
  const tax = 0;
  const total = subtotal + tax;

  return {
    currency: 'GBP',
    breakdown: {
      baseFare,
      distanceCharge,
      waitTimeCharge,
      subtotal,
      tax,
      total,
    },
    displayTotal: `£${(total / 100).toFixed(2)}`,
    vehicleMetadata: {
      name: rates.name,
      description: rates.description,
      capacity: rates.capacity,
      features: rates.features,
      imageUrl: rates.imageUrl
    }
  };
}

// ============================================================================
// ZONE PRICING FUNCTIONS
// ============================================================================

// Extract UK outward code from address string
// e.g., "123 High St, Bournemouth BH1 2AB" → "BH1"
function extractOutwardCode(address) {
  if (!address) return null;

  // Full postcode pattern: "BH1 2AB" or "BH12 1QE" or "SW1A 1AA"
  const fullMatch = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d[A-Z]{2}\b/i);
  if (fullMatch) return fullMatch[1].toUpperCase();

  // Partial match: Just outward code at end of string
  const partialMatch = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/i);
  return partialMatch ? partialMatch[1].toUpperCase() : null;
}

// Check if outward code is in tenant's service area
// tenantPostcodeAreas = ["BH", "DT", "SP", ...] - the area prefixes
// outwardCode = "BH1" → area = "BH"
function isInServiceArea(outwardCode, tenantPostcodeAreas) {
  if (!outwardCode || !tenantPostcodeAreas || !Array.isArray(tenantPostcodeAreas)) {
    return false;
  }
  // Extract area prefix from outward code (BH1 → BH, SW1A → SW)
  const area = outwardCode.replace(/\d.*$/, '');
  return tenantPostcodeAreas.includes(area);
}

// Query zone by postcode using GSI1
async function queryZoneByPostcode(outwardCode, tenantId) {
  if (!outwardCode) return null;

  try {
    const command = new QueryCommand({
      TableName: PRICING_TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `${tenantId}#POSTCODE#${outwardCode.toUpperCase()}`,
      },
    });

    const result = await docClient.send(command);

    if (result.Items && result.Items.length > 0) {
      // PostcodeLookup record found - extract zone info
      const lookup = result.Items[0];
      return {
        zoneId: lookup.zoneId,
        zoneName: lookup.zoneName,
      };
    }

    return null;
  } catch (error) {
    logger.error({
      event: 'zone_postcode_query_error',
      outwardCode,
      tenantId,
      errorMessage: error.message,
    }, 'Failed to query zone by postcode');
    return null;
  }
}

// Query destination by placeId (checks both main placeId and alternativePlaceIds)
async function queryDestinationByPlaceId(placeId, tenantId) {
  if (!placeId) return null;

  try {
    const command = new ScanCommand({
      TableName: PRICING_TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND tenantId = :tenantId AND (placeId = :placeId OR contains(alternativePlaceIds, :placeId))',
      ExpressionAttributeValues: {
        ':prefix': `${tenantId}#DESTINATION#`,
        ':sk': 'METADATA',
        ':tenantId': tenantId,
        ':placeId': placeId,
      },
    });

    const result = await docClient.send(command);

    if (result.Items && result.Items.length > 0) {
      const dest = result.Items[0];
      return {
        destinationId: dest.destinationId,
        name: dest.name,
        placeId: dest.placeId,
        alternativePlaceIds: dest.alternativePlaceIds || [],
        coordinates: dest.coordinates || null,
        locationType: dest.locationType,
      };
    }

    return null;
  } catch (error) {
    logger.error({
      event: 'destination_placeid_query_error',
      placeId,
      tenantId,
      errorMessage: error.message,
    }, 'Failed to query destination by placeId');
    return null;
  }
}

// Get all destinations for tenant (for proximity matching)
async function getAllDestinations(tenantId) {
  try {
    const command = new ScanCommand({
      TableName: PRICING_TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND tenantId = :tenantId AND active = :active',
      ExpressionAttributeValues: {
        ':prefix': `${tenantId}#DESTINATION#`,
        ':sk': 'METADATA',
        ':tenantId': tenantId,
        ':active': true,
      },
    });

    const result = await docClient.send(command);
    return result.Items || [];
  } catch (error) {
    logger.error({
      event: 'destinations_fetch_error',
      tenantId,
      errorMessage: error.message,
    }, 'Failed to fetch all destinations');
    return [];
  }
}

// Calculate haversine distance between two coordinates (in meters)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find nearest destination by proximity (for airports/stations with multiple place IDs)
async function findNearestDestination(coords, tenantId, maxDistanceMeters = 1000) {
  if (!coords || !coords.lat || !coords.lng) return null;

  const destinations = await getAllDestinations(tenantId);

  let nearest = null;
  let minDistance = Infinity;

  for (const dest of destinations) {
    if (!dest.coordinates || !dest.coordinates.lat || !dest.coordinates.lng) continue;

    const distance = haversineDistance(
      coords.lat, coords.lng,
      dest.coordinates.lat, dest.coordinates.lng
    );

    if (distance <= maxDistanceMeters && distance < minDistance) {
      nearest = {
        destination: {
          destinationId: dest.destinationId,
          name: dest.name,
          placeId: dest.placeId,
          coordinates: dest.coordinates,
          locationType: dest.locationType,
        },
        distance,
      };
      minDistance = distance;
    }
  }

  return nearest;
}

// Find destination using hybrid matching: exact placeId → alternativePlaceIds → proximity
async function findDestination(placeId, coords, tenantId, reqLogger) {
  // 1. Try exact placeId match (includes alternativePlaceIds check)
  const exactMatch = await queryDestinationByPlaceId(placeId, tenantId);
  if (exactMatch) {
    reqLogger.info({
      event: 'destination_exact_match',
      placeId,
      destinationId: exactMatch.destinationId,
    }, 'Found destination by exact placeId match');
    return exactMatch;
  }

  // 2. Proximity fallback for airports/stations (within 1km)
  if (coords && coords.lat && coords.lng) {
    const nearbyMatch = await findNearestDestination(coords, tenantId, 1000);
    if (nearbyMatch) {
      reqLogger.info({
        event: 'destination_proximity_match',
        inputPlaceId: placeId,
        matchedDestination: nearbyMatch.destination.destinationId,
        distanceMeters: Math.round(nearbyMatch.distance),
      }, 'Found destination by proximity match');
      return nearbyMatch.destination;
    }
  }

  return null;
}

// Get zone pricing for zone-destination pair
async function getZonePricingForPair(zoneId, destinationId, tenantId) {
  try {
    const command = new GetCommand({
      TableName: PRICING_TABLE_NAME,
      Key: {
        PK: `${tenantId}#ZONE#${zoneId}`,
        SK: `PRICING#${destinationId}`,
      },
    });

    const result = await docClient.send(command);

    if (result.Item && result.Item.active) {
      return {
        prices: result.Item.prices,
        name: result.Item.name,
      };
    }

    return null;
  } catch (error) {
    logger.error({
      event: 'zone_pricing_fetch_error',
      zoneId,
      destinationId,
      tenantId,
      errorMessage: error.message,
    }, 'Failed to fetch zone pricing');
    return null;
  }
}

// Main zone pricing check with bidirectional logic
async function checkZonePricing(pickup, dropoff, tenantId, reqLogger) {
  // Extract postcodes from both locations
  const pickupOutward = extractOutwardCode(pickup.address);
  const dropoffOutward = extractOutwardCode(dropoff?.address);

  reqLogger.info({
    event: 'zone_pricing_check_start',
    pickupOutward,
    dropoffOutward,
    pickupPlaceId: pickup.placeId?.substring(0, 10) + '...',
    dropoffPlaceId: dropoff?.placeId?.substring(0, 10) + '...',
  }, 'Starting zone pricing check');

  // Try pickup as zone, dropoff as destination
  let zone = pickupOutward ? await queryZoneByPostcode(pickupOutward, tenantId) : null;
  let destination = dropoff ? await findDestination(dropoff.placeId, dropoff.coords, tenantId, reqLogger) : null;
  let isReversed = false;

  // If no match, try reverse (dropoff as zone, pickup as destination)
  if (!zone || !destination) {
    const reverseZone = dropoffOutward ? await queryZoneByPostcode(dropoffOutward, tenantId) : null;
    const reverseDestination = pickup.placeId ? await findDestination(pickup.placeId, pickup.coords, tenantId, reqLogger) : null;

    if (reverseZone && reverseDestination) {
      zone = reverseZone;
      destination = reverseDestination;
      isReversed = true;
      reqLogger.info({ event: 'zone_pricing_reversed' }, 'Using reversed zone pricing (dropoff as zone, pickup as destination)');
    }
  }

  if (!zone || !destination) {
    reqLogger.debug({
      event: 'zone_pricing_no_match',
      hasZone: !!zone,
      hasDestination: !!destination,
    }, 'No zone pricing match found');
    return null;
  }

  // Get zone pricing for this combination
  const pricing = await getZonePricingForPair(zone.zoneId, destination.destinationId, tenantId);
  if (!pricing) {
    reqLogger.info({
      event: 'zone_pricing_not_configured',
      zoneId: zone.zoneId,
      destinationId: destination.destinationId,
    }, 'Zone-destination pair exists but no pricing configured');
    return null;
  }

  reqLogger.info({
    event: 'zone_pricing_match_found',
    zoneId: zone.zoneId,
    zoneName: zone.zoneName,
    destinationId: destination.destinationId,
    destinationName: destination.name,
    isReversed,
  }, 'Zone pricing match found');

  return {
    isZonePricing: true,
    zoneId: zone.zoneId,
    zoneName: zone.zoneName,
    destinationId: destination.destinationId,
    destinationName: destination.name,
    prices: pricing.prices,
    isReversed,
  };
}

// Get tenant configuration including service area
async function getTenantServiceArea(tenantId) {
  try {
    const command = new GetCommand({
      TableName: PRICING_TABLE_NAME,
      Key: {
        PK: `${tenantId}#TENANT`,
        SK: 'CONFIG',
      },
    });

    const result = await docClient.send(command);

    if (result.Item) {
      return {
        postcodeAreas: result.Item.postcodeAreas || [],
        companyName: result.Item.companyName,
      };
    }

    // Fallback: try legacy config location
    const legacyCommand = new GetCommand({
      TableName: PRICING_TABLE_NAME,
      Key: {
        PK: 'TENANT_CONFIG',
        SK: tenantId,
      },
    });

    const legacyResult = await docClient.send(legacyCommand);
    if (legacyResult.Item) {
      return {
        postcodeAreas: legacyResult.Item.postcodeAreas || [],
        companyName: legacyResult.Item.companyName,
      };
    }

    return { postcodeAreas: [] };
  } catch (error) {
    logger.error({
      event: 'tenant_config_fetch_error',
      tenantId,
      errorMessage: error.message,
    }, 'Failed to fetch tenant config');
    return { postcodeAreas: [] };
  }
}

// ============================================================================
// END ZONE PRICING FUNCTIONS
// ============================================================================

// Generate quote ID in format: DTC-Q{ddmmyy}{seq}
// Example: DTC-Q08120801 (Dec 8, 2025, first quote of the day)
async function generateFriendlyQuoteId() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const datePrefix = `${day}${month}${year}`; // ddmmyy format
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  try {
    // Query quotes created today to get the next sequence number
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :status AND GSI1SK >= :todayStart',
      ExpressionAttributeValues: {
        ':status': 'STATUS#saved',
        ':todayStart': `CREATED#${todayStart}`
      }
    });

    const result = await docClient.send(command);
    const todayCount = result.Items ? result.Items.length : 0;
    const sequenceNumber = String(todayCount + 1).padStart(2, '0');

    return `DTC-Q${datePrefix}${sequenceNumber}`;
  } catch (error) {
    // Fallback to UUID-based suffix if query fails
    return `DTC-Q${datePrefix}${randomUUID().slice(0, 2).toUpperCase()}`;
  }
}

// Generate a secure magic token for sharing quotes
function generateMagicToken() {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

// Store a saved quote (no TTL - persists until booking or explicit delete)
async function storeSavedQuote(quote, magicToken, logger, tenantId) {
  const item = {
    PK: buildTenantPK(tenantId, 'QUOTE', quote.quoteId),
    SK: 'METADATA',
    EntityType: 'Quote',
    tenantId, // Always include tenant attribute for filtering
    GSI1PK: `STATUS#${quote.status}`,
    GSI1SK: `CREATED#${quote.createdAt}`,
    // No TTL for saved quotes - they persist
    magicToken, // For secure retrieval without auth
    Data: quote,
    CreatedAt: Math.floor(new Date(quote.createdAt).getTime() / 1000),
    UpdatedAt: Math.floor(new Date(quote.createdAt).getTime() / 1000),
  };

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    logger.info({
      event: 'quote_saved',
      quoteId: quote.quoteId,
      tenantId,
    }, 'Quote saved to DynamoDB');
  } catch (error) {
    logger.error({
      event: 'dynamodb_put_error',
      tableName: TABLE_NAME,
      quoteId: quote.quoteId,
      tenantId,
      errorMessage: error.message,
    }, 'Failed to store quote in DynamoDB');
    throw new Error('Failed to save quote');
  }
}

// Retrieve a quote by ID and magic token (public access)
async function getQuoteByToken(quoteId, magicToken, logger, tenantId) {
  try {
    // Try tenant-prefixed PK first
    let result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: buildTenantPK(tenantId, 'QUOTE', quoteId),
        SK: 'METADATA',
      },
    }));

    // Fallback to old PK format if not found
    if (!result.Item) {
      result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `QUOTE#${quoteId}`,
          SK: 'METADATA',
        },
      }));
    }

    if (!result.Item) {
      return { found: false, error: 'Quote not found' };
    }

    // Verify magic token
    if (result.Item.magicToken !== magicToken) {
      logger.warn({
        event: 'invalid_magic_token',
        quoteId,
        tenantId,
      }, 'Invalid magic token for quote retrieval');
      return { found: false, error: 'Invalid token' };
    }

    return { found: true, quote: result.Item.Data };
  } catch (error) {
    logger.error({
      event: 'quote_retrieval_error',
      quoteId,
      tenantId,
      errorMessage: error.message,
    }, 'Failed to retrieve quote');
    return { found: false, error: 'Failed to retrieve quote' };
  }
}

export const handler = async (event, context) => {
  const startTime = Date.now();
  const logger = createLogger(event, context);
  const tenantId = getTenantId(event);

  const { httpMethod, path, pathParameters } = event;

  logger.info({
    event: 'lambda_invocation',
    httpMethod,
    path,
    pathParameters,
  }, 'Quote calculator invoked');

  logTenantContext(logger, tenantId, 'quotes_calculator');

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };

  // Handle OPTIONS for CORS
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Route: GET /quotes/{quoteId} - Retrieve saved quote by ID + token
  if (httpMethod === 'GET' && pathParameters?.quoteId) {
    const quoteId = pathParameters.quoteId;
    const token = event.queryStringParameters?.token;

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing token parameter' }),
      };
    }

    const result = await getQuoteByToken(quoteId, token, logger, tenantId);
    if (!result.found) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: result.error }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.quote),
    };
  }

  // Route: POST /quotes/save - Save a quote for sharing
  if (httpMethod === 'POST' && path?.includes('/save')) {
    try {
      const rawBody = JSON.parse(event.body || '{}');

      // Validate that quote data is present
      if (!rawBody.quote || !rawBody.quote.pricing) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing quote data' }),
        };
      }

      // Generate quote ID and magic token
      const quoteId = await generateFriendlyQuoteId();
      const magicToken = generateMagicToken();
      const now = new Date().toISOString();

      const savedQuote = {
        ...rawBody.quote,
        quoteId,
        status: 'saved',
        createdAt: now,
        updatedAt: now,
      };

      await storeSavedQuote(savedQuote, magicToken, logger, tenantId);

      // Return quote ID, token, and shareable URL
      const frontendUrl = process.env.FRONTEND_URL || 'https://durdle.flowency.build';
      const shareUrl = `${frontendUrl}/quote/${quoteId}?token=${magicToken}`;

      logger.info({
        event: 'quote_saved_success',
        quoteId,
        duration: Date.now() - startTime,
      }, 'Quote saved successfully');

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          quoteId,
          token: magicToken,
          shareUrl,
          quote: savedQuote,
        }),
      };
    } catch (error) {
      logger.error({
        event: 'save_quote_error',
        errorMessage: error.message,
      }, 'Failed to save quote');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save quote' }),
      };
    }
  }

  // Route: POST /quotes - Calculate quote (no auto-save)
  let validation; // Declare outside try block so it's accessible in catch

  try {
    const rawBody = JSON.parse(event.body || '{}');

    // Validate request with Zod
    validation = safeValidateQuoteRequest(rawBody);

    if (!validation.success) {
      logValidationError(logger, validation.error);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: validation.error }),
      };
    }

    const body = validation.data;
    const vehicleType = body.vehicleType || 'standard';
    const waypoints = body.waypoints || [];
    const hasWaypoints = waypoints.length > 0;
    const journeyType = body.journeyType || 'one-way';
    const durationHours = body.durationHours;
    const extras = body.extras || { babySeats: 0, childSeats: 0 };
    const compareMode = body.compareMode || false;
    const corpAccountId = body.corpAccountId || null; // Optional corporate account ID for discounts

    // Calculate total wait time from waypoints (in minutes)
    const totalWaitTime = waypoints.reduce((sum, wp) => sum + (wp.waitTime || 0), 0);

    // Log quote calculation start
    logQuoteCalculationStart(logger, body);

    let route, pricing;
    let isFixedRoute = false;
    let isHourlyRate = false;

    // Handle 'by-the-hour' journey type
    if (journeyType === 'by-the-hour') {
      logger.info({
        event: 'hourly_pricing_selected',
        durationHours,
        vehicleType,
      }, 'Using hourly pricing calculation');
      isHourlyRate = true;

      const allPricing = await getVehiclePricing(tenantId);
      const vehicleRates = allPricing[vehicleType] || allPricing.standard;
      const perHour = vehicleRates.perHour || getFallbackPricing()[vehicleType].perHour;
      const hourlyCharge = durationHours * perHour;

      route = {
        distance: { miles: '0', meters: 0, text: 'N/A (hourly booking)' },
        duration: { minutes: durationHours * 60, seconds: durationHours * 3600, text: `${durationHours} hours` }
      };

      pricing = {
        currency: 'GBP',
        breakdown: {
          baseFare: 0,
          distanceCharge: 0,
          waitTimeCharge: 0,
          hourlyCharge,
          durationHours,
          subtotal: hourlyCharge,
          tax: 0,
          total: hourlyCharge,
        },
        displayTotal: `£${(hourlyCharge / 100).toFixed(2)}`,
        isHourlyRate: true,
        vehicleMetadata: {
          name: vehicleRates.name,
          description: vehicleRates.description,
          capacity: vehicleRates.capacity,
          features: vehicleRates.features,
          imageUrl: vehicleRates.imageUrl
        }
      };
    } else {
      // Standard one-way journey pricing

      // Check for fixed route first if placeIds are provided AND no waypoints
      // Fixed routes do not support waypoints
      let fixedRoute = null;
      if (!hasWaypoints && body.pickupLocation.placeId && body.dropoffLocation.placeId) {
        fixedRoute = await checkFixedRoute(
          body.pickupLocation.placeId,
          body.dropoffLocation.placeId,
          vehicleType,
          tenantId
        );
      }

      if (fixedRoute) {
        // Use fixed route pricing
        logger.info({
          event: 'fixed_route_selected',
          routeId: fixedRoute.routeId,
          price: fixedRoute.price,
        }, 'Using fixed route pricing');
        isFixedRoute = true;

        route = {
          distance: {
            miles: fixedRoute.distance.toFixed(2),
            meters: Math.round(fixedRoute.distance * 1609.34),
            text: `${fixedRoute.distance.toFixed(1)} mi`
          },
          duration: {
            minutes: fixedRoute.estimatedDuration,
            seconds: fixedRoute.estimatedDuration * 60,
            text: `${fixedRoute.estimatedDuration} mins`
          }
        };

        const allPricing = await getVehiclePricing(tenantId);
        const vehicleMetadata = allPricing[vehicleType] || allPricing.standard;

        pricing = {
          currency: 'GBP',
          breakdown: {
            baseFare: 0,
            distanceCharge: 0,
            waitTimeCharge: 0,
            subtotal: fixedRoute.price,
            tax: 0,
            total: fixedRoute.price
          },
          displayTotal: `£${(fixedRoute.price / 100).toFixed(2)}`,
          isFixedRoute: true,
          routeId: fixedRoute.routeId,
          vehicleMetadata: {
            name: vehicleMetadata.name,
            description: vehicleMetadata.description,
            capacity: vehicleMetadata.capacity,
            features: vehicleMetadata.features,
            imageUrl: vehicleMetadata.imageUrl
          }
        };
      } else {
        // Check zone pricing BEFORE falling back to variable pricing
        // Zone pricing applies when pickup is in a zone AND dropoff is a known destination (or vice versa)
        let zonePricingResult = null;
        let isZonePricing = false;

        if (!hasWaypoints && body.dropoffLocation) {
          // Zone pricing only for simple routes (no waypoints)
          zonePricingResult = await checkZonePricing(
            body.pickupLocation,
            body.dropoffLocation,
            tenantId,
            logger
          );
        }

        if (zonePricingResult) {
          // Use zone pricing
          isZonePricing = true;
          logger.info({
            event: 'zone_pricing_selected',
            zoneName: zonePricingResult.zoneName,
            destinationName: zonePricingResult.destinationName,
            isReversed: zonePricingResult.isReversed,
          }, 'Using zone pricing');

          // Get vehicle-specific price from zone pricing
          const vehiclePrices = zonePricingResult.prices[vehicleType] || zonePricingResult.prices.standard;
          const zonePrice = vehiclePrices.outbound; // Default to outbound price

          // Still need route info for display - use Google Maps
          const apiKey = await getGoogleMapsApiKey();
          const apiStart = Date.now();
          route = await calculateDistance(
            body.pickupLocation.address,
            body.dropoffLocation.address,
            apiKey
          );
          logExternalApiCall(logger, 'distance_matrix', Date.now() - apiStart);

          const allPricing = await getVehiclePricing(tenantId);
          const vehicleMetadata = allPricing[vehicleType] || allPricing.standard;

          pricing = {
            currency: 'GBP',
            breakdown: {
              baseFare: 0,
              distanceCharge: 0,
              waitTimeCharge: 0,
              subtotal: zonePrice,
              tax: 0,
              total: zonePrice
            },
            displayTotal: `£${(zonePrice / 100).toFixed(2)}`,
            isZonePricing: true,
            zoneName: zonePricingResult.zoneName,
            destinationName: zonePricingResult.destinationName,
            vehicleMetadata: {
              name: vehicleMetadata.name,
              description: vehicleMetadata.description,
              capacity: vehicleMetadata.capacity,
              features: vehicleMetadata.features,
              imageUrl: vehicleMetadata.imageUrl
            }
          };
        } else {
          // Fallback to variable pricing calculation
          logger.info({ event: 'variable_pricing_selected' }, 'Using variable pricing calculation');
          const apiKey = await getGoogleMapsApiKey();

          if (hasWaypoints) {
            // Use Directions API for routes with waypoints
            logger.info({
              event: 'route_calculation_waypoints',
              waypointCount: waypoints.length,
              totalWaitTime,
            }, 'Calculating route with waypoints');

            const apiStart = Date.now();
            route = await calculateRouteWithWaypoints(
              body.pickupLocation.placeId || body.pickupLocation.address,
              body.dropoffLocation.placeId || body.dropoffLocation.address,
              waypoints,
              apiKey
            );
            logExternalApiCall(logger, 'directions', Date.now() - apiStart);
          } else {
            // Use Distance Matrix API for simple routes
            logger.info({ event: 'route_calculation_simple' }, 'Calculating simple route');
            const apiStart = Date.now();
            route = await calculateDistance(
              body.pickupLocation.address,
              body.dropoffLocation.address,
              apiKey
            );
            logExternalApiCall(logger, 'distance_matrix', Date.now() - apiStart);
          }

          // Calculate pricing: baseFare + (distance × perMile) + (waitTime × perMinute)
          // Note: Journey driving time is NOT charged, only explicit wait times
          pricing = await calculatePricing(
            parseFloat(route.distance.miles),
            totalWaitTime, // Only charge for explicit wait times, not driving time
            vehicleType,
            tenantId
          );
        }
      }
    } // End of one-way journey else block

    // Check service area coverage for outOfServiceArea flag
    let outOfServiceArea = false;
    let outOfServiceAreaMessage = null;

    if (body.pickupLocation?.address || body.dropoffLocation?.address) {
      const tenantServiceArea = await getTenantServiceArea(tenantId);

      if (tenantServiceArea.postcodeAreas && tenantServiceArea.postcodeAreas.length > 0) {
        const pickupOutward = extractOutwardCode(body.pickupLocation?.address);
        const dropoffOutward = extractOutwardCode(body.dropoffLocation?.address);

        const pickupInServiceArea = !pickupOutward || isInServiceArea(pickupOutward, tenantServiceArea.postcodeAreas);
        const dropoffInServiceArea = !dropoffOutward || isInServiceArea(dropoffOutward, tenantServiceArea.postcodeAreas);

        // Out of service area if EITHER pickup OR dropoff is outside coverage
        outOfServiceArea = (pickupOutward && !pickupInServiceArea) || (dropoffOutward && !dropoffInServiceArea);

        if (outOfServiceArea) {
          outOfServiceAreaMessage = "This journey is outside our standard service area. Send us this quote and we'll be in touch to discuss.";
          logger.info({
            event: 'out_of_service_area',
            pickupOutward,
            dropoffOutward,
            pickupInServiceArea,
            dropoffInServiceArea,
            serviceAreas: tenantServiceArea.postcodeAreas,
          }, 'Journey is outside service area');
        }
      }
    }

    // Check surge pricing for pickup date/time (only for non-hourly, non-fixed routes, non-zone pricing)
    let surgeResult = { combinedMultiplier: 1.0, isPeakPricing: false, appliedRules: [], wasCapped: false };
    const isZonePricing = pricing.isZonePricing || false;

    if (body.pickupTime && !isHourlyRate && !isFixedRoute && !isZonePricing) {
      surgeResult = await checkSurgePricing(body.pickupTime, tenantId);

      if (surgeResult.isPeakPricing) {
        logger.info({
          event: 'surge_pricing_applied',
          multiplier: surgeResult.combinedMultiplier,
          ruleCount: surgeResult.appliedRules.length,
          appliedRules: surgeResult.appliedRules.map(r => r.name),
          wasCapped: surgeResult.wasCapped,
        }, 'Surge pricing applied to quote');

        // Store base price before surge
        const basePriceBeforeSurge = pricing.breakdown.total;

        // Apply surge multiplier to total
        const surgedTotal = Math.round(basePriceBeforeSurge * surgeResult.combinedMultiplier);

        // Update pricing with surge info
        pricing = {
          ...pricing,
          breakdown: {
            ...pricing.breakdown,
            basePriceBeforeSurge,
            surgeMultiplier: surgeResult.combinedMultiplier,
            total: surgedTotal,
          },
          displayTotal: `£${(surgedTotal / 100).toFixed(2)}`,
          isPeakPricing: true,
          surgeMultiplier: surgeResult.combinedMultiplier,
          appliedSurgeRules: surgeResult.appliedRules.map(r => ({ name: r.name, multiplier: r.multiplier })),
        };
      }
    }

    // Apply corporate discount if corpAccountId is provided (AFTER surge pricing)
    let corporateDiscount = null;
    if (corpAccountId) {
      corporateDiscount = await getCorporateDiscount(corpAccountId, tenantId);

      if (corporateDiscount && corporateDiscount.discountPercentage > 0) {
        logger.info({
          event: 'corporate_discount_applied',
          corpAccountId,
          companyName: corporateDiscount.companyName,
          discountPercentage: corporateDiscount.discountPercentage,
          priceBeforeDiscount: pricing.breakdown.total,
        }, 'Applying corporate discount to quote');

        // Store price before corporate discount
        const priceBeforeCorporateDiscount = pricing.breakdown.total;

        // Calculate corporate discount amount
        const corporateDiscountAmount = Math.round(priceBeforeCorporateDiscount * corporateDiscount.discountPercentage / 100);
        const finalTotal = priceBeforeCorporateDiscount - corporateDiscountAmount;

        // Update pricing with corporate discount (but don't expose the percentage)
        pricing = {
          ...pricing,
          breakdown: {
            ...pricing.breakdown,
            priceBeforeCorporateDiscount,
            corporateDiscountAmount,
            total: finalTotal,
          },
          displayTotal: `£${(finalTotal / 100).toFixed(2)}`,
          isCorporateRate: true,
        };

        logger.info({
          event: 'corporate_discount_result',
          priceBeforeCorporateDiscount,
          corporateDiscountAmount,
          finalTotal,
        }, 'Corporate discount applied successfully');
      }
    }

    // Handle compareMode - return pricing for ALL vehicle types
    if (compareMode) {
      // Build debug info for zone pricing testing
      const pickupOutward = extractOutwardCode(body.pickupLocation?.address);
      const dropoffOutward = extractOutwardCode(body.dropoffLocation?.address);

      // Check for zone pricing in compare mode (only for non-hourly journeys)
      let compareModeZonePricing = null;
      let debugZoneMatch = null;
      let debugDestinationMatch = null;

      if (journeyType !== 'by-the-hour' && body.dropoffLocation) {
        compareModeZonePricing = await checkZonePricing(
          body.pickupLocation,
          body.dropoffLocation,
          tenantId,
          logger
        );

        // Build debug info
        if (compareModeZonePricing) {
          debugZoneMatch = {
            zoneId: compareModeZonePricing.zoneId,
            zoneName: compareModeZonePricing.zoneName,
            isReversed: compareModeZonePricing.isReversed,
          };
          debugDestinationMatch = {
            destinationId: compareModeZonePricing.destinationId,
            destinationName: compareModeZonePricing.destinationName,
          };
        }
      }

      // Build debug object for zone pricing testing
      const debugInfo = {
        pickup: {
          address: body.pickupLocation?.address?.substring(0, 50) + '...',
          placeId: body.pickupLocation?.placeId?.substring(0, 15) + '...',
          extractedPostcode: pickupOutward,
        },
        dropoff: body.dropoffLocation ? {
          address: body.dropoffLocation?.address?.substring(0, 50) + '...',
          placeId: body.dropoffLocation?.placeId?.substring(0, 15) + '...',
          extractedPostcode: dropoffOutward,
        } : null,
        zoneMatch: debugZoneMatch,
        destinationMatch: debugDestinationMatch,
        pricingMethod: compareModeZonePricing ? 'zone_pricing' : 'variable_pricing',
        serviceArea: {
          pickupInArea: !pickupOutward || isInServiceArea(pickupOutward, (await getTenantServiceArea(tenantId)).postcodeAreas),
          dropoffInArea: !dropoffOutward || isInServiceArea(dropoffOutward, (await getTenantServiceArea(tenantId)).postcodeAreas),
        },
      };

      logger.info({
        event: 'compare_mode_calculation',
        journeyType,
        hasRoute: !!route,
        corpAccountId: corpAccountId || null,
        hasZonePricing: !!compareModeZonePricing,
      }, 'Calculating prices for all vehicle types');

      // Get corporate discount if corpAccountId provided (reuse if already fetched above)
      if (!corporateDiscount && corpAccountId) {
        corporateDiscount = await getCorporateDiscount(corpAccountId, tenantId);
      }

      const allPricing = await getVehiclePricing(tenantId);
      const vehicleTypes = ['standard', 'executive', 'minibus'];
      const vehicles = {};

      for (const vType of vehicleTypes) {
        const vehicleRates = allPricing[vType] || getFallbackPricing()[vType];
        let oneWayPrice, oneWayBreakdown;
        let returnPriceFromZone = null; // Zone pricing has separate return prices

        if (journeyType === 'by-the-hour') {
          // Hourly pricing for compare mode
          const perHour = vehicleRates.perHour || getFallbackPricing()[vType].perHour;
          const hourlyCharge = durationHours * perHour;
          oneWayPrice = hourlyCharge;
          oneWayBreakdown = {
            baseFare: 0,
            distanceCharge: 0,
            waitTimeCharge: 0,
            hourlyCharge,
            durationHours,
            subtotal: hourlyCharge,
            tax: 0,
            total: hourlyCharge,
          };
        } else if (compareModeZonePricing && compareModeZonePricing.prices[vType]) {
          // Use zone pricing if available
          const zonePrices = compareModeZonePricing.prices[vType];
          oneWayPrice = zonePrices.outbound;
          returnPriceFromZone = zonePrices.return; // Use zone's return price directly
          oneWayBreakdown = {
            baseFare: 0,
            distanceCharge: 0,
            waitTimeCharge: 0,
            subtotal: oneWayPrice,
            tax: 0,
            total: oneWayPrice,
            isZonePricing: true,
            zoneName: compareModeZonePricing.zoneName,
            destinationName: compareModeZonePricing.destinationName,
          };
        } else {
          // Distance-based pricing for compare mode
          const baseFare = vehicleRates.baseFare;
          const distanceMiles = parseFloat(route.distance.miles);
          const distanceCharge = Math.round(distanceMiles * vehicleRates.perMile);
          const waitTimeCharge = Math.round(totalWaitTime * vehicleRates.perMinute);
          const subtotal = baseFare + distanceCharge + waitTimeCharge;
          oneWayPrice = subtotal;
          oneWayBreakdown = {
            baseFare,
            distanceCharge,
            waitTimeCharge,
            subtotal,
            tax: 0,
            total: subtotal,
          };
        }

        // Calculate return price - use zone pricing's return price if available, otherwise calculate with discount
        let returnPrice;
        let returnDiscount = 0;
        let discountAmount = 0;
        let returnPriceBeforeDiscount;

        if (returnPriceFromZone !== null) {
          // Zone pricing has explicit return prices (no discount calculation needed)
          returnPrice = returnPriceFromZone;
          returnPriceBeforeDiscount = returnPriceFromZone; // No discount for zone pricing
        } else {
          // Variable pricing: apply configurable return discount
          returnDiscount = vehicleRates.returnDiscount ?? 0;
          returnPriceBeforeDiscount = oneWayPrice * 2;
          discountAmount = Math.round(returnPriceBeforeDiscount * returnDiscount / 100);
          returnPrice = returnPriceBeforeDiscount - discountAmount;
        }

        // Apply surge pricing to compare mode prices (for non-hourly, non-zone pricing routes)
        // Zone pricing has fixed prices, so surge does not apply
        let finalOneWayPrice = oneWayPrice;
        let finalReturnPrice = returnPrice;
        let surgeInfo = {};
        const isVehicleZonePriced = returnPriceFromZone !== null;

        if (surgeResult.isPeakPricing && !isVehicleZonePriced) {
          finalOneWayPrice = Math.round(oneWayPrice * surgeResult.combinedMultiplier);
          finalReturnPrice = Math.round(returnPrice * surgeResult.combinedMultiplier);
          surgeInfo = {
            isPeakPricing: true,
            surgeMultiplier: surgeResult.combinedMultiplier,
            appliedSurgeRules: surgeResult.appliedRules.map(r => ({ name: r.name, multiplier: r.multiplier })),
          };
        }

        // Apply corporate discount AFTER surge pricing (if applicable)
        let corporateInfo = {};
        if (corporateDiscount && corporateDiscount.discountPercentage > 0) {
          const corpDiscountOneWay = Math.round(finalOneWayPrice * corporateDiscount.discountPercentage / 100);
          const corpDiscountReturn = Math.round(finalReturnPrice * corporateDiscount.discountPercentage / 100);
          finalOneWayPrice = finalOneWayPrice - corpDiscountOneWay;
          finalReturnPrice = finalReturnPrice - corpDiscountReturn;
          corporateInfo = {
            isCorporateRate: true,
          };
        }

        vehicles[vType] = {
          name: vehicleRates.name,
          description: vehicleRates.description,
          capacity: vehicleRates.capacity,
          features: vehicleRates.features || [],
          imageUrl: vehicleRates.imageUrl || '',
          oneWay: {
            price: finalOneWayPrice,
            displayPrice: `£${(finalOneWayPrice / 100).toFixed(2)}`,
            breakdown: {
              ...oneWayBreakdown,
              ...(surgeResult.isPeakPricing && {
                basePriceBeforeSurge: oneWayPrice,
                surgeMultiplier: surgeResult.combinedMultiplier,
                total: finalOneWayPrice,
              }),
            },
            ...surgeInfo,
            ...corporateInfo,
          },
          return: {
            price: finalReturnPrice,
            displayPrice: `£${(finalReturnPrice / 100).toFixed(2)}`,
            discount: {
              percentage: returnDiscount,
              amount: discountAmount,
            },
            breakdown: {
              ...oneWayBreakdown,
              subtotal: returnPriceBeforeDiscount,
              discount: discountAmount,
              total: finalReturnPrice,
              ...(oneWayBreakdown.hourlyCharge && { hourlyCharge: oneWayBreakdown.hourlyCharge * 2 }),
              ...(surgeResult.isPeakPricing && {
                basePriceBeforeSurge: returnPrice,
                surgeMultiplier: surgeResult.combinedMultiplier,
              }),
            },
            ...surgeInfo,
            ...corporateInfo,
          },
        };
      }

      const compareResponse = {
        compareMode: true,
        journeyType,
        journey: {
          distance: route.distance,
          duration: route.duration,
        },
        pickupLocation: body.pickupLocation,
        ...(body.dropoffLocation && { dropoffLocation: body.dropoffLocation }),
        ...(durationHours && { durationHours }),
        pickupTime: body.pickupTime,
        passengers: body.passengers,
        luggage: body.luggage || 0,
        extras,
        vehicles,
        ...(corporateDiscount && corporateDiscount.discountPercentage > 0 && { isCorporateRate: true }),
        // Zone pricing info
        ...(compareModeZonePricing && {
          isZonePricing: true,
          zoneName: compareModeZonePricing.zoneName,
          destinationName: compareModeZonePricing.destinationName,
        }),
        // Service area flags
        outOfServiceArea,
        ...(outOfServiceAreaMessage && { outOfServiceAreaMessage }),
        // Debug info for zone pricing testing
        _debug: debugInfo,
        createdAt: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      logger.info({
        event: 'compare_mode_success',
        duration,
        vehicleCount: vehicleTypes.length,
      }, 'Compare mode calculation complete');

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(compareResponse),
      };
    }

    // Build quote response (NOT stored - use POST /quotes/save to persist)
    const now = new Date().toISOString();

    const quote = {
      // No quoteId - assigned when saved via POST /quotes/save
      journeyType,
      journey: {
        distance: route.distance,
        duration: route.duration,
        route: {
          polyline: route.polyline || null,
        },
      },
      pricing,
      vehicleType,
      pickupLocation: body.pickupLocation,
      ...(body.dropoffLocation && { dropoffLocation: body.dropoffLocation }), // Only include if provided (not for hourly)
      ...(hasWaypoints && { waypoints }), // Only include waypoints if they exist
      ...(durationHours && { durationHours }), // Only include for hourly bookings
      pickupTime: body.pickupTime,
      passengers: body.passengers,
      luggage: body.luggage || 0,
      extras, // Baby seats and child seats
      returnJourney: body.returnJourney || false,
      // Service area flags - frontend should check these to show appropriate messaging
      outOfServiceArea,
      ...(outOfServiceAreaMessage && { outOfServiceAreaMessage }),
      calculatedAt: now,
    };

    // NOTE: Quote is NOT auto-saved to DB
    // Frontend should call POST /quotes/save to persist and get shareable URL

    // Log successful quote calculation
    const duration = Date.now() - startTime;
    logQuoteCalculationSuccess(logger, quote, duration);

    return {
      statusCode: 200, // Changed from 201 since nothing is created/stored
      headers,
      body: JSON.stringify(quote),
    };
  } catch (error) {
    logQuoteCalculationError(logger, error, validation?.data);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to calculate quote',
          details: error.message,
        },
      }),
    };
  }
};
