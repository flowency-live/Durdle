'use client';

import { Car, Star, Users, MapPin, Clock } from 'lucide-react';

import { Vehicle, QuoteResponse } from '../../quote/lib/types';

interface VehicleComparisonGridProps {
  vehicles: Vehicle[];
  vehicleQuotes: Map<string, QuoteResponse>;
  passengers: number;
  onSelect: (vehicleId: string, isReturn: boolean) => void;
}

const vehicleIcons: Record<string, typeof Car> = {
  standard: Car,
  executive: Star,
  minibus: Users,
};

export default function VehicleComparisonGrid({
  vehicles,
  vehicleQuotes,
  passengers,
  onSelect,
}: VehicleComparisonGridProps) {
  // Filter vehicles by capacity
  const availableVehicles = vehicles.filter(v => v.capacity >= passengers);

  // Get journey info from first quote for display
  const firstQuote = vehicleQuotes.values().next().value as QuoteResponse | undefined;

  return (
    <div className="space-y-4">
      {/* Journey Summary */}
      {firstQuote && (
        <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
          <h3 className="text-sm font-semibold text-foreground mb-3">Your Journey</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">From</p>
                <p className="text-foreground truncate">{firstQuote.pickupLocation.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-navy-dark mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">To</p>
                <p className="text-foreground truncate">{firstQuote.dropoffLocation.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-border mt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{firstQuote.journey.distance.text}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{firstQuote.journey.duration.text}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground px-1">Select your vehicle & journey type</h3>

        {availableVehicles.map((vehicle) => {
          const quote = vehicleQuotes.get(vehicle.vehicleId);
          if (!quote) return null;

          const Icon = vehicleIcons[vehicle.vehicleId] || Car;
          const oneWayPrice = quote.pricing.breakdown.total;
          const returnPrice = Math.round(oneWayPrice * 2 * 0.9); // 10% discount

          return (
            <div
              key={vehicle.vehicleId}
              className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light"
            >
              {/* Vehicle Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-sage-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-foreground">{vehicle.name}</h4>
                  <p className="text-sm text-muted-foreground">Up to {vehicle.capacity} passengers</p>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                {vehicle.features.slice(0, 3).map((feature, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Price Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* One-Way Button */}
                <button
                  type="button"
                  onClick={() => onSelect(vehicle.vehicleId, false)}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-border hover:border-sage-dark hover:bg-sage-dark/5 transition-all active:scale-[0.98]"
                >
                  <span className="text-xs text-muted-foreground mb-1">One-Way</span>
                  <span className="text-2xl font-bold text-foreground">
                    £{(oneWayPrice / 100).toFixed(2)}
                  </span>
                </button>

                {/* Return Button */}
                <button
                  type="button"
                  onClick={() => onSelect(vehicle.vehicleId, true)}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-sage-dark bg-sage-dark/5 hover:bg-sage-dark/10 transition-all active:scale-[0.98] relative"
                >
                  {/* Discount Badge */}
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-sage-dark text-white text-xs font-semibold rounded-full">
                    -10%
                  </span>
                  <span className="text-xs text-muted-foreground mb-1">Return</span>
                  <span className="text-2xl font-bold text-sage-dark">
                    £{(returnPrice / 100).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground line-through">
                    £{((oneWayPrice * 2) / 100).toFixed(2)}
                  </span>
                </button>
              </div>
            </div>
          );
        })}

        {availableVehicles.length === 0 && (
          <div className="bg-card rounded-2xl p-8 shadow-mobile border-2 border-sage-light text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
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
