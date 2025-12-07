import { describe, test, expect } from '@jest/globals';
import {
  calculateVariablePricing,
  calculateFixedRoutePricing,
  calculateTotalWaitTime,
  validatePricingInputs,
  FALLBACK_VEHICLE_RATES,
} from '../pricing-engine.mjs';

describe('Pricing Engine - Variable Pricing', () => {
  describe('calculateVariablePricing - Standard Vehicle', () => {
    const standardRates = FALLBACK_VEHICLE_RATES.standard;

    test('should calculate pricing for simple route (no wait time)', () => {
      const distanceMiles = 10;
      const waitTimeMinutes = 0;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, standardRates);

      expect(result.breakdown.baseFare).toBe(500);
      expect(result.breakdown.distanceCharge).toBe(1000); // 10 miles × 100 pence/mile
      expect(result.breakdown.waitTimeCharge).toBe(0);
      expect(result.breakdown.subtotal).toBe(1500);
      expect(result.breakdown.total).toBe(1500);
      expect(result.displayTotal).toBe('£15.00');
      expect(result.currency).toBe('GBP');
    });

    test('should calculate pricing for route with waypoints and wait time', () => {
      const distanceMiles = 15;
      const waitTimeMinutes = 30;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, standardRates);

      expect(result.breakdown.baseFare).toBe(500);
      expect(result.breakdown.distanceCharge).toBe(1500); // 15 miles × 100 pence/mile
      expect(result.breakdown.waitTimeCharge).toBe(300); // 30 mins × 10 pence/min
      expect(result.breakdown.subtotal).toBe(2300);
      expect(result.breakdown.total).toBe(2300);
      expect(result.displayTotal).toBe('£23.00');
    });

    test('should handle zero distance (pickup only)', () => {
      const distanceMiles = 0;
      const waitTimeMinutes = 0;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, standardRates);

      expect(result.breakdown.baseFare).toBe(500);
      expect(result.breakdown.distanceCharge).toBe(0);
      expect(result.breakdown.total).toBe(500);
      expect(result.displayTotal).toBe('£5.00');
    });

    test('should handle fractional miles', () => {
      const distanceMiles = 10.5;
      const waitTimeMinutes = 0;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, standardRates);

      expect(result.breakdown.distanceCharge).toBe(1050); // 10.5 × 100 = 1050
      expect(result.breakdown.total).toBe(1550);
    });

    test('should round distance charges to nearest pence', () => {
      const distanceMiles = 10.777;
      const waitTimeMinutes = 0;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, standardRates);

      expect(result.breakdown.distanceCharge).toBe(1078); // Math.round(1077.7)
    });
  });

  describe('calculateVariablePricing - Executive Vehicle', () => {
    const executiveRates = FALLBACK_VEHICLE_RATES.executive;

    test('should calculate higher pricing for executive vehicle', () => {
      const distanceMiles = 10;
      const waitTimeMinutes = 30;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, executiveRates);

      expect(result.breakdown.baseFare).toBe(800);
      expect(result.breakdown.distanceCharge).toBe(1500); // 10 × 150
      expect(result.breakdown.waitTimeCharge).toBe(450); // 30 × 15
      expect(result.breakdown.total).toBe(2750);
      expect(result.displayTotal).toBe('£27.50');
    });
  });

  describe('calculateVariablePricing - Minibus', () => {
    const minibusRates = FALLBACK_VEHICLE_RATES.minibus;

    test('should calculate pricing for minibus (higher base, moderate per-mile)', () => {
      const distanceMiles = 20;
      const waitTimeMinutes = 60;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, minibusRates);

      expect(result.breakdown.baseFare).toBe(1000);
      expect(result.breakdown.distanceCharge).toBe(2400); // 20 × 120
      expect(result.breakdown.waitTimeCharge).toBe(720); // 60 × 12
      expect(result.breakdown.total).toBe(4120);
      expect(result.displayTotal).toBe('£41.20');
    });
  });

  describe('calculateVariablePricing - Edge Cases', () => {
    const standardRates = FALLBACK_VEHICLE_RATES.standard;

    test('should handle very long distance (100 miles)', () => {
      const distanceMiles = 100;
      const waitTimeMinutes = 0;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, standardRates);

      expect(result.breakdown.distanceCharge).toBe(10000);
      expect(result.breakdown.total).toBe(10500);
      expect(result.displayTotal).toBe('£105.00');
    });

    test('should handle long wait time (8 hours = 480 minutes)', () => {
      const distanceMiles = 5;
      const waitTimeMinutes = 480;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, standardRates);

      expect(result.breakdown.waitTimeCharge).toBe(4800); // 480 × 10
      expect(result.breakdown.total).toBe(5800);
      expect(result.displayTotal).toBe('£58.00');
    });

    test('should handle very small distance (0.1 miles)', () => {
      const distanceMiles = 0.1;
      const waitTimeMinutes = 0;

      const result = calculateVariablePricing(distanceMiles, waitTimeMinutes, standardRates);

      expect(result.breakdown.distanceCharge).toBe(10); // 0.1 × 100
      expect(result.breakdown.total).toBe(510);
    });
  });
});

