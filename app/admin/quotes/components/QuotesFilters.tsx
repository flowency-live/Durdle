'use client';

import React, { useState, useEffect } from 'react';

export default function QuotesFilters({ filters, onChange }: any) {
  const [local, setLocal] = useState(() => ({
    status: filters?.status || 'all',
    search: filters?.search || '',
  }));

  useEffect(() => setLocal({ status: filters?.status || 'all', search: filters?.search || '' }), [filters]);

  function handleApply() {
    onChange({ ...filters, ...local });
  }

  function handleClear() {
    const cleared = { status: 'all', search: '', dateFrom: undefined, dateTo: undefined, priceMin: undefined, priceMax: undefined };
    onChange(cleared);
  }

  return (
    <div className="mb-4 flex flex-col md:flex-row md:items-end md:gap-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Status</label>
        <select
          value={local.status}
          onChange={e => setLocal(s => ({ ...s, status: e.target.value }))}
          className="mt-1 block w-48 rounded-md border-gray-200 bg-white p-2"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="converted">Converted</option>
        </select>
      </div>

      <div className="flex-1">
        <label className="text-sm font-medium text-gray-700">Search</label>
        <input
          type="text"
          value={local.search}
          onChange={e => setLocal(s => ({ ...s, search: e.target.value }))}
          placeholder="Quote ID, location, or email"
          className="mt-1 block w-full rounded-md border-gray-200 bg-white p-2"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleApply} className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">Apply</button>
        <button onClick={handleClear} className="mt-4 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md">Clear</button>
      </div>
    </div>
  );
}
