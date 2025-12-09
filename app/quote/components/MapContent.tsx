'use client';

import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';

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

// Component to automatically fit map bounds to show all markers
function FitBounds({ locations }: { locations: LocationPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = locations
        .filter(loc => loc.coords)
        .map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);

      if (bounds.length > 0) {
        // Small delay to ensure map is ready
        setTimeout(() => {
          try {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
          } catch (error) {
            console.error('Error fitting bounds:', error);
          }
        }, 100);
      }
    }
  }, [locations, map]);

  return null;
}

export default function MapContent({ locations, mapCenter }: MapContentProps) {
  return (
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
