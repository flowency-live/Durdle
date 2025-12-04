# NOTS Platform - Database Schema Design

**Version:** 1.0
**Last Updated:** 2025-12-04
**Status:** Draft
**Database:** AWS DynamoDB (Single-Table Design)

---

## 1. Overview

The NOTS platform uses DynamoDB with a single-table design pattern to optimize cost and performance. This approach stores all entities in one table using composite keys and Global Secondary Indexes (GSIs) for access patterns.

**Why Single-Table Design?**
- Reduced costs (one table vs multiple tables)
- Atomic transactions across related entities
- Optimized for common access patterns
- Better performance for read-heavy workloads

---

## 2. Table Structure

### 2.1 Main Table: `nots-main-table`

**Primary Key:**
- **Partition Key (PK):** String
- **Sort Key (SK):** String

**Attributes:**
- **EntityType:** String (helps with filtering and querying)
- **GSI1PK:** String (for first GSI)
- **GSI1SK:** String (for first GSI)
- **GSI2PK:** String (for second GSI)
- **GSI2SK:** String (for second GSI)
- **GSI3PK:** String (for third GSI)
- **GSI3SK:** String (for third GSI)
- **Data:** Map (entity-specific attributes)
- **CreatedAt:** Number (Unix timestamp)
- **UpdatedAt:** Number (Unix timestamp)
- **TTL:** Number (Unix timestamp for auto-deletion)

**Billing Mode:** On-Demand (auto-scales)

**Encryption:** AWS managed keys (AES-256)

**Point-in-Time Recovery:** ENABLED

---

## 3. Entity Patterns

### 3.1 User (Customer)

**Item Structure:**
```json
{
  "PK": "USER#user_abc123",
  "SK": "PROFILE",
  "EntityType": "User",
  "GSI1PK": "EMAIL#john@example.com",
  "GSI1SK": "USER",
  "Data": {
    "userId": "user_abc123",
    "cognitoId": "cognito-uuid-xyz",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+447700900123",
    "role": "customer",
    "status": "active",
    "preferences": {
      "notifications": {
        "email": true,
        "sms": true
      },
      "savedAddresses": [
        {
          "label": "Home",
          "address": "123 High Street, Bournemouth",
          "latitude": 50.7192,
          "longitude": -1.8808
        }
      ]
    }
  },
  "CreatedAt": 1701710400,
  "UpdatedAt": 1701710400
}
```

**Access Patterns:**
- Get user by ID: `PK = USER#{userId}, SK = PROFILE`
- Get user by email: `GSI1: PK = EMAIL#{email}, SK = USER`
- List all users: Query on `EntityType = User`

---

### 3.2 Driver

**Item Structure:**
```json
{
  "PK": "DRIVER#driver_xyz789",
  "SK": "PROFILE",
  "EntityType": "Driver",
  "GSI1PK": "DRIVER_STATUS#active",
  "GSI1SK": "DRIVER#driver_xyz789",
  "GSI2PK": "DRIVER_AVAILABLE#true",
  "GSI2SK": "RATING#4.8",
  "Data": {
    "driverId": "driver_xyz789",
    "cognitoId": "cognito-uuid-abc",
    "email": "driver@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+447700900456",
    "status": "active",
    "availability": {
      "available": true,
      "currentLocation": {
        "latitude": 50.7192,
        "longitude": -1.8808,
        "updatedAt": 1701710400
      }
    },
    "performance": {
      "rating": 4.8,
      "totalTrips": 245,
      "completionRate": 98.5,
      "acceptanceRate": 95.2,
      "onTimeRate": 97.1
    },
    "assignedVehicle": "vehicle_def456"
  },
  "CreatedAt": 1701710400,
  "UpdatedAt": 1701710400
}
```

**Access Patterns:**
- Get driver by ID: `PK = DRIVER#{driverId}, SK = PROFILE`
- List active drivers: `GSI1: PK = DRIVER_STATUS#active`
- List available drivers sorted by rating: `GSI2: PK = DRIVER_AVAILABLE#true, SK begins_with RATING#`

---

### 3.3 Driver Compliance Document

