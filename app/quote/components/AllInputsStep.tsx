'use client';

import { Plus } from 'lucide-react';
import { useRef, useCallback } from 'react';

import JourneyTypeTabs, { JourneyDirectionToggle } from './JourneyTypeTabs';
import LocationInput from './LocationInput';
import MapPreview from './MapPreview';
import OptionalExtras from './OptionalExtras';
import PassengerLuggageRow from './PassengerLuggageRow';
import WaypointInput from './WaypointInput';
import { Extras, JourneyType, Location, LocationType, Waypoint } from '../lib/types';

import DateTimePickerMobile from './DateTimePickerMobile';
import HourlyTimeSelector, { calculateHourlyDuration } from './HourlyTimeSelector';
import TransportDetails, { locationTypeToTransportType } from './TransportDetails';

interface AllInputsStepProps {
  pickup: Location | null;
  dropoff: Location | null;
  waypoints: Waypoint[];
  pickupDate: Date | null;
  returnDate: Date | null;
  endTime: Date | null;
  passengers: number;
  luggage: number;
  journeyType: JourneyType;
  duration: number;
  extras: Extras;
  flightNumber: string;
  trainNumber: string;
  returnToPickup: boolean;
  onPickupChange: (location: Location) => void;
  onDropoffChange: (location: Location) => void;
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  onDateChange: (date: Date) => void;
  onReturnDateChange: (date: Date) => void;
  onEndTimeChange: (date: Date) => void;
  onPassengersChange: (count: number) => void;
  onLuggageChange: (count: number) => void;
  onJourneyTypeChange: (type: JourneyType) => void;
  onDurationChange: (hours: number) => void;
  onExtrasChange: (extras: Extras) => void;
  onFlightNumberChange: (value: string) => void;
  onTrainNumberChange: (value: string) => void;
  onReturnToPickupChange: (value: boolean) => void;
  specialRequests: string;
  onSpecialRequestsChange: (value: string) => void;
}

