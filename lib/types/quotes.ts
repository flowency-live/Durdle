/**
 * Quote-related TypeScript types
 * Based on AdminQuotesView_Implementation_Plan.md specifications
 */

export interface Location {
  address: string;
  placeId: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface Quote {
  quoteId: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'converted';

  // Journey details
  pickupLocation: Location;
  dropoffLocation: Location;
  waypoints?: Location[];
  pickupTime: string;

  // Pricing
  totalPrice: number;
  vehicleType: string;
  pricingBreakdown: {
    baseFare: number;
    distanceCost: number;
    waypointCost?: number;
  };

  // Optional customer info
  customerEmail?: string;
  customerPhone?: string;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  bookingId?: string;
}

export interface QuoteFilters {
  status?: 'all' | 'active' | 'expired' | 'converted';
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  sortBy?: 'date' | 'price';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  cursor?: string | null;
}

export interface QuotesListResponse {
  quotes: Quote[];
  pagination: {
    total: number;
    limit: number;
    cursor: string | null;
  };
}
