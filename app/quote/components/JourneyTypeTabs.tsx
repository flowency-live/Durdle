'use client';

export type JourneyType = 'one-way' | 'hourly';

interface JourneyTypeTabsProps {
  selected: JourneyType;
  onChange: (type: JourneyType) => void;
}

export default function JourneyTypeTabs({ selected, onChange }: JourneyTypeTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-muted rounded-xl">
      <button
        type="button"
        onClick={() => onChange('one-way')}
        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
          selected === 'one-way'
            ? 'bg-sage-dark text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        One way
      </button>
      <button
        type="button"
        onClick={() => onChange('hourly')}
        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
          selected === 'hourly'
            ? 'bg-sage-dark text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        By the hour
      </button>
    </div>
  );
}
