// Quote Wizard TypeScript Types
// Based on QUOTE_WIZARD_IMPLEMENTATION_SPEC.md

// Journey Type
// - 'one-way': Single journey from A to B
// - 'round-trip': Journey A to B with return trip on specified date/time
// - 'hourly': Hire by the hour from pickup location
// - 'by-the-hour': Backend API uses this for hourly journeys
export type JourneyType = 'one-way' | 'round-trip' | 'hourly' | 'by-the-hour';

// Optional Extras
export interface Extras {
  babySeats: number;
  childSeats: number;
}

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
export type LocationType = 'airport' | 'train_station' | 'standard';

export interface Location {
  address: string;
  placeId?: string;
  locationType?: LocationType;
  lat?: number;
  lng?: number;
}

// Waypoint Type (extends Location with wait time)
export interface Waypoint extends Location {
  waitTime?: number; // Wait time in minutes at this waypoint
}

// Quote Request (POST /v1/quotes)
export interface QuoteRequest {
  pickupLocation: Location;
  dropoffLocation?: Location; // Optional for hourly journeys
  waypoints?: Waypoint[]; // Changed from Location[] to support wait times
  pickupTime: string; // ISO 8601 format
  passengers: number; // 1-8
  luggage?: number; // Number of bags
  vehicleType: 'standard' | 'executive' | 'minibus';
  returnJourney?: boolean;
  journeyType?: JourneyType; // 'one-way' | 'hourly'
  durationHours?: number; // Required for hourly journeys (2-6)
  extras?: Extras; // Baby seats, child seats
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
  vehicleDetails?: {
    name: string;
    description: string;
    imageUrl: string;
    capacity: number;
    features: string[];
  };
  pickupLocation: Location;
  dropoffLocation: Location;
  waypoints?: Waypoint[]; // Include waypoints in response
  pickupTime: string;
  passengers: number;
  luggage?: number;
  returnJourney: boolean;
  journeyType?: JourneyType;
  durationHours?: number;
  extras?: Extras;
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

// Vehicle pricing from compareMode response (matches backend response)
export interface VehiclePricing {
  // Vehicle info (flat, not nested)
  name: string;
  description: string;
  capacity: number;
  features: string[];
  imageUrl: string;
  // Pricing
  oneWay: {
    price: number;          // pence
    displayPrice: string;   // "£35.00"
    breakdown: {
      baseFare: number;
      distanceCharge: number;
      waitTimeCharge: number;
      subtotal: number;
      tax: number;
      total: number;
      hourlyCharge?: number;
      durationHours?: number;
      // Surge pricing fields
      basePriceBeforeSurge?: number;
      surgeMultiplier?: number;
    };
    // Surge pricing indicators
    isPeakPricing?: boolean;
    surgeMultiplier?: number;
    appliedSurgeRules?: { name: string; multiplier: number }[];
  };
  return: {
    price: number;          // pence
    displayPrice: string;   // "£70.00"
    discount: {
      percentage: number;
      amount: number;
    };
    breakdown: {
      baseFare: number;
      distanceCharge: number;
      waitTimeCharge: number;
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
      hourlyCharge?: number;
      // Surge pricing fields
      basePriceBeforeSurge?: number;
      surgeMultiplier?: number;
    };
    // Surge pricing indicators
    isPeakPricing?: boolean;
    surgeMultiplier?: number;
    appliedSurgeRules?: { name: string; multiplier: number }[];
  };
}

// Multi-vehicle quote response (compareMode: true)
export interface MultiVehicleQuoteResponse {
  compareMode: true;
  journeyType: JourneyType;
  journey: {
    distance: { meters: number; miles: string; text: string };
    duration: { seconds: number; minutes: number; text: string };
  };
  vehicles: {
    standard: VehiclePricing;
    executive: VehiclePricing;
    minibus: VehiclePricing;
  };
  pickupLocation: Location;
  dropoffLocation?: Location;
  durationHours?: number;
  pickupTime: string;
  passengers: number;
  luggage?: number;
  extras?: Extras;
  createdAt: string;
  // Optional fields (not in backend response but may be needed by frontend)
  quoteId?: string;
  status?: 'valid' | 'expired';
  expiresAt?: string;
  waypoints?: Waypoint[];
}
