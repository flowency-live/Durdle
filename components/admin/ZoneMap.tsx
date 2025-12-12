'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

// Fix Leaflet default marker icon issue in Next.js
delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface PostcodeArea {
  outwardCode: string;
  lat: number;
  lon: number;
  area: string;
  isDorset: boolean;
}

interface ZoneMapProps {
  selectedCodes: string[];
  onCodesChange: (codes: string[]) => void;
  existingPolygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  onPolygonChange?: (polygon: GeoJSON.Polygon | null) => void;
  postcodeAreas?: PostcodeArea[];
  height?: string;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

// Dorset center coordinates
const DORSET_CENTER: L.LatLngExpression = [50.75, -2.0];
const DEFAULT_ZOOM = 9;

export default function ZoneMap({
  selectedCodes,
  onCodesChange,
  existingPolygon,
  onPolygonChange,
  postcodeAreas = [],
  height = '400px',
}: ZoneMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DORSET_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    // Create markers layer
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Initialize Geoman drawing controls
    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
    });

    // Set drawing options
    map.pm.setPathOptions({
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      weight: 2,
    });

    // Handle polygon creation
    map.on('pm:create', async (e) => {
      // Remove any existing polygon
      if (polygonLayerRef.current) {
        polygonLayerRef.current.remove();
      }

      if (e.layer instanceof L.Polygon) {
        polygonLayerRef.current = e.layer;
        const geoJson = e.layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;

        if (onPolygonChange) {
          onPolygonChange(geoJson.geometry);
        }

        // Resolve polygon to outward codes
        await resolvePolygonToCodes(geoJson.geometry);
      }
    });

    // Handle polygon edit - listen for edit end on any layer
    map.on('pm:edit', async (e) => {
      if (e.layer instanceof L.Polygon) {
        const geoJson = e.layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;

        if (onPolygonChange) {
          onPolygonChange(geoJson.geometry);
        }

        await resolvePolygonToCodes(geoJson.geometry);
      }
    });

    // Also listen for global edit mode disable (when user clicks done editing)
    map.on('pm:globaleditmodetoggled', async (e) => {
      if (!e.enabled && polygonLayerRef.current) {
        const geoJson = polygonLayerRef.current.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;

        if (onPolygonChange) {
          onPolygonChange(geoJson.geometry);
        }

        await resolvePolygonToCodes(geoJson.geometry);
      }
    });

    // Handle polygon removal
    map.on('pm:remove', () => {
      polygonLayerRef.current = null;
      if (onPolygonChange) {
        onPolygonChange(null);
      }
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Resolve polygon to outward codes via API
  const resolvePolygonToCodes = async (polygon: GeoJSON.Polygon) => {
    setIsResolving(true);
    setResolveError(null);

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/zones/resolve-polygon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ polygon }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve polygon');
      }

      const data = await response.json();
      if (data.outwardCodes && data.outwardCodes.length > 0) {
        onCodesChange(data.outwardCodes);
      }
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : 'Failed to resolve polygon');
      console.error('Polygon resolution error:', err);
    } finally {
      setIsResolving(false);
    }
  };

  // Update markers when postcode areas change
  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return;

    markersLayerRef.current.clearLayers();

    postcodeAreas.forEach((area) => {
      const isSelected = selectedCodes.includes(area.outwardCode);

      // For selected postcodes, add a larger highlight circle underneath
      if (isSelected) {
        const highlight = L.circleMarker([area.lat, area.lon], {
          radius: 18,
          fillColor: '#22c55e',
          color: '#16a34a',
          weight: 3,
          opacity: 0.6,
          fillOpacity: 0.3,
        });
        highlight.addTo(markersLayerRef.current!);
      }

      const marker = L.circleMarker([area.lat, area.lon], {
        radius: isSelected ? 10 : 7,
        fillColor: isSelected ? '#22c55e' : area.isDorset ? '#3b82f6' : '#9ca3af',
        color: isSelected ? '#15803d' : area.isDorset ? '#1d4ed8' : '#6b7280',
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: isSelected ? 0.9 : 0.5,
      });

      marker.bindTooltip(
        `<strong>${area.outwardCode}</strong><br/>${area.area}${area.isDorset ? '' : ' (neighboring)'}${isSelected ? '<br/><em>Selected</em>' : ''}`,
        { direction: 'top' }
      );

      marker.on('click', () => {
        if (isSelected) {
          onCodesChange(selectedCodes.filter((c) => c !== area.outwardCode));
        } else {
          onCodesChange([...selectedCodes, area.outwardCode]);
        }
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [postcodeAreas, selectedCodes, onCodesChange]);

  // Load existing polygon
  useEffect(() => {
    if (!mapRef.current || !existingPolygon) return;

    // Remove existing polygon layer
    if (polygonLayerRef.current) {
      polygonLayerRef.current.remove();
    }

    // Create polygon from GeoJSON
    const coords = existingPolygon.type === 'Polygon'
      ? existingPolygon.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number])
      : existingPolygon.coordinates[0][0].map(([lng, lat]) => [lat, lng] as [number, number]);

    const polygon = L.polygon(coords, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      weight: 2,
    });

    polygon.addTo(mapRef.current);
    polygon.pm.enable();
    polygonLayerRef.current = polygon;

    // Add edit event listener to the loaded polygon
    polygon.on('pm:edit', async () => {
      const geoJson = polygon.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
      if (onPolygonChange) {
        onPolygonChange(geoJson.geometry);
      }
      await resolvePolygonToCodes(geoJson.geometry);
    });

    // Fit map to polygon bounds
    mapRef.current.fitBounds(polygon.getBounds(), { padding: [50, 50] });
  }, [existingPolygon]);

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        style={{ height, width: '100%' }}
        className="rounded-lg border border-gray-300 z-0"
      />

      {/* Status overlay */}
      {isResolving && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2 z-[1000]">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          Resolving postcodes...
        </div>
      )}

      {resolveError && (
        <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-lg text-sm z-[1000]">
          {resolveError}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white rounded-lg shadow-md p-2 text-xs z-[1000]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span>Dorset</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-400"></span>
          <span>Neighboring</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-2 text-xs text-gray-500">
        <p>Draw a polygon to select postcodes, or click individual markers to toggle selection.</p>
      </div>
    </div>
  );
}
