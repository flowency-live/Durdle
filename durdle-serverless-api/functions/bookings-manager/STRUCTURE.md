# Bookings Manager Lambda

## Overview
Manages booking creation, retrieval, and status updates for the Durdle platform.

## Function Details
- **Name**: `bookings-manager-dev`
- **Runtime**: Node.js 20.x (arm64)
- **Handler**: `index.handler`
- **Layer**: `durdle-common-layer:3` (logger.mjs + Pino)
- **Timeout**: 30 seconds
- **Memory**: 256 MB

## Environment Variables
| Variable | Value | Description |
|----------|-------|-------------|
| `BOOKINGS_TABLE_NAME` | `durdle-bookings-dev` | DynamoDB bookings table |
| `AWS_REGION` | `eu-west-2` | AWS region |

## API Endpoints

### POST /bookings
Creates a new booking from payment/quote data.

**Request Body:**
```json
{
  "quoteId": "DTC-Q08120801",
  "customerName": "John Smith",
  "customerEmail": "john@example.com",
  "customerPhone": "07123456789",
  "pickupLocation": { "address": "...", "lat": 50.7, "lng": -2.4 },
  "dropoffLocation": { "address": "...", "lat": 50.8, "lng": -2.5 },
  "pickupTime": "2025-12-15T10:00:00Z",
  "passengers": 2,
  "luggage": 1,
  "vehicleType": "standard",
  "pricing": { "totalPrice": 4500, "breakdown": {...} },
  "paymentMethod": "card",
  "stripePaymentIntentId": "pi_xxx",
  "specialRequests": "Child seat required"
}
```

**Response (201):**
```json
{
  "message": "Booking created successfully",
  "booking": {
    "bookingId": "DTC-08120801",
    "status": "pending",
    "customer": { "name": "...", "email": "...", "phone": "..." },
    "pickupTime": "2025-12-15T10:00:00Z",
    "pricing": {...},
    "createdAt": "2025-12-08T..."
  }
}
```

### GET /bookings/{bookingId}
Retrieves a specific booking.

### GET /bookings
Lists bookings with optional filters.

**Query Parameters:**
- `status`: Filter by status (pending, confirmed, in_progress, completed, cancelled)
- `date`: Filter by date (yyyy-mm-dd)
- `limit`: Max results (default 50)

### PUT /bookings/{bookingId}
Updates booking status.

**Request Body:**
```json
{
  "status": "confirmed"
}
```

## Booking ID Format
`DTC-{ddmmyy}{seq}` - e.g., `DTC-08120801`
- DTC = Dorset Transfer Company prefix
- ddmmyy = Date (day/month/year)
- seq = Two-digit sequence number for the day (01, 02, etc.)

## DynamoDB Schema
- **Table**: `durdle-bookings-dev`
- **PK**: `BOOKING#{bookingId}`
- **SK**: `METADATA`
- **GSI1**: Status + Pickup time queries
  - GSI1PK: `STATUS#{status}`
  - GSI1SK: `PICKUP#{pickupTime}`
- **GSI2**: Date-based queries
  - GSI2PK: `DATE#{yyyy-mm-dd}`
  - GSI2SK: `CREATED#{createdAt}`

## Deployment Commands

### First-Time Deployment
```bash
cd durdle-serverless-api/functions/bookings-manager

# Create deployment ZIP (no node_modules - AWS SDK v3 included in runtime)
zip -r deployment.zip index.mjs

# Create function
aws lambda create-function \
  --function-name bookings-manager-dev \
  --runtime nodejs20.x \
  --architectures arm64 \
  --handler index.handler \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --zip-file fileb://deployment.zip \
  --timeout 30 \
  --memory-size 256 \
  --layers arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:3 \
  --environment Variables="{BOOKINGS_TABLE_NAME=durdle-bookings-dev}" \
  --region eu-west-2

# Clean up
rm deployment.zip
```

### Update Code
```bash
cd durdle-serverless-api/functions/bookings-manager

zip -r deployment.zip index.mjs

aws lambda update-function-code \
  --function-name bookings-manager-dev \
  --zip-file fileb://deployment.zip \
  --region eu-west-2

rm deployment.zip
```

## Related Resources
- DynamoDB: `durdle-bookings-dev`
- Lambda Layer: `durdle-common-layer:3`
- IAM Role: `durdle-lambda-execution-role-dev`
