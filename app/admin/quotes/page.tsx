'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { useBookings, BookingFilters } from '../../../lib/hooks/useBookings';
import { useQuotes, QuoteFilters } from '../../../lib/hooks/useQuotes';

import BookingDetailsModal from './components/BookingDetailsModal';
import BookingsTable from './components/BookingsTable';
import ExportButton from './components/ExportButton';
import QuoteDetailsModal from './components/QuoteDetailsModal';
import QuotesFilters from './components/QuotesFilters';
import QuotesTable from './components/QuotesTable';

type TabType = 'quotes' | 'bookings';

function parseStatus(value: string | null): QuoteFilters['status'] {
  if (value === 'active' || value === 'expired' || value === 'converted') return value;
  return 'all';
}

function parseBookingStatus(value: string | null): BookingFilters['status'] {
  if (value === 'pending' || value === 'confirmed' || value === 'completed' || value === 'cancelled') return value;
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

  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'quotes'
  );

  // Quote state
  const [quoteFilters, setQuoteFilters] = useState<QuoteFilters>({
    status: parseStatus(searchParams.get('status')),
    search: searchParams.get('search') || undefined,
    sortBy: parseSortBy(searchParams.get('sortBy')),
    sortOrder: parseSortOrder(searchParams.get('sortOrder')),
    limit: 50,
    cursor: searchParams.get('cursor') || undefined,
  });
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [quotePrevCursor, setQuotePrevCursor] = useState<string | null>(null);

  // Booking state
  const [bookingFilters, setBookingFilters] = useState<BookingFilters>({
    status: parseBookingStatus(searchParams.get('bookingStatus')),
    sortBy: parseSortBy(searchParams.get('bookingSortBy')),
    sortOrder: parseSortOrder(searchParams.get('bookingSortOrder')),
    limit: 50,
  });
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [bookingPrevCursor, setBookingPrevCursor] = useState<string | null>(null);

  const quotesData = useQuotes(quoteFilters);
  const bookingsData = useBookings(bookingFilters);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);

    if (activeTab === 'quotes') {
      if (quoteFilters.status && quoteFilters.status !== 'all') params.set('status', quoteFilters.status);
      if (quoteFilters.search) params.set('search', quoteFilters.search);
      if (quoteFilters.sortBy) params.set('sortBy', quoteFilters.sortBy);
      if (quoteFilters.sortOrder) params.set('sortOrder', quoteFilters.sortOrder);
      if (quoteFilters.cursor) params.set('cursor', quoteFilters.cursor);
    } else {
      if (bookingFilters.status && bookingFilters.status !== 'all') params.set('bookingStatus', bookingFilters.status);
      if (bookingFilters.sortBy) params.set('bookingSortBy', bookingFilters.sortBy);
      if (bookingFilters.sortOrder) params.set('bookingSortOrder', bookingFilters.sortOrder);
    }

    const queryString = params.toString();
    router.push(`/admin/quotes${queryString ? '?' + queryString : ''}`, { scroll: false });
  }, [activeTab, quoteFilters, bookingFilters, router]);

  // Quote handlers
  function handleQuoteFilterChange(newFilters: QuoteFilters) {
    setQuotePrevCursor(null);
    setQuoteFilters({ ...newFilters, cursor: undefined, limit: 50 });
  }

  function handleQuoteSort(column: 'date' | 'price') {
    const newSortBy = column === 'date' ? 'date' : 'price';
    const newSortOrder =
      quoteFilters.sortBy === newSortBy && quoteFilters.sortOrder === 'desc' ? 'asc' : 'desc';
    setQuotePrevCursor(null);
    setQuoteFilters({ ...quoteFilters, sortBy: newSortBy, sortOrder: newSortOrder, cursor: undefined });
  }

  function handleQuoteNextPage() {
    if (quotesData.data?.pagination?.cursor) {
      setQuotePrevCursor(quoteFilters.cursor || null);
      setQuoteFilters({ ...quoteFilters, cursor: quotesData.data.pagination.cursor });
    }
  }

  function handleQuotePrevPage() {
    setQuotePrevCursor(null);
    setQuoteFilters({ ...quoteFilters, cursor: quotePrevCursor || undefined });
  }

  // Booking handlers
  function handleBookingSort(column: 'date' | 'price') {
    const newSortBy = column === 'date' ? 'date' : 'price';
    const newSortOrder =
      bookingFilters.sortBy === newSortBy && bookingFilters.sortOrder === 'desc' ? 'asc' : 'desc';
    setBookingPrevCursor(null);
    setBookingFilters({ ...bookingFilters, sortBy: newSortBy, sortOrder: newSortOrder, cursor: undefined });
  }

  function handleBookingNextPage() {
    if (bookingsData.data?.pagination?.cursor) {
      setBookingPrevCursor(bookingFilters.cursor || null);
      setBookingFilters({ ...bookingFilters, cursor: bookingsData.data.pagination.cursor });
    }
  }

  function handleBookingPrevPage() {
    setBookingPrevCursor(null);
    setBookingFilters({ ...bookingFilters, cursor: bookingPrevCursor || undefined });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quotes & Bookings</h1>
          <p className="text-sm text-gray-600">View and manage customer quotes and bookings</p>
        </div>
        {activeTab === 'quotes' && (
          <div className="flex items-center gap-2">
            <ExportButton filters={quoteFilters} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'quotes'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Quotes
          {quotesData.data?.pagination?.total !== undefined && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {quotesData.data.pagination.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bookings'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Bookings
          {bookingsData.data?.pagination?.total !== undefined && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {bookingsData.data.pagination.total}
            </span>
          )}
        </button>
      </div>

      {/* Quotes Tab */}
      {activeTab === 'quotes' && (
        <>
          <QuotesFilters filters={quoteFilters} onChange={handleQuoteFilterChange} />

          {quotesData.loading && <div className="p-6 bg-white rounded-lg shadow-sm">Loading...</div>}
          {quotesData.error && <div className="p-6 bg-white rounded-lg shadow-sm text-red-600">{quotesData.error.message}</div>}

          {quotesData.data && (
            <div className="space-y-4">
              <QuotesTable
                quotes={quotesData.data.quotes}
                onRowClick={(id: string) => setSelectedQuote(id)}
                sortBy={quoteFilters.sortBy}
                sortOrder={quoteFilters.sortOrder}
                onSort={handleQuoteSort}
              />

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {quotesData.data.quotes.length} of {quotesData.data.pagination?.total || '-'}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={!quotePrevCursor && !quoteFilters.cursor}
                    onClick={handleQuotePrevPage}
                    className="px-3 py-2 rounded bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                  >
                    Previous
                  </button>
                  <button
                    disabled={!quotesData.data.pagination?.cursor}
                    onClick={handleQuoteNextPage}
                    className="px-3 py-2 rounded bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedQuote && <QuoteDetailsModal quoteId={selectedQuote} onClose={() => setSelectedQuote(null)} />}
        </>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <>
          {/* Booking Status Filter */}
          <div className="mb-4 flex gap-2">
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setBookingFilters({ ...bookingFilters, status: status as BookingFilters['status'] })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  bookingFilters.status === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {bookingsData.loading && <div className="p-6 bg-white rounded-lg shadow-sm">Loading...</div>}
          {bookingsData.error && <div className="p-6 bg-white rounded-lg shadow-sm text-red-600">{bookingsData.error.message}</div>}

          {bookingsData.data && (
            <div className="space-y-4">
              <BookingsTable
                bookings={bookingsData.data.bookings}
                onRowClick={(id: string) => setSelectedBooking(id)}
                sortBy={bookingFilters.sortBy}
                sortOrder={bookingFilters.sortOrder}
                onSort={handleBookingSort}
              />

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {bookingsData.data.bookings.length} of {bookingsData.data.pagination?.total || '-'}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={!bookingPrevCursor && !bookingFilters.cursor}
                    onClick={handleBookingPrevPage}
                    className="px-3 py-2 rounded bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                  >
                    Previous
                  </button>
                  <button
                    disabled={!bookingsData.data.pagination?.cursor}
                    onClick={handleBookingNextPage}
                    className="px-3 py-2 rounded bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedBooking && (
            <BookingDetailsModal
              bookingId={selectedBooking}
              onClose={() => setSelectedBooking(null)}
              onStatusChange={() => bookingsData.refetch()}
            />
          )}
        </>
      )}
    </div>
  );
}
