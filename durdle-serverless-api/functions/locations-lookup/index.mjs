import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';

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

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

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
        return errorResponse(400, 'Missing required query parameter: placeId', null, headers);
      }

      const { placeId } = queryStringParameters;
      const result = await fetchPlaceDetails(placeId);

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
        return errorResponse(400, 'Missing required query parameters: lat, lng', null, headers);
      }

      const { lat, lng } = queryStringParameters;
      const result = await fetchReverseGeocode(lat, lng);

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
      return errorResponse(400, 'Missing required query parameter: input', null, headers);
    }

    const { input, sessionToken } = queryStringParameters;

    if (input.length < 3) {
      return errorResponse(400, 'Input must be at least 3 characters', null, headers);
    }

    const predictions = await fetchAutocomplete(input, sessionToken);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        predictions,
        status: 'OK'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

async function getGoogleMapsApiKey() {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  const command = new GetSecretValueCommand({
    SecretId: GOOGLE_MAPS_SECRET_NAME
  });

  const response = await secretsClient.send(command);
  cachedApiKey = response.SecretString;
  return cachedApiKey;
}

async function fetchAutocomplete(input, sessionToken) {
  const apiKey = await getGoogleMapsApiKey();

  const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  const params = {
    input,
    key: apiKey,
    sessiontoken: sessionToken,
    components: 'country:gb' // Restrict to UK
  };

  const response = await axios.get(url, { params });

  if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Maps API error: ${response.data.status}`);
  }

  if (response.data.status === 'ZERO_RESULTS') {
    return [];
  }

  // Add icon emoji based on types
  return response.data.predictions.map(prediction => ({
    place_id: prediction.place_id,
    description: prediction.description,
    structured_formatting: prediction.structured_formatting,
    types: prediction.types,
    icon: getIconForTypes(prediction.types)
  }));
}

async function fetchPlaceDetails(placeId) {
  const apiKey = await getGoogleMapsApiKey();

  const url = 'https://maps.googleapis.com/maps/api/place/details/json';
  const params = {
    place_id: placeId,
    fields: 'geometry',
    key: apiKey
  };

  const response = await axios.get(url, { params });

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

async function fetchReverseGeocode(lat, lng) {
  const apiKey = await getGoogleMapsApiKey();

  const url = 'https://maps.googleapis.com/maps/api/geocode/json';
  const params = {
    latlng: `${lat},${lng}`,
    key: apiKey,
    result_type: 'street_address|premise|route|locality'
  };

  const response = await axios.get(url, { params });

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
