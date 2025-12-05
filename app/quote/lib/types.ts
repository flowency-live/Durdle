// Quote Wizard TypeScript Types
// Based on QUOTE_WIZARD_IMPLEMENTATION_SPEC.md

// Vehicle Type
export interface Vehicle {
  vehicleId: string;
  name: string;
  description: string;
  capacity: number;
  features: string[];
  imageUrl: string;
  baseFare: number;
  perMile: number;
  perMinute: number;
  active: boolean;
}

// Location Type
export interface Location {
  address: string;
  placeId?: string;
}

// Quote Request (POST /v1/quotes)
export interface QuoteRequest {
  pickupLocation: Location;
  dropoffLocation: Location;
  waypoints?: Location[];
  pickupTime: string; // ISO 8601 format
  passengers: number; // 1-8
  vehicleType: 'standard' | 'executive' | 'minibus';
  returnJourney?: boolean;
  contactDetails?: {
    name: string;
    email: string;
    phone: string;
  };
}

// Quote Response (from POST /v1/quotes)
export interface QuoteResponse {
  quoteId: string;
  status: 'valid' | 'expired';
  expiresAt: string;
  journey: {
    distance: {
      meters: number;
      miles: string;
      text: string;
    };
    duration: {
      seconds: number;
      minutes: number;
      text: string;
    };
    route: {
      polyline: string | null;
    };
  };
  pricing: {
    currency: 'GBP';
    breakdown: {
      baseFare: number; // pence
      distanceCharge: number;
      timeCharge: number;
      subtotal: number;
      tax: number;
      total: number;
    };
    displayTotal: string; // "£18.61"
  };
  vehicleType: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  pickupTime: string;
  passengers: number;
  returnJourney: boolean;
  createdAt: string;
}

// Form Data (internal state)
export interface QuoteFormData {
  pickupLocation: Location;
  dropoffLocation: Location;
  waypoints: Location[];
  pickupDate: Date | null;
  pickupTime: string;
  passengers: number;
  vehicleType: 'standard' | 'executive' | 'minibus';
  returnJourney: boolean;
  contactDetails: {
    name: string;
    email: string;
    phone: string;
  };
}

// API Error Response
export interface ApiError {
  error: {
    message: string;
    code?: string;
  };
}
