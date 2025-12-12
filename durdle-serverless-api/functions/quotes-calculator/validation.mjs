import { z } from 'zod';

/**
 * Location schema - represents a pickup, dropoff, or waypoint location
 */
const LocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  placeId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

/**
 * Waypoint schema - location with optional wait time
 */
const WaypointSchema = LocationSchema.extend({
  waitTime: z.number().min(0).max(480).optional(), // Max 8 hours wait
});

/**
 * Optional extras schema - baby/child seats
 */
const ExtrasSchema = z.object({
  babySeats: z.number().int().min(0).max(4).optional().default(0), // Ages 0-4
  childSeats: z.number().int().min(0).max(4).optional().default(0), // Ages 5-12
});

/**
 * Journey type enum
 */
const JourneyTypeSchema = z.enum(['one-way', 'by-the-hour']).optional().default('one-way');

/**
 * Quote request schema - validates incoming quote calculation requests
 */
export const QuoteRequestSchema = z.object({
  pickupLocation: LocationSchema,
  dropoffLocation: LocationSchema.optional(), // Optional for 'by-the-hour' journeys
  waypoints: z.array(WaypointSchema).max(5).optional(), // Max 5 waypoints
  pickupTime: z.string().datetime({ message: 'Valid ISO 8601 datetime required' }),
  passengers: z.number().int().min(1).max(8),
  luggage: z.number().int().min(0).max(20).optional(),
  vehicleType: z.enum(['standard', 'executive', 'minibus']).optional(),
  journeyType: JourneyTypeSchema,
  durationHours: z.number().int().min(2).max(12).optional(), // Required for 'by-the-hour', 2-12 hours
  extras: ExtrasSchema.optional(),
  compareMode: z.boolean().optional(), // When true, return pricing for ALL vehicle types
  corpAccountId: z.string().optional(), // Optional corporate account ID for applying discounts
  contactDetails: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
}).refine(
  (data) => {
    // For 'by-the-hour' journeys, dropoffLocation is not required
    if (data.journeyType === 'by-the-hour') {
      return true;
    }
    // For 'one-way' journeys, pickup and dropoff must be different
    if (!data.dropoffLocation) {
      return false;
    }
    return data.pickupLocation.address !== data.dropoffLocation.address;
  },
  { message: 'Pickup and dropoff locations must be different', path: ['dropoffLocation'] }
).refine(
  (data) => {
    // durationHours is required for 'by-the-hour' journeys
    if (data.journeyType === 'by-the-hour') {
      return data.durationHours !== undefined && data.durationHours >= 2;
    }
    return true;
  },
  { message: 'Duration is required for by-the-hour journeys (minimum 2 hours)', path: ['durationHours'] }
).refine(
  (data) => {
    // Total seats cannot exceed passenger count
    const totalSeats = (data.extras?.babySeats || 0) + (data.extras?.childSeats || 0);
    return totalSeats <= data.passengers;
  },
  { message: 'Total child seats cannot exceed passenger count', path: ['extras'] }
);

/**
 * Validate and parse quote request
 * @param {any} rawData - Raw request body
 * @returns {object} Validated quote request
 * @throws {z.ZodError} If validation fails
 */
export function validateQuoteRequest(rawData) {
  return QuoteRequestSchema.parse(rawData);
}

/**
 * Safe validation that returns result object instead of throwing
 * @param {any} rawData - Raw request body
 * @returns {{success: boolean, data?: object, error?: object}}
 */
export function safeValidateQuoteRequest(rawData) {
  const result = QuoteRequestSchema.safeParse(rawData);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format Zod errors for API response
  // Handle both standard errors and refine errors
  const zodErrors = result.error?.errors || result.error?.issues || [];
  const errors = zodErrors.map(err => ({
    field: err.path?.join('.') || 'unknown',
    message: err.message,
    code: err.code
  }));

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: errors
    }
  };
}
