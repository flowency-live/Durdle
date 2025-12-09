'use client';

import { Calendar, Clock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateTimePickerMobileProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  error?: string;
  label?: string;
  minDate?: Date;
}

// Generate hour options (1-12)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

// Generate minute options in 5-minute intervals
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export default function DateTimePickerMobile({
  selectedDate,
  onChange,
  error,
  label = 'Pickup Date & Time',
  minDate: propMinDate,
}: DateTimePickerMobileProps) {
  const inputRef = useRef<DatePicker>(null);

  // Default minimum is 24 hours from now
  const defaultMinDate = new Date();
  defaultMinDate.setHours(defaultMinDate.getHours() + 24);

  // Use prop minDate if provided, otherwise use default (24h from now)
  const minDate = propMinDate || defaultMinDate;

  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);

  // Extract time components from selectedDate
  const getHour12 = () => {
    if (!selectedDate) return 12;
    const h = selectedDate.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };

  const getMinute = () => {
    if (!selectedDate) return 0;
    return Math.floor(selectedDate.getMinutes() / 5) * 5;
  };

  const getAmPm = (): 'AM' | 'PM' => {
    if (!selectedDate) return 'AM';
    return selectedDate.getHours() >= 12 ? 'PM' : 'AM';
  };

  // Set inputMode to none on mount to prevent Android keyboard
  useEffect(() => {
    if (inputRef.current) {
      const input = (inputRef.current as unknown as { input: HTMLInputElement }).input;
      if (input) {
        input.setAttribute('inputmode', 'none');
      }
    }
  }, []);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Preserve existing time if set, otherwise default to noon
      if (selectedDate) {
        date.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      } else {
        date.setHours(12, 0, 0, 0);
      }
      onChange(date);
    }
  };

  const handleTimeChange = (hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    const newDate = selectedDate ? new Date(selectedDate) : new Date(minDate);

    // Convert 12-hour to 24-hour
    let hour24 = hour12;
    if (ampm === 'AM') {
      hour24 = hour12 === 12 ? 0 : hour12;
    } else {
      hour24 = hour12 === 12 ? 12 : hour12 + 12;
    }

    newDate.setHours(hour24, minute, 0, 0);
    onChange(newDate);
  };

  // Prevent mobile keyboard from appearing
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.blur();
    e.target.setAttribute('inputmode', 'none');
  };

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {label.includes('Date') ? label : `${label} Date`} *
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <DatePicker
            ref={inputRef}
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="EEEE, MMMM d, yyyy"
            minDate={minDate}
            maxDate={maxDate}
            placeholderText="Tap to select date"
            onFocus={handleFocus}
            autoComplete="off"
            className={`w-full pl-12 pr-4 py-4 rounded-xl border ${
              error ? 'border-error' : 'border-border'
            } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer`}
            wrapperClassName="w-full"
            calendarClassName="shadow-2xl"
            withPortal
            portalId="date-picker-portal"
          />
        </div>
      </div>

      {/* Time Picker - Hour / Minute / AM-PM */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Time *
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Hour */}
          <select
            value={getHour12()}
            onChange={(e) => handleTimeChange(parseInt(e.target.value), getMinute(), getAmPm())}
            className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>

          <span className="text-lg font-medium text-muted-foreground">:</span>

          {/* Minute */}
          <select
            value={getMinute()}
            onChange={(e) => handleTimeChange(getHour12(), parseInt(e.target.value), getAmPm())}
            className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
            ))}
          </select>

          {/* AM/PM */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => handleTimeChange(getHour12(), getMinute(), 'AM')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                getAmPm() === 'AM'
                  ? 'bg-sage-dark text-white'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handleTimeChange(getHour12(), getMinute(), 'PM')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                getAmPm() === 'PM'
                  ? 'bg-sage-dark text-white'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Bookings must be made at least 24 hours in advance
      </p>
    </div>
  );
}
