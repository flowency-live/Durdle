'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationInputProps {
  label: string;
  value: string;
  onSelect: (address: string, placeId: string) => void;
  placeholder?: string;
  error?: string;
}

interface Prediction {
  description: string;
  place_id: string;
}

export default function LocationInput({
  label,
  value,
  onSelect,
  placeholder,
  error
}: LocationInputProps) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  // Debounced fetch suggestions
  useEffect(() => {
    // Skip API call if user just selected a suggestion
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    if (input.length < 3) {
      setSuggestions([]);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/v1/locations/autocomplete?input=${encodeURIComponent(input)}`);
        const data = await response.json();

        if (data.predictions) {
          setSuggestions(data.predictions);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [input]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSelectSuggestion = (prediction: Prediction) => {
    isSelectingRef.current = true;
    setInput(prediction.description);
    onSelect(prediction.description, prediction.place_id);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="block text-sm font-medium text-foreground">
        {label} *
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className="w-5 h-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full pl-12 pr-12 py-3 rounded-xl border ${
            error ? 'border-error' : 'border-border'
          } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background`}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-sage-dark animate-spin" />
          </div>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {suggestions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelectSuggestion(prediction)}
                className="w-full px-4 py-3 text-left hover:bg-sage-dark/10 transition-colors flex items-start gap-3 border-b border-border last:border-0"
              >
                <MapPin className="w-4 h-4 text-sage-dark flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{prediction.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Start typing to see location suggestions
      </p>
    </div>
  );
}
