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
 * Quote request schema - validates incoming quote calculation requests
 */
export const QuoteRequestSchema = z.object({
  pickupLocation: LocationSchema,
  dropoffLocation: LocationSchema,
  waypoints: z.array(WaypointSchema).max(5).optional(), // Max 5 waypoints
  pickupTime: z.string().datetime({ message: 'Valid ISO 8601 datetime required' }),
  passengers: z.number().int().min(1).max(8),
  luggage: z.number().int().min(0).max(20).optional(),
  vehicleType: z.enum(['standard', 'executive', 'minibus']).optional(),
  contactDetails: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
}).refine(
  (data) => data.pickupLocation.address !== data.dropoffLocation.address,
  { message: 'Pickup and dropoff locations must be different', path: ['dropoffLocation'] }
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
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
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
