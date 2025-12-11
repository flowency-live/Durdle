import { z } from 'zod';

// Create corporate account schema
export const CreateCorporateAccountSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(200),
  companyNumber: z.string().optional(), // Companies House number
  contactName: z.string().min(2, 'Contact name must be at least 2 characters').max(100),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  billingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    postcode: z.string().min(1),
    country: z.string().default('UK'),
  }).optional(),
  discountPercentage: z.number().min(0).max(50).default(0), // Max 50% discount
  paymentTerms: z.enum(['immediate', 'net7', 'net14', 'net30']).default('immediate'),
  notes: z.string().max(1000).optional(),
});

// Update corporate account schema (all fields optional)
export const UpdateCorporateAccountSchema = z.object({
  companyName: z.string().min(2).max(200).optional(),
  companyNumber: z.string().optional(),
  contactName: z.string().min(2).max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  billingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    postcode: z.string().min(1),
    country: z.string().default('UK'),
  }).optional(),
  discountPercentage: z.number().min(0).max(50).optional(),
  paymentTerms: z.enum(['immediate', 'net7', 'net14', 'net30']).optional(),
  status: z.enum(['active', 'suspended', 'closed']).optional(),
  notes: z.string().max(1000).optional(),
});

// Add corporate user schema
export const AddCorporateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['admin', 'booker']).default('booker'),
});

// Update corporate user schema
export const UpdateCorporateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['admin', 'booker']).optional(),
  status: z.enum(['active', 'pending', 'suspended']).optional(),
});

// List query parameters
export const ListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(['active', 'suspended', 'closed', 'all']).default('all'),
  search: z.string().optional(),
});

/**
 * Validate request body against schema
 * @param {object} body - Request body to validate
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {{ success: boolean, data?: object, errors?: string[] }}
 */
export function validateRequest(body, schema) {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Invalid request data'] };
  }
}
