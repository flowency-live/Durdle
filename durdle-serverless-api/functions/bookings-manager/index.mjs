import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import logger, { createLogger } from '/opt/nodejs/logger.mjs';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const BOOKINGS_TABLE_NAME = process.env.BOOKINGS_TABLE_NAME || 'durdle-bookings-dev';

// Generate booking ID in format: DTC-{ddmmyy}{seq}
async function generateBookingId() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const datePrefix = `${day}${month}${year}`; // ddmmyy format
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  try {
    // Query bookings created today using GSI2 (date-based)
    const command = new QueryCommand({
      TableName: BOOKINGS_TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :dateKey',
      ExpressionAttributeValues: {
        ':dateKey': `DATE#${now.toISOString().split('T')[0]}`, // DATE#yyyy-mm-dd
      },
    });

    const result = await docClient.send(command);
    const todayCount = result.Items ? result.Items.length : 0;
    const sequenceNumber = String(todayCount + 1).padStart(2, '0');

    return `DTC-${datePrefix}${sequenceNumber}`;
  } catch (error) {
    // Fallback to UUID-based suffix if query fails
    logger.warn({ error: error.message }, 'Failed to query for booking sequence, using UUID fallback');
    return `DTC-${datePrefix}${randomUUID().slice(0, 2).toUpperCase()}`;
  }
}

// Store a new booking
async function createBooking(bookingData, log) {
  const bookingId = await generateBookingId();
  const now = new Date().toISOString();
  const dateKey = now.split('T')[0]; // yyyy-mm-dd

  const item = {
    PK: `BOOKING#${bookingId}`,
    SK: 'METADATA',
    EntityType: 'Booking',
    bookingId,
    // GSI1: Status-based queries (STATUS#pending + PICKUP#datetime)
    GSI1PK: `STATUS#${bookingData.status || 'pending'}`,
    GSI1SK: `PICKUP#${bookingData.pickupTime || now}`,
    // GSI2: Date-based queries (DATE#yyyy-mm-dd + CREATED#datetime)
    GSI2PK: `DATE#${dateKey}`,
    GSI2SK: `CREATED#${now}`,
    // Booking data
    quoteId: bookingData.quoteId,
    status: bookingData.status || 'pending',
    // Customer info
    customer: {
      name: bookingData.customerName,
      email: bookingData.customerEmail,
      phone: bookingData.customerPhone,
    },
    // Journey details (from quote)
    journey: bookingData.journey,
    pickupLocation: bookingData.pickupLocation,
    dropoffLocation: bookingData.dropoffLocation,
    waypoints: bookingData.waypoints || [],
    pickupTime: bookingData.pickupTime,
    passengers: bookingData.passengers,
    luggage: bookingData.luggage || 0,
    returnJourney: bookingData.returnJourney || false,
    // Pricing
    vehicleType: bookingData.vehicleType,
    pricing: bookingData.pricing,
    // Payment info
    payment: {
      method: bookingData.paymentMethod || 'card',
      status: bookingData.paymentStatus || 'pending',
      stripePaymentIntentId: bookingData.stripePaymentIntentId || null,
    },
    // Notes
    specialRequests: bookingData.specialRequests || '',
    // Timestamps
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: BOOKINGS_TABLE_NAME,
    Item: item,
  }));

  log.info({ bookingId, quoteId: bookingData.quoteId }, 'Booking created successfully');

  return {
    bookingId,
    status: item.status,
    customer: item.customer,
    pickupTime: item.pickupTime,
    pickupLocation: item.pickupLocation,
    dropoffLocation: item.dropoffLocation,
    pricing: item.pricing,
    createdAt: item.createdAt,
  };
}

// Get booking by ID
async function getBooking(bookingId, log) {
  const command = new GetCommand({
    TableName: BOOKINGS_TABLE_NAME,
    Key: {
      PK: `BOOKING#${bookingId}`,
      SK: 'METADATA',
    },
  });

  const result = await docClient.send(command);

  if (!result.Item) {
    return null;
  }

  log.info({ bookingId }, 'Booking retrieved');
  return result.Item;
}

