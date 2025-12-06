# NOTS Platform - API Specification

**Version:** 1.0
**Last Updated:** 2025-12-04
**Status:** Draft
**Base URL:** `https://api.nots.co.uk/v1`

---

## 1. Overview

This document defines the REST API contract for the NOTS platform. All endpoints use JSON for request/response bodies and follow RESTful conventions.

**OpenAPI Specification:** See `openapi.yaml` in repository root (to be generated)

---

## 2. Authentication

All endpoints (except public quotes) require JWT authentication via AWS Cognito.

**Header:**
```
Authorization: Bearer <jwt_token>
```

**Token Acquisition:**
```
POST https://cognito-idp.eu-west-2.amazonaws.com/
Content-Type: application/x-amz-json-1.1
X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth

{
  "AuthFlow": "USER_PASSWORD_AUTH",
  "ClientId": "{client_id}",
  "AuthParameters": {
    "USERNAME": "user@example.com",
    "PASSWORD": "password"
  }
}
```

**Response:**
```json
{
  "AuthenticationResult": {
    "AccessToken": "eyJraWQ...",
    "IdToken": "eyJraWQ...",
    "RefreshToken": "eyJjdHk...",
    "ExpiresIn": 3600
  }
}
```

---

## 3. Common Response Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid request body/parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., booking already exists) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

---

## 4. Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Pickup location is required",
    "details": {
      "field": "pickupLocation",
      "constraint": "required"
    },
    "requestId": "abc123-def456"
  }
}
```

**Common Error Codes:**
- `INVALID_REQUEST` - Validation error
- `UNAUTHORIZED` - Authentication failure
- `FORBIDDEN` - Authorization failure
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error
- `EXTERNAL_SERVICE_ERROR` - Third-party API failure (Google Maps, Stripe)

---

## 5. API Endpoints

---

## 5.1 Quotes

### POST /v1/quotes

Calculate a quote for a journey.

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "pickupLocation": {
    "address": "Bournemouth Railway Station, Bournemouth, UK",
    "latitude": 50.7260,
    "longitude": -1.8782
  },
  "dropoffLocation": {
    "address": "Poole Harbour, Poole, UK",
    "latitude": 50.7122,
    "longitude": -2.0053
  },
  "pickupTime": "2025-12-10T14:30:00Z",
  "passengers": 2,
  "vehicleType": "standard",
  "returnJourney": false
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pickupLocation.address | string | Yes | Pickup address |
| pickupLocation.latitude | number | No | Pickup lat (if known) |
| pickupLocation.longitude | number | No | Pickup lng (if known) |
| dropoffLocation.address | string | Yes | Dropoff address |
| dropoffLocation.latitude | number | No | Dropoff lat (if known) |
| dropoffLocation.longitude | number | No | Dropoff lng (if known) |
| pickupTime | ISO 8601 | Yes | Scheduled pickup time |
| passengers | integer | Yes | Number of passengers (1-8) |
| vehicleType | enum | No | `standard`, `executive`, `minibus` (default: `standard`) |
| returnJourney | boolean | No | Include return journey (default: false) |

**Response (201 Created):**
```json
{
  "quoteId": "quote_abc123def456",
  "status": "valid",
  "expiresAt": "2025-12-04T15:30:00Z",
  "journey": {
    "distance": {
      "meters": 8500,
      "miles": 5.28,
      "text": "5.3 miles"
    },
    "duration": {
      "seconds": 1200,
      "minutes": 20,
      "text": "20 mins"
    },
    "route": {
      "polyline": "encoded_polyline_string"
    }
  },
  "pricing": {
    "currency": "GBP",
    "breakdown": {
      "baseFare": 500,
      "distanceCharge": 528,
      "timeCharge": 200,
      "subtotal": 1228,
      "tax": 0,
      "total": 1228
    },
    "displayTotal": "£12.28"
  },
  "vehicleType": "standard",
  "returnJourney": null,
  "createdAt": "2025-12-04T14:30:00Z"
}
```

**Error Responses:**
- `400` - Invalid address or parameters
- `503` - Google Maps API unavailable

---

### GET /v1/quotes/:quoteId

Retrieve a previously calculated quote.

**Authentication:** Not required

**Response (200 OK):**
Same as POST /v1/quotes response

**Error Responses:**
- `404` - Quote not found or expired

---

## 5.2 Bookings

### POST /v1/bookings

Create a new booking from a quote.

**Authentication:** Required (customer, admin, dispatcher)

**Request Body:**
```json
{
  "quoteId": "quote_abc123def456",
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+447700900123",
    "userId": "user_xyz789"
  },
  "pickupInstructions": "Wait by main entrance",
  "dropoffInstructions": "Call on arrival",
  "passengers": 2,
  "luggage": 1,
  "specialRequirements": "Child seat needed",
  "paymentMethod": "stripe",
  "stripePaymentIntentId": "pi_abc123"
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| quoteId | string | Yes | Valid quote ID |
| customer.firstName | string | Yes | Passenger first name |
| customer.lastName | string | Yes | Passenger last name |
| customer.email | string | Yes | Contact email |
| customer.phone | string | Yes | Contact phone (E.164 format) |
| customer.userId | string | No | If authenticated customer |
| pickupInstructions | string | No | Special pickup notes |
| dropoffInstructions | string | No | Special dropoff notes |
| passengers | integer | Yes | Number of passengers |
| luggage | integer | No | Number of bags (default: 0) |
| specialRequirements | string | No | Accessibility, child seats, etc. |
| paymentMethod | enum | Yes | `stripe`, `cash`, `account` |
| stripePaymentIntentId | string | Conditional | Required if paymentMethod=stripe |

