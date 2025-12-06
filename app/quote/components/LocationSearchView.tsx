'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Loader2, Crosshair } from 'lucide-react';
import { Location } from '../lib/types';

interface LocationSearchViewProps {
  activeFieldType: 'pickup' | 'destination' | 'waypoint';
  activeFieldIndex?: number;
  initialValue?: string;
  onSelect: (location: Location) => void;
  onClose: () => void;
}

interface Prediction {
  description: string;
  place_id: string;
}

export default function LocationSearchView({
  activeFieldType,
  activeFieldIndex,
  initialValue = '',
  onSelect,
  onClose
}: LocationSearchViewProps) {
  const [input, setInput] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced fetch suggestions
  useEffect(() => {
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
        const response = await fetch(
          `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/v1/locations/autocomplete?input=${encodeURIComponent(input)}`
        );
        const data = await response.json();

        if (data.predictions) {
          setSuggestions(data.predictions);
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

  const handleSelectSuggestion = (prediction: Prediction) => {
    onSelect({
      address: prediction.description,
      placeId: prediction.place_id
    });
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
            onSelect({
              address: data.address,
              placeId: data.place_id
            });
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

  const getHeaderTitle = () => {
    if (activeFieldType === 'pickup') return 'Pickup Location';
    if (activeFieldType === 'destination') return 'Destination';
    if (activeFieldType === 'waypoint') return `Waypoint ${(activeFieldIndex ?? 0) + 1}`;
    return 'Location';
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <button
          onClick={onClose}
          className="text-foreground hover:text-muted-foreground transition-colors"
          aria-label="Close search"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {getHeaderTitle()}
        </h2>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-border bg-card">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search location..."
            className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-sage-dark animate-spin" />
            </div>
          )}
        </div>

        {/* Use Current Location Button */}
        <button
          onClick={handleUseCurrentLocation}
          disabled={gettingLocation}
          className="mt-3 flex items-center gap-2 text-sage-dark hover:text-sage-dark/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gettingLocation ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Getting your location...</span>
            </>
          ) : (
            <>
              <Crosshair className="w-5 h-5" />
              <span className="text-sm">Use current location</span>
            </>
          )}
        </button>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {suggestions.length > 0 ? (
          suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelectSuggestion(prediction)}
              className="w-full px-4 py-4 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
            >
              <MapPin className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm text-foreground">{prediction.description}</p>
              </div>
            </button>
          ))
        ) : input.length > 0 && !loading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No locations found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
          </div>
        ) : input.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Start typing to search for a location</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
