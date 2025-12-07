import { useMemo } from 'react';

import adminApi from '../services/adminApi';
import { useApi } from './useApi';

export type QuoteFilters = {
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
};

export type QuotesListResponse = {
  quotes: any[];
  pagination: { total: number; limit: number; cursor: string | null };
};

export function useQuotes(filters: QuoteFilters): ReturnType<typeof useApi<QuotesListResponse>> {
  const key = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  return useApi<QuotesListResponse>(
    () => adminApi.listQuotes(filters),
    [key]
  );
}

interface QuoteDetails {
  [key: string]: unknown;
}

export function useQuoteDetails(quoteId?: string): ReturnType<typeof useApi<QuoteDetails | null>> {
  return useApi<QuoteDetails | null>(
    () => (quoteId ? adminApi.getQuoteDetails(quoteId) as Promise<QuoteDetails> : Promise.resolve(null)),
    [quoteId],
    { immediate: !!quoteId }
  );
}
