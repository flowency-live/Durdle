'use client';

import { MapPin, Clock, Calendar, Users, Car, Luggage, Edit2, Share2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

import { QuoteResponse } from '../lib/types';
import MapPreview from './MapPreview';
import ShareQuoteModal from './ShareQuoteModal';


interface QuoteResultProps {
  quote: QuoteResponse;
  onNewQuote: () => void;
  onBack?: () => void;
  onConfirmBooking?: () => void;
}

export default function QuoteResult({ quote, onNewQuote, onBack, onConfirmBooking }: QuoteResultProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);

  // Scroll to top when quote result appears
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date();
      const expires = new Date(quote.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [quote.expiresAt]);

  const pickupDate = new Date(quote.pickupTime);

  return (
    <section className="py-6 pb-24">
      <div className="container px-4 mx-auto max-w-4xl">
        {/* Quote Card */}
        <div className="bg-card rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-navy-sage p-6 text-white">
            <h2 className="text-2xl md:text-3xl font-bold font-playfair mb-2">
              Your Quote
            </h2>
            <p className="text-sm opacity-90">
              Quote ID: {quote.quoteId}
            </p>
          </div>

          {/* Vehicle + Map Section - Side by side on desktop */}
          <div className="p-4 md:p-6 border-b border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vehicle Card */}
              {quote.vehicleDetails && (
                <div className="bg-gradient-to-br from-sage-light/30 to-sage-light/10 rounded-2xl p-4 border border-sage-light">
                  {/* Vehicle Image */}
                  {quote.vehicleDetails.imageUrl ? (
                    <div className="relative w-full h-32 md:h-40 rounded-xl overflow-hidden bg-white/50 mb-4">
                      <Image
                        src={quote.vehicleDetails.imageUrl}
                        alt={quote.vehicleDetails.name}
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 md:h-40 rounded-xl bg-white/50 flex items-center justify-center mb-4">
                      <Car className="w-16 h-16 text-sage-dark" />
                    </div>
                  )}

                  {/* Vehicle Details */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-navy-dark">{quote.vehicleDetails.name}</h3>
                    <p className="text-sm text-muted-foreground">{quote.vehicleDetails.description}</p>

                    {/* Capacity */}
                    {quote.vehicleDetails.capacity && (
                      <div className="flex items-center gap-2 text-sm text-navy-light">
                        <Users className="w-4 h-4" />
                        <span>Up to {quote.vehicleDetails.capacity} passengers</span>
                      </div>
                    )}

                    {/* Features */}
                    {quote.vehicleDetails.features && quote.vehicleDetails.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {quote.vehicleDetails.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-3 py-1 bg-white/70 rounded-full text-navy-light border border-sage-light"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Route Map */}
              <MapPreview
                pickup={quote.pickupLocation}
                dropoff={quote.dropoffLocation}
                waypoints={quote.waypoints}
                pickupTime={new Date(quote.pickupTime)}
              />
            </div>
          </div>

          {/* Journey Details */}
          <div className="p-6 space-y-6">
            {/* Section Header with Edit */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Journey Details</h3>
              <button
                type="button"
                onClick={onBack || onNewQuote}
                className="flex items-center gap-1.5 text-sm text-sage-accessible hover:text-sage-accessible/80 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            </div>

            {/* Route Summary */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-sage-dark" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {quote.pickupLocation.address}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pickup location</p>
                </div>
              </div>

              {/* Waypoints */}
              {quote.waypoints && quote.waypoints.length > 0 && quote.waypoints.map((waypoint, index) => (
                <div key={index}>
                  <div className="flex items-center gap-3 pl-4">
                    <div className="h-6 w-0.5 bg-border" />
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {waypoint.address}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Stop {index + 1}
                        {waypoint.waitTime && waypoint.waitTime > 0 && (
                          <span className="ml-2 text-amber-600">
                            • Wait {waypoint.waitTime} min
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 pl-4">
                <div className="h-6 w-0.5 bg-border" />
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-navy-dark/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-navy-dark" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {quote.dropoffLocation.address}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Dropoff location</p>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-sage-dark" />
                <div>
                  <p className="text-xs text-muted-foreground">Pickup Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {pickupDate.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-sage-dark" />
                <div>
                  <p className="text-xs text-muted-foreground">Pickup Time</p>
                  <p className="text-sm font-medium text-foreground">
                    {pickupDate.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-sage-dark" />
                <div>
                  <p className="text-xs text-muted-foreground">Passengers</p>
                  <p className="text-sm font-medium text-foreground">
                    {quote.passengers}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-sage-dark" />
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-medium text-foreground">
                    {quote.vehicleType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-sage-dark" />
                <div>
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-sm font-medium text-foreground">
                    {quote.journey.distance.text}
                  </p>
                </div>
              </div>
              {quote.luggage !== undefined && quote.luggage > 0 && (
                <div className="flex items-center gap-3">
                  <Luggage className="w-5 h-5 text-sage-dark" />
                  <div>
                    <p className="text-xs text-muted-foreground">Luggage</p>
                    <p className="text-sm font-medium text-foreground">
                      {quote.luggage} {quote.luggage === 1 ? 'bag' : 'bags'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Breakdown */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Price Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base fare</span>
                  <span className="font-medium text-foreground">
                    £{(quote.pricing.breakdown.baseFare / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Distance charge</span>
                  <span className="font-medium text-foreground">
                    £{(quote.pricing.breakdown.distanceCharge / 100).toFixed(2)}
                  </span>
                </div>
                {quote.pricing.breakdown.waitTimeCharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Wait time charge</span>
                    <span className="font-medium text-foreground">
                      £{(quote.pricing.breakdown.waitTimeCharge / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                {/* Legacy support for old quotes with timeCharge */}
                {quote.pricing.breakdown.timeCharge !== undefined && quote.pricing.breakdown.timeCharge > 0 && !quote.pricing.breakdown.waitTimeCharge && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time charge</span>
                    <span className="font-medium text-foreground">
                      £{(quote.pricing.breakdown.timeCharge / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground">Total</span>
                  <span className="text-3xl font-bold text-sage-dark">
                    {quote.pricing.displayTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="p-6 bg-muted/50 space-y-3">
            <Button
              type="button"
              variant="hero-golden"
              size="xl"
              className="w-full"
              onClick={onConfirmBooking}
              disabled={!onConfirmBooking}
            >
              Confirm Booking
            </Button>
            <div className="flex gap-3">
              <Link href="/" className="flex-1">
                <Button
                  type="button"
                  variant="default"
                  size="xl"
                  className="w-full"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="button"
                size="xl"
                className="flex-1 bg-sage-dark hover:bg-sage-dark/90 text-white"
                onClick={() => setShowShareModal(true)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
            <div className="text-center space-y-1 pt-2">
              <p className="text-sm text-muted-foreground">
                Quote expires in: <span className="font-semibold text-foreground">{timeRemaining}</span>
              </p>
              <button
                type="button"
                onClick={onNewQuote}
                className="text-sm text-sage-accessible hover:underline"
              >
                Get a new quote
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareQuoteModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        quoteData={quote}
      />
    </section>
  );
}
