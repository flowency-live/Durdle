'use client';

import { Plus } from 'lucide-react';

import DurationSelector from '../../quote/components/DurationSelector';
import JourneyTypeTabs from '../../quote/components/JourneyTypeTabs';
import LocationInput from '../../quote/components/LocationInput';
import LuggageCounter from '../../quote/components/LuggageCounter';
import MapPreview from '../../quote/components/MapPreview';
import OptionalExtras from '../../quote/components/OptionalExtras';
import PassengerCounter from '../../quote/components/PassengerCounter';
import WaypointInput from '../../quote/components/WaypointInput';
import { Extras, JourneyType, Location, Waypoint } from '../../quote/lib/types';

import DateTimePickerMobile from './DateTimePickerMobile';

interface AllInputsStepProps {
  pickup: Location | null;
  dropoff: Location | null;
  waypoints: Waypoint[];
  pickupDate: Date | null;
  passengers: number;
  luggage: number;
  journeyType: JourneyType;
  duration: number;
  extras: Extras;
  onPickupChange: (location: Location) => void;
  onDropoffChange: (location: Location) => void;
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  onDateChange: (date: Date) => void;
  onPassengersChange: (count: number) => void;
  onLuggageChange: (count: number) => void;
  onJourneyTypeChange: (type: JourneyType) => void;
  onDurationChange: (hours: number) => void;
  onExtrasChange: (extras: Extras) => void;
}

export default function AllInputsStep({
  pickup,
  dropoff,
  waypoints,
  pickupDate,
  passengers,
  luggage,
  journeyType,
  duration,
  extras,
  onPickupChange,
  onDropoffChange,
  onWaypointsChange,
  onDateChange,
  onPassengersChange,
  onLuggageChange,
  onJourneyTypeChange,
  onDurationChange,
  onExtrasChange,
}: AllInputsStepProps) {
  const isHourly = journeyType === 'hourly';

  const handlePickupSelect = (address: string, placeId: string) => {
    onPickupChange({ address, placeId });
  };

  const handleDropoffSelect = (address: string, placeId: string) => {
    onDropoffChange({ address, placeId });
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

      {/* Map Preview - Shows when locations are selected (one-way only) */}
      {!isHourly && pickup && dropoff && (
        <div className="animate-fade-up">
          <MapPreview
            pickup={pickup}
            dropoff={dropoff}
            waypoints={waypoints}
            pickupTime={pickupDate}
          />
        </div>
      )}

      {/* Locations Card */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            {isHourly ? 'Where should we pick you up?' : 'Where are you going?'}
          </h3>
        </div>

        <div className="space-y-0">
          {/* Pickup Location */}
          <div className="py-2">
            <LocationInput
              value={pickup?.address || ''}
              onSelect={handlePickupSelect}
              placeholder={isHourly ? 'Pickup location' : 'Pickup location'}
              hideCurrentLocation={!!(pickup && dropoff)}
            />
          </div>

          {/* One-way mode: Show dropoff and waypoints */}
          {!isHourly && (
            <>
              {pickup && <div className="border-b border-border my-2"></div>}

              {/* Waypoints */}
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

              {/* Dropoff Location */}
              {pickup && (
                <div className="py-2 animate-fade-up">
                  <LocationInput
                    value={dropoff?.address || ''}
                    onSelect={handleDropoffSelect}
                    placeholder="Drop-off location"
                    hideCurrentLocation={!!(pickup && dropoff)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Waypoint Button - One-way only */}
        {!isHourly && pickup && dropoff && waypoints.length < 3 && (
          <>
            {waypoints.length > 0 && <div className="border-b border-border my-2"></div>}
            <button
              type="button"
              onClick={addWaypoint}
              className="mt-2 flex items-center gap-2 text-sm text-sage-dark hover:text-sage-dark/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add a stop along the way
            </button>
          </>
        )}

        {!isHourly && waypoints.length === 3 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Maximum 3 stops allowed
          </p>
        )}
      </div>

      {/* Duration Selector - Hourly only */}
      {isHourly && pickup && (
        <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light animate-fade-up">
          <DurationSelector
            duration={duration}
            onChange={onDurationChange}
          />
        </div>
      )}

      {/* Date & Time Card */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">When do you need pickup?</h3>
        </div>
        <DateTimePickerMobile
          selectedDate={pickupDate}
          onChange={onDateChange}
        />
      </div>

      {/* Passengers & Luggage Card */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light space-y-6">
        <PassengerCounter
          count={passengers}
          onChange={onPassengersChange}
        />

        <div className="border-t border-border pt-6">
          <LuggageCounter
            count={luggage}
            onChange={onLuggageChange}
          />
        </div>
      </div>

      {/* Optional Extras */}
      <OptionalExtras
        extras={extras}
        onChange={onExtrasChange}
        maxSeats={passengers}
      />
    </div>
  );
}