describe('Pricing Engine - Fixed Route Pricing', () => {
  const vehicleMetadata = {
    name: 'Standard Sedan',
    description: 'Comfortable sedan',
    capacity: 4,
    features: ['Air Conditioning'],
    imageUrl: 'https://example.com/sedan.jpg',
  };

  test('should calculate fixed route pricing', () => {
    const fixedPrice = 2500; // £25.00

    const result = calculateFixedRoutePricing(fixedPrice, vehicleMetadata);

    expect(result.breakdown.baseFare).toBe(0);
    expect(result.breakdown.distanceCharge).toBe(0);
    expect(result.breakdown.waitTimeCharge).toBe(0);
    expect(result.breakdown.subtotal).toBe(2500);
    expect(result.breakdown.total).toBe(2500);
    expect(result.displayTotal).toBe('£25.00');
    expect(result.isFixedRoute).toBe(true);
    expect(result.vehicleMetadata).toEqual(vehicleMetadata);
  });

  test('should handle airport transfer fixed route (higher price)', () => {
    const fixedPrice = 8500; // £85.00

    const result = calculateFixedRoutePricing(fixedPrice, vehicleMetadata);

    expect(result.breakdown.total).toBe(8500);
    expect(result.displayTotal).toBe('£85.00');
  });
});

describe('Pricing Engine - Wait Time Calculation', () => {
  test('should calculate total wait time from waypoints', () => {
    const waypoints = [
      { address: 'Stop 1', waitTime: 15 },
      { address: 'Stop 2', waitTime: 30 },
      { address: 'Stop 3', waitTime: 10 },
    ];

    const totalWaitTime = calculateTotalWaitTime(waypoints);

    expect(totalWaitTime).toBe(55);
  });

  test('should handle waypoints with zero wait time', () => {
    const waypoints = [
      { address: 'Stop 1', waitTime: 0 },
      { address: 'Stop 2', waitTime: 0 },
    ];

    const totalWaitTime = calculateTotalWaitTime(waypoints);

    expect(totalWaitTime).toBe(0);
  });

  test('should handle waypoints without waitTime property', () => {
    const waypoints = [{ address: 'Stop 1' }, { address: 'Stop 2' }];

    const totalWaitTime = calculateTotalWaitTime(waypoints);

    expect(totalWaitTime).toBe(0);
  });

  test('should handle mixed waypoints (some with waitTime, some without)', () => {
    const waypoints = [
      { address: 'Stop 1', waitTime: 20 },
      { address: 'Stop 2' }, // No waitTime
      { address: 'Stop 3', waitTime: 15 },
    ];

    const totalWaitTime = calculateTotalWaitTime(waypoints);

    expect(totalWaitTime).toBe(35);
  });

  test('should handle empty waypoints array', () => {
    const totalWaitTime = calculateTotalWaitTime([]);

    expect(totalWaitTime).toBe(0);
  });

  test('should handle null/undefined waypoints', () => {
    expect(calculateTotalWaitTime(null)).toBe(0);
    expect(calculateTotalWaitTime(undefined)).toBe(0);
  });
});

