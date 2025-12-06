// Quote Wizard Validation Schema
// Based on QUOTE_WIZARD_IMPLEMENTATION_SPEC.md

import { z } from 'zod';

export const quoteFormSchema = z.object({
  pickupLocation: z.object({
    address: z.string().min(1, 'Pickup location is required'),
    placeId: z.string().optional(),
  }),
  dropoffLocation: z.object({
    address: z.string().min(1, 'Dropoff location is required'),
    placeId: z.string().optional(),
  }),
  waypoints: z.array(
    z.object({
      address: z.string(),
      placeId: z.string().optional(),
      waitTime: z.number().min(0, 'Wait time cannot be negative').max(480, 'Maximum wait time is 8 hours (480 minutes)').optional(),
    })
  ).max(3, 'Maximum 3 waypoints allowed').optional(),
  pickupTime: z.string().refine((date) => {
    const pickup = new Date(date);
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    return pickup >= tomorrow;
  }, 'Pickup must be at least 24 hours from now'),
  passengers: z.number().min(1, 'At least 1 passenger required').max(8, 'Maximum 8 passengers'),
  vehicleType: z.enum(['standard', 'executive', 'minibus'], {
    message: 'Please select a vehicle type'
  }),
  returnJourney: z.boolean().optional(),
  contactDetails: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().regex(/^(\+44|0)7\d{9}$/, 'Invalid UK mobile number').optional(),
  }).optional(),
}).refine((data) => {
  // Ensure pickup and dropoff are different
  return data.pickupLocation.address !== data.dropoffLocation.address;
}, {
  message: 'Pickup and dropoff locations must be different',
  path: ['dropoffLocation'],
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;

// Validation error messages
export const errorMessages = {
  INVALID_REQUEST: 'Please check your journey details and try again',
  ROUTE_NOT_FOUND: 'Unable to calculate route between these locations',
  LOCATION_INVALID: 'Please select a valid UK location',
  API_TIMEOUT: 'Request timed out. Please try again',
  NETWORK_ERROR: 'Connection error. Check your internet and try again',
  UNKNOWN_ERROR: 'Something went wrong. Please try again or contact support',
} as const;
