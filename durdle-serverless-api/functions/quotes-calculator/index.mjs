import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';
import { randomUUID } from 'crypto';

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
    console.error('Failed to retrieve Google Maps API key:', error);
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
      console.log('No vehicle pricing found in DynamoDB, using fallback');
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

    return pricing;
  } catch (error) {
    console.error('Failed to fetch vehicle pricing from DynamoDB:', error);
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
    console.error('Failed to check fixed routes:', error);
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
    console.error('Distance calculation failed:', error);
    throw new Error('Unable to calculate route');
  }
}

async function calculatePricing(distanceMiles, durationMinutes, vehicleType = 'standard') {
  const allPricing = await getVehiclePricing();
  const rates = allPricing[vehicleType] || allPricing.standard;

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
    vehicleMetadata: {
      name: rates.name,
      description: rates.description,
      capacity: rates.capacity,
      features: rates.features,
      imageUrl: rates.imageUrl
    }
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

    const vehicleType = body.vehicleType || 'standard';

    // Check for fixed route first if placeIds are provided
    let fixedRoute = null;
    if (body.pickupLocation.placeId && body.dropoffLocation.placeId) {
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
      console.log('Using fixed route pricing:', fixedRoute.routeId);
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
          timeCharge: 0,
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
      console.log('Using variable pricing calculation');
      const apiKey = await getGoogleMapsApiKey();

      route = await calculateDistance(
        body.pickupLocation.address,
        body.dropoffLocation.address,
        apiKey
      );

      pricing = await calculatePricing(
        parseFloat(route.distance.miles),
        route.duration.minutes,
        vehicleType
      );
    }

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
