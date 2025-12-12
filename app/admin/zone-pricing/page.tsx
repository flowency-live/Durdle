'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Zone {
  zoneId: string;
  name: string;
  outwardCodes: string[];
  active: boolean;
}

interface Destination {
  destinationId: string;
  name: string;
  locationType: string;
  active: boolean;
}

interface VehiclePrices {
  outbound: number;
  return: number;
}

interface ZonePricing {
  zoneId: string;
  destinationId: string;
  name: string;
  prices: {
    standard: VehiclePrices;
    executive: VehiclePrices;
    minibus: VehiclePrices;
  };
  active: boolean;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

export default function ZonePricingPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [pricingMatrix, setPricingMatrix] = useState<Record<string, Record<string, ZonePricing>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [editingPricing, setEditingPricing] = useState<ZonePricing | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formStandardOutbound, setFormStandardOutbound] = useState('');
  const [formStandardReturn, setFormStandardReturn] = useState('');
  const [formExecutiveOutbound, setFormExecutiveOutbound] = useState('');
  const [formExecutiveReturn, setFormExecutiveReturn] = useState('');
  const [formMinibusOutbound, setFormMinibusOutbound] = useState('');
  const [formMinibusReturn, setFormMinibusReturn] = useState('');
  const [formSameForReturn, setFormSameForReturn] = useState(true);
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');

      // Fetch zones, destinations, and pricing matrix in parallel
      const [zonesRes, destinationsRes, matrixRes] = await Promise.all([
        fetch(`${API_BASE}/admin/zones`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch(`${API_BASE}/admin/destinations`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch(`${API_BASE}/admin/pricing-matrix`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
      ]);

      if (!zonesRes.ok) throw new Error('Failed to fetch zones');
      if (!destinationsRes.ok) throw new Error('Failed to fetch destinations');

      const zonesData = await zonesRes.json();
      const destinationsData = await destinationsRes.json();

      setZones(zonesData.zones || []);
      setDestinations(destinationsData.destinations || []);

      // Process pricing matrix
      if (matrixRes.ok) {
        const matrixData = await matrixRes.json();
        const matrix: Record<string, Record<string, ZonePricing>> = {};

        (matrixData.pricing || []).forEach((p: ZonePricing) => {
          if (!matrix[p.zoneId]) {
            matrix[p.zoneId] = {};
          }
          matrix[p.zoneId][p.destinationId] = p;
        });

        setPricingMatrix(matrix);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openPricingModal = (zone: Zone, destination: Destination) => {
    setSelectedZone(zone);
    setSelectedDestination(destination);

    const existingPricing = pricingMatrix[zone.zoneId]?.[destination.destinationId];

    if (existingPricing) {
      setEditingPricing(existingPricing);
      setFormName(existingPricing.name);
      setFormStandardOutbound((existingPricing.prices.standard.outbound / 100).toFixed(2));
      setFormStandardReturn((existingPricing.prices.standard.return / 100).toFixed(2));
      setFormExecutiveOutbound((existingPricing.prices.executive.outbound / 100).toFixed(2));
      setFormExecutiveReturn((existingPricing.prices.executive.return / 100).toFixed(2));
      setFormMinibusOutbound((existingPricing.prices.minibus.outbound / 100).toFixed(2));
      setFormMinibusReturn((existingPricing.prices.minibus.return / 100).toFixed(2));
      setFormSameForReturn(
        existingPricing.prices.standard.outbound === existingPricing.prices.standard.return &&
        existingPricing.prices.executive.outbound === existingPricing.prices.executive.return &&
        existingPricing.prices.minibus.outbound === existingPricing.prices.minibus.return
      );
      setFormActive(existingPricing.active);
    } else {
      setEditingPricing(null);
      setFormName(`${zone.name} - ${destination.name}`);
      setFormStandardOutbound('');
      setFormStandardReturn('');
      setFormExecutiveOutbound('');
      setFormExecutiveReturn('');
      setFormMinibusOutbound('');
      setFormMinibusReturn('');
      setFormSameForReturn(true);
      setFormActive(true);
    }

    setShowPricingModal(true);
  };

  const closePricingModal = () => {
    setShowPricingModal(false);
    setSelectedZone(null);
    setSelectedDestination(null);
    setEditingPricing(null);
  };

  const handleSavePricing = async () => {
    if (!selectedZone || !selectedDestination) return;

    const standardOutbound = Math.round(parseFloat(formStandardOutbound || '0') * 100);
    const executiveOutbound = Math.round(parseFloat(formExecutiveOutbound || '0') * 100);
    const minibusOutbound = Math.round(parseFloat(formMinibusOutbound || '0') * 100);

    if (standardOutbound < 100 || executiveOutbound < 100 || minibusOutbound < 100) {
      setError('All prices must be at least 1.00');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const url = editingPricing
        ? `${API_BASE}/admin/zones/${selectedZone.zoneId}/pricing/${selectedDestination.destinationId}`
        : `${API_BASE}/admin/zones/${selectedZone.zoneId}/pricing`;

      const prices = {
        standard: {
          outbound: standardOutbound,
          return: formSameForReturn ? standardOutbound : Math.round(parseFloat(formStandardReturn || '0') * 100),
        },
        executive: {
          outbound: executiveOutbound,
          return: formSameForReturn ? executiveOutbound : Math.round(parseFloat(formExecutiveReturn || '0') * 100),
        },
        minibus: {
          outbound: minibusOutbound,
          return: formSameForReturn ? minibusOutbound : Math.round(parseFloat(formMinibusReturn || '0') * 100),
        },
      };

      const response = await fetch(url, {
        method: editingPricing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          destinationId: selectedDestination.destinationId,
          name: formName.trim(),
          prices,
          active: formActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save pricing');
      }

      await fetchAllData();
      closePricingModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePricing = async () => {
    if (!selectedZone || !selectedDestination || !editingPricing) return;

    if (!confirm('Are you sure you want to delete this pricing record?')) return;

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE}/admin/zones/${selectedZone.zoneId}/pricing/${selectedDestination.destinationId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to delete pricing');

      await fetchAllData();
      closePricingModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pricing');
    }
  };

  const getPricingForCell = (zoneId: string, destinationId: string): ZonePricing | null => {
    return pricingMatrix[zoneId]?.[destinationId] || null;
  };

  const formatPrice = (pence: number): string => {
    return (pence / 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeZones = zones.filter((z) => z.active);
  const activeDestinations = destinations.filter((d) => d.active);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Zone Pricing</h2>
            <p className="text-gray-600">Set fixed prices for zone to destination routes</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/zones"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Manage Zones
            </Link>
            <Link
              href="/admin/destinations"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Manage Destinations
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-4 text-sm text-gray-600">
          <span>{activeZones.length} active zone{activeZones.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">|</span>
          <span>{activeDestinations.length} active destination{activeDestinations.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">|</span>
          <span>
            {Object.values(pricingMatrix).reduce((acc, dest) => acc + Object.keys(dest).length, 0)} pricing record
            {Object.values(pricingMatrix).reduce((acc, dest) => acc + Object.keys(dest).length, 0) !== 1 ? 's' : ''}
          </span>
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

      {/* Pricing Matrix */}
      {activeZones.length === 0 || activeDestinations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Cannot show pricing matrix</p>
          <p className="text-sm mt-1">
            {activeZones.length === 0 && 'Create zones first. '}
            {activeDestinations.length === 0 && 'Add destinations first.'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {activeZones.length === 0 && (
              <Link
                href="/admin/zones"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Zones
              </Link>
            )}
            {activeDestinations.length === 0 && (
              <Link
                href="/admin/destinations"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Destinations
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Zone
                </th>
                {activeDestinations.map((destination) => (
                  <th
                    key={destination.destinationId}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]"
                  >
                    <div>{destination.name}</div>
                    <div className="font-normal capitalize text-gray-400">{destination.locationType.replace('_', ' ')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeZones.map((zone) => (
                <tr key={zone.zoneId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10">
                    <div className="font-medium text-gray-900">{zone.name}</div>
                    <div className="text-xs text-gray-500">{zone.outwardCodes.length} postcodes</div>
                  </td>
                  {activeDestinations.map((destination) => {
                    const pricing = getPricingForCell(zone.zoneId, destination.destinationId);
                    return (
                      <td
                        key={destination.destinationId}
                        className="px-4 py-3 text-center"
                      >
                        <button
                          onClick={() => openPricingModal(zone, destination)}
                          className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                            pricing
                              ? pricing.active
                                ? 'bg-green-50 hover:bg-green-100 text-green-800 border border-green-200'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300'
                              : 'bg-gray-50 hover:bg-blue-50 text-gray-400 border border-dashed border-gray-300'
                          }`}
                        >
                          {pricing ? (
                            <div>
                              <div className="font-semibold">
                                from {'\u00A3'}{formatPrice(pricing.prices.standard.outbound)}
                              </div>
                              {!pricing.active && <div className="text-xs text-gray-500">(inactive)</div>}
                            </div>
                          ) : (
                            <span>+ Set Price</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && selectedZone && selectedDestination && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingPricing ? 'Edit Pricing' : 'Set Pricing'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedZone.name} to {selectedDestination.name}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Route Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., BH Zone 1 - Heathrow"
                />
              </div>

              {/* Same for return toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSameForReturn}
                    onChange={(e) => setFormSameForReturn(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Same price for return journeys</span>
              </div>

              {/* Vehicle Prices */}
              <div className="space-y-4">
                {/* Standard */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Standard Vehicle</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Outbound ({'\u00A3'})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formStandardOutbound}
                        onChange={(e) => setFormStandardOutbound(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="125.00"
                      />
                    </div>
                    {!formSameForReturn && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Return ({'\u00A3'})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formStandardReturn}
                          onChange={(e) => setFormStandardReturn(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="125.00"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Executive */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Executive Vehicle</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Outbound ({'\u00A3'})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formExecutiveOutbound}
                        onChange={(e) => setFormExecutiveOutbound(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="175.00"
                      />
                    </div>
                    {!formSameForReturn && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Return ({'\u00A3'})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formExecutiveReturn}
                          onChange={(e) => setFormExecutiveReturn(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="175.00"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Minibus */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Minibus</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Outbound ({'\u00A3'})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formMinibusOutbound}
                        onChange={(e) => setFormMinibusOutbound(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="225.00"
                      />
                    </div>
                    {!formSameForReturn && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Return ({'\u00A3'})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formMinibusReturn}
                          onChange={(e) => setFormMinibusReturn(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="225.00"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Active (available for quotes)</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-between">
              <div>
                {editingPricing && (
                  <button
                    onClick={handleDeletePricing}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closePricingModal}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePricing}
                  disabled={saving || !formStandardOutbound || !formExecutiveOutbound || !formMinibusOutbound}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingPricing ? 'Update Pricing' : 'Set Pricing'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
