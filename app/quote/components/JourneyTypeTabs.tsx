'use client';

import { JourneyType } from '../lib/types';

interface JourneyTypeTabsProps {
  selected: JourneyType;
  onChange: (type: JourneyType) => void;
}

export default function JourneyTypeTabs({ selected, onChange }: JourneyTypeTabsProps) {
  // Determine if we're in "Journey Plan" mode (one-way or round-trip) vs hourly
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
    <div className="space-y-3">
      {/* Main Tabs: Journey Plan vs By the Hour */}
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
          Journey Plan
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

      {/* Sub-tabs: One Way vs Round Trip (only shown for Journey Plan) */}
      {isJourneyPlan && (
        <div className="flex gap-2 p-1 bg-sage-light/30 rounded-lg animate-fade-up">
          <button
            type="button"
            onClick={() => onChange('one-way')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              selected === 'one-way'
                ? 'bg-white text-sage-dark shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            One Way
          </button>
          <button
            type="button"
            onClick={() => onChange('round-trip')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              selected === 'round-trip'
                ? 'bg-white text-sage-dark shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Round Trip
          </button>
        </div>
      )}
    </div>
  );
}
