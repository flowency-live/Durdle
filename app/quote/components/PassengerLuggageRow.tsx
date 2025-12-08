'use client';

import { Minus, Plus, Users, Luggage } from 'lucide-react';

interface PassengerLuggageRowProps {
  passengers: number;
  luggage: number;
  onPassengersChange: (count: number) => void;
  onLuggageChange: (count: number) => void;
  maxPassengers?: number;
  maxLuggage?: number;
}

export default function PassengerLuggageRow({
  passengers,
  luggage,
  onPassengersChange,
  onLuggageChange,
  maxPassengers = 8,
  maxLuggage = 10,
}: PassengerLuggageRowProps) {
  return (
    <div className="flex gap-3">
      {/* Passengers */}
      <div className="flex-1">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Passengers
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => passengers > 1 && onPassengersChange(passengers - 1)}
            disabled={passengers <= 1}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:border-sage-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-sage-dark bg-sage-dark/5">
            <Users className="w-4 h-4 text-sage-dark" />
            <span className="text-lg font-semibold text-foreground">{passengers}</span>
          </div>

          <button
            type="button"
            onClick={() => passengers < maxPassengers && onPassengersChange(passengers + 1)}
            disabled={passengers >= maxPassengers}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:border-sage-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Luggage */}
      <div className="flex-1">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Large Bags
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => luggage > 0 && onLuggageChange(luggage - 1)}
            disabled={luggage <= 0}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:border-sage-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-sage-dark bg-sage-dark/5">
            <Luggage className="w-4 h-4 text-sage-dark" />
            <span className="text-lg font-semibold text-foreground">{luggage}</span>
          </div>

          <button
            type="button"
            onClick={() => luggage < maxLuggage && onLuggageChange(luggage + 1)}
            disabled={luggage >= maxLuggage}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:border-sage-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
