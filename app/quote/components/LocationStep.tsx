'use client';

import { Plus } from 'lucide-react';

import { JourneyType, Location, Waypoint } from '../lib/types';

import DurationSelector from './DurationSelector';
import JourneyTypeTabs from './JourneyTypeTabs';
import LocationInput from './LocationInput';
import WaypointInput from './WaypointInput';

interface LocationStepProps {
  pickup: Location | null;
  dropoff: Location | null;
  waypoints: Waypoint[];
  onPickupChange: (location: Location) => void;
  onDropoffChange: (location: Location) => void;
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  journeyType: JourneyType;
  onJourneyTypeChange: (type: JourneyType) => void;
  duration: number;
  onDurationChange: (hours: number) => void;
  errors?: {
    pickup?: string;
    dropoff?: string;
  };
}

export default function LocationStep({
  pickup,
  dropoff,
  waypoints,
  onPickupChange,
  onDropoffChange,
  onWaypointsChange,
  journeyType,
  onJourneyTypeChange,
  duration,
  onDurationChange,
  errors = {}
}: LocationStepProps) {
  const isHourly = journeyType === 'hourly';
  const handlePickupSelect = (address: string, placeId: string, locationType?: unknown, lat?: number, lng?: number) => {
    onPickupChange({ address, placeId, lat, lng });
  };

  const handleDropoffSelect = (address: string, placeId: string, locationType?: unknown, lat?: number, lng?: number) => {
    onDropoffChange({ address, placeId, lat, lng });
  };

  const handleWaypointChange = (index: number, waypoint: Waypoint) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = waypoint;
    onWaypointsChange(newWaypoints);
  };

  const addWaypoint = () => {
    if (waypoints.length < 3) {
      onWaypointsChange([...waypoints, { address: '', placeId: '' }]);
    }
  };

  const removeWaypoint = (index: number) => {
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    onWaypointsChange(newWaypoints);
  };

  return (
    <div className="space-y-4">
      {/* Journey Type Tabs */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
        <JourneyTypeTabs
          selected={journeyType}
          onChange={onJourneyTypeChange}
        />
      </div>

      {/* Single Condensed Card */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">

        {/* Card Header */}
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            {isHourly ? 'Where should we pick you up?' : 'Plan your trip'}
          </h3>
        </div>

        {/* Location Fields with Progressive Disclosure */}
        <div className="space-y-0">

          {/* Start Location - Always Visible */}
          <div className="py-2">
            <LocationInput
              value={pickup?.address || ''}
              onSelect={handlePickupSelect}
              placeholder={isHourly ? 'Pickup Location' : 'Start Location'}
              error={errors.pickup}
              hideCurrentLocation={!!(pickup && dropoff)}
            />
          </div>

          {/* One-way mode: Show dropoff and waypoints */}
          {!isHourly && (
            <>
              {/* Divider */}
              {pickup && <div className="border-b border-border my-2"></div>}

              {/* Waypoints - Shown after pickup selected, before destination */}
              {pickup && waypoints.length > 0 && (
                <>
                  <div className="space-y-3 py-2">
                    {waypoints.map((waypoint, index) => (
                      <WaypointInput
                        key={index}
                        index={index}
                        waypoint={waypoint}
                        onChange={(updatedWaypoint) => handleWaypointChange(index, updatedWaypoint)}
                        onRemove={() => removeWaypoint(index)}
                      />
                    ))}
                  </div>
                  <div className="border-b border-border my-2"></div>
                </>
              )}

              {/* Destination - Shown after pickup selected */}
              {pickup && (
                <div className="py-2 animate-fade-up">
                  <LocationInput
                    value={dropoff?.address || ''}
                    onSelect={handleDropoffSelect}
                    placeholder="Where to?"
                    error={errors.dropoff}
                    hideCurrentLocation={!!(pickup && dropoff)}
                  />
                </div>
              )}
            </>
          )}

        </div>

        {/* Add Waypoint Button - Only shown for one-way after both locations selected */}
        {!isHourly && pickup && dropoff && waypoints.length < 3 && (
          <>
            {waypoints.length > 0 && <div className="border-b border-border my-2"></div>}
            <button
              type="button"
              onClick={addWaypoint}
              className="mt-2 flex items-center gap-2 text-sm text-sage-accessible hover:text-sage-accessible/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add waypoints along the way
            </button>
          </>
        )}

        {!isHourly && waypoints.length === 3 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Maximum 3 waypoints allowed
          </p>
        )}

      </div>

      {/* Duration Selector - Only for hourly journeys */}
      {isHourly && pickup && (
        <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light animate-fade-up">
          <DurationSelector
            duration={duration}
            onChange={onDurationChange}
          />
        </div>
      )}
    </div>
  );
}
