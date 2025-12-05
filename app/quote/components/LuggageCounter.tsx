'use client';

import { Minus, Plus, Luggage } from 'lucide-react';

interface LuggageCounterProps {
  count: number;
  onChange: (count: number) => void;
  min?: number;
  max?: number;
  error?: string;
}

export default function LuggageCounter({
  count,
  onChange,
  min = 0,
  max = 10,
  error
}: LuggageCounterProps) {
  const handleDecrement = () => {
    if (count > min) {
      onChange(count - 1);
    }
  };

  const handleIncrement = () => {
    if (count < max) {
      onChange(count + 1);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Large Bags
      </label>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={count <= min}
          className="w-12 h-12 rounded-xl border-2 border-border flex items-center justify-center hover:border-sage-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-xl border-2 border-sage-dark bg-sage-dark/5">
          <Luggage className="w-5 h-5 text-sage-dark" />
          <span className="text-2xl font-semibold text-foreground">
            {count}
          </span>
          <span className="text-sm text-muted-foreground">
            {count === 1 ? 'bag' : 'bags'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={count >= max}
          className="w-12 h-12 rounded-xl border-2 border-border flex items-center justify-center hover:border-sage-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Maximum {max} large bags
      </p>
    </div>
  );
}