describe('Pricing Engine - Input Validation', () => {
  test('should validate correct inputs', () => {
    const result = validatePricingInputs(10, 30);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject negative distance', () => {
    const result = validatePricingInputs(-5, 30);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Distance must be a non-negative number');
  });

  test('should reject negative wait time', () => {
    const result = validatePricingInputs(10, -15);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Wait time must be a non-negative number');
  });

  test('should reject distance exceeding maximum (500 miles)', () => {
    const result = validatePricingInputs(501, 30);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Distance exceeds maximum allowed (500 miles)');
  });

  test('should reject wait time exceeding maximum (8 hours)', () => {
    const result = validatePricingInputs(10, 481);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Wait time exceeds maximum allowed (8 hours)');
  });

  test('should reject non-numeric distance', () => {
    const result = validatePricingInputs('ten', 30);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Distance must be a non-negative number');
  });

  test('should reject non-numeric wait time', () => {
    const result = validatePricingInputs(10, 'thirty');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Wait time must be a non-negative number');
  });

  test('should accept zero values', () => {
    const result = validatePricingInputs(0, 0);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should accept maximum allowed values', () => {
    const result = validatePricingInputs(500, 480);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should accumulate multiple errors', () => {
    const result = validatePricingInputs(-10, 500);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('Distance must be a non-negative number');
    expect(result.errors).toContain('Wait time exceeds maximum allowed (8 hours)');
  });
});

describe('Pricing Engine - Real-World Scenarios', () => {
  test('Airport transfer: Heathrow to Central London (20 miles, no wait)', () => {
    const executiveRates = FALLBACK_VEHICLE_RATES.executive;
    const result = calculateVariablePricing(20, 0, executiveRates);

    expect(result.breakdown.baseFare).toBe(800);
    expect(result.breakdown.distanceCharge).toBe(3000); // 20 × 150
    expect(result.breakdown.total).toBe(3800);
    expect(result.displayTotal).toBe('£38.00');
  });

  test('Corporate event: Multiple stops with wait times', () => {
    const executiveRates = FALLBACK_VEHICLE_RATES.executive;
    const waypoints = [
      { address: 'Office 1', waitTime: 10 },
      { address: 'Office 2', waitTime: 15 },
      { address: 'Office 3', waitTime: 20 },
    ];
    const totalWaitTime = calculateTotalWaitTime(waypoints);
    const result = calculateVariablePricing(30, totalWaitTime, executiveRates);

    expect(totalWaitTime).toBe(45);
    expect(result.breakdown.waitTimeCharge).toBe(675); // 45 × 15
    expect(result.breakdown.total).toBe(5975);
    expect(result.displayTotal).toBe('£59.75');
  });

  test('Short local trip: 2 miles, standard vehicle', () => {
    const standardRates = FALLBACK_VEHICLE_RATES.standard;
    const result = calculateVariablePricing(2, 0, standardRates);

    expect(result.breakdown.distanceCharge).toBe(200); // 2 × 100
    expect(result.breakdown.total).toBe(700);
    expect(result.displayTotal).toBe('£7.00');
  });

  test('Group transport: Minibus for 25 miles', () => {
    const minibusRates = FALLBACK_VEHICLE_RATES.minibus;
    const result = calculateVariablePricing(25, 0, minibusRates);

    expect(result.breakdown.baseFare).toBe(1000);
    expect(result.breakdown.distanceCharge).toBe(3000); // 25 × 120
    expect(result.breakdown.total).toBe(4000);
    expect(result.displayTotal).toBe('£40.00');
  });
});
