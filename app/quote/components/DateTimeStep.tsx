'use client';

import DateTimePicker from './DateTimePicker';

interface DateTimeStepProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  error?: string;
}

export default function DateTimeStep({ selectedDate, onChange, error }: DateTimeStepProps) {
  return (
    <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
      <DateTimePicker
        selectedDate={selectedDate}
        onChange={onChange}
        error={error}
      />
    </div>
  );
}
