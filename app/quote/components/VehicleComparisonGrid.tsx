'use client';

import { Car, Calendar, Check, Clock, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { JourneyType, MultiVehicleQuoteResponse } from '../lib/types';

interface VehicleComparisonGridProps {
  multiQuote: MultiVehicleQuoteResponse;
  passengers: number;
  journeyType: JourneyType;
  onSelect: (vehicleId: string, isReturn: boolean) => void;
}

export default function VehicleComparisonGrid({
  multiQuote,
  passengers,
  journeyType,
  onSelect,
}: VehicleComparisonGridProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  // For round-trip, default to return pricing; for one-way/hourly, default to one-way
  const [selectedIsReturn, setSelectedIsReturn] = useState<boolean>(journeyType === 'round-trip');

  const vehicleTypes = ['standard', 'executive', 'minibus'] as const;

  // Filter vehicles by capacity
  const availableVehicles = vehicleTypes.filter(
    type => multiQuote.vehicles[type].capacity >= passengers
  );

  // Format pickup date/time
  const formatPickupDateTime = () => {
    const date = new Date(multiQuote.pickupTime);
    return {
      date: date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const pickupDateTime = formatPickupDateTime();

  // Handle vehicle selection (just highlights, doesn't confirm)
  const handleVehicleSelect = (vehicleId: string, isReturn: boolean) => {
    setSelectedVehicle(vehicleId);
    setSelectedIsReturn(isReturn);
  };

  // Handle confirmation
  const handleConfirm = () => {
    if (selectedVehicle) {
      onSelect(selectedVehicle, selectedIsReturn);
    }
  };

  // Get selected pricing info for confirmation display
  const getSelectedPricing = () => {
    if (!selectedVehicle) return null;
    const vehicle = multiQuote.vehicles[selectedVehicle as keyof typeof multiQuote.vehicles];
    const getJourneyLabel = () => {
      if (journeyType === 'round-trip') return 'Return';
      if (journeyType === 'hourly') return 'Hourly';
      return 'One-Way';
    };
    return {
      name: vehicle.name,
      price: selectedIsReturn ? vehicle.return.displayPrice : vehicle.oneWay.displayPrice,
      journeyType: getJourneyLabel(),
    };
  };

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
          {/* Pickup Date & Time */}
          <div className="flex items-center gap-3 pt-2 border-t border-border mt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sage-dark" />
              <span className="text-foreground font-medium">{pickupDateTime.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sage-dark" />
              <span className="text-foreground font-medium">{pickupDateTime.time}</span>
            </div>
          </div>
          {/* Distance & Duration */}
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
        <h3 className="text-sm font-semibold text-foreground px-1">
          {journeyType === 'round-trip'
            ? 'Select your vehicle for your return journey'
            : journeyType === 'hourly'
              ? 'Select your vehicle for hourly hire'
              : 'Select your vehicle'
          }
        </h3>

        {availableVehicles.map((type) => {
          const pricing = multiQuote.vehicles[type];
          // For round-trip, only show return price. For one-way/hourly, only show one-way price.
          const isReturnOnly = journeyType === 'round-trip';
          const isOneWayOnly = journeyType === 'one-way' || journeyType === 'hourly';

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

              {/* Price Buttons - Single button layout when journey type is pre-selected */}
              {isOneWayOnly && (
                <button
                  type="button"
                  onClick={() => handleVehicleSelect(type, false)}
                  className={`w-full flex flex-col items-center p-4 rounded-xl border-2 transition-all active:scale-[0.98] relative ${
                    selectedVehicle === type
                      ? 'border-sage-dark bg-sage-dark/10 ring-2 ring-sage-dark ring-offset-2'
                      : 'border-border hover:border-sage-dark hover:bg-sage-dark/5'
                  }`}
                >
                  {selectedVehicle === type && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-sage-dark rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground mb-1">
                    {journeyType === 'hourly' ? 'Hourly Rate' : 'One-Way'}
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    {pricing.oneWay.displayPrice}
                  </span>
                </button>
              )}

              {isReturnOnly && (
                <button
                  type="button"
                  onClick={() => handleVehicleSelect(type, true)}
                  className={`w-full flex flex-col items-center p-4 rounded-xl border-2 transition-all active:scale-[0.98] relative ${
                    selectedVehicle === type
                      ? 'border-sage-dark bg-sage-dark/10 ring-2 ring-sage-dark ring-offset-2'
                      : 'border-sage-dark bg-sage-dark/5 hover:bg-sage-dark/10'
                  }`}
                >
                  {/* Discount Badge - only show if there's a discount */}
                  {pricing.return.discount.percentage > 0 && (
                    <span className={`absolute -top-2 px-2 py-0.5 bg-sage-dark text-white text-xs font-semibold rounded-full ${
                      selectedVehicle === type ? '-left-2' : '-right-2'
                    }`}>
                      Save {pricing.return.discount.percentage}%
                    </span>
                  )}
                  {selectedVehicle === type && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-sage-dark rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground mb-1">Return Journey</span>
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
              )}
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

      {/* Sticky Confirmation Button */}
      {selectedVehicle && (
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 -mx-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="font-semibold text-foreground">
                {getSelectedPricing()?.name} - {getSelectedPricing()?.journeyType}
              </p>
            </div>
            <p className="text-2xl font-bold text-sage-dark">
              {getSelectedPricing()?.price}
            </p>
          </div>
          <Button
            onClick={handleConfirm}
            className="w-full bg-sage-dark hover:bg-sage-dark/90 text-white h-12 text-lg font-semibold"
          >
            Confirm Selection
          </Button>
        </div>
      )}
    </div>
  );
}
