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

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME;
const FIXED_ROUTES_TABLE_NAME = process.env.FIXED_ROUTES_TABLE_NAME || 'durdle-fixed-routes-dev';
const PRICING_TABLE_NAME = process.env.PRICING_TABLE_NAME || 'durdle-pricing-config-dev';
const GOOGLE_MAPS_SECRET_NAME = 'durdle/google-maps-api-key';

let cachedApiKey = null;
let vehiclePricingCache = null;
let pricingCacheTime = null;
const PRICING_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

async function getVehiclePricing() {
  // Check if cache is still valid
  if (vehiclePricingCache && pricingCacheTime && (Date.now() - pricingCacheTime < PRICING_CACHE_DURATION)) {
    return vehiclePricingCache;
  }

  try {
    const command = new ScanCommand({
      TableName: PRICING_TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
      ExpressionAttributeValues: {
        ':pkPrefix': 'VEHICLE#',
        ':sk': 'METADATA'
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
      name: 'Minibus',
      description: 'Spacious minibus for up to 8 passengers',
      capacity: 8,
      features: ['Air Conditioning', 'WiFi', 'Extra Luggage Space'],
      imageUrl: ''
    }
  };
}

async function checkFixedRoute(originPlaceId, destinationPlaceId, vehicleId) {
  if (!originPlaceId || !destinationPlaceId || !vehicleId) {
    return null;
  }

  try {
    const command = new QueryCommand({
      TableName: FIXED_ROUTES_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `ROUTE#${originPlaceId}`,
        ':sk': `DEST#${destinationPlaceId}#VEHICLE#${vehicleId}`
      }
    });

    const result = await docClient.send(command);

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

async function calculatePricing(distanceMiles, waitTimeMinutes, vehicleType = 'standard') {
  const allPricing = await getVehiclePricing();
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

async function generateFriendlyQuoteId() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${month}${day}`;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  try {
    // Query quotes created today to get the next sequence number
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :status AND GSI1SK >= :todayStart',
      ExpressionAttributeValues: {
        ':status': 'STATUS#valid',
        ':todayStart': `CREATED#${todayStart}`
      }
    });

    const result = await docClient.send(command);
    const todayCount = result.Items ? result.Items.length : 0;
    const sequenceNumber = String(todayCount + 1).padStart(3, '0');

    return `DTS${datePrefix}_${sequenceNumber}`;
  } catch (error) {
    logger.warn({
      event: 'quote_id_generation_fallback',
      errorMessage: error.message,
    }, 'Failed to generate sequential quote ID, using UUID fallback');
    // Fallback to UUID-based ID if query fails
    return `DTS${datePrefix}_${randomUUID().slice(0, 3).toUpperCase()}`;
  }
}

async function storeQuote(quote) {
  const ttl = Math.floor(Date.now() / 1000) + (15 * 60);

  const item = {
    PK: `QUOTE#${quote.quoteId}`,
    SK: 'METADATA',
    EntityType: 'Quote',
    GSI1PK: `STATUS#${quote.status}`,
    GSI1SK: `CREATED#${quote.createdAt}`,
    TTL: ttl,
    Data: quote,
    CreatedAt: Math.floor(new Date(quote.createdAt).getTime() / 1000),
    UpdatedAt: Math.floor(new Date(quote.createdAt).getTime() / 1000),
  };

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));
  } catch (error) {
    logger.error({
      event: 'dynamodb_put_error',
      tableName: TABLE_NAME,
      quoteId: quote.quoteId,
      errorMessage: error.message,
    }, 'Failed to store quote in DynamoDB');
    throw new Error('Failed to save quote');
  }
}

export const handler = async (event, context) => {
  const startTime = Date.now();
  const logger = createLogger(event, context);

  logger.info({
    event: 'lambda_invocation',
    httpMethod: event.httpMethod,
    path: event.path,
  }, 'Quote calculator invoked');

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

    // Calculate total wait time from waypoints (in minutes)
    const totalWaitTime = waypoints.reduce((sum, wp) => sum + (wp.waitTime || 0), 0);

    // Log quote calculation start
    logQuoteCalculationStart(logger, body);

    // Check for fixed route first if placeIds are provided AND no waypoints
    // Fixed routes do not support waypoints
    let fixedRoute = null;
    if (!hasWaypoints && body.pickupLocation.placeId && body.dropoffLocation.placeId) {
      fixedRoute = await checkFixedRoute(
        body.pickupLocation.placeId,
        body.dropoffLocation.placeId,
        vehicleType
      );
    }

    let route, pricing;
    let isFixedRoute = false;

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

      const allPricing = await getVehiclePricing();
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
        vehicleType
      );
    }

    const quoteId = await generateFriendlyQuoteId();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const quote = {
      quoteId,
      status: 'valid',
      expiresAt,
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
      dropoffLocation: body.dropoffLocation,
      ...(hasWaypoints && { waypoints }), // Only include waypoints if they exist
      pickupTime: body.pickupTime,
      passengers: body.passengers,
      luggage: body.luggage || 0,
      returnJourney: body.returnJourney || false,
      createdAt: now,
    };

    await storeQuote(quote);

    // Log successful quote calculation
    const duration = Date.now() - startTime;
    logQuoteCalculationSuccess(logger, quote, duration);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
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
