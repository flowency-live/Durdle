/**
 * Pure pricing calculation functions (no external dependencies)
 * Extracted for unit testing
 */

/**
 * Calculate variable pricing based on distance, wait time, and vehicle rates
 * @param {number} distanceMiles - Distance in miles
 * @param {number} waitTimeMinutes - Wait time in minutes (0 for simple routes)
 * @param {object} vehicleRates - Vehicle pricing rates
 * @returns {object} Pricing breakdown
 */
export function calculateVariablePricing(distanceMiles, waitTimeMinutes, vehicleRates) {
  const baseFare = vehicleRates.baseFare;
  const distanceCharge = Math.round(distanceMiles * vehicleRates.perMile);
  const waitTimeCharge = Math.round(waitTimeMinutes * vehicleRates.perMinute);
  const subtotal = baseFare + distanceCharge + waitTimeCharge;
  const tax = 0;
  const total = subtotal + tax;

  return {
    currency: 'GBP',
    breakdown: {
      baseFare,
      distanceCharge,
      waitTimeCharge,
      subtotal,
      tax,
      total,
    },
    displayTotal: `£${(total / 100).toFixed(2)}`,
  };
}

/**
 * Calculate fixed route pricing
 * @param {number} fixedPrice - Fixed price in pence
 * @param {object} vehicleMetadata - Vehicle details for display
 * @returns {object} Pricing breakdown
 */
export function calculateFixedRoutePricing(fixedPrice, vehicleMetadata) {
  return {
    currency: 'GBP',
    breakdown: {
      baseFare: 0,
      distanceCharge: 0,
      waitTimeCharge: 0,
      subtotal: fixedPrice,
      tax: 0,
      total: fixedPrice,
    },
    displayTotal: `£${(fixedPrice / 100).toFixed(2)}`,
    isFixedRoute: true,
    vehicleMetadata: {
      name: vehicleMetadata.name,
      description: vehicleMetadata.description,
      capacity: vehicleMetadata.capacity,
      features: vehicleMetadata.features,
      imageUrl: vehicleMetadata.imageUrl,
    },
  };
}

/**
 * Standard vehicle rates (fallback configuration)
 */
export const FALLBACK_VEHICLE_RATES = {
  standard: {
    baseFare: 500,
    perMile: 100,
    perMinute: 10,
    perHour: 3500, // £35/hour in pence
    name: 'Standard Sedan',
    description: 'Comfortable sedan for up to 4 passengers',
    capacity: 4,
    features: ['Air Conditioning', 'Phone Charger'],
    imageUrl: '',
  },
  executive: {
    baseFare: 800,
    perMile: 150,
    perMinute: 15,
    perHour: 5000, // £50/hour in pence
    name: 'Executive Sedan',
    description: 'Premium sedan with luxury amenities',
    capacity: 4,
    features: ['Air Conditioning', 'WiFi', 'Premium Amenities'],
    imageUrl: '',
  },
  minibus: {
    baseFare: 1000,
    perMile: 120,
    perMinute: 12,
    perHour: 7000, // £70/hour in pence
    name: 'Minibus',
    description: 'Spacious minibus for up to 8 passengers',
    capacity: 8,
    features: ['Air Conditioning', 'WiFi', 'Extra Luggage Space'],
    imageUrl: '',
  },
};

/**
 * Calculate hourly pricing for "by-the-hour" journeys
 * @param {number} durationHours - Duration in hours (2-12)
 * @param {object} vehicleRates - Vehicle pricing rates (must include perHour)
 * @returns {object} Pricing breakdown
 */
export function calculateHourlyPricing(durationHours, vehicleRates) {
  const perHour = vehicleRates.perHour || 3500; // Default £35/hour
  const hourlyCharge = durationHours * perHour;
  const total = hourlyCharge;

  return {
    currency: 'GBP',
    breakdown: {
      baseFare: 0,
      distanceCharge: 0,
      waitTimeCharge: 0,
      hourlyCharge,
      durationHours,
      subtotal: total,
      tax: 0,
      total,
    },
    displayTotal: `£${(total / 100).toFixed(2)}`,
    isHourlyRate: true,
  };
}

/**
 * Calculate total wait time from waypoints
 * @param {Array} waypoints - Array of waypoint objects with waitTime property
 * @returns {number} Total wait time in minutes
 */
export function calculateTotalWaitTime(waypoints) {
  if (!waypoints || !Array.isArray(waypoints)) {
    return 0;
  }
  return waypoints.reduce((sum, wp) => sum + (wp.waitTime || 0), 0);
}

/**
 * Validate pricing inputs
 * @param {number} distanceMiles - Distance in miles
 * @param {number} waitTimeMinutes - Wait time in minutes
 * @returns {object} Validation result
 */
export function validatePricingInputs(distanceMiles, waitTimeMinutes) {
  const errors = [];

  if (typeof distanceMiles !== 'number' || distanceMiles < 0) {
    errors.push('Distance must be a non-negative number');
  }

  if (typeof waitTimeMinutes !== 'number' || waitTimeMinutes < 0) {
    errors.push('Wait time must be a non-negative number');
  }

  if (distanceMiles > 500) {
    errors.push('Distance exceeds maximum allowed (500 miles)');
  }

  if (waitTimeMinutes > 480) {
    errors.push('Wait time exceeds maximum allowed (8 hours)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
