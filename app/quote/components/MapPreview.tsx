'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-leaflet';

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

// Dynamically import MapContainer to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// Component to automatically fit map bounds to show all markers
function FitBounds({ locations }: { locations: Array<{ coords?: Coordinates }> }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = locations
        .filter(loc => loc.coords)
        .map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [locations, map]);

  return null;
}

export default function MapPreview({ pickup, dropoff, waypoints = [], pickupTime = null, className = '' }: MapPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [coordinates, setCoordinates] = useState<Map<string, Coordinates>>(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Fix Leaflet default icon issue with Next.js
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      });
    }
  }, []);

  // Geocode locations using backend API
  useEffect(() => {
    if (!mounted) return;

    const geocodeLocation = async (location: Location): Promise<[string, Coordinates] | null> => {
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
          return [location.placeId, { lat: data.location.lat, lng: data.location.lng }];
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

    if (pickup && pickup.placeId) {
      const coords = coordinates.get(pickup.placeId);
      if (coords) points.push({ location: pickup, type: 'pickup', coords });
    }

    waypoints.forEach(w => {
      if (w.placeId) {
        const coords = coordinates.get(w.placeId);
        if (coords) points.push({ location: w, type: 'waypoint', coords });
      }
    });

    if (dropoff && dropoff.placeId) {
      const coords = coordinates.get(dropoff.placeId);
      if (coords) points.push({ location: dropoff, type: 'dropoff', coords });
    }

    return points;
  }, [pickup, dropoff, waypoints, coordinates]);

  // Calculate map center and bounds
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
        <MapContainer
          center={mapCenter}
          zoom={8}
          scrollWheelZoom={false}
          attributionControl={false}
          className="w-full h-full z-0"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution=""
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-fit bounds to show all markers */}
          <FitBounds locations={locations} />

          {/* Markers for each location */}
          {locations.map((loc, idx) => (
            <Marker key={idx} position={[loc.coords!.lat, loc.coords!.lng]}>
              <Popup>
                <div className="text-sm">
                  <strong className="capitalize">{loc.type}</strong>
                  <br />
                  {loc.location.address}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Draw route line */}
          {locations.length > 1 && (
            <Polyline
              positions={locations.map(loc => [loc.coords!.lat, loc.coords!.lng])}
              pathOptions={{ color: '#8fb894', weight: 4, opacity: 0.7 }}
            />
          )}
        </MapContainer>
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