export default function AllInputsStep({
  pickup,
  dropoff,
  waypoints,
  pickupDate,
  returnDate,
  endTime,
  passengers,
  luggage,
  journeyType,
  duration,
  extras,
  flightNumber,
  trainNumber,
  returnToPickup,
  onPickupChange,
  onDropoffChange,
  onWaypointsChange,
  onDateChange,
  onReturnDateChange,
  onEndTimeChange,
  onPassengersChange,
  onLuggageChange,
  onJourneyTypeChange,
  onDurationChange,
  onExtrasChange,
  onFlightNumberChange,
  onTrainNumberChange,
  onReturnToPickupChange,
  specialRequests,
  onSpecialRequestsChange,
}: AllInputsStepProps) {
  const isHourly = journeyType === 'hourly';
  const isRoundTrip = journeyType === 'round-trip';
  const isJourneyPlan = journeyType === 'one-way' || journeyType === 'round-trip';

  // Refs for focus management
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const dropoffInputRef = useRef<HTMLInputElement>(null);
  const datePickerSectionRef = useRef<HTMLDivElement>(null);

  const handlePickupSelect = (address: string, placeId: string, locationType?: LocationType, lat?: number, lng?: number) => {
    onPickupChange({ address, placeId, locationType, lat, lng });
  };

  const handleDropoffSelect = (address: string, placeId: string, locationType?: LocationType, lat?: number, lng?: number) => {
    onDropoffChange({ address, placeId, locationType, lat, lng });
  };

  // Focus management callbacks
  const focusDropoffInput = useCallback(() => {
    if (dropoffInputRef.current) {
      dropoffInputRef.current.focus();
    }
  }, []);

  const focusDateSection = useCallback(() => {
    if (datePickerSectionRef.current) {
      // Scroll the date section into view and focus first focusable element
      datePickerSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const firstFocusable = datePickerSectionRef.current.querySelector('input, select, button') as HTMLElement;
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 300); // Delay to allow scroll
      }
    }
  }, []);

  // Get transport type from pickup location
  const pickupTransportType = locationTypeToTransportType(pickup?.locationType);

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

      {/* Map Preview - Shows when locations are selected */}
      {/* Show for journey plan with both locations, or hourly with custom dropoff */}
      {((isJourneyPlan && pickup && dropoff) || (isHourly && pickup && !returnToPickup && dropoff)) && (
        <div className="animate-fade-up">
          <MapPreview
            pickup={pickup}
            dropoff={dropoff}
            waypoints={isHourly ? [] : waypoints}
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

        {/* One Way / Return toggle */}
        {isJourneyPlan && (
          <div className="mb-4">
            <JourneyDirectionToggle
              selected={journeyType}
              onChange={onJourneyTypeChange}
            />
          </div>
        )}

        <div className="space-y-0">
          {/* Pickup Location */}
          <div className="py-2">
            <LocationInput
              value={pickup?.address || ''}
              onSelect={handlePickupSelect}
              placeholder="Pickup location"
              hideCurrentLocation={!!(pickup && dropoff)}
              inputRef={pickupInputRef}
              onSelectionComplete={isJourneyPlan ? focusDropoffInput : undefined}
            />
          </div>

          {/* Hourly mode: Show return to pickup toggle and optional dropoff */}
          {isHourly && pickup && (
            <>
              <div className="border-b border-border my-2"></div>
              <div className="py-3 animate-fade-up">
                <button
                  type="button"
                  onClick={() => onReturnToPickupChange(!returnToPickup)}
                  className="w-full flex items-center justify-between gap-3 group"
                >
                  <span className="text-sm text-foreground">Return to pick-up location</span>
                  {/* Custom toggle switch */}
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      returnToPickup ? 'bg-sage-dark' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        returnToPickup ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>

                {/* Show dropoff input if not returning to pickup */}
                {!returnToPickup && (
                  <div className="mt-3 animate-fade-up">
                    <LocationInput
                      value={dropoff?.address || ''}
                      onSelect={handleDropoffSelect}
                      placeholder="Drop-off location"
                      hideCurrentLocation={!!(pickup && dropoff)}
                      inputRef={dropoffInputRef}
                      onSelectionComplete={focusDateSection}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Journey plan mode: Show dropoff and waypoints */}
          {isJourneyPlan && (
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
                    inputRef={dropoffInputRef}
                    onSelectionComplete={focusDateSection}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Waypoint Button - Journey plan only */}
        {isJourneyPlan && pickup && dropoff && waypoints.length < 3 && (
          <>
            {waypoints.length > 0 && <div className="border-b border-border my-2"></div>}
            <button
              type="button"
              onClick={addWaypoint}
              className="mt-2 flex items-center gap-2 text-sm text-sage-accessible hover:text-sage-accessible/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add a stop along the way
            </button>
          </>
        )}

        {isJourneyPlan && waypoints.length === 3 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Maximum 3 stops allowed
          </p>
        )}
      </div>

      {/* Date & Time Card - Transfer modes */}
      {!isHourly && (
        <div ref={datePickerSectionRef} className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {isRoundTrip ? 'Outbound Journey' : 'When do you need pickup?'}
            </h3>
          </div>
          <DateTimePickerMobile
            selectedDate={pickupDate}
            onChange={onDateChange}
            label="Pickup Date & Time"
          />

          {/* Return Date/Time - Round trip only */}
          {isRoundTrip && (
            <div className="mt-4 pt-4 border-t border-border animate-fade-up">
              <h3 className="text-sm font-semibold text-foreground mb-3">Return Journey</h3>
              <DateTimePickerMobile
                selectedDate={returnDate}
                onChange={onReturnDateChange}
                label="Return Date & Time"
                minDate={pickupDate || undefined}
              />
            </div>
          )}
        </div>
      )}

      {/* Transport Details - Airport/Train Station (after date picker) */}
      {!isHourly && pickupTransportType && (
        <TransportDetails
          transportType={pickupTransportType}
          flightNumber={flightNumber}
          trainNumber={trainNumber}
          onFlightNumberChange={onFlightNumberChange}
          onTrainNumberChange={onTrainNumberChange}
        />
      )}

      {/* Hourly Time Selection - Start & End Time */}
      {isHourly && pickup && (
        <div ref={datePickerSectionRef} className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light animate-fade-up">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">When do you need the vehicle?</h3>
          </div>
          <HourlyTimeSelector
            startTime={pickupDate}
            endTime={endTime}
            onStartTimeChange={(date) => {
              onDateChange(date);
              // Auto-calculate duration when times change
              if (endTime) {
                const hours = calculateHourlyDuration(date, endTime);
                onDurationChange(hours);
              }
            }}
            onEndTimeChange={(date) => {
              onEndTimeChange(date);
              // Auto-calculate duration when times change
              if (pickupDate) {
                const hours = calculateHourlyDuration(pickupDate, date);
                onDurationChange(hours);
              }
            }}
            calculatedHours={duration}
          />
        </div>
      )}

      {/* Passengers & Luggage Card - Compact Row */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
        <PassengerLuggageRow
          passengers={passengers}
          luggage={luggage}
          onPassengersChange={onPassengersChange}
          onLuggageChange={onLuggageChange}
        />
      </div>

      {/* Optional Extras */}
      <OptionalExtras
        extras={extras}
        onChange={onExtrasChange}
        maxSeats={passengers}
      />

      {/* Special Requests */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">Special Requests</h3>
          <p className="text-xs text-muted-foreground mt-1">Any additional requirements or notes</p>
        </div>
        <textarea
          value={specialRequests}
          onChange={(e) => onSpecialRequestsChange(e.target.value)}
          placeholder="e.g., wheelchair access, extra luggage, specific route..."
          className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-sm resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}
