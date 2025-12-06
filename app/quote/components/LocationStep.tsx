'use client';

import { useState } from 'react';
import { MapPin, Plus, ChevronUp } from 'lucide-react';
import { Location, Waypoint } from '../lib/types';
import LocationInput from './LocationInput';
import WaypointInput from './WaypointInput';
import { Button } from '@/components/ui/button';

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

export default function LocationStep({
  pickup,
  dropoff,
  waypoints,
  onPickupChange,
  onDropoffChange,
  onWaypointsChange,
  errors = {}
}: LocationStepProps) {
  const [showWaypoints, setShowWaypoints] = useState(waypoints.length > 0);

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
      setShowWaypoints(true);
    }
  };

  const removeWaypoint = (index: number) => {
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    onWaypointsChange(newWaypoints);
    if (newWaypoints.length === 0) {
      setShowWaypoints(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pickup Location - Always visible */}
      <div className="bg-card rounded-2xl p-6 shadow-mobile border-2 border-sage-light">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-sage-dark/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-sage-dark" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Pickup Location</h3>
        </div>
        <LocationInput
          label="Where are you being picked up?"
          value={pickup?.address || ''}
          onSelect={handlePickupSelect}
          placeholder="Enter pickup address"
          error={errors.pickup}
          autoFocus={true}
        />
      </div>

      {/* Progressive Disclosure - Show dropoff after pickup is selected */}
      {pickup && (
        <>
          {/* Connection Line */}
          <div className="flex items-center justify-center">
            <div className="h-8 w-0.5 bg-sage-light"></div>
          </div>

          {/* Dropoff Location */}
          <div className="bg-card rounded-2xl p-6 shadow-mobile border-2 border-sage-light animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-navy-dark/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-navy-dark" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Dropoff Location</h3>
            </div>
            <LocationInput
              label="Where are you going?"
              value={dropoff?.address || ''}
              onSelect={handleDropoffSelect}
              placeholder="Enter destination address"
              error={errors.dropoff}
            />
          </div>
        </>
      )}

      {/* Waypoints Section - Collapsible, only shown after pickup selected */}
      {pickup && (
        <>
          {/* Connection Line */}
          {(showWaypoints || waypoints.length > 0) && (
            <div className="flex items-center justify-center">
              <div className="h-8 w-0.5 bg-sage-light"></div>
            </div>
          )}

          {/* Add Waypoints Toggle/Button */}
          {!showWaypoints && waypoints.length === 0 ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowWaypoints(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-sage-dark hover:text-sage-dark/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add stops along the way (optional)
              </button>
            </div>
          ) : null}

          {/* Waypoints Manager */}
          {showWaypoints && (
            <div className="bg-card rounded-2xl p-6 shadow-mobile border-2 border-sage-light/50 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-sage-dark" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Stops {waypoints.length > 0 && `(${waypoints.length})`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWaypoints(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Collapse waypoints"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {waypoints.map((waypoint, index) => (
                  <WaypointInput
                    key={index}
                    index={index}
                    waypoint={waypoint}
                    onChange={(updatedWaypoint) => handleWaypointChange(index, updatedWaypoint)}
                    onRemove={() => removeWaypoint(index)}
                  />
                ))}

                {waypoints.length < 3 && (
                  <Button
                    type="button"
                    variant="hero-outline"
                    onClick={addWaypoint}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Stop
                  </Button>
                )}

                {waypoints.length === 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Maximum 3 stops allowed
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
