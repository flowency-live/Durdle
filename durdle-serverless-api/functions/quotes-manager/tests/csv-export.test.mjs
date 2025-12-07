import { describe, test, expect } from '@jest/globals';
import { generateCSV, generateCSVFilename } from '../csv-export.mjs';

describe('CSV Export', () => {
  test('should generate CSV with headers', () => {
    const quotes = [];
    const csv = generateCSV(quotes);

    expect(csv).toContain('Quote ID,Created Date,Status');
    expect(csv).toContain('Customer Email,Pickup Location,Dropoff Location');
  });

  test('should format quote data correctly', () => {
    const quotes = [
      {
        quoteId: 'QUOTE#abc123',
        createdAt: '2025-12-07T10:30:00.000Z',
        status: 'active',
        customerEmail: 'test@example.com',
        pickupLocation: {
          address: 'Bournemouth Station, Bournemouth',
        },
        dropoffLocation: {
          address: 'London Heathrow Airport',
        },
        pickupTime: '2025-12-10T14:30:00.000Z',
        vehicleType: 'executive',
        totalPrice: 138.0,
        bookingId: '',
      },
    ];

    const csv = generateCSV(quotes);

    expect(csv).toContain('#abc123');
    expect(csv).toContain('Active');
    expect(csv).toContain('test@example.com');
    expect(csv).toContain('Bournemouth Station');
    expect(csv).toContain('London Heathrow Airport');
    expect(csv).toContain('Executive Saloon');
    expect(csv).toContain('£138.00');
  });

  test('should escape commas in addresses', () => {
    const quotes = [
      {
        quoteId: 'QUOTE#test',
        createdAt: '2025-12-07T10:30:00.000Z',
        status: 'active',
        pickupLocation: {
          address: 'Station Road, Bournemouth, Dorset',
        },
        dropoffLocation: {
          address: 'Airport Terminal, London',
        },
        totalPrice: 100.0,
      },
    ];

    const csv = generateCSV(quotes);

    // Addresses with commas should be quoted
    expect(csv).toMatch(/"Station Road, Bournemouth, Dorset"/);
    expect(csv).toMatch(/"Airport Terminal, London"/);
  });

  test('should handle missing optional fields', () => {
    const quotes = [
      {
        quoteId: 'QUOTE#test',
        createdAt: '2025-12-07T10:30:00.000Z',
        status: 'expired',
        pickupLocation: {
          address: 'Pickup Address',
        },
        dropoffLocation: {
          address: 'Dropoff Address',
        },
        totalPrice: 50.0,
        // No customerEmail, no bookingId
      },
    ];

    const csv = generateCSV(quotes);

    expect(csv).toContain('Pickup Address');
    expect(csv).toContain('Dropoff Address');
    // Should have empty fields for missing data
    const lines = csv.split('\n');
    expect(lines[1]).toContain(',,'); // Empty customer email
  });

  test('should format multiple quotes', () => {
    const quotes = [
      {
        quoteId: 'QUOTE#001',
        createdAt: '2025-12-07T10:00:00.000Z',
        status: 'active',
        pickupLocation: { address: 'Location A' },
        dropoffLocation: { address: 'Location B' },
        totalPrice: 100.0,
      },
      {
        quoteId: 'QUOTE#002',
        createdAt: '2025-12-07T11:00:00.000Z',
        status: 'converted',
        pickupLocation: { address: 'Location C' },
        dropoffLocation: { address: 'Location D' },
        totalPrice: 200.0,
        bookingId: 'DURDLE-12345',
      },
    ];

    const csv = generateCSV(quotes);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3); // Header + 2 data rows
    expect(csv).toContain('#001');
    expect(csv).toContain('#002');
    expect(csv).toContain('DURDLE-12345');
  });

  test('should generate filename with current date', () => {
    const filename = generateCSVFilename();

    expect(filename).toMatch(/^durdle-quotes-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(filename).toContain('.csv');
  });
});
