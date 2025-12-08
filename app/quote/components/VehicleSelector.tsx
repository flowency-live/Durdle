'use client';

import { Car, Star, Users, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getVehicles } from '../lib/api';
import { Vehicle } from '../lib/types';

interface VehicleSelectorProps {
  selected: string | null;
  onChange: (vehicleId: string) => void;
  passengers: number;
  error?: string;
}

const vehicleIcons: Record<string, typeof Car> = {
  standard: Car,
  executive: Star,
  minibus: Users,
};

export default function VehicleSelector({ selected, onChange, passengers, error }: VehicleSelectorProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVehicles() {
      try {
        setLoading(true);
        const data = await getVehicles();
        setVehicles(data);
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    }

    fetchVehicles();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-sage-dark animate-spin" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
        <div className="text-center py-8 text-error">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-sage-accessible hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Filter out disabled vehicles (hide vehicles that can't accommodate passengers)
  const availableVehicles = vehicles.filter(v => v.capacity >= passengers);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {availableVehicles.map((vehicle) => {
          const Icon = vehicleIcons[vehicle.vehicleId] || Car;
          const isSelected = selected === vehicle.vehicleId;

          return (
            <button
              key={vehicle.vehicleId}
              type="button"
              onClick={() => onChange(vehicle.vehicleId)}
              className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-sage-dark bg-sage-dark/10'
                  : 'border-border hover:border-sage-dark/50'
              }`}
            >
              {/* Radio indicator */}
              <div className="absolute top-2 right-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-sage-dark bg-sage-dark' : 'border-border'
                }`}>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </div>
              </div>

              {/* Icon */}
              <Icon className={`w-6 h-6 mb-2 ${
                isSelected ? 'text-sage-dark' : 'text-muted-foreground'
              }`} />

              {/* Details */}
              <h3 className="text-sm font-semibold text-foreground mb-1 pr-6">
                {vehicle.name}
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Up to {vehicle.capacity} passengers
              </p>

              {/* Features - show only first 2 */}
              <ul className="space-y-1">
                {vehicle.features.slice(0, 2).map((feature, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-sage-dark rounded-full flex-shrink-0" />
                    <span className="truncate">{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-error mt-3">{error}</p>
      )}
    </div>
  );
}
