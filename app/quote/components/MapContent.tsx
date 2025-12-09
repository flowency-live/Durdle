'use client';

import L from 'leaflet';
import { useEffect, useRef } from 'react';

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

// Pure Leaflet implementation - no react-leaflet hooks
export default function MapContent({ locations, mapCenter }: MapContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current, {
      center: mapCenter,
      zoom: 10,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
    }).addTo(map);

    mapRef.current = map;

    // Add markers
    const validLocations = locations.filter(loc => loc.coords);
    validLocations.forEach(loc => {
      if (loc.coords) {
        const marker = L.marker([loc.coords.lat, loc.coords.lng]).addTo(map);
        marker.bindPopup(`<strong>${loc.type}</strong><br/>${loc.location.address}`);
      }
    });

    // Draw route line
    if (validLocations.length > 1) {
      const polylineCoords = validLocations.map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);
      L.polyline(polylineCoords, { color: '#8fb894', weight: 4, opacity: 0.7 }).addTo(map);
    }

    // Fit bounds
    if (validLocations.length > 0) {
      const bounds = validLocations.map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);
      requestAnimationFrame(() => {
        try {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
        } catch {
          // Silently ignore
        }
      });
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty deps - only run once on mount

  // Update map if locations change after initial render
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const validLocations = locations.filter(loc => loc.coords);

    if (validLocations.length > 0) {
      const bounds = validLocations.map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);
      try {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      } catch {
        // Silently ignore
      }
    }
  }, [locations]);

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: '200px' }} />;
}
