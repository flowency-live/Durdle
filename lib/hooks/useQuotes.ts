import { useMemo } from 'react';

import adminApi from '../services/adminApi';
import { Quote, QuoteFilters, QuotesListResponse } from '../types/quotes';

import { useApi } from './useApi';

export type { Quote, QuoteFilters, QuotesListResponse };

export function useQuotes(filters: QuoteFilters): ReturnType<typeof useApi<QuotesListResponse>> {
  const key = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  return useApi<QuotesListResponse>(
    () => adminApi.listQuotes(filters) as Promise<QuotesListResponse>,
    [key]
  );
}

export function useQuoteDetails(quoteId?: string): ReturnType<typeof useApi<Quote | null>> {
  return useApi<Quote | null>(
    () => (quoteId ? adminApi.getQuoteDetails(quoteId) as Promise<Quote> : Promise.resolve(null)),
    [quoteId],
    { immediate: !!quoteId }
  );
}