**Item Structure:**
```json
{
  "PK": "DRIVER#driver_xyz789",
  "SK": "DOC#dbs",
  "EntityType": "ComplianceDocument",
  "GSI1PK": "DOC_STATUS#expiring_soon",
  "GSI1SK": "EXPIRY#1734825600",
  "Data": {
    "documentId": "doc_abc123",
    "driverId": "driver_xyz789",
    "documentType": "dbs",
    "status": "valid",
    "expiryDate": 1767139200,
    "uploadedAt": 1701710400,
    "fileUrl": "https://s3.amazonaws.com/.../dbs_abc123.pdf",
    "fileKey": "drivers/driver_xyz789/dbs_abc123.pdf",
    "reviewedBy": "admin_def456",
    "reviewedAt": 1701796800
  },
  "CreatedAt": 1701710400,
  "UpdatedAt": 1701710400
}
```

**Document Types:**
- `dbs` - DBS Check
- `insurance` - Vehicle Insurance
- `mot` - MOT Certificate
- `phv_license` - Private Hire Vehicle License
- `driving_license` - UK Driving License

**Access Patterns:**
- Get all documents for driver: `PK = DRIVER#{driverId}, SK begins_with DOC#`
- Get specific document: `PK = DRIVER#{driverId}, SK = DOC#{documentType}`
- List expiring documents: `GSI1: PK = DOC_STATUS#expiring_soon, SK < EXPIRY#{timestamp}`

---

### 3.4 Quote

**Item Structure:**
```json
{
  "PK": "QUOTE#quote_abc123",
  "SK": "METADATA",
  "EntityType": "Quote",
  "Data": {
    "quoteId": "quote_abc123",
    "status": "valid",
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
    "pickupTime": 1733842200,
    "journey": {
      "distance": {
        "meters": 8500,
        "miles": 5.28
      },
      "duration": {
        "seconds": 1200,
        "minutes": 20
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
      }
    },
    "vehicleType": "standard",
    "passengers": 2,
    "returnJourney": false
  },
  "CreatedAt": 1701710400,
  "UpdatedAt": 1701710400,
  "TTL": 1701796800
}
```

**Access Patterns:**
- Get quote by ID: `PK = QUOTE#{quoteId}, SK = METADATA`
- Auto-delete expired quotes: TTL attribute (15 minutes)

---

### 3.5 Booking

**Item Structure:**
```json
{
  "PK": "BOOKING#booking_abc123",
  "SK": "METADATA",
  "EntityType": "Booking",
  "GSI1PK": "STATUS#confirmed",
  "GSI1SK": "PICKUP_TIME#1733842200",
  "GSI2PK": "USER#user_abc123",
  "GSI2SK": "BOOKING#booking_abc123",
  "GSI3PK": "DRIVER#driver_xyz789",
  "GSI3SK": "PICKUP_TIME#1733842200",
  "Data": {
    "bookingId": "booking_abc123",
    "bookingReference": "NOTS-12345",
    "status": "confirmed",
    "quoteId": "quote_abc123",
    "customer": {
      "userId": "user_abc123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+447700900123"
    },
    "journey": {
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
      "pickupTime": 1733842200,
      "pickupInstructions": "Wait by main entrance",
      "dropoffInstructions": "Call on arrival"
    },
    "passengers": 2,
    "luggage": 1,
    "specialRequirements": "Child seat needed",
    "pricing": {
      "currency": "GBP",
      "total": 1228,
      "displayTotal": "£12.28"
    },
    "driver": {
      "driverId": "driver_xyz789",
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "+447700900456",
      "assignedAt": 1701796800
    },
    "vehicle": {
      "vehicleId": "vehicle_def456",
      "registration": "AB12 CDE",
      "make": "Toyota",
      "model": "Prius",
      "color": "Silver"
    },
    "payment": {
      "paymentId": "payment_xyz123",
      "status": "completed",
      "method": "stripe",
      "stripePaymentIntentId": "pi_abc123"
    },
    "timeline": {
      "created": 1701710400,
      "confirmed": 1701710400,
      "assigned": 1701796800,
      "driverEnRoute": null,
      "arrived": null,
      "passengerOnboard": null,
      "completed": null,
      "cancelled": null
    },
    "internalNotes": ""
  },
  "CreatedAt": 1701710400,
  "UpdatedAt": 1701796800
}
```

**Booking Status Flow:**
```
pending → confirmed → assigned → in_progress → completed
                         ↓
                    cancelled
```

