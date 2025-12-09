'use client';

import React, { useState } from 'react';

import adminApi from '../../../../lib/services/adminApi';
import { useBookingDetails } from '../../../../lib/hooks/useBookings';

interface BookingDetailsModalProps {
  bookingId?: string;
  onClose: () => void;
  onStatusChange?: () => void;
}

const statusOptions = ['pending', 'confirmed', 'completed', 'cancelled'];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function BookingDetailsModal({ bookingId, onClose, onStatusChange }: BookingDetailsModalProps) {
  const { data, loading, error, refetch } = useBookingDetails(bookingId);
  const [updating, setUpdating] = useState(false);

  if (!bookingId) return null;

  async function handleStatusChange(newStatus: string) {
    if (!bookingId || !data) return;
    setUpdating(true);
    try {
      await adminApi.updateBookingStatus(bookingId, newStatus);
      refetch();
      onStatusChange?.();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Booking Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-600">{error.message}</p>}

        {data && (
          <div className="space-y-6">
            {/* Header with ID and Status */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <p className="text-sm text-gray-500">Booking ID</p>
                <p className="font-mono font-semibold">{data.bookingId}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[data.status] || 'bg-gray-100'}`}>
                  {data.status}
                </span>
                <select
                  value={data.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  className="ml-2 px-2 py-1 border rounded text-sm"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Customer Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium">{data.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium">{data.customerPhone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium">{data.customerEmail}</p>
                </div>
              </div>
            </div>

            {/* Journey Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Journey Details</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Pickup Date & Time</p>
                  <p className="font-medium">{formatDate(data.pickupTime)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Pickup Location</p>
                  <p className="font-medium">{data.pickupLocation?.address}</p>
                </div>
                <div>
                  <p className="text-gray-500">Dropoff Location</p>
                  <p className="font-medium">{data.dropoffLocation?.address}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-gray-500">Vehicle</p>
                    <p className="font-medium capitalize">{data.vehicleType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Passengers</p>
                    <p className="font-medium">{data.passengers}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Luggage</p>
                    <p className="font-medium">{data.luggage || 0}</p>
                  </div>
                </div>
                {data.isReturn && (
                  <div>
                    <p className="text-green-600 font-medium">Return Journey Included</p>
                  </div>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Total Price</p>
                <p className="text-2xl font-bold text-green-700">
                  {data.totalPrice ? `£${(data.totalPrice / 100).toFixed(2)}` : '-'}
                </p>
              </div>
            </div>

            {/* Special Requests */}
            {data.specialRequests && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Special Requests</h4>
                <p className="text-sm">{data.specialRequests}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-gray-500 pt-4 border-t">
              <p>Created: {formatDate(data.createdAt)}</p>
              {data.quoteId && <p>Quote ID: {data.quoteId}</p>}
            </div>

            {/* Raw JSON */}
            <details>
              <summary className="cursor-pointer text-sm text-gray-600">Full JSON</summary>
              <pre className="text-xs overflow-auto max-h-48 bg-gray-100 p-2 mt-2">{JSON.stringify(data, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
