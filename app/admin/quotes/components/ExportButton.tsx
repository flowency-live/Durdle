'use client';

import React, { useState } from 'react';

import adminApi from '../../../../lib/services/adminApi';
import { QuoteFilters } from '../../../../lib/types/quotes';

interface ExportButtonProps {
  filters: QuoteFilters;
}

export default function ExportButton({ filters }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    try {
      setLoading(true);
      const blob = await adminApi.exportQuotes(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `durdle-quotes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Export failed', err);
      alert('Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleExport} disabled={loading} className="ml-auto inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md">
      {loading ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}
