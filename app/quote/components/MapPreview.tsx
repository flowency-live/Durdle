'use client';

import { useEffect, useMemo, useState } from 'react';
import { Location } from '../lib/types';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue with Next.js
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface MapPreviewProps {
  pickup: Location | null;
  dropoff: Location | null;
  waypoints?: Location[];
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

export default function MapPreview({ pickup, dropoff, waypoints = [], className = '' }: MapPreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // TODO: Implement proper geocoding using Google Places API placeId or Nominatim
  // For now, using Dorset center as placeholder coordinates

  const locations = useMemo(() => {
    const points: Array<{ location: Location; type: 'pickup' | 'waypoint' | 'dropoff' }> = [];
    if (pickup) points.push({ location: pickup, type: 'pickup' });
    waypoints.forEach(w => points.push({ location: w, type: 'waypoint' }));
    if (dropoff) points.push({ location: dropoff, type: 'dropoff' });
    return points;
  }, [pickup, dropoff, waypoints]);

  // Calculate map center and bounds
  const mapCenter: [number, number] = useMemo(() => {
    if (!pickup && !dropoff) return [50.7155, -2.4397]; // Dorset center
    // TODO: Calculate actual center based on geocoded coordinates
    return [50.7155, -2.4397];
  }, [pickup, dropoff]);

  if (!mounted || (!pickup && !dropoff)) {
    return (
      <div className={`bg-muted rounded-2xl overflow-hidden ${className}`}>
        <div className="w-full h-48 md:h-56 flex items-center justify-center text-muted-foreground text-sm">
          Select locations to preview route
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-2xl overflow-hidden shadow-mobile border-2 border-sage-light ${className}`}>
      <div className="relative w-full h-48 md:h-56">
        <MapContainer
          center={mapCenter}
          zoom={10}
          scrollWheelZoom={false}
          className="w-full h-full z-0"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Markers for each location */}
          {locations.map((loc, idx) => (
            <Marker key={idx} position={mapCenter}>
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
              positions={locations.map(() => mapCenter)}
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
              <span>{waypoints.length} waypoint{waypoints.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {dropoff && (
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[60px]">Dropoff:</span>
              <span className="truncate">{dropoff.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
