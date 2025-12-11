import { z } from 'zod';

/**
 * Schema for updating notification preferences
 */
export const UpdateNotificationsSchema = z.object({
  emailBookingConfirmations: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  emailMarketingUpdates: z.boolean().optional(),
});

/**
 * Schema for updating company details (admin only)
 */
export const UpdateCompanySchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  primaryContactName: z.string().min(1).max(200).optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().max(50).optional(),
  billingAddress: z.object({
    line1: z.string().max(200).optional(),
    line2: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    county: z.string().max(100).optional(),
    postcode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
  }).optional(),
  invoiceEmail: z.string().email().optional(),
  purchaseOrderRequired: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Schema for adding a new user
 */
export const AddUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(200),
  role: z.enum(['admin', 'booker']),
});

/**
 * Schema for updating a user
 */
export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(['admin', 'booker']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

/**
 * Validate request body against schema
 * @param {object} body - Request body to validate
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
export function validateRequest(body, schema) {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}
