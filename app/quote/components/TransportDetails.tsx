'use client';

import { Plane, Train, AlertCircle } from 'lucide-react';

import { LocationType } from '../lib/types';

export type TransportType = 'airport' | 'train_station' | null;

interface TransportDetailsProps {
  transportType: TransportType;
  flightNumber: string;
  trainNumber: string;
  onFlightNumberChange: (value: string) => void;
  onTrainNumberChange: (value: string) => void;
}

// Convert LocationType from API to TransportType for this component
export function locationTypeToTransportType(locationType?: LocationType): TransportType {
  if (locationType === 'airport') return 'airport';
  if (locationType === 'train_station') return 'train_station';
  return null;
}

export default function TransportDetails({
  transportType,
  flightNumber,
  trainNumber,
  onFlightNumberChange,
  onTrainNumberChange,
}: TransportDetailsProps) {
  if (!transportType) return null;

  const isAirport = transportType === 'airport';

  return (
    <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        {isAirport ? (
          <Plane className="w-5 h-5 text-sage-dark flex-shrink-0" />
        ) : (
          <Train className="w-5 h-5 text-sage-dark flex-shrink-0" />
        )}
        <h3 className="text-sm font-semibold text-foreground">
          {isAirport ? 'Flight Details' : 'Train Details'}
        </h3>
      </div>

      <div className="space-y-3">
        {isAirport ? (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Flight Number (optional)
            </label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => onFlightNumberChange(e.target.value.toUpperCase())}
              placeholder="e.g. BA123"
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Train Number / Service (optional)
            </label>
            <input
              type="text"
              value={trainNumber}
              onChange={(e) => onTrainNumberChange(e.target.value)}
              placeholder="e.g. 1A23 or 14:30 from London"
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground"
            />
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-sage-dark/5 rounded-lg">
          <AlertCircle className="w-4 h-4 text-sage-dark flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {isAirport
              ? 'Your driver will monitor flight arrivals and adjust pickup time if your flight is delayed.'
              : 'Your driver will monitor train arrivals and adjust pickup time if your train is delayed.'}
          </p>
        </div>
      </div>
    </div>
  );
}
