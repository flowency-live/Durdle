'use client';

import { JourneyType } from '../lib/types';

interface JourneyTypeTabsProps {
  selected: JourneyType;
  onChange: (type: JourneyType) => void;
}

export default function JourneyTypeTabs({ selected, onChange }: JourneyTypeTabsProps) {
  // Determine if we're in "Transfer" mode (one-way or round-trip) vs hourly
  const isJourneyPlan = selected === 'one-way' || selected === 'round-trip';
  const isHourly = selected === 'hourly';

  const handleMainTabChange = (mode: 'journey-plan' | 'hourly') => {
    if (mode === 'hourly') {
      onChange('hourly');
    } else {
      // Default to one-way when switching to journey plan
      if (selected === 'hourly') {
        onChange('one-way');
      }
    }
  };

  return (
    <div>
      {/* Main Tabs: Transfer vs By the Hour */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          type="button"
          onClick={() => handleMainTabChange('journey-plan')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
            isJourneyPlan
              ? 'bg-sage-dark text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Transfer
        </button>
        <button
          type="button"
          onClick={() => handleMainTabChange('hourly')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
            isHourly
              ? 'bg-sage-dark text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          By the Hour
        </button>
      </div>
    </div>
  );
}

// Separate component for One Way / Return toggle - used in location card
interface JourneyDirectionToggleProps {
  selected: JourneyType;
  onChange: (type: JourneyType) => void;
}

export function JourneyDirectionToggle({ selected, onChange }: JourneyDirectionToggleProps) {
  const isJourneyPlan = selected === 'one-way' || selected === 'round-trip';

  if (!isJourneyPlan) return null;

  return (
    <div className="flex gap-6">
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected === 'one-way'
            ? 'border-sage-dark bg-sage-dark'
            : 'border-border group-hover:border-sage-dark/50'
        }`}>
          {selected === 'one-way' && <div className="w-2 h-2 bg-white rounded-full" />}
        </div>
        <span className="text-sm font-medium text-foreground">One Way</span>
        <input
          type="radio"
          name="journeyDirection"
          checked={selected === 'one-way'}
          onChange={() => onChange('one-way')}
          className="sr-only"
        />
      </label>
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected === 'round-trip'
            ? 'border-sage-dark bg-sage-dark'
            : 'border-border group-hover:border-sage-dark/50'
        }`}>
          {selected === 'round-trip' && <div className="w-2 h-2 bg-white rounded-full" />}
        </div>
        <span className="text-sm font-medium text-foreground">Return</span>
        <input
          type="radio"
          name="journeyDirection"
          checked={selected === 'round-trip'}
          onChange={() => onChange('round-trip')}
          className="sr-only"
        />
      </label>
    </div>
  );
}
