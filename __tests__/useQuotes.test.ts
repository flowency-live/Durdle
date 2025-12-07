import { renderHook, waitFor } from '@testing-library/react';
import { useQuotes, useQuoteDetails } from '../lib/hooks/useQuotes';
import * as adminApi from '../lib/services/adminApi';

jest.mock('../lib/services/adminApi');

describe('useQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches quotes with filters', async () => {
    const mockData = {
      quotes: [
        {
          quoteId: 'Q001',
          createdAt: '2024-01-15T10:30:00Z',
          status: 'pending',
          locations: [],
          pricing: {},
        },
      ],
      pagination: { total: 1, cursor: null },
    };

    (adminApi.listQuotes as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() =>
      useQuotes({
        status: 'pending',
        limit: 50,
      })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(adminApi.listQuotes).toHaveBeenCalled();
  });

  it('handles error when fetching quotes fails', async () => {
    const mockError = new Error('API Error');
    (adminApi.listQuotes as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() =>
      useQuotes({
        status: 'all',
        limit: 50,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toContain('API Error');
  });

  it('refetches when filters change', async () => {
    const mockData = {
      quotes: [],
      pagination: { total: 0 },
    };

    (adminApi.listQuotes as jest.Mock).mockResolvedValue(mockData);

    const { rerender } = renderHook(
      ({ filters }) => useQuotes(filters),
      {
        initialProps: {
          filters: { status: 'pending', limit: 50 },
        },
      }
    );

    expect(adminApi.listQuotes).toHaveBeenCalledTimes(1);

    rerender({
      filters: { status: 'accepted', limit: 50 },
    });

    await waitFor(() => {
      expect(adminApi.listQuotes).toHaveBeenCalledTimes(2);
    });
  });

  it('supports sorting', async () => {
    const mockData = {
      quotes: [],
      pagination: { total: 0 },
    };

    (adminApi.listQuotes as jest.Mock).mockResolvedValue(mockData);

    renderHook(() =>
      useQuotes({
        status: 'all',
        sortBy: 'price',
        sortOrder: 'asc',
        limit: 50,
      })
    );

    expect(adminApi.listQuotes).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'price',
        sortOrder: 'asc',
      })
    );
  });

  it('supports cursor-based pagination', async () => {
    const mockData = {
      quotes: [],
      pagination: { total: 100, cursor: 'next-cursor' },
    };

    (adminApi.listQuotes as jest.Mock).mockResolvedValue(mockData);

    renderHook(() =>
      useQuotes({
        status: 'all',
        limit: 50,
        cursor: 'page-1-cursor',
      })
    );

    expect(adminApi.listQuotes).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: 'page-1-cursor',
        limit: 50,
      })
    );
  });
});

describe('useQuoteDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches quote details when quoteId is provided', async () => {
    const mockQuote = {
      quoteId: 'Q001',
      createdAt: '2024-01-15T10:30:00Z',
      status: 'pending',
      locations: {
        pickup: { address: '123 Main St' },
        dropoff: { address: '456 Oak Ave' },
      },
      pricing: { totalPrice: 45.0 },
    };

    (adminApi.getQuoteDetails as jest.Mock).mockResolvedValueOnce(mockQuote);

    const { result } = renderHook(() => useQuoteDetails('Q001'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockQuote);
    expect(adminApi.getQuoteDetails).toHaveBeenCalledWith('Q001');
  });

  it('does not fetch when quoteId is not provided', () => {
    const { result } = renderHook(() => useQuoteDetails(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(adminApi.getQuoteDetails).not.toHaveBeenCalled();
  });

  it('handles error when fetching quote details fails', async () => {
    const mockError = new Error('Not Found');
    (adminApi.getQuoteDetails as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useQuoteDetails('INVALID'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toContain('Not Found');
  });

  it('refetches when quoteId changes', async () => {
    const mockQuote = {
      quoteId: 'Q001',
      createdAt: '2024-01-15T10:30:00Z',
      status: 'pending',
      locations: {},
      pricing: {},
    };

    (adminApi.getQuoteDetails as jest.Mock).mockResolvedValue(mockQuote);

    const { rerender } = renderHook(
      ({ quoteId }) => useQuoteDetails(quoteId),
      {
        initialProps: { quoteId: 'Q001' },
      }
    );

    expect(adminApi.getQuoteDetails).toHaveBeenCalledWith('Q001');

    rerender({ quoteId: 'Q002' });

    await waitFor(() => {
      expect(adminApi.getQuoteDetails).toHaveBeenCalledWith('Q002');
    });
  });
});
