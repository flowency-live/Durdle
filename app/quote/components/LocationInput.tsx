'use client';

import { MapPin, Loader2, Crosshair } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { LocationType } from '../lib/types';

interface LocationInputProps {
  label?: string;
  value: string;
  onSelect: (address: string, placeId: string, locationType?: LocationType, lat?: number, lng?: number) => void;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  hideCurrentLocation?: boolean;
  onSelectionComplete?: () => void; // Called after a selection is made (for focus management)
  inputRef?: React.RefObject<HTMLInputElement>;
}

interface Prediction {
  description: string;
  place_id: string;
  locationType?: LocationType;
}

export default function LocationInput({
  label,
  value,
  onSelect,
  placeholder,
  error,
  autoFocus = false,
  hideCurrentLocation = false,
  onSelectionComplete,
  inputRef: externalInputRef
}: LocationInputProps) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRefToUse = externalInputRef || internalInputRef;
  const suggestionsRef = useRef<HTMLDivElement>(null);
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
          // Debug: log predictions with locationType
          console.log('[LocationInput] Predictions received:', data.predictions.map((p: Prediction) => ({
            description: p.description,
            locationType: p.locationType
          })));
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
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const items = suggestionsRef.current.querySelectorAll('[data-suggestion-item]');
      const highlightedItem = items[highlightedIndex] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      // If no suggestions, allow Tab to work normally
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        } else if (suggestions.length > 0) {
          // If nothing highlighted, select first suggestion
          handleSelectSuggestion(suggestions[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        // Allow Tab to close dropdown and move focus
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelectSuggestion = async (prediction: Prediction) => {
    // Debug: log selected prediction
    console.log('[LocationInput] Selected:', {
      description: prediction.description,
      place_id: prediction.place_id,
      locationType: prediction.locationType
    });
    isSelectingRef.current = true;
    setInput(prediction.description);
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);

    // Fetch coordinates for the selected place
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/v1/locations/place-details?placeId=${encodeURIComponent(prediction.place_id)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.location) {
          lat = data.location.lat;
          lng = data.location.lng;
        }
      }
    } catch (err) {
      console.error('[LocationInput] Failed to fetch coordinates:', err);
    }

    onSelect(prediction.description, prediction.place_id, prediction.locationType, lat, lng);

    // Notify parent for focus management
    if (onSelectionComplete) {
      // Small delay to allow state updates to complete
      setTimeout(() => onSelectionComplete(), 50);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/v1/locations/geocode?lat=${latitude}&lng=${longitude}`
          );

          if (!response.ok) {
            throw new Error('Failed to get address from coordinates');
          }

          const data = await response.json();

          if (data.address && data.place_id) {
            isSelectingRef.current = true;
            setInput(data.address);
            onSelect(data.address, data.place_id, data.locationType, latitude, longitude);
          } else {
            throw new Error('Invalid response from geocoding service');
          }
        } catch (err) {
          console.error('Geocoding error:', err);
          alert(err instanceof Error ? err.message : 'Failed to get address from your location');
        } finally {
          setGettingLocation(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        let message = 'Failed to get your location';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }

        alert(message);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label} *
        </label>
      )}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className="w-5 h-5 text-muted-foreground" />
        </div>
        <input
          ref={inputRefToUse}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-controls="location-suggestions-listbox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
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
          <div
            id="location-suggestions-listbox"
            ref={suggestionsRef}
            role="listbox"
            className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto"
          >
            {suggestions.map((prediction, index) => (
              <button
                key={prediction.place_id}
                id={`suggestion-${index}`}
                type="button"
                role="option"
                aria-selected={index === highlightedIndex}
                data-suggestion-item
                onClick={() => handleSelectSuggestion(prediction)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-4 py-3 text-left transition-colors flex items-start gap-3 border-b border-border last:border-0 ${
                  index === highlightedIndex
                    ? 'bg-sage-dark/20 text-foreground'
                    : 'hover:bg-sage-dark/10'
                }`}
              >
                <MapPin className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  index === highlightedIndex ? 'text-sage-dark' : 'text-sage-dark'
                }`} />
                <span className="text-sm text-foreground">{prediction.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Location Button */}
      {!hideCurrentLocation && (
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={gettingLocation}
          className="flex items-center gap-2 text-sm text-sage-accessible hover:text-sage-accessible/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gettingLocation ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Getting your location...
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4" />
              Use Current Location
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}
