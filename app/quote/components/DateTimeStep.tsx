'use client';

import { Calendar, Clock } from 'lucide-react';
import DateTimePicker from './DateTimePicker';

interface DateTimeStepProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  error?: string;
}

export default function DateTimeStep({ selectedDate, onChange, error }: DateTimeStepProps) {
  return (
    <div className="space-y-6">
      {/* Date & Time Card */}
      <div className="bg-card rounded-2xl p-6 shadow-mobile border-2 border-sage-light">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-sage-dark/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-sage-dark" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Pickup Date & Time</h3>
        </div>

        <DateTimePicker
          selectedDate={selectedDate}
          onChange={onChange}
          error={error}
        />

        {/* Helpful Info */}
        <div className="mt-6 p-4 bg-sage-light/30 rounded-xl">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
            <div className="text-sm text-navy-light space-y-1">
              <p className="font-medium">Booking Requirements</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Minimum 24 hours advance booking required</li>
                <li>Maximum 6 months in advance</li>
                <li>30-minute time intervals available</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
