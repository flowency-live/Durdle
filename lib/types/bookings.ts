/**
 * Booking-related TypeScript types
 */

export interface Booking {
  bookingId: string;
  quoteId?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;

  // Customer info
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Journey details
  pickupLocation: {
    address: string;
    placeId?: string;
  };
  dropoffLocation: {
    address: string;
    placeId?: string;
  };
  pickupTime: string;
  passengers: number;
  luggage?: number;

  // Pricing
  totalPrice: number;
  vehicleType: string;
  isReturn?: boolean;

  // Optional
  specialRequests?: string;
  flightNumber?: string;
}

export interface BookingFilters {
  status?: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'date' | 'price';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  cursor?: string | null;
}

export interface BookingsListResponse {
  bookings: Booking[];
  pagination: {
    total: number;
    limit: number;
    cursor: string | null;
  };
}