**Access Patterns:**
- Get booking by ID: `PK = BOOKING#{bookingId}, SK = METADATA`
- List bookings by status and pickup time: `GSI1: PK = STATUS#{status}, SK = PICKUP_TIME#{timestamp}`
- List user's bookings: `GSI2: PK = USER#{userId}, SK begins_with BOOKING#`
- List driver's jobs: `GSI3: PK = DRIVER#{driverId}, SK = PICKUP_TIME#{timestamp}`

---

### 3.6 Payment

**Item Structure:**
```json
{
  "PK": "BOOKING#booking_abc123",
  "SK": "PAYMENT#payment_xyz123",
  "EntityType": "Payment",
  "GSI1PK": "PAYMENT_STATUS#completed",
  "GSI1SK": "CREATED#1701710400",
  "Data": {
    "paymentId": "payment_xyz123",
    "bookingId": "booking_abc123",
    "userId": "user_abc123",
    "status": "completed",
    "method": "stripe",
    "provider": {
      "name": "stripe",
      "paymentIntentId": "pi_abc123",
      "chargeId": "ch_xyz789"
    },
    "amount": {
      "total": 1228,
      "currency": "GBP",
      "displayTotal": "£12.28"
    },
    "refund": {
      "refunded": false,
      "refundId": null,
      "amount": 0,
      "reason": null,
      "refundedAt": null
    }
  },
  "CreatedAt": 1701710400,
  "UpdatedAt": 1701710400
}
```

**Access Patterns:**
- Get payment for booking: `PK = BOOKING#{bookingId}, SK = PAYMENT#{paymentId}`
- List payments by status: `GSI1: PK = PAYMENT_STATUS#{status}, SK = CREATED#{timestamp}`

---

### 3.7 Vehicle

**Item Structure:**
```json
{
  "PK": "VEHICLE#vehicle_def456",
  "SK": "METADATA",
  "EntityType": "Vehicle",
  "GSI1PK": "VEHICLE_STATUS#active",
  "GSI1SK": "VEHICLE#vehicle_def456",
  "Data": {
    "vehicleId": "vehicle_def456",
    "registration": "AB12CDE",
    "make": "Toyota",
    "model": "Prius",
    "year": 2022,
    "color": "Silver",
    "type": "standard",
    "capacity": 4,
    "status": "active",
    "assignedDriver": "driver_xyz789",
    "features": [
      "air_conditioning",
      "bluetooth",
      "child_seat_available"
    ],
    "insurance": {
      "provider": "ABC Insurance",
      "policyNumber": "POL123456",
      "expiryDate": 1767139200
    },
    "mot": {
      "expiryDate": 1767139200,
      "certificateNumber": "MOT987654"
    }
  },
  "CreatedAt": 1701710400,
  "UpdatedAt": 1701710400
}
```

**Vehicle Types:**
- `standard` - Sedan (4 passengers)
- `executive` - Luxury sedan (4 passengers)
- `minibus` - 8 passengers

**Access Patterns:**
- Get vehicle by ID: `PK = VEHICLE#{vehicleId}, SK = METADATA`
- List active vehicles: `GSI1: PK = VEHICLE_STATUS#active`

---

### 3.8 Rating

**Item Structure:**
```json
{
  "PK": "BOOKING#booking_abc123",
  "SK": "RATING",
  "EntityType": "Rating",
  "GSI1PK": "DRIVER#driver_xyz789",
  "GSI1SK": "RATING#booking_abc123",
  "Data": {
    "ratingId": "rating_xyz123",
    "bookingId": "booking_abc123",
    "driverId": "driver_xyz789",
    "customerId": "user_abc123",
    "score": 5,
    "feedback": "Excellent service, very professional",
    "categories": {
      "punctuality": 5,
      "cleanliness": 5,
      "driving": 5,
      "professionalism": 5
    }
  },
  "CreatedAt": 1701796800,
  "UpdatedAt": 1701796800
}
```

**Access Patterns:**
- Get rating for booking: `PK = BOOKING#{bookingId}, SK = RATING`
- List driver's ratings: `GSI1: PK = DRIVER#{driverId}, SK begins_with RATING#`

---

### 3.9 Complaint

