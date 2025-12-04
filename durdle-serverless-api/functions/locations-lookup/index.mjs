import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';

const secretsClient = new SecretsManagerClient({ region: 'eu-west-2' });

const GOOGLE_MAPS_SECRET_NAME = process.env.GOOGLE_MAPS_SECRET_NAME || 'durdle/google-maps-api-key';

let cachedApiKey = null;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Session-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
};

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { queryStringParameters } = event;

    if (!queryStringParameters || !queryStringParameters.input) {
      return errorResponse(400, 'Missing required query parameter: input');
    }

    const { input, sessionToken } = queryStringParameters;

    if (input.length < 3) {
      return errorResponse(400, 'Input must be at least 3 characters');
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
    return errorResponse(500, 'Internal server error', error.message);
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

function errorResponse(statusCode, message, details = null) {
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
