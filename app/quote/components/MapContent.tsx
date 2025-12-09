'use client';

import L from 'leaflet';
import { useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';

import { Location } from '../lib/types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationPoint {
  location: Location;
  type: 'pickup' | 'waypoint' | 'dropoff';
  coords?: Coordinates;
}

interface MapContentProps {
  locations: LocationPoint[];
  mapCenter: [number, number];
}

export default function MapContent({ locations, mapCenter }: MapContentProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Fit bounds when map is ready - uses ref callback pattern
  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;

    if (locations.length > 0) {
      const bounds = locations
        .filter(loc => loc.coords)
        .map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);

      if (bounds.length > 0) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          try {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
          } catch {
            // Silently ignore if map not ready
          }
        });
      }
    }
  }, [locations]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={10}
      scrollWheelZoom={false}
      attributionControl={false}
      className="w-full h-full z-0"
      style={{ height: '100%', width: '100%' }}
      ref={handleMapReady}
    >
      <TileLayer
        attribution=""
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Markers for each location */}
      {locations.map((loc, idx) => (
        loc.coords && (
          <Marker key={idx} position={[loc.coords.lat, loc.coords.lng]}>
            <Popup>
              <div className="text-sm">
                <strong className="capitalize">{loc.type}</strong>
                <br />
                {loc.location.address}
              </div>
            </Popup>
          </Marker>
        )
      ))}

      {/* Draw route line */}
      {locations.length > 1 && (
        <Polyline
          positions={locations
            .filter(loc => loc.coords)
            .map(loc => [loc.coords!.lat, loc.coords!.lng])}
          pathOptions={{ color: '#8fb894', weight: 4, opacity: 0.7 }}
        />
      )}
    </MapContainer>
  );
}
