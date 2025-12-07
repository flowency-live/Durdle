import { useMemo } from 'react';
import { useApi } from './useApi';
import adminApi from '../services/adminApi';

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

export function useQuotes(filters: QuoteFilters) {
  const key = useMemo(() => JSON.stringify(filters || {}), [filters]);

  return useApi<QuotesListResponse>(
    () => adminApi.listQuotes(filters),
    [key]
  );
}

export function useQuoteDetails(quoteId?: string) {
  return useApi<any>(
    () => (quoteId ? adminApi.getQuoteDetails(quoteId) : Promise.resolve(null)),
    [quoteId],
    { immediate: !!quoteId }
  );
}
