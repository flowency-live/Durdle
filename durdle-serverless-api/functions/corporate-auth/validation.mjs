import { z } from 'zod';

/**
 * Password validation rules:
 * - Min 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Schema for requesting a magic link
 */
export const MagicLinkRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Schema for verifying a magic link token
 */
export const VerifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Schema for email + password login
 */
export const PasswordLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Schema for setting password (first time or reset)
 */
export const SetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Schema for forgot password request
 */
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
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
