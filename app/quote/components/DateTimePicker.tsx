'use client';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

interface DateTimePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  error?: string;
}

export default function DateTimePicker({ selectedDate, onChange, error }: DateTimePickerProps) {
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 24); // Minimum 24 hours from now

  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6); // Maximum 6 months in advance

  const handleChange = (date: Date | null) => {
    if (date) {
      onChange(date);
    }
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
          selected={selectedDate}
          onChange={handleChange}
          showTimeSelect
          timeIntervals={30}
          timeCaption="Time"
          dateFormat="MMMM d, yyyy h:mm aa"
          minDate={minDate}
          maxDate={maxDate}
          placeholderText="Select pickup date and time"
          className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
            error ? 'border-error' : 'border-border'
          } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background`}
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
