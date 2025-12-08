// Quote Wizard API Client
// Based on QUOTE_WIZARD_IMPLEMENTATION_SPEC.md

import { QuoteRequest, QuoteResponse, Vehicle, ApiError, FixedRoute, FixedRoutesResponse, MultiVehicleQuoteResponse } from './types';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

/**
 * Calculate a quote based on journey details
 * @param request Quote request data
 * @returns Quote response with pricing and journey details
 */
export async function calculateQuote(request: QuoteRequest): Promise<QuoteResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.quotes}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to calculate quote';

    try {
      const error: ApiError = await response.json();
      errorMessage = error.error?.message || errorMessage;
      console.error('API Error Response:', error);
    } catch (parseError) {
      // If response isn't JSON (e.g., 500 errors), use status text
      errorMessage = `Server error (${response.status}): ${response.statusText}`;
      console.error('Failed to parse error response:', parseError);
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get list of available vehicles
 * @returns Array of active vehicles with images and pricing
 */
export async function getVehicles(): Promise<Vehicle[]> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.vehicles}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch vehicles');
  }

  const data = await response.json();
  return data.vehicles;
}

/**
 * Get list of fixed route pricing
 * @returns Array of active fixed routes with pricing
 */
export async function getFixedRoutes(): Promise<FixedRoute[]> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.fixedRoutes}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch fixed routes');
  }

  const data: FixedRoutesResponse = await response.json();
  return data.routes;
}

/**
 * Calculate quotes for all vehicle types in one API call
 * @param request Quote request data (without vehicleType, with compareMode: true)
 * @returns Multi-vehicle quote response with pricing for all vehicles
 */
export async function calculateMultiVehicleQuote(
  request: Omit<QuoteRequest, 'vehicleType'> & { compareMode: true }
): Promise<MultiVehicleQuoteResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.quotes}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to get quotes';

    try {
      const error: ApiError = await response.json();
      errorMessage = error.error?.message || errorMessage;
      console.error('API Error Response:', error);
    } catch (parseError) {
      errorMessage = `Server error (${response.status}): ${response.statusText}`;
      console.error('Failed to parse error response:', parseError);
    }

    throw new Error(errorMessage);
  }

  return response.json();
}
