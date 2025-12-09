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
  hideCurrentLocation = false
}: LocationInputProps) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
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
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
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
          type="text"
          value={input}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
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
