'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TenantConfig {
  tenantId: string;
  name: string;
  postcodeAreas: string[];
  mapCenter: { lat: number; lon: number };
  defaultZoom: number;
  s3BoundaryBucket: string;
  s3BoundaryPrefix: string;
}

interface ZoneAssignment {
  zoneId: string;
  zoneName: string;
}

interface ZoneMapClickableProps {
  selectedCodes: string[];
  onCodesChange: (codes: string[]) => void;
  zoneAssignments?: Record<string, ZoneAssignment>;
  currentZoneId?: string;
  height?: string;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

// Color palette for zones
const ZONE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
];

export default function ZoneMapClickable({
  selectedCodes,
  onCodesChange,
  zoneAssignments = {},
  currentZoneId,
  height = '500px',
}: ZoneMapClickableProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const layerLookupRef = useRef<Map<string, L.Layer>>(new Map());

  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [boundaries, setBoundaries] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paintMode, setPaintMode] = useState(false);
  const [isPainting, setIsPainting] = useState(false);

  // Build zone color map
  const zoneColorMap = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const uniqueZones = Array.from(new Set(Object.values(zoneAssignments).map(z => z.zoneId)));
    uniqueZones.forEach((zoneId, i) => {
      zoneColorMap.current.set(zoneId, ZONE_COLORS[i % ZONE_COLORS.length]);
    });
  }, [zoneAssignments]);

  // Fetch tenant config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('durdle_admin_token');
        const response = await fetch(`${API_BASE}/admin/tenant-config`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to fetch tenant config');
        const config = await response.json();
        setTenantConfig(config);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Fetch GeoJSON boundaries from S3
  useEffect(() => {
    if (!tenantConfig) return;

    const fetchBoundaries = async () => {
      setLoading(true);
      setError(null);

      try {
        const s3Base = `https://${tenantConfig.s3BoundaryBucket}.s3.eu-west-2.amazonaws.com/${tenantConfig.s3BoundaryPrefix}`;

        const fetchPromises = tenantConfig.postcodeAreas.map(async (area) => {
          const response = await fetch(`${s3Base}/${area}.geojson`);
          if (!response.ok) {
            console.warn(`Failed to fetch ${area}.geojson`);
            return null;
          }
          return response.json();
        });

        const results = await Promise.all(fetchPromises);
        const validResults = results.filter(Boolean) as GeoJSON.FeatureCollection[];

        // Merge all features into single FeatureCollection
        const merged: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: validResults.flatMap(fc => fc.features),
        };

        setBoundaries(merged);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load boundaries');
      } finally {
        setLoading(false);
      }
    };

    fetchBoundaries();
  }, [tenantConfig]);

  // Get style for a district
  const getDistrictStyle = useCallback((districtCode: string): L.PathOptions => {
    const isSelected = selectedCodes.includes(districtCode);
    const assignment = zoneAssignments[districtCode];
    const isAssignedToOther = assignment && assignment.zoneId !== currentZoneId;

    if (isSelected) {
      return {
        fillColor: '#3b82f6',
        fillOpacity: 0.5,
        color: '#1d4ed8',
        weight: 2,
      };
    }

    if (isAssignedToOther) {
      const zoneColor = zoneColorMap.current.get(assignment.zoneId) || '#9ca3af';
      return {
        fillColor: zoneColor,
        fillOpacity: 0.3,
        color: zoneColor,
        weight: 1,
        dashArray: '4,4',
      };
    }

    return {
      fillColor: '#e5e7eb',
      fillOpacity: 0.4,
      color: '#6b7280',
      weight: 1,
    };
  }, [selectedCodes, zoneAssignments, currentZoneId]);

  // Toggle district selection
  const toggleSelection = useCallback((districtCode: string) => {
    const isSelected = selectedCodes.includes(districtCode);
    const assignment = zoneAssignments[districtCode];

    // Prevent selecting districts assigned to other zones
    if (assignment && assignment.zoneId !== currentZoneId && !isSelected) {
      return;
    }

    if (isSelected) {
      onCodesChange(selectedCodes.filter(c => c !== districtCode));
    } else {
      onCodesChange([...selectedCodes, districtCode]);
    }
  }, [selectedCodes, onCodesChange, zoneAssignments, currentZoneId]);

  // Add district to selection (for paint mode)
  const addToSelection = useCallback((districtCode: string) => {
    if (selectedCodes.includes(districtCode)) return;

    const assignment = zoneAssignments[districtCode];
    if (assignment && assignment.zoneId !== currentZoneId) return;

    onCodesChange([...selectedCodes, districtCode]);
  }, [selectedCodes, onCodesChange, zoneAssignments, currentZoneId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!tenantConfig) return;

    const map = L.map(mapContainerRef.current, {
      center: [tenantConfig.mapCenter.lat, tenantConfig.mapCenter.lon],
      zoom: tenantConfig.defaultZoom,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [tenantConfig]);

  // Render GeoJSON boundaries
  useEffect(() => {
    if (!mapRef.current || !boundaries) return;

    // Clear existing layer
    if (geoJsonLayerRef.current) {
      mapRef.current.removeLayer(geoJsonLayerRef.current);
    }
    layerLookupRef.current.clear();

    const geoJsonLayer = L.geoJSON(boundaries, {
      style: (feature) => {
        const code = feature?.properties?.name || '';
        return getDistrictStyle(code);
      },
      onEachFeature: (feature, layer) => {
        const code = feature.properties?.name || '';
        layerLookupRef.current.set(code, layer);

        // Tooltip
        const assignment = zoneAssignments[code];
        const isSelected = selectedCodes.includes(code);
        let tooltipContent = `<strong>${code}</strong>`;
        if (assignment) {
          tooltipContent += `<br/>Zone: ${assignment.zoneName}`;
        }
        if (isSelected) {
          tooltipContent += '<br/><em>Selected</em>';
        }
        (layer as L.Path).bindTooltip(tooltipContent, { direction: 'top' });

        // Click handler
        layer.on('click', () => toggleSelection(code));

        // Hover effects
        layer.on('mouseover', () => {
          (layer as L.Path).setStyle({
            weight: 3,
            fillOpacity: 0.6,
          });
        });

        layer.on('mouseout', () => {
          (layer as L.Path).setStyle(getDistrictStyle(code));
        });

        // Paint mode - add on mouseover when painting
        layer.on('mouseover', () => {
          if (isPainting && paintMode) {
            addToSelection(code);
          }
        });
      },
    });

    geoJsonLayer.addTo(mapRef.current);
    geoJsonLayerRef.current = geoJsonLayer;

  }, [boundaries, selectedCodes, zoneAssignments, currentZoneId, getDistrictStyle, toggleSelection, addToSelection, isPainting, paintMode]);

  // Update styles when selection changes (without recreating the layer)
  useEffect(() => {
    if (!geoJsonLayerRef.current) return;

    layerLookupRef.current.forEach((layer, code) => {
      (layer as L.Path).setStyle(getDistrictStyle(code));

      // Update tooltip
      const assignment = zoneAssignments[code];
      const isSelected = selectedCodes.includes(code);
      let tooltipContent = `<strong>${code}</strong>`;
      if (assignment) {
        tooltipContent += `<br/>Zone: ${assignment.zoneName}`;
      }
      if (isSelected) {
        tooltipContent += '<br/><em>Selected</em>';
      }
      (layer as L.Path).unbindTooltip();
      (layer as L.Path).bindTooltip(tooltipContent, { direction: 'top' });
    });
  }, [selectedCodes, zoneAssignments, getDistrictStyle]);

  // Paint mode mouse handlers
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const container = mapContainerRef.current;

    const handleMouseDown = (e: MouseEvent) => {
      if (paintMode && e.button === 0) {
        setIsPainting(true);
      }
    };

    const handleMouseUp = () => {
      setIsPainting(false);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [paintMode]);

  // Clear all selections
  const handleClearAll = () => {
    onCodesChange([]);
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300"
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading postcode boundaries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200"
        style={{ height }}
      >
        <div className="text-center p-4">
          <p className="text-red-800 font-medium">Error loading map</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setPaintMode(!paintMode)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            paintMode
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {paintMode ? 'Exit Paint Mode' : 'Paint Mode'}
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Clear All
        </button>
        <span className="text-sm text-gray-500 ml-2">
          {selectedCodes.length} selected
        </span>
      </div>

      {/* Map */}
      <div
        ref={mapContainerRef}
        style={{ height, width: '100%', cursor: paintMode ? 'crosshair' : 'default' }}
        className="rounded-lg border border-gray-300 z-0"
      />

      {/* Paint mode indicator */}
      {paintMode && (
        <div className="absolute top-14 left-2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm z-[1000]">
          Paint mode: Click and drag to select areas
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white rounded-lg shadow-md p-2 text-xs z-[1000]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></span>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded bg-gray-200 border border-gray-400"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded border-2 border-dashed" style={{ borderColor: '#9ca3af' }}></span>
          <span>Other Zone</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-2 text-xs text-gray-500">
        <p>Click areas to select/deselect. Use Paint Mode to drag-select multiple areas.</p>
      </div>
    </div>
  );
}