**Response (201 Created):**
```json
{
  "bookingId": "booking_abc123",
  "status": "confirmed",
  "bookingReference": "NOTS-12345",
  "quote": {
    "quoteId": "quote_abc123def456",
    "pricing": {
      "displayTotal": "£12.28"
    }
  },
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+447700900123"
  },
  "journey": {
    "pickupLocation": {
      "address": "Bournemouth Railway Station, Bournemouth, UK"
    },
    "dropoffLocation": {
      "address": "Poole Harbour, Poole, UK"
    },
    "pickupTime": "2025-12-10T14:30:00Z"
  },
  "driver": null,
  "vehicle": null,
  "payment": {
    "status": "completed",
    "method": "stripe",
    "amount": 1228,
    "currency": "GBP"
  },
  "createdAt": "2025-12-04T14:45:00Z",
  "updatedAt": "2025-12-04T14:45:00Z"
}
```

**Error Responses:**
- `400` - Invalid quote or payment details
- `404` - Quote not found or expired
- `409` - Booking already exists for this quote
- `402` - Payment failed

---

### GET /v1/bookings

List bookings (paginated).

**Authentication:** Required
- Customers: See own bookings only
- Admins/Dispatchers: See all bookings

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Results per page (default: 20, max: 100) |
| cursor | string | No | Pagination cursor from previous response |
| status | enum | No | Filter by status: `pending`, `confirmed`, `assigned`, `in_progress`, `completed`, `cancelled` |
| fromDate | ISO 8601 | No | Filter bookings from this date |
| toDate | ISO 8601 | No | Filter bookings until this date |
| driverId | string | No | Filter by assigned driver (admin only) |

**Response (200 OK):**
```json
{
  "bookings": [
    {
      "bookingId": "booking_abc123",
      "status": "confirmed",
      "bookingReference": "NOTS-12345",
      "customer": {
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+447700900123"
      },
      "journey": {
        "pickupTime": "2025-12-10T14:30:00Z",
        "pickupLocation": {
          "address": "Bournemouth Railway Station"
        },
        "dropoffLocation": {
          "address": "Poole Harbour"
        }
      },
      "pricing": {
        "displayTotal": "£12.28"
      },
      "driver": null,
      "createdAt": "2025-12-04T14:45:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "nextCursor": "eyJib29raW5nSWQiOiJib29raW5nX2FiYzEyMyJ9",
    "hasMore": true
  }
}
```

---

### GET /v1/bookings/:bookingId

Get booking details.

**Authentication:** Required
- Customers: Own bookings only
- Admins/Dispatchers: All bookings

**Response (200 OK):**
Same structure as POST /v1/bookings response

**Error Responses:**
- `404` - Booking not found
- `403` - Not authorized to view this booking

---

### PATCH /v1/bookings/:bookingId

Update booking details.

**Authentication:** Required (admin, dispatcher)

**Request Body (all fields optional):**
```json
{
  "status": "assigned",
  "driverId": "driver_xyz789",
  "vehicleId": "vehicle_abc123",
  "pickupTime": "2025-12-10T14:45:00Z",
  "pickupInstructions": "Updated instructions",
  "internalNotes": "Driver called customer to confirm"
}
```

**Response (200 OK):**
Updated booking object

