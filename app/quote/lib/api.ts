// Quote Wizard API Client
// Based on QUOTE_WIZARD_IMPLEMENTATION_SPEC.md

import { QuoteRequest, QuoteResponse, Vehicle, ApiError } from './types';

const API_BASE_URL = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

/**
 * Calculate a quote based on journey details
 * @param request Quote request data
 * @returns Quote response with pricing and journey details
 */
export async function calculateQuote(request: QuoteRequest): Promise<QuoteResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error?.message || 'Failed to calculate quote');
  }

  return response.json();
}

/**
 * Get list of available vehicles
 * @returns Array of active vehicles with images and pricing
 */
export async function getVehicles(): Promise<Vehicle[]> {
  const response = await fetch(`${API_BASE_URL}/v1/vehicles`, {
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
