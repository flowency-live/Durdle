'use client';

import { Plus } from 'lucide-react';

import LocationInput from '../../quote/components/LocationInput';
import LuggageCounter from '../../quote/components/LuggageCounter';
import MapPreview from '../../quote/components/MapPreview';
import PassengerCounter from '../../quote/components/PassengerCounter';
import WaypointInput from '../../quote/components/WaypointInput';
import { Location, Waypoint } from '../../quote/lib/types';

import DateTimePickerMobile from './DateTimePickerMobile';

interface AllInputsStepProps {
  pickup: Location | null;
  dropoff: Location | null;
  waypoints: Waypoint[];
  pickupDate: Date | null;
  passengers: number;
  luggage: number;
  onPickupChange: (location: Location) => void;
  onDropoffChange: (location: Location) => void;
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  onDateChange: (date: Date) => void;
  onPassengersChange: (count: number) => void;
  onLuggageChange: (count: number) => void;
}

export default function AllInputsStep({
  pickup,
  dropoff,
  waypoints,
  pickupDate,
  passengers,
  luggage,
  onPickupChange,
  onDropoffChange,
  onWaypointsChange,
  onDateChange,
  onPassengersChange,
  onLuggageChange,
}: AllInputsStepProps) {
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
      {/* Map Preview - Shows when locations are selected */}
      {pickup && dropoff && (
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
          <h3 className="text-sm font-semibold text-foreground">Where are you going?</h3>
        </div>

        <div className="space-y-0">
          {/* Pickup Location */}
          <div className="py-2">
            <LocationInput
              value={pickup?.address || ''}
              onSelect={handlePickupSelect}
              placeholder="Pickup location"
              hideCurrentLocation={!!(pickup && dropoff)}
            />
          </div>

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
        </div>

        {/* Add Waypoint Button */}
        {pickup && dropoff && waypoints.length < 3 && (
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

        {waypoints.length === 3 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Maximum 3 stops allowed
          </p>
        )}
      </div>

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
    </div>
  );
}