**Item Structure:**
```json
{
  "PK": "COMPLAINT#complaint_abc123",
  "SK": "METADATA",
  "EntityType": "Complaint",
  "GSI1PK": "DRIVER#driver_xyz789",
  "GSI1SK": "CREATED#1701796800",
  "GSI2PK": "STATUS#open",
  "GSI2SK": "PRIORITY#high",
  "Data": {
    "complaintId": "complaint_abc123",
    "bookingId": "booking_abc123",
    "driverId": "driver_xyz789",
    "customerId": "user_abc123",
    "status": "open",
    "priority": "high",
    "category": "driver_behavior",
    "description": "Driver was rude to passenger",
    "resolution": null,
    "resolvedBy": null,
    "resolvedAt": null
  },
  "CreatedAt": 1701796800,
  "UpdatedAt": 1701796800
}
```

**Complaint Categories:**
- `driver_behavior`
- `vehicle_condition`
- `late_pickup`
- `route_dispute`
- `pricing_dispute`
- `safety_concern`
- `other`

**Access Patterns:**
- Get complaint by ID: `PK = COMPLAINT#{complaintId}, SK = METADATA`
- List driver's complaints: `GSI1: PK = DRIVER#{driverId}, SK = CREATED#{timestamp}`
- List open complaints by priority: `GSI2: PK = STATUS#open, SK = PRIORITY#{priority}`

---

## 4. Global Secondary Indexes (GSIs)

### GSI-1: Entity Status and Sorting

**Purpose:** Query entities by status/type with sorting
**Projection:** ALL

| Attribute | Type |
|-----------|------|
| GSI1PK | Partition Key |
| GSI1SK | Sort Key |

**Usage:**
- List active drivers
- List bookings by status and pickup time
- List expiring documents
- List driver ratings
- List driver complaints

---

### GSI-2: User/Driver Bookings

**Purpose:** Query bookings by user or driver
**Projection:** ALL

| Attribute | Type |
|-----------|------|
| GSI2PK | Partition Key |
| GSI2SK | Sort Key |

**Usage:**
- Get all bookings for a user
- Get driver's booking history

---

### GSI-3: Driver Assignments and Availability

**Purpose:** Query driver jobs and availability
**Projection:** ALL

| Attribute | Type |
|-----------|------|
| GSI3PK | Partition Key |
| GSI3SK | Sort Key |

**Usage:**
- Get driver's upcoming jobs
- Find available drivers by rating

---

## 5. Access Patterns Summary

| Use Case | Pattern |
|----------|---------|
| Get user by ID | Query: `PK = USER#{userId}, SK = PROFILE` |
| Get user by email | GSI1: `PK = EMAIL#{email}` |
| Get booking by ID | Query: `PK = BOOKING#{bookingId}, SK = METADATA` |
| List user's bookings | GSI2: `PK = USER#{userId}, SK begins_with BOOKING#` |
| List bookings by status | GSI1: `PK = STATUS#{status}` |
| List driver's jobs | GSI3: `PK = DRIVER#{driverId}` |
| Get driver by ID | Query: `PK = DRIVER#{driverId}, SK = PROFILE` |
| List active drivers | GSI1: `PK = DRIVER_STATUS#active` |
| List available drivers | GSI2: `PK = DRIVER_AVAILABLE#true` |
| Get driver documents | Query: `PK = DRIVER#{driverId}, SK begins_with DOC#` |
| List expiring documents | GSI1: `PK = DOC_STATUS#expiring_soon` |
| Get quote by ID | Query: `PK = QUOTE#{quoteId}, SK = METADATA` |
| Get vehicle by ID | Query: `PK = VEHICLE#{vehicleId}, SK = METADATA` |
| List driver complaints | GSI1: `PK = DRIVER#{driverId}, SK begins_with CREATED#` |

---

## 6. Data Modeling Best Practices

### 6.1 ID Generation

Use UUIDs with prefixes for clarity:
```
user_abc123def456
booking_xyz789ghi012
driver_mno345pqr678
```

### 6.2 Timestamps

Store as Unix timestamps (seconds since epoch):
```javascript
CreatedAt: Math.floor(Date.now() / 1000)
```

### 6.3 Status Enums

Define clear status values:
- **Booking:** `pending`, `confirmed`, `assigned`, `in_progress`, `completed`, `cancelled`
- **Payment:** `pending`, `processing`, `completed`, `failed`, `refunded`
- **Driver:** `active`, `inactive`, `suspended`
- **Document:** `pending_review`, `valid`, `expiring_soon`, `expired`, `rejected`

