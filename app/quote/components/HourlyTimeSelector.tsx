'use client';

import { Clock, AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface HourlyTimeSelectorProps {
  startTime: Date | null;
  endTime: Date | null;
  onStartTimeChange: (date: Date) => void;
  onEndTimeChange: (date: Date) => void;
  calculatedHours: number;
}

const MIN_HOURS = 5;

export default function HourlyTimeSelector({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  calculatedHours,
}: HourlyTimeSelectorProps) {
  const startInputRef = useRef<DatePicker>(null);
  const endInputRef = useRef<DatePicker>(null);

  // Default minimum is 24 hours from now for start time
  const minStartTime = new Date();
  minStartTime.setHours(minStartTime.getHours() + 24);

  // Calculate minimum end time (start time + 5 hours)
  const minEndTime = startTime ? new Date(startTime.getTime() + MIN_HOURS * 60 * 60 * 1000) : null;

  // Max booking 6 months out
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);

  // Set inputMode to none on mount to prevent Android keyboard
  useEffect(() => {
    [startInputRef, endInputRef].forEach(ref => {
      if (ref.current) {
        const input = (ref.current as unknown as { input: HTMLInputElement }).input;
        if (input) {
          input.setAttribute('inputmode', 'none');
        }
      }
    });
  }, []);

  // Filter out times less than 24 hours from now for start time
  const filterStartTime = (time: Date) => {
    const now = new Date();
    const minDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return time.getTime() >= minDateTime.getTime();
  };

  // Filter end times to be at least 5 hours after start
  const filterEndTime = (time: Date) => {
    if (!startTime) return true;
    const minEnd = new Date(startTime.getTime() + MIN_HOURS * 60 * 60 * 1000);
    return time.getTime() >= minEnd.getTime();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.blur();
    e.target.setAttribute('inputmode', 'none');
  };

  const isUnderMinimum = calculatedHours > 0 && calculatedHours < MIN_HOURS;

  return (
    <div className="space-y-4">
      {/* Start Time */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Start Time *
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <DatePicker
            ref={startInputRef}
            selected={startTime}
            onChange={(date) => date && onStartTimeChange(date)}
            showTimeSelect
            timeIntervals={30}
            timeCaption="Time"
            dateFormat="MMMM d, yyyy h:mm aa"
            minDate={minStartTime}
            maxDate={maxDate}
            filterTime={filterStartTime}
            placeholderText="Select start date & time"
            onFocus={handleFocus}
            autoComplete="off"
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer"
            wrapperClassName="w-full"
            calendarClassName="shadow-2xl"
            withPortal
            portalId="date-picker-portal"
          />
        </div>
      </div>

      {/* End Time */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          End Time *
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <DatePicker
            ref={endInputRef}
            selected={endTime}
            onChange={(date) => date && onEndTimeChange(date)}
            showTimeSelect
            timeIntervals={30}
            timeCaption="Time"
            dateFormat="MMMM d, yyyy h:mm aa"
            minDate={minEndTime || minStartTime}
            maxDate={maxDate}
            filterTime={filterEndTime}
            placeholderText={startTime ? "Select end date & time" : "Select start time first"}
            onFocus={handleFocus}
            autoComplete="off"
            disabled={!startTime}
            className={`w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer ${
              !startTime ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            wrapperClassName="w-full"
            calendarClassName="shadow-2xl"
            withPortal
            portalId="date-picker-portal"
          />
        </div>
      </div>

      {/* Calculated Duration Display */}
      {startTime && endTime && (
        <div className={`p-4 rounded-xl ${isUnderMinimum ? 'bg-error/10 border border-error/20' : 'bg-sage-dark/10 border border-sage-dark/20'}`}>
          <div className="flex items-center gap-2">
            {isUnderMinimum ? (
              <AlertCircle className="w-5 h-5 text-error" />
            ) : (
              <Clock className="w-5 h-5 text-sage-dark" />
            )}
            <span className={`font-semibold ${isUnderMinimum ? 'text-error' : 'text-sage-dark'}`}>
              {calculatedHours} hour{calculatedHours !== 1 ? 's' : ''} booking
            </span>
          </div>
          {isUnderMinimum && (
            <p className="text-sm text-error mt-1">
              Minimum booking is {MIN_HOURS} hours
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Minimum booking: {MIN_HOURS} hours. Partial hours are rounded up.
      </p>
    </div>
  );
}

// Helper function to calculate hours from start to end, rounding up
export function calculateHourlyDuration(startTime: Date | null, endTime: Date | null): number {
  if (!startTime || !endTime) return 0;
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  // Round up to nearest hour
  return Math.ceil(diffHours);
}
