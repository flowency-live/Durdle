import { z } from 'zod';

// Query parameters schema for listing quotes
export const listQuotesSchema = z.object({
  status: z.enum(['all', 'active', 'expired', 'converted']).default('all'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['date', 'price']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

// Quote ID path parameter schema
export const quoteIdSchema = z.object({
  quoteId: z.string().regex(/^QUOTE#[a-zA-Z0-9-]+$/, 'Invalid quote ID format'),
});

// Export query parameters (same as list but no pagination)
export const exportQuotesSchema = z.object({
  status: z.enum(['all', 'active', 'expired', 'converted']).default('all'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['date', 'price']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Helper function to parse and validate query parameters
export function parseQueryParams(queryStringParameters, schema) {
  if (!queryStringParameters) {
    return schema.parse({});
  }

  try {
    return schema.parse(queryStringParameters);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      throw new ValidationError('Invalid query parameters', validationErrors);
    }
    throw error;
  }
}

// Helper function to parse and validate path parameters
export function parsePathParams(pathParameters, schema) {
  if (!pathParameters) {
    throw new ValidationError('Missing path parameters', []);
  }

  try {
    return schema.parse(pathParameters);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      throw new ValidationError('Invalid path parameters', validationErrors);
    }
    throw error;
  }
}

// Custom validation error class
export class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
