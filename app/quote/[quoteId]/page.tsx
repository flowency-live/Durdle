'use client';

import { MapPin, Clock, Calendar, Users, Car, Luggage, ArrowRight, AlertCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

interface SavedQuote {
  quoteId: string;
  status: string;
  journey?: {
    distance: number | { meters: number; miles: string; text: string };
    duration: number | { seconds: number; minutes: number; text: string };
  };
  pricing: {
    totalPrice?: number;
    breakdown?: {
      baseFare: number;
      distance?: number;
      distanceCharge?: number;
      time?: number;
      timeCharge?: number;
      subtotal?: number;
      tax?: number;
      total?: number;
    };
    displayTotal?: string;
  };
  vehicleType: string;
  pickupLocation: { address: string; lat?: number; lng?: number };
  dropoffLocation: { address: string; lat?: number; lng?: number };
  pickupTime: string;
  passengers: number;
  luggage?: number;
  returnJourney?: boolean;
  createdAt: string;
}

export default function QuoteRetrievalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quoteId = params.quoteId as string;
  const token = searchParams.get('token');

  const [quote, setQuote] = useState<SavedQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      if (!quoteId || !token) {
        setError('Invalid quote link. Please request a new quote.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.quotesRetrieve}/${quoteId}?token=${token}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError('Quote not found. It may have expired or been deleted.');
          } else if (response.status === 403) {
            setError('Invalid access token. Please request the quote link again.');
          } else {
            setError('Failed to load quote. Please try again.');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setQuote(data);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError('Failed to load quote. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchQuote();
  }, [quoteId, token]);

  // Format price from pence to pounds
  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  // Get total price
  const getTotalPrice = () => {
    if (!quote) return '£0.00';
    if (quote.pricing.displayTotal) return quote.pricing.displayTotal;
    if (quote.pricing.totalPrice) return formatPrice(quote.pricing.totalPrice);
    if (quote.pricing.breakdown?.total) return formatPrice(quote.pricing.breakdown.total);
    return '£0.00';
  };

  // Format date/time
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      }),
    };
  };

  // Get distance text
  const getDistanceText = () => {
    if (!quote?.journey?.distance) return 'N/A';
    if (typeof quote.journey.distance === 'number') {
      return `${quote.journey.distance.toFixed(1)} miles`;
    }
    return quote.journey.distance.text || `${quote.journey.distance.miles} miles`;
  };

  // Get duration text
  const getDurationText = () => {
    if (!quote?.journey?.duration) return 'N/A';
    if (typeof quote.journey.duration === 'number') {
      return `${quote.journey.duration} mins`;
    }
    return quote.journey.duration.text || `${quote.journey.duration.minutes} mins`;
  };

  // Copy share link
  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Quote link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-dark mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Quote Not Available</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/quote">
            <Button className="bg-sage-dark hover:bg-sage-dark/90 text-white">
              Get a New Quote
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  const { date, time } = formatDateTime(quote.pickupTime);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-playfair text-foreground mb-2">
            Your Saved Quote
          </h1>
          <p className="text-muted-foreground">
            Quote ID: <span className="font-mono font-medium">{quote.quoteId}</span>
          </p>
        </div>

        {/* Quote Card */}
        <div className="bg-card rounded-3xl shadow-xl overflow-hidden">
          {/* Price Header */}
          <div className="bg-gradient-navy-sage p-6 text-white text-center">
            <p className="text-sm opacity-90 mb-1">Total Price</p>
            <p className="text-4xl font-bold">{getTotalPrice()}</p>
            {quote.returnJourney && (
              <p className="text-sm opacity-75 mt-2">Includes return journey</p>
            )}
          </div>

          {/* Journey Details */}
          <div className="p-6 space-y-6">
            {/* Route */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-sage-dark" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Pickup</p>
                  <p className="font-medium text-foreground">{quote.pickupLocation.address}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pl-5">
                <div className="h-8 w-0.5 bg-border ml-[15px]" />
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-navy-dark/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-navy-dark" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Drop-off</p>
                  <p className="font-medium text-foreground">{quote.dropoffLocation.address}</p>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
              <Calendar className="w-5 h-5 text-sage-dark" />
              <div>
                <p className="font-medium text-foreground">{date}</p>
                <p className="text-sm text-muted-foreground">Pickup at {time}</p>
              </div>
            </div>

            {/* Journey Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
                <p className="font-medium text-foreground">{getDurationText()}</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Distance</p>
                </div>
                <p className="font-medium text-foreground">{getDistanceText()}</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                </div>
                <p className="font-medium text-foreground capitalize">{quote.vehicleType}</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Passengers</p>
                </div>
                <p className="font-medium text-foreground">{quote.passengers}</p>
              </div>
            </div>

            {quote.luggage && quote.luggage > 0 && (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                <Luggage className="w-5 h-5 text-muted-foreground" />
                <p className="text-foreground">{quote.luggage} luggage items</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-border space-y-3">
            <Link href="/quote" className="block">
              <Button className="w-full bg-sage-dark hover:bg-sage-dark/90 text-white h-12 text-lg">
                Book This Transfer
              </Button>
            </Link>

            <div className="flex gap-3">
              <Button
                className="flex-1 border border-border bg-background hover:bg-muted"
                onClick={copyShareLink}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Quote
              </Button>

              <Link href="/quote" className="flex-1">
                <Button className="w-full border border-border bg-background hover:bg-muted">
                  Get New Quote
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          This quote was generated on {new Date(quote.createdAt).toLocaleDateString('en-GB')}.
          Prices may change based on availability and booking date.
        </p>
      </div>
    </div>
  );
}
