'use client';

import React from 'react';

import { Booking } from '../../../../lib/types/bookings';

interface BookingsTableProps {
  bookings: Booking[];
  onRowClick: (bookingId: string) => void;
  sortBy?: 'date' | 'price';
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: 'date' | 'price') => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function BookingsTable({
  bookings = [],
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
}: BookingsTableProps) {
  function handleHeaderClick(column: 'date' | 'price') {
    onSort?.(column);
  }

  function renderSortIcon(column: 'date' | 'price') {
    if (sortBy !== column) return <span className="text-gray-300">-</span>;
    return sortOrder === 'asc' ? <span>^</span> : <span>v</span>;
  }

  function formatPrice(price: number | undefined): string {
    if (price === undefined || price === null) return '-';
    return `GBP ${(price / 100).toFixed(2)}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3">Booking ID</th>
            <th
              className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleHeaderClick('date')}
            >
              Pickup Date {renderSortIcon('date')}
            </th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Pickup</th>
            <th className="px-4 py-3">Dropoff</th>
            <th
              className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleHeaderClick('price')}
            >
              Price {renderSortIcon('price')}
            </th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No bookings found</td>
            </tr>
          )}
          {bookings.map((b: Booking) => (
            <tr key={b.bookingId} className="hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick(b.bookingId)}>
              <td className="px-4 py-3 font-mono text-xs">{b.bookingId}</td>
              <td className="px-4 py-3">{formatDate(b.pickupTime)}</td>
              <td className="px-4 py-3">
                <div>{b.customer?.name}</div>
                <div className="text-xs text-gray-500">{b.customer?.phone}</div>
              </td>
              <td className="px-4 py-3">{b.pickupLocation?.address?.slice(0, 50)}</td>
              <td className="px-4 py-3">{b.dropoffLocation?.address?.slice(0, 50)}</td>
              <td className="px-4 py-3">{b.pricing?.displayTotal || formatPrice(b.pricing?.breakdown?.total)}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || 'bg-gray-100'}`}>
                  {b.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
