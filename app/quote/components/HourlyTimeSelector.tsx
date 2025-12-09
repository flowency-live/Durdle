'use client';

import { Calendar, Clock, AlertCircle } from 'lucide-react';
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

// Generate hour options (1-12)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

// Generate minute options in 5-minute intervals
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

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
  const minStartDate = new Date();
  minStartDate.setHours(minStartDate.getHours() + 24);

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

  // Time extraction helpers
  const getHour12 = (date: Date | null) => {
    if (!date) return 12;
    const h = date.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };

  const getMinute = (date: Date | null) => {
    if (!date) return 0;
    return Math.floor(date.getMinutes() / 5) * 5;
  };

  const getAmPm = (date: Date | null): 'AM' | 'PM' => {
    if (!date) return 'AM';
    return date.getHours() >= 12 ? 'PM' : 'AM';
  };

  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      if (startTime) {
        date.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
      } else {
        date.setHours(9, 0, 0, 0);
      }
      onStartTimeChange(date);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      if (endTime) {
        date.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
      } else {
        date.setHours(14, 0, 0, 0);
      }
      onEndTimeChange(date);
    }
  };

  const handleStartTimeChange = (hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    const newDate = startTime ? new Date(startTime) : new Date(minStartDate);
    let hour24 = hour12;
    if (ampm === 'AM') {
      hour24 = hour12 === 12 ? 0 : hour12;
    } else {
      hour24 = hour12 === 12 ? 12 : hour12 + 12;
    }
    newDate.setHours(hour24, minute, 0, 0);
    onStartTimeChange(newDate);
  };

  const handleEndTimeChange = (hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    const newDate = endTime ? new Date(endTime) : (startTime ? new Date(startTime) : new Date(minStartDate));
    let hour24 = hour12;
    if (ampm === 'AM') {
      hour24 = hour12 === 12 ? 0 : hour12;
    } else {
      hour24 = hour12 === 12 ? 12 : hour12 + 12;
    }
    newDate.setHours(hour24, minute, 0, 0);
    onEndTimeChange(newDate);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.blur();
    e.target.setAttribute('inputmode', 'none');
  };

  const isUnderMinimum = calculatedHours > 0 && calculatedHours < MIN_HOURS;

  return (
    <div className="space-y-6">
      {/* Start Date & Time */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Start</h4>

        {/* Start Date */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <DatePicker
            ref={startInputRef}
            selected={startTime}
            onChange={handleStartDateChange}
            dateFormat="EEEE, MMMM d, yyyy"
            minDate={minStartDate}
            maxDate={maxDate}
            placeholderText="Select start date"
            onFocus={handleFocus}
            autoComplete="off"
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer"
            wrapperClassName="w-full"
            calendarClassName="shadow-2xl"
            withPortal
            portalId="date-picker-portal"
          />
        </div>

        {/* Start Time */}
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <select
            value={getHour12(startTime)}
            onChange={(e) => handleStartTimeChange(parseInt(e.target.value), getMinute(startTime), getAmPm(startTime))}
            className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span className="text-lg font-medium text-muted-foreground">:</span>
          <select
            value={getMinute(startTime)}
            onChange={(e) => handleStartTimeChange(getHour12(startTime), parseInt(e.target.value), getAmPm(startTime))}
            className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
            ))}
          </select>
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => handleStartTimeChange(getHour12(startTime), getMinute(startTime), 'AM')}
              className={`px-3 py-3 text-sm font-medium transition-colors ${
                getAmPm(startTime) === 'AM' ? 'bg-sage-dark text-white' : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handleStartTimeChange(getHour12(startTime), getMinute(startTime), 'PM')}
              className={`px-3 py-3 text-sm font-medium transition-colors ${
                getAmPm(startTime) === 'PM' ? 'bg-sage-dark text-white' : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* End Date & Time */}
      <div className={`space-y-3 ${!startTime ? 'opacity-50' : ''}`}>
        <h4 className="text-sm font-semibold text-foreground">End</h4>

        {/* End Date */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <DatePicker
            ref={endInputRef}
            selected={endTime}
            onChange={handleEndDateChange}
            dateFormat="EEEE, MMMM d, yyyy"
            minDate={startTime || minStartDate}
            maxDate={maxDate}
            placeholderText={startTime ? "Select end date" : "Select start first"}
            onFocus={handleFocus}
            autoComplete="off"
            disabled={!startTime}
            className={`w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer ${
              !startTime ? 'cursor-not-allowed' : ''
            }`}
            wrapperClassName="w-full"
            calendarClassName="shadow-2xl"
            withPortal
            portalId="date-picker-portal"
          />
        </div>

        {/* End Time */}
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <select
            value={getHour12(endTime)}
            onChange={(e) => handleEndTimeChange(parseInt(e.target.value), getMinute(endTime), getAmPm(endTime))}
            disabled={!startTime}
            className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center disabled:opacity-50"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span className="text-lg font-medium text-muted-foreground">:</span>
          <select
            value={getMinute(endTime)}
            onChange={(e) => handleEndTimeChange(getHour12(endTime), parseInt(e.target.value), getAmPm(endTime))}
            disabled={!startTime}
            className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center disabled:opacity-50"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
            ))}
          </select>
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => handleEndTimeChange(getHour12(endTime), getMinute(endTime), 'AM')}
              disabled={!startTime}
              className={`px-3 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                getAmPm(endTime) === 'AM' ? 'bg-sage-dark text-white' : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handleEndTimeChange(getHour12(endTime), getMinute(endTime), 'PM')}
              disabled={!startTime}
              className={`px-3 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                getAmPm(endTime) === 'PM' ? 'bg-sage-dark text-white' : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              PM
            </button>
          </div>
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
