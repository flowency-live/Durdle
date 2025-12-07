'use client';

import React from 'react';

import { useQuoteDetails } from '../../../../lib/hooks/useQuotes';

interface QuoteDetailsModalProps {
  quoteId?: string;
  onClose: () => void;
}

export default function QuoteDetailsModal({ quoteId, onClose }: QuoteDetailsModalProps) {
  const { data, loading, error } = useQuoteDetails(quoteId);

  if (!quoteId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg w-full max-w-3xl p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Quote Details</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>

        {loading && <p>Loading…</p>}
        {error && <p className="text-red-600">{error.message}</p>}

        {data && (
          <div className="grid grid-cols-1 gap-3">
            <div><strong>Reference:</strong> {data.quoteId?.replace(/^QUOTE#/, '#')}</div>
            <div><strong>Status:</strong> {data.status}</div>
            <div><strong>Created:</strong> {new Date(data.createdAt).toString()}</div>
            <div><strong>Expires:</strong> {data.expiresAt !== null ? new Date(data.expiresAt).toString() : '—'}</div>
            <div><strong>Customer:</strong> {data.customerEmail || 'Not provided'}</div>
            <div><strong>Pickup:</strong> {data.pickupLocation?.address}</div>
            <div><strong>Dropoff:</strong> {data.dropoffLocation?.address}</div>
            <div><strong>Price:</strong> {data.totalPrice !== null ? `£${(data.totalPrice/100).toFixed(2)}` : '—'}</div>
            <div className="pt-3">
              <details>
                <summary className="cursor-pointer text-sm text-gray-600">Full JSON</summary>
                <pre className="text-xs overflow-auto max-h-48 bg-gray-100 p-2 mt-2">{JSON.stringify(data, null, 2)}</pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
