'use client';

import { useEffect, useState } from 'react';
import { Car, Star, Users, Loader2 } from 'lucide-react';
import { Vehicle } from '../lib/types';
import { getVehicles } from '../lib/api';
import Image from 'next/image';

interface VehicleSelectorProps {
  selected: string | null;
  onChange: (vehicleId: string) => void;
  error?: string;
}

const vehicleIcons: Record<string, typeof Car> = {
  standard: Car,
  executive: Star,
  minibus: Users,
};

export default function VehicleSelector({ selected, onChange, error }: VehicleSelectorProps) {
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
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          Select Vehicle Type
        </label>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-sage-dark animate-spin" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          Select Vehicle Type
        </label>
        <div className="text-center py-8 text-error">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-sage-dark hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-foreground">
        Select Vehicle Type *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => {
          const Icon = vehicleIcons[vehicle.vehicleId] || Car;
          const isSelected = selected === vehicle.vehicleId;

          return (
            <button
              key={vehicle.vehicleId}
              type="button"
              onClick={() => onChange(vehicle.vehicleId)}
              className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-sage-dark bg-sage-dark/10'
                  : 'border-border hover:border-sage-dark/50'
              }`}
            >
              {/* Radio indicator */}
              <div className="absolute top-4 right-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-sage-dark bg-sage-dark' : 'border-border'
                }`}>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>

              {/* Vehicle Image */}
              {vehicle.imageUrl && (
                <div className="relative w-full h-32 mb-4 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={vehicle.imageUrl}
                    alt={vehicle.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Icon */}
              <Icon className={`w-8 h-8 mb-3 ${
                isSelected ? 'text-sage-dark' : 'text-muted-foreground'
              }`} />

              {/* Details */}
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {vehicle.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Up to {vehicle.capacity} passengers
              </p>

              {/* Features */}
              <ul className="space-y-2">
                {vehicle.features.slice(0, 3).map((feature, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-1 h-1 bg-sage-dark rounded-full flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}