// List bookings (admin) with optional status filter
async function listBookings(options = {}, log) {
  const { status, limit = 50, startDate, endDate } = options;

  let command;

  if (status) {
    // Query by status using GSI1
    command = new QueryCommand({
      TableName: BOOKINGS_TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :statusKey',
      ExpressionAttributeValues: {
        ':statusKey': `STATUS#${status}`,
      },
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    });
  } else if (startDate) {
    // Query by date using GSI2
    command = new QueryCommand({
      TableName: BOOKINGS_TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :dateKey',
      ExpressionAttributeValues: {
        ':dateKey': `DATE#${startDate}`,
      },
      Limit: limit,
      ScanIndexForward: false,
    });
  } else {
    // Default: Get today's bookings
    const today = new Date().toISOString().split('T')[0];
    command = new QueryCommand({
      TableName: BOOKINGS_TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :dateKey',
      ExpressionAttributeValues: {
        ':dateKey': `DATE#${today}`,
      },
      Limit: limit,
      ScanIndexForward: false,
    });
  }

  const result = await docClient.send(command);

  log.info({ count: result.Items?.length || 0, status, startDate }, 'Bookings listed');
  return result.Items || [];
}

// Update booking status
async function updateBookingStatus(bookingId, newStatus, log) {
  const now = new Date().toISOString();

  // First get the existing booking to get pickupTime for GSI1SK
  const existing = await getBooking(bookingId, log);
  if (!existing) {
    return null;
  }

  const command = new UpdateCommand({
    TableName: BOOKINGS_TABLE_NAME,
    Key: {
      PK: `BOOKING#${bookingId}`,
      SK: 'METADATA',
    },
    UpdateExpression: 'SET #status = :status, GSI1PK = :gsi1pk, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': newStatus,
      ':gsi1pk': `STATUS#${newStatus}`,
      ':updatedAt': now,
    },
    ReturnValues: 'ALL_NEW',
  });

  const result = await docClient.send(command);
  log.info({ bookingId, newStatus }, 'Booking status updated');
  return result.Attributes;
}

export const handler = async (event, context) => {
  const startTime = Date.now();
  const log = createLogger(event, context);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { httpMethod, path, pathParameters, queryStringParameters } = event;

  log.info({
    event: 'request_received',
    method: httpMethod,
    path,
    pathParameters,
  }, 'Bookings manager request');

  try {
    // Route: POST /bookings - Create a new booking
    if (httpMethod === 'POST' && !pathParameters?.bookingId) {
      const body = JSON.parse(event.body || '{}');

      // Validate required fields
      const required = ['customerName', 'customerEmail', 'customerPhone', 'pickupLocation', 'dropoffLocation', 'pickupTime', 'vehicleType', 'pricing'];
      const missing = required.filter(field => !body[field]);
      if (missing.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}` }),
        };
      }

      const booking = await createBooking(body, log);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Booking created successfully',
          booking,
        }),
      };
    }

    // Route: GET /bookings/{bookingId} - Get booking by ID
    if (httpMethod === 'GET' && pathParameters?.bookingId) {
      const { bookingId } = pathParameters;
      const booking = await getBooking(bookingId, log);

      if (!booking) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Booking not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ booking }),
      };
    }

    // Route: GET /bookings - List bookings (admin)
    if (httpMethod === 'GET' && !pathParameters?.bookingId) {
      const options = {
        status: queryStringParameters?.status,
        limit: parseInt(queryStringParameters?.limit || '50', 10),
        startDate: queryStringParameters?.date,
      };

      const bookings = await listBookings(options, log);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ bookings, count: bookings.length }),
      };
    }

    // Route: PUT /bookings/{bookingId} - Update booking status
    if (httpMethod === 'PUT' && pathParameters?.bookingId) {
      const { bookingId } = pathParameters;
      const body = JSON.parse(event.body || '{}');

      if (!body.status) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Status is required' }),
        };
      }

      const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(body.status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
        };
      }

      const updated = await updateBookingStatus(bookingId, body.status, log);

      if (!updated) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Booking not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Booking updated', booking: updated }),
      };
    }

    // Unknown route
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };

  } catch (error) {
    log.error({
      event: 'handler_error',
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    }, 'Bookings manager error');

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
