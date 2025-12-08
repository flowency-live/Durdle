'use client';

import { Clock } from 'lucide-react';

interface DurationSelectorProps {
  duration: number;
  onChange: (hours: number) => void;
}

const DURATION_OPTIONS = [2, 3, 4, 5, 6];

export default function DurationSelector({ duration, onChange }: DurationSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        How long do you need the vehicle? *
      </label>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {DURATION_OPTIONS.map((hours) => (
          <button
            key={hours}
            type="button"
            onClick={() => onChange(hours)}
            className={`flex-shrink-0 flex items-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
              duration === hours
                ? 'border-sage-dark bg-sage-dark/10 text-sage-dark'
                : 'border-border bg-background text-foreground hover:border-sage-dark/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="font-medium">{hours} hours</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Select how many hours you need the vehicle and driver at your disposal
      </p>
    </div>
  );
}
