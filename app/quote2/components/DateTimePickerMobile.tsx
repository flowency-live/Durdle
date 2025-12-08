'use client';

import { Calendar } from 'lucide-react';
import { useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateTimePickerMobileProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  error?: string;
}

export default function DateTimePickerMobile({ selectedDate, onChange, error }: DateTimePickerMobileProps) {
  const inputRef = useRef<DatePicker>(null);

  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 24);

  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);

  // Prevent keyboard on mobile - set inputMode to none
  useEffect(() => {
    if (inputRef.current) {
      const input = (inputRef.current as unknown as { input: HTMLInputElement }).input;
      if (input) {
        input.setAttribute('inputmode', 'none');
        input.setAttribute('readonly', 'true');
      }
    }
  }, []);

  const handleChange = (date: Date | null) => {
    if (date) {
      onChange(date);
    }
  };

  // Filter out times less than 24 hours from now
  const filterPassedTime = (time: Date) => {
    const now = new Date();
    const minDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return time.getTime() >= minDateTime.getTime();
  };

  // Prevent keyboard from appearing on focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Blur immediately to prevent keyboard, then re-focus for the picker
    e.target.blur();
    e.target.setAttribute('inputmode', 'none');
    e.target.setAttribute('readonly', 'true');
    // Small delay then trigger click to open picker
    setTimeout(() => {
      e.target.click();
    }, 10);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Pickup Date & Time *
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
        <DatePicker
          ref={inputRef}
          selected={selectedDate}
          onChange={handleChange}
          showTimeSelect
          timeIntervals={30}
          timeCaption="Time"
          dateFormat="MMMM d, yyyy h:mm aa"
          minDate={minDate}
          maxDate={maxDate}
          filterTime={filterPassedTime}
          placeholderText="Tap to select date and time"
          onFocus={handleFocus}
          autoComplete="off"
          readOnly
          className={`w-full pl-12 pr-4 py-4 rounded-xl border ${
            error ? 'border-error' : 'border-border'
          } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer`}
          wrapperClassName="w-full"
          calendarClassName="shadow-2xl"
          withPortal
          portalId="date-picker-portal"
        />
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
