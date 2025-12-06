'use client';

import { useState } from 'react';
import { MapPin, Clock, HelpCircle, X } from 'lucide-react';
import LocationInput from './LocationInput';
import { Waypoint } from '../lib/types';

interface WaypointInputProps {
  index: number;
  waypoint: Waypoint;
  onChange: (waypoint: Waypoint) => void;
  onRemove: () => void;
}

export default function WaypointInput({ index, waypoint, onChange, onRemove }: WaypointInputProps) {
  const [showWaitTime, setShowWaitTime] = useState(!!waypoint.waitTime);
  const [showHelp, setShowHelp] = useState(false);

  const handleLocationSelect = (address: string, placeId: string) => {
    onChange({ ...waypoint, address, placeId });
  };

  const handleWaitTimeChange = (minutes: number) => {
    onChange({ ...waypoint, waitTime: minutes > 0 ? minutes : undefined });
  };

  const toggleWaitTime = () => {
    if (showWaitTime) {
      onChange({ ...waypoint, waitTime: undefined });
      setShowWaitTime(false);
    } else {
      setShowWaitTime(true);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-sage-light/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-sage/30 flex items-center justify-center text-xs font-semibold text-sage-dark">
            {index + 1}
          </div>
          <span className="text-sm font-medium text-foreground">Stop {index + 1}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-error hover:text-error/80 transition-colors p-1"
          aria-label="Remove stop"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Location Input */}
      <LocationInput
        label="Location"
        value={waypoint.address}
        onSelect={handleLocationSelect}
        placeholder="Enter stop address"
      />

      {/* Wait Time Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleWaitTime}
            className="text-sm text-sage-dark hover:text-sage-dark/80 transition-colors flex items-center gap-1"
          >
            <Clock className="w-4 h-4" />
            {showWaitTime ? 'Remove wait time' : 'Add wait time'}
          </button>

          {/* Help Icon with Popup */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Wait time help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Help Popup */}
            {showHelp && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowHelp(false)}
                />
                {/* Popup */}
                <div className="absolute right-0 top-8 z-50 w-64 bg-card border-2 border-sage-light rounded-xl shadow-floating p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Clock className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
                    <h4 className="font-semibold text-foreground text-sm">Wait Time</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add a wait time if the driver needs to wait at this stop before continuing.
                  </p>
                  <div className="bg-sage-light/30 rounded-lg p-2 text-xs text-navy-light">
                    <strong>Example:</strong> Drop Kevin off, wait 2 hours, then continue to final destination.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHelp(false)}
                    className="mt-3 text-xs text-sage-dark hover:underline"
                  >
                    Got it
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Wait Time Input */}
        {showWaitTime && (
          <div className="animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Wait Time (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="480"
                  step="15"
                  value={waypoint.waitTime || 0}
                  onChange={(e) => handleWaitTimeChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground"
                  placeholder="0"
                />
              </div>
              <div className="text-xs text-muted-foreground pt-5">
                {waypoint.waitTime ? `${Math.floor(waypoint.waitTime / 60)}h ${waypoint.waitTime % 60}m` : '0h 0m'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum 8 hours (480 minutes)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
