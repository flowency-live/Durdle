'use client';

import { Car, MapPin, Clock } from 'lucide-react';
import Image from 'next/image';

import { MultiVehicleQuoteResponse } from '../lib/types';

interface VehicleComparisonGridProps {
  multiQuote: MultiVehicleQuoteResponse;
  passengers: number;
  onSelect: (vehicleId: string, isReturn: boolean) => void;
}

export default function VehicleComparisonGrid({
  multiQuote,
  passengers,
  onSelect,
}: VehicleComparisonGridProps) {
  const vehicleTypes = ['standard', 'executive', 'minibus'] as const;

  // Filter vehicles by capacity
  const availableVehicles = vehicleTypes.filter(
    type => multiQuote.vehicles[type].capacity >= passengers
  );

  return (
    <div className="space-y-4">
      {/* Journey Summary */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
        <h3 className="text-sm font-semibold text-foreground mb-3">Your Journey</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-xs">From</p>
              <p className="text-foreground truncate">{multiQuote.pickupLocation.address}</p>
            </div>
          </div>
          {multiQuote.dropoffLocation && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-navy-dark mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">To</p>
                <p className="text-foreground truncate">{multiQuote.dropoffLocation.address}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 pt-2 border-t border-border mt-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{multiQuote.journey.distance.text}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{multiQuote.journey.duration.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground px-1">Select your vehicle & journey type</h3>

        {availableVehicles.map((type) => {
          const pricing = multiQuote.vehicles[type];

          return (
            <div
              key={type}
              className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light"
            >
              {/* Vehicle Header with Image */}
              <div className="flex items-start gap-3 mb-4">
                {/* Vehicle Image */}
                {pricing.imageUrl ? (
                  <div className="relative w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                    <Image
                      src={pricing.imageUrl}
                      alt={pricing.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-20 h-16 rounded-xl bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                    <Car className="w-8 h-8 text-sage-dark" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-foreground">{pricing.name}</h4>
                  <p className="text-sm text-muted-foreground">Up to {pricing.capacity} passengers</p>
                </div>
              </div>

              {/* Features */}
              {pricing.features && pricing.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {pricing.features.slice(0, 3).map((feature, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}

              {/* Price Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* One-Way Button */}
                <button
                  type="button"
                  onClick={() => onSelect(type, false)}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-border hover:border-sage-dark hover:bg-sage-dark/5 transition-all active:scale-[0.98]"
                >
                  <span className="text-xs text-muted-foreground mb-1">One-Way</span>
                  <span className="text-2xl font-bold text-foreground">
                    {pricing.oneWay.displayPrice}
                  </span>
                </button>

                {/* Return Button */}
                <button
                  type="button"
                  onClick={() => onSelect(type, true)}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-sage-dark bg-sage-dark/5 hover:bg-sage-dark/10 transition-all active:scale-[0.98] relative"
                >
                  {/* Discount Badge - only show if there's a discount */}
                  {pricing.return.discount.percentage > 0 && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-sage-dark text-white text-xs font-semibold rounded-full">
                      Save {pricing.return.discount.percentage}%
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground mb-1">Return</span>
                  <span className="text-2xl font-bold text-sage-dark">
                    {pricing.return.displayPrice}
                  </span>
                  {/* Show original price if discounted */}
                  {pricing.return.discount.percentage > 0 && (
                    <span className="text-xs text-muted-foreground line-through">
                      {`£${((pricing.oneWay.price * 2) / 100).toFixed(2)}`}
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {availableVehicles.length === 0 && (
          <div className="bg-card rounded-2xl p-8 shadow-mobile border-2 border-sage-light text-center">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No vehicles available for {passengers} passengers.
              <br />
              Please reduce the passenger count.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
