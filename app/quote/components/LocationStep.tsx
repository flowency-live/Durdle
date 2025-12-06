'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Location, Waypoint } from '../lib/types';
import LocationField from './LocationField';
import LocationSearchView from './LocationSearchView';

interface LocationStepProps {
  pickup: Location | null;
  dropoff: Location | null;
  waypoints: Waypoint[];
  onPickupChange: (location: Location) => void;
  onDropoffChange: (location: Location) => void;
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  errors?: {
    pickup?: string;
    dropoff?: string;
  };
}

interface ActiveField {
  type: 'pickup' | 'destination' | 'waypoint';
  index?: number;
}

export default function LocationStep({
  pickup,
  dropoff,
  waypoints,
  onPickupChange,
  onDropoffChange,
  onWaypointsChange,
  errors = {}
}: LocationStepProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  const openSearch = (type: 'pickup' | 'destination' | 'waypoint', index?: number) => {
    setActiveField({ type, index });
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setActiveField(null);
  };

  const handleSearchSelect = (location: Location) => {
    if (!activeField) return;

    if (activeField.type === 'pickup') {
      onPickupChange(location);

      // Auto-focus destination if empty
      if (!dropoff) {
        setTimeout(() => {
          openSearch('destination');
        }, 300);
      } else {
        closeSearch();
      }
    } else if (activeField.type === 'destination') {
      onDropoffChange(location);
      closeSearch();
    } else if (activeField.type === 'waypoint' && activeField.index !== undefined) {
      const updatedWaypoints = [...waypoints];
      updatedWaypoints[activeField.index] = {
        address: location.address,
        placeId: location.placeId,
        waitTime: waypoints[activeField.index]?.waitTime
      };
      onWaypointsChange(updatedWaypoints);
      closeSearch();
    }
  };

  const addWaypoint = () => {
    const newWaypoints = [...waypoints, { address: '', placeId: '', waitTime: 0 }];
    onWaypointsChange(newWaypoints);

    // Auto-open search for new waypoint
    setTimeout(() => {
      openSearch('waypoint', waypoints.length);
    }, 100);
  };

  const removeWaypoint = (index: number) => {
    const updatedWaypoints = waypoints.filter((_, i) => i !== index);
    onWaypointsChange(updatedWaypoints);
  };

  const handleUseCurrentLocationForField = async () => {
    // Trigger the search view's current location handler
    // This is handled within LocationSearchView
  };

  // Count total fields to determine isLast
  const totalFields = 2 + waypoints.length; // pickup + destination + waypoints

  return (
    <>
      {/* Single Condensed Card */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">

        {/* Card Header */}
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">Plan your trip</h3>
        </div>

        {/* Location Fields Stack */}
        <div className="space-y-0">

          {/* Pickup Field */}
          <LocationField
            type="pickup"
            value={pickup}
            placeholder="Pickup location"
            onFocus={() => openSearch('pickup')}
            showCurrentLocationButton={false}
            isLast={false}
          />

          {/* Waypoints (inserted between pickup and destination) */}
          {waypoints.map((waypoint, idx) => (
            <LocationField
              key={idx}
              type="waypoint"
              value={waypoint.address ? { address: waypoint.address, placeId: waypoint.placeId } : null}
              placeholder={`Waypoint ${idx + 1}`}
              onFocus={() => openSearch('waypoint', idx)}
              icon={idx + 1}
              onRemove={() => removeWaypoint(idx)}
              isLast={false}
            />
          ))}

          {/* Destination Field */}
          <LocationField
            type="destination"
            value={dropoff}
            placeholder="Where to?"
            onFocus={() => openSearch('destination')}
            showCurrentLocationButton={false}
            isLast={true}
          />

        </div>

        {/* Add Waypoint Button */}
        {waypoints.length < 3 && (
          <button
            type="button"
            onClick={addWaypoint}
            className="mt-3 flex items-center gap-2 text-sm text-sage-dark hover:text-sage-dark/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {waypoints.length === 0 ? 'Add waypoints along the way' : 'Add another stop'}
          </button>
        )}

        {waypoints.length === 3 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Maximum 3 waypoints allowed
          </p>
        )}

      </div>

      {/* Error Messages */}
      {(errors.pickup || errors.dropoff) && (
        <div className="mt-3 space-y-2">
          {errors.pickup && (
            <p className="text-sm text-error">{errors.pickup}</p>
          )}
          {errors.dropoff && (
            <p className="text-sm text-error">{errors.dropoff}</p>
          )}
        </div>
      )}

      {/* Full-Screen Search Modal */}
      {searchOpen && activeField && (
        <LocationSearchView
          activeFieldType={activeField.type}
          activeFieldIndex={activeField.index}
          initialValue={
            activeField.type === 'pickup'
              ? pickup?.address || ''
              : activeField.type === 'destination'
              ? dropoff?.address || ''
              : waypoints[activeField.index!]?.address || ''
          }
          onSelect={handleSearchSelect}
          onClose={closeSearch}
        />
      )}
    </>
  );
}
