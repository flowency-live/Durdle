import { useMemo } from 'react';

import adminApi from '../services/adminApi';
import { Booking, BookingFilters, BookingsListResponse } from '../types/bookings';

import { useApi } from './useApi';

export type { Booking, BookingFilters, BookingsListResponse };

export function useBookings(filters: BookingFilters): ReturnType<typeof useApi<BookingsListResponse>> {
  const key = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  return useApi<BookingsListResponse>(
    () => adminApi.listBookings(filters) as Promise<BookingsListResponse>,
    [key]
  );
}

export function useBookingDetails(bookingId?: string): ReturnType<typeof useApi<Booking | null>> {
  return useApi<Booking | null>(
    async () => {
      if (!bookingId) return null;
      const response = await adminApi.getBookingDetails(bookingId) as { booking: Booking };
      return response.booking;
    },
    [bookingId],
    { immediate: !!bookingId }
  );
}
