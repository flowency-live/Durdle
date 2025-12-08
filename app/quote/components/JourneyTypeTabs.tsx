'use client';

import { useState } from 'react';

import { JourneyType } from '../lib/types';

interface JourneyTypeTabsProps {
  selected: JourneyType;
  onChange: (type: JourneyType) => void;
}

export default function JourneyTypeTabs({ selected, onChange }: JourneyTypeTabsProps) {
  // Track if user has explicitly clicked Journey Plan to show sub-tabs
  const [showSubTabs, setShowSubTabs] = useState(false);

  // Determine if we're in "Journey Plan" mode (one-way or round-trip) vs hourly
  const isJourneyPlan = selected === 'one-way' || selected === 'round-trip';
  const isHourly = selected === 'hourly';

  const handleMainTabChange = (mode: 'journey-plan' | 'hourly') => {
    if (mode === 'hourly') {
      onChange('hourly');
      setShowSubTabs(false);
    } else {
      // Show sub-tabs when user clicks Journey Plan
      setShowSubTabs(true);
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

      {/* Radio buttons: One Way vs Round Trip (only shown after clicking Journey Plan) */}
      {isJourneyPlan && showSubTabs && (
        <div className="flex gap-4 px-1 animate-fade-up">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="journeyDirection"
              checked={selected === 'one-way'}
              onChange={() => onChange('one-way')}
              className="w-4 h-4 text-sage-dark border-border focus:ring-sage-dark focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-foreground">One Way</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="journeyDirection"
              checked={selected === 'round-trip'}
              onChange={() => onChange('round-trip')}
              className="w-4 h-4 text-sage-dark border-border focus:ring-sage-dark focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-foreground">Round Trip</span>
          </label>
        </div>
      )}
    </div>
  );
}
