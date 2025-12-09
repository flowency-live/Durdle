'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import { Location, Waypoint } from '../lib/types';
import 'leaflet/dist/leaflet.css';

interface Coordinates {
  lat: number;
  lng: number;
}

interface MapPreviewProps {
  pickup: Location | null;
  dropoff: Location | null;
  waypoints?: Waypoint[];
  pickupTime?: Date | null;
  className?: string;
}

// Dynamically import the entire map implementation to avoid SSR issues
const MapContent = dynamic(
  () => import('./MapContent'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 md:h-56 flex items-center justify-center text-muted-foreground text-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sage-light border-t-sage-dark mr-3"></div>
        Loading map...
      </div>
    )
  }
);

export default function MapPreview({ pickup, dropoff, waypoints = [], pickupTime = null, className = '' }: MapPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [coordinates, setCoordinates] = useState<Map<string, Coordinates>>(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Geocode locations - use stored coords if available, otherwise fetch from API
  useEffect(() => {
    if (!mounted) return;

    const geocodeLocation = async (location: Location): Promise<[string, Coordinates] | null> => {
      const key = location.placeId || location.address;
      if (!key) return null;

      // If location already has coordinates, use them (no API call needed)
      if (location.lat !== undefined && location.lng !== undefined) {
        return [key, { lat: location.lat, lng: location.lng }];
      }

      // Otherwise, fetch from API
      if (!location.placeId) return null;

      try {
        const response = await fetch(
          `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/v1/locations/place-details?placeId=${encodeURIComponent(location.placeId)}`
        );

        if (!response.ok) {
          throw new Error('Failed to geocode location');
        }

        const data = await response.json();

        if (data.location) {
          return [key, { lat: data.location.lat, lng: data.location.lng }];
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
      return null;
    };

    const geocodeAll = async () => {
      setIsGeocoding(true);
      const locations: Location[] = [];
      if (pickup) locations.push(pickup);
      waypoints.forEach(w => locations.push(w));
      if (dropoff) locations.push(dropoff);

      const results = await Promise.all(locations.map(geocodeLocation));
      const coordMap = new Map<string, Coordinates>();

      results.forEach(result => {
        if (result) {
          coordMap.set(result[0], result[1]);
        }
      });

      setCoordinates(coordMap);
      setIsGeocoding(false);
    };

    geocodeAll();
  }, [mounted, pickup, dropoff, waypoints]);

  const locations = useMemo(() => {
    const points: Array<{
      location: Location;
      type: 'pickup' | 'waypoint' | 'dropoff';
      coords?: Coordinates;
    }> = [];

    const getKey = (loc: Location) => loc.placeId || loc.address;

    if (pickup) {
      const key = getKey(pickup);
      const coords = key ? coordinates.get(key) : undefined;
      if (coords) points.push({ location: pickup, type: 'pickup', coords });
    }

    waypoints.forEach(w => {
      const key = getKey(w);
      const coords = key ? coordinates.get(key) : undefined;
      if (coords) points.push({ location: w, type: 'waypoint', coords });
    });

    if (dropoff) {
      const key = getKey(dropoff);
      const coords = key ? coordinates.get(key) : undefined;
      if (coords) points.push({ location: dropoff, type: 'dropoff', coords });
    }

    return points;
  }, [pickup, dropoff, waypoints, coordinates]);

  // Calculate map center
  const mapCenter: [number, number] = useMemo(() => {
    if (locations.length === 0) return [50.7155, -2.4397]; // Dorset center

    const lats = locations.map(l => l.coords!.lat);
    const lngs = locations.map(l => l.coords!.lng);
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    return [avgLat, avgLng];
  }, [locations]);

  if (!mounted || (!pickup && !dropoff)) {
    return (
      <div className={`bg-muted rounded-2xl overflow-hidden ${className}`}>
        <div className="w-full h-48 md:h-56 flex items-center justify-center text-muted-foreground text-sm">
          Select locations to preview route
        </div>
      </div>
    );
  }

  if (isGeocoding || locations.length === 0) {
    return (
      <div className={`bg-card rounded-2xl overflow-hidden shadow-mobile border-2 border-sage-light ${className}`}>
        <div className="w-full h-48 md:h-56 flex items-center justify-center text-muted-foreground text-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sage-light border-t-sage-dark mr-3"></div>
          Loading map...
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-2xl overflow-hidden shadow-mobile border-2 border-sage-light ${className}`}>
      <div className="relative w-full h-48 md:h-56">
        <MapContent
          locations={locations}
          mapCenter={mapCenter}
        />
      </div>

      {/* Route summary */}
      <div className="p-3 bg-sage-light/30 border-t border-sage-light">
        <div className="text-xs text-navy-light space-y-1">
          {pickup && (
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[60px]">Pickup:</span>
              <span className="truncate">{pickup.address}</span>
            </div>
          )}
          {waypoints.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[60px]">Stops:</span>
              <div className="flex-1 space-y-1">
                {waypoints.map((waypoint, index) => (
                  <div key={index} className="truncate">
                    {waypoint.address}
                    {waypoint.waitTime && (
                      <span className="text-sage-dark ml-1">
                        (Wait: {Math.floor(waypoint.waitTime / 60)}h {waypoint.waitTime % 60}m)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {dropoff && (
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[60px]">Dropoff:</span>
              <span className="truncate">{dropoff.address}</span>
            </div>
          )}
          {pickupTime && (
            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-sage-light">
              <span className="font-semibold min-w-[60px]">Pickup:</span>
              <span>
                {pickupTime.toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })} at {pickupTime.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
