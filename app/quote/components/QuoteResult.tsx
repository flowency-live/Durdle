'use client';

import { MapPin, Clock, Calendar, Users, Car, Luggage } from 'lucide-react';
import { QuoteResponse } from '../lib/types';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface QuoteResultProps {
  quote: QuoteResponse;
  onNewQuote: () => void;
}

export default function QuoteResult({ quote, onNewQuote }: QuoteResultProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

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
    <section className="pb-24">
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

          {/* Journey Details */}
          <div className="p-6 space-y-6">
            {/* Route Summary */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-sage-dark" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {quote.pickupLocation.address}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Pickup location</p>
                </div>
              </div>

              <div className="flex items-center gap-4 pl-5">
                <div className="h-12 w-0.5 bg-border" />
                <div className="flex-1 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    <span>{quote.journey.distance.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{quote.journey.duration.text}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time charge</span>
                  <span className="font-medium text-foreground">
                    £{(quote.pricing.breakdown.timeCharge / 100).toFixed(2)}
                  </span>
                </div>
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
          <div className="p-6 bg-muted/50 space-y-4">
            <Button
              type="button"
              variant="hero-golden"
              size="xl"
              className="w-full"
              disabled
            >
              Confirm Booking (Coming Soon)
            </Button>
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Quote expires in: <span className="font-semibold text-foreground">{timeRemaining}</span>
              </p>
              <button
                type="button"
                onClick={onNewQuote}
                className="text-sm text-sage-dark hover:underline"
              >
                Get a new quote
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
