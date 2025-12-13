'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/admin/Modal';

interface Zone {
  zoneId: string;
  name: string;
  outwardCodes: string[];
  active: boolean;
}

interface Location {
  placeId: string;
  description: string;
}

interface GooglePlacesPrediction {
  place_id: string;
  description: string;
}

interface VehiclePrices {
  outbound: number;
  return: number;
}

interface FixedPriceRoute {
  zoneId: string;
  zoneName: string;
  destinationPlaceId: string;
  destinationName: string;
  name: string;
  prices: {
    standard: VehiclePrices;
    executive: VehiclePrices;
    minibus: VehiclePrices;
  };
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

export default function ZonePricingPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [routes, setRoutes] = useState<FixedPriceRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<FixedPriceRoute | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [destSuggestions, setDestSuggestions] = useState<Location[]>([]);
  const [selectedDest, setSelectedDest] = useState<Location | null>(null);
  const [routeName, setRouteName] = useState('');
  const [sameForReturn, setSameForReturn] = useState(true);
  const [standardOutbound, setStandardOutbound] = useState('');
  const [standardReturn, setStandardReturn] = useState('');
  const [executiveOutbound, setExecutiveOutbound] = useState('');
  const [executiveReturn, setExecutiveReturn] = useState('');
  const [minibusOutbound, setMinibusOutbound] = useState('');
  const [minibusReturn, setMinibusReturn] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Filter state
  const [filterZone, setFilterZone] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<FixedPriceRoute | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (destSearch.length >= 3 && !selectedDest) {
      searchDestinations(destSearch);
    } else {
      setDestSuggestions([]);
    }
  }, [destSearch, selectedDest]);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');

      // Fetch zones and pricing matrix in parallel
      const [zonesRes, matrixRes] = await Promise.all([
        fetch(`${API_BASE}/admin/zones`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch(`${API_BASE}/admin/pricing-matrix`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
      ]);

      if (!zonesRes.ok) throw new Error('Failed to fetch zones');

      const zonesData = await zonesRes.json();
      const activeZones = (zonesData.zones || []).filter((z: Zone) => z.active);
      setZones(activeZones);

      if (activeZones.length > 0 && !selectedZoneId) {
        setSelectedZoneId(activeZones[0].zoneId);
      }

      // Process pricing matrix into flat routes list
      if (matrixRes.ok) {
        const matrixData = await matrixRes.json();
        const pricingMap = matrixData.pricing || {};
        const zonesList = matrixData.zones || [];

        const routesList: FixedPriceRoute[] = [];
        Object.entries(pricingMap).forEach(([key, value]) => {
          const [zoneId, destinationPlaceId] = key.split(':');
          const zone = zonesList.find((z: Zone) => z.zoneId === zoneId);
          const pricing = value as {
            name: string;
            destinationName?: string;
            prices: FixedPriceRoute['prices'];
            active: boolean;
          };

          routesList.push({
            zoneId,
            zoneName: zone?.name || zoneId,
            destinationPlaceId,
            destinationName: pricing.destinationName || pricing.name?.split(' - ')[1] || destinationPlaceId,
            name: pricing.name,
            prices: pricing.prices,
            active: pricing.active,
          });
        });

        setRoutes(routesList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const searchDestinations = async (query: string) => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE}/admin/locations/autocomplete?input=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      const suggestions = data.predictions.map((p: GooglePlacesPrediction) => ({
        placeId: p.place_id,
        description: p.description,
      }));

      setDestSuggestions(suggestions);
    } catch (err) {
      console.error('Failed to search destinations:', err);
    }
  };

  const resetForm = () => {
    setSelectedZoneId(zones.length > 0 ? zones[0].zoneId : '');
    setDestSearch('');
    setSelectedDest(null);
    setDestSuggestions([]);
    setRouteName('');
    setSameForReturn(true);
    setStandardOutbound('');
    setStandardReturn('');
    setExecutiveOutbound('');
    setExecutiveReturn('');
    setMinibusOutbound('');
    setMinibusReturn('');
    setIsActive(true);
    setEditingRoute(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (route: FixedPriceRoute) => {
    setEditingRoute(route);
    setSelectedZoneId(route.zoneId);
    setSelectedDest({ placeId: route.destinationPlaceId, description: route.destinationName });
    setDestSearch(route.destinationName);
    setRouteName(route.name);
    setStandardOutbound((route.prices.standard.outbound / 100).toFixed(2));
    setStandardReturn((route.prices.standard.return / 100).toFixed(2));
    setExecutiveOutbound((route.prices.executive.outbound / 100).toFixed(2));
    setExecutiveReturn((route.prices.executive.return / 100).toFixed(2));
    setMinibusOutbound((route.prices.minibus.outbound / 100).toFixed(2));
    setMinibusReturn((route.prices.minibus.return / 100).toFixed(2));
    setSameForReturn(
      route.prices.standard.outbound === route.prices.standard.return &&
      route.prices.executive.outbound === route.prices.executive.return &&
      route.prices.minibus.outbound === route.prices.minibus.return
    );
    setIsActive(route.active);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedZoneId || !selectedDest) {
      setError('Please select a zone and destination');
      return;
    }

    const stdOut = Math.round(parseFloat(standardOutbound || '0') * 100);
    const execOut = Math.round(parseFloat(executiveOutbound || '0') * 100);
    const miniOut = Math.round(parseFloat(minibusOutbound || '0') * 100);

    if (stdOut < 100 || execOut < 100 || miniOut < 100) {
      setError('All prices must be at least 1.00');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const zone = zones.find(z => z.zoneId === selectedZoneId);
      const autoName = routeName.trim() || `${zone?.name} - ${selectedDest.description}`;

      const prices = {
        standard: {
          outbound: stdOut,
          return: sameForReturn ? stdOut : Math.round(parseFloat(standardReturn || '0') * 100),
        },
        executive: {
          outbound: execOut,
          return: sameForReturn ? execOut : Math.round(parseFloat(executiveReturn || '0') * 100),
        },
        minibus: {
          outbound: miniOut,
          return: sameForReturn ? miniOut : Math.round(parseFloat(minibusReturn || '0') * 100),
        },
      };

      const url = editingRoute
        ? `${API_BASE}/admin/zones/${selectedZoneId}/pricing/${editingRoute.destinationPlaceId}`
        : `${API_BASE}/admin/zones/${selectedZoneId}/pricing`;

      const response = await fetch(url, {
        method: editingRoute ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          destinationId: selectedDest.placeId,
          destinationName: selectedDest.description,
          name: autoName,
          prices,
          active: isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save route');
      }

      await fetchAllData();
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (route: FixedPriceRoute) => {
    setDeleteConfirm(route);
  };

  const handleDelete = async (route: FixedPriceRoute) => {
    setDeleteConfirm(null);
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE}/admin/zones/${route.zoneId}/pricing/${route.destinationPlaceId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to delete route');
      await fetchAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete route');
    }
  };

  const handleToggleActive = async (route: FixedPriceRoute) => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE}/admin/zones/${route.zoneId}/pricing/${route.destinationPlaceId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ active: !route.active }),
        }
      );

      if (!response.ok) throw new Error('Failed to update route');
      await fetchAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route');
    }
  };

  const formatPrice = (pence: number): string => `£${(pence / 100).toFixed(2)}`;

  // Apply filters
  const filteredRoutes = routes.filter(route => {
    if (filterZone !== 'all' && route.zoneId !== filterZone) return false;
    if (filterStatus === 'active' && !route.active) return false;
    if (filterStatus === 'inactive' && route.active) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Zone Pricing</h2>
            <p className="text-gray-600">Fixed prices from postcode zones to destinations</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/zones"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Manage Zones
            </Link>
            <button
              onClick={openCreateForm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Route
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-4 text-sm text-gray-600">
          <span>{zones.length} zone{zones.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">|</span>
          <span>{routes.length} fixed price route{routes.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-sm text-red-600 hover:text-red-800">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Zones</option>
              {zones.map((z) => (
                <option key={z.zoneId} value={z.zoneId}>{z.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingRoute ? 'Edit Fixed Price Route' : 'Add Fixed Price Route'}
          </h3>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone *</label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  disabled={!!editingRoute}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a zone...</option>
                  {zones.map((z) => (
                    <option key={z.zoneId} value={z.zoneId}>{z.name} ({z.outwardCodes.length} postcodes)</option>
                  ))}
                </select>
              </div>

              {/* Destination */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                <input
                  type="text"
                  value={selectedDest ? selectedDest.description : destSearch}
                  onChange={(e) => {
                    setDestSearch(e.target.value);
                    setSelectedDest(null);
                  }}
                  disabled={!!editingRoute}
                  placeholder="Search for airport, station..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                {destSuggestions.length > 0 && !selectedDest && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {destSuggestions.map((loc) => (
                      <button
                        key={loc.placeId}
                        type="button"
                        onClick={() => {
                          setSelectedDest(loc);
                          setDestSearch(loc.description);
                          setDestSuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        {loc.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Route Name (optional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Route Name (optional)</label>
                <input
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="Auto-generated if blank"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Same for return toggle */}
            <div className="flex items-center gap-3 mb-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameForReturn}
                  onChange={(e) => setSameForReturn(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm font-medium text-gray-700">Same price for return journeys</span>
            </div>

            {/* Vehicle Prices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Standard */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Standard</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Outbound</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                      <input
                        type="number"
                        step="0.01"
                        value={standardOutbound}
                        onChange={(e) => setStandardOutbound(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="125.00"
                      />
                    </div>
                  </div>
                  {!sameForReturn && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Return</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={standardReturn}
                          onChange={(e) => setStandardReturn(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="125.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Executive */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Executive</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Outbound</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                      <input
                        type="number"
                        step="0.01"
                        value={executiveOutbound}
                        onChange={(e) => setExecutiveOutbound(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="175.00"
                      />
                    </div>
                  </div>
                  {!sameForReturn && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Return</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={executiveReturn}
                          onChange={(e) => setExecutiveReturn(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="175.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Minibus */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Minibus</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Outbound</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                      <input
                        type="number"
                        step="0.01"
                        value={minibusOutbound}
                        onChange={(e) => setMinibusOutbound(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="225.00"
                      />
                    </div>
                  </div>
                  {!sameForReturn && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Return</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={minibusReturn}
                          onChange={(e) => setMinibusReturn(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="225.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3 mb-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm font-medium text-gray-700">Active (available for quotes)</span>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || !selectedZoneId || !selectedDest || !standardOutbound || !executiveOutbound || !minibusOutbound}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : editingRoute ? 'Update Route' : 'Add Route'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routes Grid */}
      {zones.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p>No zones created yet</p>
          <p className="text-sm mt-1">Create zones first to set up fixed pricing</p>
          <Link
            href="/admin/zones"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Zones
          </Link>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{routes.length === 0 ? 'No fixed price routes yet' : 'No routes match your filters'}</p>
          <p className="text-sm mt-1">
            {routes.length === 0 ? 'Add your first fixed price route' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Executive</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minibus</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoutes.map((route) => (
                  <tr key={`${route.zoneId}:${route.destinationPlaceId}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{route.zoneName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{route.destinationName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(route.prices.standard.outbound)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(route.prices.executive.outbound)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(route.prices.minibus.outbound)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        route.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {route.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditForm(route)}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(route)}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          {route.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(route)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Zone Price Route"
        message={`Are you sure you want to delete the zone price route "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
