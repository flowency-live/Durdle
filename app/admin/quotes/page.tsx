'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { useQuotes, QuoteFilters } from '../../../lib/hooks/useQuotes';
import ExportButton from './components/ExportButton';
import QuoteDetailsModal from './components/QuoteDetailsModal';
import QuotesFilters from './components/QuotesFilters';
import QuotesTable from './components/QuotesTable';

function parseStatus(value: string | null): QuoteFilters['status'] {
  if (value === 'active' || value === 'expired' || value === 'converted') return value;
  return 'all';
}

function parseSortBy(value: string | null): QuoteFilters['sortBy'] {
  if (value === 'price') return 'price';
  return 'date';
}

function parseSortOrder(value: string | null): QuoteFilters['sortOrder'] {
  if (value === 'asc') return 'asc';
  return 'desc';
}

export default function AdminQuotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<QuoteFilters>({
    status: parseStatus(searchParams.get('status')),
    search: searchParams.get('search') || undefined,
    sortBy: parseSortBy(searchParams.get('sortBy')),
    sortOrder: parseSortOrder(searchParams.get('sortOrder')),
    limit: 50,
    cursor: searchParams.get('cursor') || undefined,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);

  const { data, loading, error } = useQuotes(filters);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.cursor) params.set('cursor', filters.cursor);

    const queryString = params.toString();
    router.push(`/admin/quotes${queryString ? '?' + queryString : ''}`, { scroll: false });
  }, [filters, router]);

  function handleFilterChange(newFilters: QuoteFilters) {
    setPrevCursor(null);
    setFilters({ ...newFilters, cursor: undefined, limit: 50 });
  }

  function handleSort(column: 'date' | 'price') {
    const newSortBy = column === 'date' ? 'date' : 'price';
    const newSortOrder =
      filters.sortBy === newSortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    setPrevCursor(null);
    setFilters({ ...filters, sortBy: newSortBy, sortOrder: newSortOrder, cursor: undefined });
  }

  function handleNextPage() {
    if (data?.pagination?.cursor) {
      setPrevCursor(filters.cursor || null);
      setFilters({ ...filters, cursor: data.pagination.cursor });
    }
  }

  function handlePrevPage() {
    setPrevCursor(null);
    setFilters({ ...filters, cursor: prevCursor || undefined });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-sm text-gray-600">View and manage customer quotes</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton filters={filters} />
        </div>
      </div>

      <QuotesFilters filters={filters} onChange={handleFilterChange} />

      {loading && <div className="p-6 bg-white rounded-lg shadow-sm">Loading...</div>}
      {error && <div className="p-6 bg-white rounded-lg shadow-sm text-red-600">{error.message}</div>}

      {data && (
        <div className="space-y-4">
          <QuotesTable
            quotes={data.quotes}
            onRowClick={(id: string) => setSelected(id)}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSort={handleSort}
          />

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {data.quotes.length} of {data.pagination?.total || '-'}
            </div>
            <div className="flex gap-2">
              <button
                disabled={!prevCursor && !filters.cursor}
                onClick={handlePrevPage}
                className="px-3 py-2 rounded bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
              >
                Previous
              </button>
              <button
                disabled={!data.pagination?.cursor}
                onClick={handleNextPage}
                className="px-3 py-2 rounded bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && <QuoteDetailsModal quoteId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
