'use client';

import { Baby, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

export interface Extras {
  babySeats: number;
  childSeats: number;
}

interface OptionalExtrasProps {
  extras: Extras;
  onChange: (extras: Extras) => void;
  maxSeats?: number;
}

export default function OptionalExtras({ extras, onChange, maxSeats = 4 }: OptionalExtrasProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasExtras = extras.babySeats > 0 || extras.childSeats > 0;

  const handleBabySeatsChange = (delta: number) => {
    const newValue = Math.max(0, Math.min(maxSeats, extras.babySeats + delta));
    onChange({ ...extras, babySeats: newValue });
  };

  const handleChildSeatsChange = (delta: number) => {
    const newValue = Math.max(0, Math.min(maxSeats, extras.childSeats + delta));
    onChange({ ...extras, childSeats: newValue });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header - Click to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-background hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Baby className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-foreground">Optional Extras</span>
          {hasExtras && (
            <span className="text-xs px-2 py-0.5 bg-sage-dark/10 text-sage-dark rounded-full">
              {extras.babySeats + extras.childSeats} selected
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/30">
          {/* Baby Seat */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Baby Seat</p>
              <p className="text-xs text-muted-foreground">For children ages 0-4</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleBabySeatsChange(-1)}
                disabled={extras.babySeats === 0}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease baby seats"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold text-lg">{extras.babySeats}</span>
              <button
                type="button"
                onClick={() => handleBabySeatsChange(1)}
                disabled={extras.babySeats >= maxSeats}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase baby seats"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Child Seat */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Child Seat</p>
              <p className="text-xs text-muted-foreground">For children ages 5-12</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChildSeatsChange(-1)}
                disabled={extras.childSeats === 0}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease child seats"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold text-lg">{extras.childSeats}</span>
              <button
                type="button"
                onClick={() => handleChildSeatsChange(1)}
                disabled={extras.childSeats >= maxSeats}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase child seats"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            Child seats are provided free of charge
          </p>
        </div>
      )}
    </div>
  );
}