### 6.4 TTL (Time To Live)

Use TTL for auto-cleanup:
- **Quotes:** 15 minutes (900 seconds)
- **Expired sessions:** 24 hours
- **Old analytics data:** 90 days (Phase 2)

---

## 7. Transaction Examples

### 7.1 Create Booking with Payment

```javascript
const params = {
  TransactItems: [
    {
      Put: {
        TableName: 'nots-main-table',
        Item: {
          PK: 'BOOKING#booking_abc123',
          SK: 'METADATA',
          EntityType: 'Booking',
          // ... booking data
        }
      }
    },
    {
      Put: {
        TableName: 'nots-main-table',
        Item: {
          PK: 'BOOKING#booking_abc123',
          SK: 'PAYMENT#payment_xyz123',
          EntityType: 'Payment',
          // ... payment data
        }
      }
    }
  ]
};

await dynamodb.transactWrite(params).promise();
```

### 7.2 Update Booking Status

```javascript
const params = {
  TableName: 'nots-main-table',
  Key: {
    PK: 'BOOKING#booking_abc123',
    SK: 'METADATA'
  },
  UpdateExpression: 'SET #data.#status = :status, #data.#timeline.#assigned = :timestamp, UpdatedAt = :now, GSI1PK = :gsi1pk',
  ExpressionAttributeNames: {
    '#data': 'Data',
    '#status': 'status',
    '#timeline': 'timeline',
    '#assigned': 'assigned'
  },
  ExpressionAttributeValues: {
    ':status': 'assigned',
    ':timestamp': Math.floor(Date.now() / 1000),
    ':now': Math.floor(Date.now() / 1000),
    ':gsi1pk': 'STATUS#assigned'
  }
};

await dynamodb.update(params).promise();
```

---

## 8. Capacity Planning

### 8.1 Initial Estimates (1000 bookings/month)

**Read Requests:**
- API queries: ~50,000 reads/month
- Dashboard views: ~10,000 reads/month
- **Total:** ~60,000 reads/month (~23 reads/minute)

**Write Requests:**
- Bookings: ~1,000 writes/month
- Status updates: ~4,000 writes/month
- Ratings/feedback: ~800 writes/month
- **Total:** ~5,800 writes/month (~2 writes/minute)

**Storage:**
- Average item size: 5 KB
- Items per booking: 3 (booking, payment, rating) = 15 KB
- 1000 bookings = 15 MB/month
- **Total (1 year):** ~180 MB

**Cost (On-Demand):**
- Read: $0.25 per million reads = ~$0.015/month
- Write: $1.25 per million writes = ~$0.007/month
- Storage: $0.25 per GB = ~$0.04/month
- **Total:** ~$0.06/month (negligible)

### 8.2 Scaling Considerations

DynamoDB On-Demand auto-scales to handle traffic spikes without capacity planning.

---

## 9. Backup and Recovery

**Point-in-Time Recovery (PITR):**
- Enabled on production table
- 35-day retention
- Restore to any point in last 35 days

**On-Demand Backups:**
- Manual backups before major changes
- Stored indefinitely until deleted

**Cross-Region Replication:**
- Phase 3: Replicate to `eu-west-1` for DR

---

## 10. Migration Strategy

### 10.1 From Legacy System (if applicable)

1. Export data from old system
2. Transform to NOTS schema
3. Batch import using DynamoDB BatchWriteItem
4. Validate data integrity
5. Run parallel systems for 1 week
6. Cutover to NOTS

### 10.2 Schema Evolution

**Adding New Attributes:**
- Backward compatible (no migration needed)
- Set default values in application code

**Adding New Entity Types:**
- Define new PK/SK patterns
- Update GSI projections if needed

**Changing Key Structure:**
- Requires data migration
- Create new table → Migrate → Swap tables

---

## 11. References

- [TechnicalArchitecture.md](TechnicalArchitecture.md)
- [APISpecification.md](APISpecification.md)
- AWS DynamoDB Best Practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
- Single-Table Design Guide: https://www.alexdebrie.com/posts/dynamodb-single-table/

---

**Document Owner:** Backend Lead / Database Architect
**Review Cycle:** Quarterly or before schema changes
