import { z } from 'zod';

// Domain validation - accepts "example.com" or "@example.com", normalizes to "example.com"
const domainSchema = z.string()
  .min(3)
  .max(100)
  .transform(d => d.toLowerCase().replace(/^@/, '').trim())
  .refine(d => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d), {
    message: 'Invalid domain format (e.g., example.com)',
  });

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
  // Allowed email domains for corporate users (e.g., ["flowency.co.uk", "flowency.com"])
  allowedDomains: z.array(domainSchema).max(10).optional(),
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
  // Allowed email domains for corporate users (e.g., ["flowency.co.uk", "flowency.com"])
  allowedDomains: z.array(domainSchema).max(10).optional(),
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

/**
 * Validate that an email belongs to an allowed domain
 * @param {string} email - Email address to validate
 * @param {string[]} allowedDomains - Array of allowed domains (e.g., ["flowency.co.uk"])
 * @returns {{ valid: boolean, domain?: string, message?: string }}
 */
export function validateEmailDomain(email, allowedDomains) {
  if (!allowedDomains || allowedDomains.length === 0) {
    // No domain restrictions - allow all emails
    return { valid: true };
  }

  const emailLower = email.toLowerCase();
  const atIndex = emailLower.lastIndexOf('@');
  if (atIndex === -1) {
    return { valid: false, message: 'Invalid email format' };
  }

  const domain = emailLower.substring(atIndex + 1);
  const isAllowed = allowedDomains.some(d => d.toLowerCase() === domain);

  if (!isAllowed) {
    const formatted = allowedDomains.map(d => `@${d}`).join(', ');
    return {
      valid: false,
      domain,
      message: `Email domain must be one of: ${formatted}`,
    };
  }

  return { valid: true, domain };
}
