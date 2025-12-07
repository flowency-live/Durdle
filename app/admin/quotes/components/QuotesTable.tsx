'use client';

import React from 'react';

interface Quote {
  quoteId: string;
  createdAt: string;
  customerEmail?: string;
  pickupLocation?: { address: string };
  dropoffLocation?: { address: string };
  totalPrice?: number;
  status: string;
}

interface QuotesTableProps {
  quotes: Quote[];
  onRowClick: (quoteId: string) => void;
}

export default function QuotesTable({ quotes = [], onRowClick }: QuotesTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Pickup</th>
            <th className="px-4 py-3">Dropoff</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {quotes.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No quotes found</td>
            </tr>
          )}
          {quotes.map((q: Quote) => (
            <tr key={q.quoteId} className="hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick(q.quoteId)}>
              <td className="px-4 py-3">{q.quoteId?.replace(/^QUOTE#/, '#')}</td>
              <td className="px-4 py-3">{new Date(q.createdAt).toLocaleString()}</td>
              <td className="px-4 py-3">{q.customerEmail || '—'}</td>
              <td className="px-4 py-3">{q.pickupLocation?.address?.slice(0, 60)}</td>
              <td className="px-4 py-3">{q.dropoffLocation?.address?.slice(0, 60)}</td>
              <td className="px-4 py-3">{q.totalPrice !== null ? `£${(q.totalPrice/100).toFixed(2)}` : '—'}</td>
              <td className="px-4 py-3">{q.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
