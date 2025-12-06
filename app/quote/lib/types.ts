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

// Waypoint Type (extends Location with wait time)
export interface Waypoint extends Location {
  waitTime?: number; // Wait time in minutes at this waypoint
}

// Quote Request (POST /v1/quotes)
export interface QuoteRequest {
  pickupLocation: Location;
  dropoffLocation: Location;
  waypoints?: Waypoint[]; // Changed from Location[] to support wait times
  pickupTime: string; // ISO 8601 format
  passengers: number; // 1-8
  luggage?: number; // Number of bags
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
      timeCharge?: number; // Legacy field (deprecated)
      waitTimeCharge: number; // Wait time charge (v2.0)
      subtotal: number;
      tax: number;
      total: number;
    };
    displayTotal: string; // "£18.61"
  };
  vehicleType: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  waypoints?: Waypoint[]; // Include waypoints in response
  pickupTime: string;
  passengers: number;
  luggage?: number;
  returnJourney: boolean;
  createdAt: string;
}

// Form Data (internal state)
export interface QuoteFormData {
  pickupLocation: Location;
  dropoffLocation: Location;
  waypoints: Waypoint[]; // Changed to Waypoint[] for wait time support
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

// Fixed Route Types (matches Lambda formatRoute response)
export interface FixedRoute {
  routeId: string;
  originPlaceId: string;
  originName: string;
  originType: string;
  destinationPlaceId: string;
  destinationName: string;
  destinationType: string;
  vehicleId: string;
  vehicleName: string;
  price: number; // in pence
  distance: number;
  estimatedDuration: number;
  active: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface FixedRoutesResponse {
  routes: FixedRoute[];
  count: number;
}
