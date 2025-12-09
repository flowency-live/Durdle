/**
 * API Configuration
 * Centralized API endpoint configuration for all environments
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Public Quote Endpoints
  quotes: '/v1/quotes',
  quotesSave: '/quotes/save',
  quotesRetrieve: '/quotes', // /quotes/{quoteId}?token=xxx
  bookings: '/bookings',
  vehicles: '/v1/vehicles',
  fixedRoutes: '/v1/fixed-routes',
  locations: '/v1/locations/autocomplete',
  feedback: '/v1/feedback',

  // Admin Endpoints
  adminAuth: '/admin/auth',
  adminLogin: '/admin/auth/login',
  adminLogout: '/admin/auth/logout',
  adminSession: '/admin/auth/session',
  adminPricing: '/admin/pricing/vehicles',
  adminFixedRoutes: '/admin/pricing/fixed-routes',
  adminVehicles: '/admin/vehicles',
  adminFeedback: '/admin/feedback',
  adminDocuments: '/admin/documents',
  adminComments: '/admin/documents/comments',
  adminUploads: '/admin/uploads/presigned',
  // Admin Quotes endpoints
  adminQuotes: '/admin/quotes',
  adminQuotesExport: '/admin/quotes/export',
  // Admin Bookings endpoints (uses public bookings endpoint for now)
  adminBookings: '/bookings',
} as const;

/**
 * Build full API URL
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
