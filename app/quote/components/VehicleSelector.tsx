'use client';

import { Car, Zap } from 'lucide-react';
import Image from 'next/image';

import { VehiclePricing } from '../lib/types';

interface VehicleSelectorProps {
  selected: string | null;
  onChange: (vehicleId: string) => void;
  passengers: number;
  vehiclePrices: {
    standard: VehiclePricing;
    executive: VehiclePricing;
    minibus: VehiclePricing;
  };
  returnJourney: boolean;
  onReturnJourneyChange: (isReturn: boolean) => void;
}

export default function VehicleSelector({
  selected,
  onChange,
  passengers,
  vehiclePrices,
  returnJourney,
  onReturnJourneyChange,
}: VehicleSelectorProps) {
  const vehicleTypes = ['standard', 'executive', 'minibus'] as const;

  // Filter vehicles that can accommodate the passenger count
  const availableVehicles = vehicleTypes.filter(
    type => vehiclePrices[type].capacity >= passengers
  );

  return (
    <div className="space-y-4">
      {/* One Way / Return Tabs */}
      <div className="flex rounded-xl overflow-hidden border-2 border-sage-light">
        <button
          type="button"
          onClick={() => onReturnJourneyChange(false)}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            !returnJourney
              ? 'bg-sage-dark text-white'
              : 'bg-card text-foreground hover:bg-muted'
          }`}
        >
          One Way
        </button>
        <button
          type="button"
          onClick={() => onReturnJourneyChange(true)}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            returnJourney
              ? 'bg-sage-dark text-white'
              : 'bg-card text-foreground hover:bg-muted'
          }`}
        >
          Return
        </button>
      </div>

      {/* Vehicle Cards - NO outer container */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {availableVehicles.map((type) => {
          const pricing = vehiclePrices[type];
          const isSelected = selected === type;
          const priceData = returnJourney ? pricing.return : pricing.oneWay;
          const displayPrice = priceData.displayPrice;
          const hasSurge = priceData.isPeakPricing && priceData.surgeMultiplier && priceData.surgeMultiplier > 1;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={`relative p-3 rounded-xl border-2 transition-all text-left bg-card ${
                isSelected
                  ? 'border-sage-dark bg-sage-dark/10'
                  : 'border-border hover:border-sage-dark/50'
              }`}
            >
              {/* Selection indicator */}
              <div className="absolute top-2 right-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-sage-dark bg-sage-dark' : 'border-border'
                }`}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>

              {/* Vehicle Image */}
              {pricing.imageUrl ? (
                <div className="relative w-full h-20 mb-2">
                  <Image
                    src={pricing.imageUrl}
                    alt={pricing.name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-full h-20 bg-muted rounded-lg mb-2 flex items-center justify-center">
                  <Car className="w-8 h-8 text-muted-foreground" />
                </div>
              )}

              {/* Vehicle Name */}
              <h3 className="text-sm font-semibold text-foreground mb-1 pr-6">
                {pricing.name}
              </h3>

              {/* Capacity */}
              <p className="text-xs text-muted-foreground mb-2">
                Up to {pricing.capacity} passengers
              </p>

              {/* Price - prominent */}
              <p className="text-lg font-bold text-sage-dark">
                {displayPrice}
              </p>

              {/* Surge Pricing Indicator */}
              {hasSurge && (
                <div className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                  <Zap className="w-3 h-3" />
                  <span>Peak {priceData.surgeMultiplier}x</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
