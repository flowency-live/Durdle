import { describe, test, expect } from '@jest/globals';
import {
  parseQueryParams,
  parsePathParams,
  listQuotesSchema,
  quoteIdSchema,
  exportQuotesSchema,
  ValidationError,
} from '../validation.mjs';

describe('Validation', () => {
  describe('listQuotesSchema', () => {
    test('should accept valid query parameters', () => {
      const params = {
        status: 'active',
        dateFrom: '2025-12-01T00:00:00.000Z',
        dateTo: '2025-12-07T23:59:59.000Z',
        priceMin: '50',
        priceMax: '200',
        search: 'heathrow',
        sortBy: 'date',
        sortOrder: 'desc',
        limit: '25',
      };

      const result = parseQueryParams(params, listQuotesSchema);

      expect(result.status).toBe('active');
      expect(result.dateFrom).toBe('2025-12-01T00:00:00.000Z');
      expect(result.dateTo).toBe('2025-12-07T23:59:59.000Z');
      expect(result.priceMin).toBe(50);
      expect(result.priceMax).toBe(200);
      expect(result.search).toBe('heathrow');
      expect(result.sortBy).toBe('date');
      expect(result.sortOrder).toBe('desc');
      expect(result.limit).toBe(25);
    });

    test('should apply default values', () => {
      const params = {};

      const result = parseQueryParams(params, listQuotesSchema);

      expect(result.status).toBe('all');
      expect(result.sortBy).toBe('date');
      expect(result.sortOrder).toBe('desc');
      expect(result.limit).toBe(50);
    });

    test('should reject invalid status', () => {
      const params = { status: 'invalid' };

      expect(() => parseQueryParams(params, listQuotesSchema)).toThrow(ValidationError);
    });

    test('should reject limit over 100', () => {
      const params = { limit: '150' };

      expect(() => parseQueryParams(params, listQuotesSchema)).toThrow(ValidationError);
    });

    test('should reject negative price', () => {
      const params = { priceMin: '-10' };

      expect(() => parseQueryParams(params, listQuotesSchema)).toThrow(ValidationError);
    });

    test('should coerce string numbers to integers', () => {
      const params = {
        priceMin: '100',
        priceMax: '500',
        limit: '30',
      };

      const result = parseQueryParams(params, listQuotesSchema);

      expect(result.priceMin).toBe(100);
      expect(result.priceMax).toBe(500);
      expect(result.limit).toBe(30);
    });
  });

  describe('quoteIdSchema', () => {
    test('should accept valid quote ID', () => {
      const params = { quoteId: 'QUOTE#abc123' };

      const result = parsePathParams(params, quoteIdSchema);

      expect(result.quoteId).toBe('QUOTE#abc123');
    });

    test('should reject invalid quote ID format', () => {
      const params = { quoteId: 'invalid-id' };

      expect(() => parsePathParams(params, quoteIdSchema)).toThrow(ValidationError);
    });

    test('should reject quote ID without QUOTE# prefix', () => {
      const params = { quoteId: 'abc123' };

      expect(() => parsePathParams(params, quoteIdSchema)).toThrow(ValidationError);
    });

    test('should accept quote ID with hyphens', () => {
      const params = { quoteId: 'QUOTE#abc-123-def' };

      const result = parsePathParams(params, quoteIdSchema);

      expect(result.quoteId).toBe('QUOTE#abc-123-def');
    });
  });

  describe('exportQuotesSchema', () => {
    test('should accept valid export parameters', () => {
      const params = {
        status: 'converted',
        dateFrom: '2025-12-01T00:00:00.000Z',
        dateTo: '2025-12-07T23:59:59.000Z',
      };

      const result = parseQueryParams(params, exportQuotesSchema);

      expect(result.status).toBe('converted');
      expect(result.dateFrom).toBe('2025-12-01T00:00:00.000Z');
      expect(result.dateTo).toBe('2025-12-07T23:59:59.000Z');
    });

    test('should not have limit or cursor fields', () => {
      const params = {
        status: 'all',
      };

      const result = parseQueryParams(params, exportQuotesSchema);

      expect(result.limit).toBeUndefined();
      expect(result.cursor).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    test('should create validation error with message and errors', () => {
      const errors = [
        { field: 'status', message: 'Invalid enum value' },
      ];

      const error = new ValidationError('Validation failed', errors);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
    });

    test('should be throwable', () => {
      expect(() => {
        throw new ValidationError('Test error', []);
      }).toThrow(ValidationError);
    });
  });

  describe('parseQueryParams', () => {
    test('should handle null query parameters', () => {
      const result = parseQueryParams(null, listQuotesSchema);

      expect(result.status).toBe('all');
      expect(result.limit).toBe(50);
    });

    test('should handle undefined query parameters', () => {
      const result = parseQueryParams(undefined, listQuotesSchema);

      expect(result.status).toBe('all');
      expect(result.limit).toBe(50);
    });
  });

  describe('parsePathParams', () => {
    test('should throw error for null path parameters', () => {
      expect(() => parsePathParams(null, quoteIdSchema)).toThrow(ValidationError);
    });

    test('should throw error for undefined path parameters', () => {
      expect(() => parsePathParams(undefined, quoteIdSchema)).toThrow(ValidationError);
    });
  });
});
