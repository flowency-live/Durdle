import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, logTenantContext } from '/opt/nodejs/tenant.mjs';

const secretsClient = new SecretsManagerClient({ region: 'eu-west-2' });

const GOOGLE_MAPS_SECRET_NAME = process.env.GOOGLE_MAPS_SECRET_NAME || 'durdle/google-maps-api-key';

let cachedApiKey = null;

const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://durdle.flowency.build',
  'https://durdle.co.uk'
];

const getHeaders = (path, origin) => {
  // Public endpoint uses wildcard, admin endpoint uses dynamic origin for credentials
  const isAdminPath = path && path.includes('/admin/');

  if (isAdminPath) {
    const allowedOrigins = getAllowedOrigins();
    const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    return {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Session-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };
  }

  // Public endpoint - wildcard is fine, no credentials
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Session-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  };
};

export const handler = async (event, context) => {
  const logger = createLogger(event, context);
  const tenantId = getTenantId(event);

  logger.info('lambda_invocation', {
    httpMethod: event.httpMethod,
    path: event.path || event.requestContext?.resourcePath || ''
  });

  logTenantContext(logger, tenantId, 'locations_lookup');

  const origin = event.headers?.origin || event.headers?.Origin || '';
  const path = event.path || event.requestContext?.resourcePath || '';
  const headers = getHeaders(path, origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { queryStringParameters } = event;

    // Handle place details endpoint (placeId to lat/lng)
    if (path.includes('/place-details')) {
      if (!queryStringParameters || !queryStringParameters.placeId) {
        logger.warn('location_place_details_validation_error', {
          error: 'Missing required query parameter: placeId',
          tenantId
        });
        return errorResponse(400, 'Missing required query parameter: placeId', null, headers);
      }

      const { placeId } = queryStringParameters;

      logger.info('location_place_details_start', { placeId, tenantId });

      const result = await fetchPlaceDetails(placeId, logger);

      logger.info('location_place_details_success', {
        placeId,
        lat: result.location.lat,
        lng: result.location.lng,
        tenantId
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          location: result.location,
          status: 'OK'
        })
      };
    }

    // Handle reverse geocoding endpoint
    if (path.includes('/geocode')) {
      if (!queryStringParameters || !queryStringParameters.lat || !queryStringParameters.lng) {
        logger.warn('location_reverse_geocode_validation_error', {
          error: 'Missing required query parameters: lat, lng',
          tenantId
        });
        return errorResponse(400, 'Missing required query parameters: lat, lng', null, headers);
      }

      const { lat, lng } = queryStringParameters;

      logger.info('location_reverse_geocode_start', { lat, lng, tenantId });

      const result = await fetchReverseGeocode(lat, lng, logger);

      logger.info('location_reverse_geocode_success', {
        lat,
        lng,
        address: result.address,
        placeId: result.place_id,
        tenantId
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ...result,
          status: 'OK'
        })
      };
    }

    // Handle autocomplete endpoint
    if (!queryStringParameters || !queryStringParameters.input) {
      logger.warn('location_autocomplete_validation_error', {
        error: 'Missing required query parameter: input',
        tenantId
      });
      return errorResponse(400, 'Missing required query parameter: input', null, headers);
    }

    const { input, sessionToken } = queryStringParameters;

    if (input.length < 3) {
      logger.warn('location_autocomplete_validation_error', {
        error: 'Input must be at least 3 characters',
        inputLength: input.length,
        tenantId
      });
      return errorResponse(400, 'Input must be at least 3 characters', null, headers);
    }

    logger.info('location_autocomplete_start', { input, sessionToken, tenantId });

    const predictions = await fetchAutocomplete(input, sessionToken, logger);

    logger.info('location_autocomplete_success', {
      input,
      sessionToken,
      resultCount: predictions.length,
      tenantId
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        predictions,
        status: 'OK'
      })
    };
  } catch (error) {
    logger.error('lambda_error', {
      error: error.message,
      stack: error.stack,
      tenantId
    });
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

async function getGoogleMapsApiKey(logger) {
  if (cachedApiKey) {
    logger.info('secrets_manager_api_key', {
      cacheHit: true,
      secretName: GOOGLE_MAPS_SECRET_NAME
    });
    return cachedApiKey;
  }

  logger.info('secrets_manager_api_key', {
    cacheHit: false,
    secretName: GOOGLE_MAPS_SECRET_NAME
  });

  const command = new GetSecretValueCommand({
    SecretId: GOOGLE_MAPS_SECRET_NAME
  });

  const response = await secretsClient.send(command);
  cachedApiKey = response.SecretString;
  return cachedApiKey;
}

async function fetchAutocomplete(input, sessionToken, logger) {
  const apiKey = await getGoogleMapsApiKey(logger);

  const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  const params = {
    input,
    key: apiKey,
    sessiontoken: sessionToken,
    components: 'country:gb' // Restrict to UK
  };

  const startTime = Date.now();

  const response = await axios.get(url, { params });

  const duration = Date.now() - startTime;

  logger.info('google_maps_api_call', {
    endpoint: 'autocomplete',
    duration,
    status: response.data.status
  });

  if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Maps API error: ${response.data.status}`);
  }

  if (response.data.status === 'ZERO_RESULTS') {
    return [];
  }

  // Add icon emoji and locationType based on types
  return response.data.predictions.map(prediction => {
    const types = prediction.types || [];
    const description = (prediction.description || '').toLowerCase();

    // Check types first, then fall back to name matching
    const isAirport = types.includes('airport') ||
      description.includes('airport');
    const isTrainStation = types.includes('train_station') ||
      types.includes('transit_station') ||
      description.includes('railway station') ||
      description.includes('train station');

    const locationType = isAirport ? 'airport' : isTrainStation ? 'train_station' : 'standard';

    return {
      place_id: prediction.place_id,
      description: prediction.description,
      structured_formatting: prediction.structured_formatting,
      types: types,
      icon: getIconForTypes(types),
      locationType
    };
  });
}

async function fetchPlaceDetails(placeId, logger) {
  const apiKey = await getGoogleMapsApiKey(logger);

  const url = 'https://maps.googleapis.com/maps/api/place/details/json';
  const params = {
    place_id: placeId,
    fields: 'geometry',
    key: apiKey
  };

  const startTime = Date.now();

  const response = await axios.get(url, { params });

  const duration = Date.now() - startTime;

  logger.info('google_maps_api_call', {
    endpoint: 'place_details',
    duration,
    status: response.data.status
  });

  if (response.data.status !== 'OK') {
    throw new Error(`Google Maps Place Details API error: ${response.data.status}`);
  }

  if (!response.data.result || !response.data.result.geometry || !response.data.result.geometry.location) {
    throw new Error('No location data found for this place ID');
  }

  return {
    location: {
      lat: response.data.result.geometry.location.lat,
      lng: response.data.result.geometry.location.lng
    }
  };
}

async function fetchReverseGeocode(lat, lng, logger) {
  const apiKey = await getGoogleMapsApiKey(logger);

  const url = 'https://maps.googleapis.com/maps/api/geocode/json';
  const params = {
    latlng: `${lat},${lng}`,
    key: apiKey,
    result_type: 'street_address|premise|route|locality'
  };

  const startTime = Date.now();

  const response = await axios.get(url, { params });

  const duration = Date.now() - startTime;

  logger.info('google_maps_api_call', {
    endpoint: 'reverse_geocode',
    duration,
    status: response.data.status
  });

  if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Maps Geocoding API error: ${response.data.status}`);
  }

  if (response.data.status === 'ZERO_RESULTS' || !response.data.results || response.data.results.length === 0) {
    throw new Error('No address found for these coordinates');
  }

  const result = response.data.results[0];

  return {
    address: result.formatted_address,
    place_id: result.place_id,
    location: result.geometry.location
  };
}

function getIconForTypes(types) {
  if (!types || types.length === 0) {
    return '';
  }

  // Priority order for icon selection
  if (types.includes('airport')) {
    return '✈️';
  }
  if (types.includes('train_station') || types.includes('transit_station')) {
    return '🚂';
  }
  if (types.includes('hotel') || types.includes('lodging')) {
    return '🏨';
  }
  if (types.includes('city_hall') || types.includes('locality') || types.includes('postal_town')) {
    return '📍';
  }
  if (types.includes('bus_station')) {
    return '🚌';
  }
  if (types.includes('point_of_interest') || types.includes('establishment')) {
    return '📌';
  }

  return '🔍';
}

function errorResponse(statusCode, message, details = null, headers) {
  const body = { error: message };
  if (details) {
    body.details = details;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}