**Error Responses:**
- `400` - Invalid update parameters
- `404` - Booking not found
- `403` - Not authorized to update this booking
- `409` - Invalid status transition (e.g., can't set `completed` if not `in_progress`)

---

### DELETE /v1/bookings/:bookingId

Cancel a booking.

**Authentication:** Required
- Customers: Can cancel own bookings (with restrictions)
- Admins/Dispatchers: Can cancel any booking

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reason | string | No | Cancellation reason |
| refund | boolean | No | Issue refund if paid (admin only, default: false) |

**Response (200 OK):**
```json
{
  "bookingId": "booking_abc123",
  "status": "cancelled",
  "cancellation": {
    "reason": "Customer requested",
    "cancelledBy": "customer",
    "cancelledAt": "2025-12-04T15:00:00Z",
    "refundIssued": false
  }
}
```

**Error Responses:**
- `404` - Booking not found
- `403` - Not authorized to cancel (e.g., too close to pickup time)
- `409` - Booking cannot be cancelled (e.g., already in progress)

---

## 5.3 Payments

### POST /v1/payments/intents

Create a Stripe Payment Intent for a booking.

**Authentication:** Required (customer, admin)

**Request Body:**
```json
{
  "quoteId": "quote_abc123def456",
  "amount": 1228,
  "currency": "GBP",
  "customerId": "user_xyz789"
}
```

**Response (201 Created):**
```json
{
  "paymentIntentId": "pi_abc123def456",
  "clientSecret": "pi_abc123def456_secret_xyz789",
  "amount": 1228,
  "currency": "GBP",
  "status": "requires_payment_method"
}
```

---

### POST /v1/webhooks/stripe

Handle Stripe webhook events (internal endpoint).

**Authentication:** Stripe signature validation

**Events Handled:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

## 5.4 Drivers

### GET /v1/drivers

List all drivers.

**Authentication:** Required (admin, dispatcher)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | enum | No | `active`, `inactive`, `suspended` |
| available | boolean | No | Filter by availability |

**Response (200 OK):**
```json
{
  "drivers": [
    {
      "driverId": "driver_abc123",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "+447700900456",
      "status": "active",
      "availability": {
        "available": true,
        "currentLocation": {
          "latitude": 50.7192,
          "longitude": -1.8808,
          "updatedAt": "2025-12-04T14:50:00Z"
        }
      },
      "performance": {
        "rating": 4.8,
        "totalTrips": 245,
        "completionRate": 98.5
      },
      "compliance": {
        "allDocumentsValid": true,
        "expiringDocuments": []
      },
      "createdAt": "2024-06-01T10:00:00Z"
    }
  ]
}
```

---

### GET /v1/drivers/:driverId

Get driver details.

**Authentication:** Required
- Drivers: Own profile only
- Admins: All profiles

**Response (200 OK):**
```json
{
  "driverId": "driver_abc123",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+447700900456",
  "status": "active",
  "documents": {
    "dbs": {
      "status": "valid",
      "expiresAt": "2026-06-01T00:00:00Z",
      "fileUrl": "https://s3.../dbs.pdf"
    },
    "insurance": {
      "status": "expiring_soon",
      "expiresAt": "2025-12-20T00:00:00Z",
      "fileUrl": "https://s3.../insurance.pdf"
    },
    "phvLicense": {
      "status": "valid",
      "expiresAt": "2027-01-15T00:00:00Z",
      "fileUrl": "https://s3.../phv.pdf"
    }
  },
  "performance": {
    "rating": 4.8,
    "totalTrips": 245,
    "completionRate": 98.5,
    "acceptanceRate": 95.2,
    "onTimeRate": 97.1
  }
}
```

---

### PATCH /v1/drivers/:driverId

Update driver information.

**Authentication:** Required
- Drivers: Can update own profile (limited fields)
- Admins: Can update any profile (all fields)

**Request Body (example - all fields optional):**
```json
{
  "status": "inactive",
  "phone": "+447700900999",
  "availability": {
    "available": false
  }
}
```

**Response (200 OK):**
Updated driver object

---

## 5.5 Dispatch

### POST /v1/dispatch/assign

Assign a booking to a driver.

**Authentication:** Required (admin, dispatcher)

**Request Body:**
```json
{
  "bookingId": "booking_abc123",
  "driverId": "driver_xyz789",
  "vehicleId": "vehicle_def456",
  "notifyDriver": true
}
```

**Response (200 OK):**
```json
{
  "bookingId": "booking_abc123",
  "status": "assigned",
  "driver": {
    "driverId": "driver_xyz789",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+447700900456"
  },
  "vehicle": {
    "vehicleId": "vehicle_def456",
    "registration": "AB12 CDE",
    "make": "Toyota",
    "model": "Prius",
    "color": "Silver"
  },
  "assignedAt": "2025-12-04T15:00:00Z"
}
```

**Error Responses:**
- `400` - Invalid booking or driver
- `409` - Driver not available or booking already assigned

---

## 5.6 Vehicles

### GET /v1/vehicles

List all vehicles.

**Authentication:** Required (admin, dispatcher)

**Response (200 OK):**
```json
{
  "vehicles": [
    {
      "vehicleId": "vehicle_abc123",
      "registration": "AB12 CDE",
      "make": "Toyota",
      "model": "Prius",
      "year": 2022,
      "color": "Silver",
      "type": "standard",
      "capacity": 4,
      "status": "active",
      "assignedDriver": "driver_xyz789"
    }
  ]
}
```

---

## 5.7 Compliance

### POST /v1/compliance/documents

Upload driver compliance document.

**Authentication:** Required (admin, driver for own documents)

**Request Body (multipart/form-data):**
```
driverId: driver_abc123
documentType: dbs
expiryDate: 2026-06-01
file: [binary file data]
```

**Response (201 Created):**
```json
{
  "documentId": "doc_abc123",
  "driverId": "driver_abc123",
  "documentType": "dbs",
  "status": "pending_review",
  "expiryDate": "2026-06-01T00:00:00Z",
  "uploadedAt": "2025-12-04T15:00:00Z",
  "fileUrl": "https://s3.../dbs_abc123.pdf"
}
```

---

## 5.8 Analytics

### GET /v1/analytics/overview

Get platform analytics overview.

**Authentication:** Required (admin only)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| fromDate | ISO 8601 | Yes | Start date for analytics |
| toDate | ISO 8601 | Yes | End date for analytics |
| granularity | enum | No | `day`, `week`, `month` (default: `day`) |

**Response (200 OK):**
```json
{
  "period": {
    "from": "2025-12-01T00:00:00Z",
    "to": "2025-12-04T23:59:59Z"
  },
  "bookings": {
    "total": 156,
    "completed": 142,
    "cancelled": 8,
    "inProgress": 6,
    "conversionRate": 68.5
  },
  "revenue": {
    "total": 245600,
    "currency": "GBP",
    "displayTotal": "£2,456.00",
    "averageBookingValue": 1574
  },
  "drivers": {
    "active": 12,
    "averageRating": 4.7,
    "averageTripsPerDriver": 11.8
  },
  "topRoutes": [
    {
      "route": "Bournemouth → Poole",
      "bookings": 23,
      "revenue": 28600
    }
  ]
}
```

---

## 6. Rate Limiting

**Limits:**
- **Public endpoints** (quotes): 100 requests/hour per IP
- **Authenticated endpoints**: 1000 requests/hour per user
- **Admin endpoints**: 5000 requests/hour per user

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1701710400
```

---

## 7. Webhooks (Outbound)

NOTS can send webhook notifications to external systems (Phase 2).

**Events:**
- `booking.created`
- `booking.assigned`
- `booking.completed`
- `booking.cancelled`
- `payment.completed`
- `driver.document_expiring`

---

## 8. Versioning

API versioning via URL path: `/v1/`, `/v2/`, etc.

**Deprecation Policy:**
- 6 months notice before deprecating endpoints
- Old versions supported for 12 months minimum

---

## 9. Pagination

All list endpoints use cursor-based pagination.

**Request:**
```
GET /v1/bookings?limit=20&cursor=eyJib29raW5nSWQi...
```

**Response:**
```json
{
  "bookings": [...],
  "pagination": {
    "limit": 20,
    "nextCursor": "eyJib29raW5nSWQiOiJib29raW5nX2FiYzEyMyJ9",
    "hasMore": true
  }
}
```

---

## 10. OpenAPI Specification

Full OpenAPI 3.0 specification to be generated from this document.

**Tools:**
- Swagger UI for API documentation
- Postman collection for testing
- API client SDKs (Phase 2)

---

## 11. Testing

**Sandbox Environment:**
- Base URL: `https://api-staging.nots.co.uk/v1`
- Test Stripe keys
- Test Google Maps API quota

**Test Credentials:**
```
Admin: admin@nots.test / TestPass123!
Driver: driver@nots.test / TestPass123!
Customer: customer@nots.test / TestPass123!
```

---

## References

- [TechnicalArchitecture.md](TechnicalArchitecture.md)
- [DatabaseSchema.md](DatabaseSchema.md)
- [SecurityCompliance.md](SecurityCompliance.md)

---

**Document Owner:** Tech Lead / API Architect
**Review Cycle:** Quarterly or before major releases
