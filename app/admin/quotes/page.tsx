'use client';

import React, { useState } from 'react';

import ExportButton from './components/ExportButton';
import QuoteDetailsModal from './components/QuoteDetailsModal';
import QuotesFilters from './components/QuotesFilters';
import QuotesTable from './components/QuotesTable';

import { useQuotes, QuoteFilters } from '../../../lib/hooks/useQuotes';

export default function AdminQuotesPage() {
  const [filters, setFilters] = useState<QuoteFilters>({ status: 'all', limit: 50 });
  const [selected, setSelected] = useState<string | null>(null);

  const { data, loading, error } = useQuotes(filters);

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

      <QuotesFilters filters={filters} onChange={(f: QuoteFilters) => setFilters(f)} />

      {loading && <div className="p-6 bg-white rounded-lg shadow-sm">Loading…</div>}
      {error && <div className="p-6 bg-white rounded-lg shadow-sm text-red-600">{error.message}</div>}

      {data && (
        <div className="space-y-4">
          <QuotesTable quotes={data.quotes} onRowClick={(id: string) => setSelected(id)} />

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Showing {data.quotes.length} of {data.pagination?.total || '—'}</div>
            <div className="flex gap-2">
              <button disabled={!data.pagination?.cursor} className="px-3 py-2 rounded bg-gray-100 text-gray-600">Previous</button>
              <button className="px-3 py-2 rounded bg-gray-100 text-gray-600">Next</button>
            </div>
          </div>
        </div>
      )}

      {selected && <QuoteDetailsModal quoteId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
