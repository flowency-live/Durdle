import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';
import { randomUUID } from 'crypto';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME;
const GOOGLE_MAPS_SECRET_NAME = 'durdle/google-maps-api-key';

let cachedApiKey = null;

async function getGoogleMapsApiKey() {
  if (cachedApiKey) return cachedApiKey;

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: GOOGLE_MAPS_SECRET_NAME })
    );
    cachedApiKey = response.SecretString;
    return cachedApiKey;
  } catch (error) {
    console.error('Failed to retrieve Google Maps API key:', error);
    throw new Error('Configuration error');
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
    console.error('Distance calculation failed:', error);
    throw new Error('Unable to calculate route');
  }
}

function calculatePricing(distanceMiles, durationMinutes, vehicleType = 'standard') {
  const pricing = {
    standard: {
      baseFare: 500,
      perMile: 100,
      perMinute: 10,
    },
    executive: {
      baseFare: 800,
      perMile: 150,
      perMinute: 15,
    },
    minibus: {
      baseFare: 1000,
      perMile: 120,
      perMinute: 12,
    },
  };

  const rates = pricing[vehicleType] || pricing.standard;

  const baseFare = rates.baseFare;
  const distanceCharge = Math.round(distanceMiles * rates.perMile);
  const timeCharge = Math.round(durationMinutes * rates.perMinute);
  const subtotal = baseFare + distanceCharge + timeCharge;
  const tax = 0;
  const total = subtotal + tax;

  return {
    currency: 'GBP',
    breakdown: {
      baseFare,
      distanceCharge,
      timeCharge,
      subtotal,
      tax,
      total,
    },
    displayTotal: `£${(total / 100).toFixed(2)}`,
  };
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
    console.error('Failed to store quote:', error);
    throw new Error('Failed to save quote');
  }
}

export const handler = async (event) => {
  console.log('Quote calculator invoked:', JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body || '{}');

    if (!body.pickupLocation?.address || !body.dropoffLocation?.address) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Pickup and dropoff locations are required',
          },
        }),
      };
    }

    if (!body.pickupTime) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Pickup time is required',
          },
        }),
      };
    }

    if (!body.passengers || body.passengers < 1 || body.passengers > 8) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Passengers must be between 1 and 8',
          },
        }),
      };
    }

    const apiKey = await getGoogleMapsApiKey();

    const route = await calculateDistance(
      body.pickupLocation.address,
      body.dropoffLocation.address,
      apiKey
    );

    const vehicleType = body.vehicleType || 'standard';
    const pricing = calculatePricing(
      parseFloat(route.distance.miles),
      route.duration.minutes,
      vehicleType
    );

    const quoteId = `quote_${randomUUID().replace(/-/g, '')}`;
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
          polyline: null,
        },
      },
      pricing,
      vehicleType,
      pickupLocation: body.pickupLocation,
      dropoffLocation: body.dropoffLocation,
      pickupTime: body.pickupTime,
      passengers: body.passengers,
      returnJourney: body.returnJourney || false,
      createdAt: now,
    };

    await storeQuote(quote);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(quote),
    };
  } catch (error) {
    console.error('Error processing quote:', error);

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
