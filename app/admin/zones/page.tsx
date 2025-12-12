'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import ZoneMapLoader from '@/components/admin/ZoneMapLoader';

interface Zone {
  zoneId: string;
  name: string;
  description: string;
  outwardCodes: string[];
  polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PostcodeArea {
  outwardCode: string;
  lat: number;
  lon: number;
  area: string;
  isDorset: boolean;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

// UK outward code regex: 1-2 letters, 1-2 digits, optional letter
const OUTWARD_CODE_REGEX = /^[A-Z]{1,2}\d{1,2}[A-Z]?$/i;

type InputMode = 'manual' | 'map';

export default function ZonesManagement() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [postcodeAreas, setPostcodeAreas] = useState<PostcodeArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [saving, setSaving] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('manual');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOutwardCodes, setFormOutwardCodes] = useState<string[]>([]);
  const [formPolygon, setFormPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [formActive, setFormActive] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    fetchZones();
    fetchPostcodeAreas();
  }, []);

  const fetchZones = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/zones`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch zones');

      const data = await response.json();
      setZones(data.zones || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  const fetchPostcodeAreas = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      // Fetch from UK postcodes table
      const response = await fetch(`${API_BASE}/admin/postcodes`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPostcodeAreas(data.postcodes || []);
      }
    } catch (err) {
      console.error('Failed to fetch postcode areas:', err);
      // Non-critical, continue without map data
    }
  };

  const openCreateModal = () => {
    setEditingZone(null);
    setFormName('');
    setFormDescription('');
    setFormOutwardCodes([]);
    setFormPolygon(null);
    setFormActive(true);
    setCodeInput('');
    setCodeError(null);
    setInputMode('manual');
    setShowModal(true);
  };

  const openEditModal = (zone: Zone) => {
    setEditingZone(zone);
    setFormName(zone.name);
    setFormDescription(zone.description || '');
    setFormOutwardCodes([...zone.outwardCodes]);
    setFormPolygon(zone.polygon as GeoJSON.Polygon || null);
    setFormActive(zone.active);
    setCodeInput('');
    setCodeError(null);
    setInputMode(zone.polygon ? 'map' : 'manual');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingZone(null);
    setCodeError(null);
  };

  const handleAddCode = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;

    if (!OUTWARD_CODE_REGEX.test(code)) {
      setCodeError('Invalid UK outward code format (e.g., BH1, DT3, SO41)');
      return;
    }

    if (formOutwardCodes.includes(code)) {
      setCodeError('Code already added');
      return;
    }

    setFormOutwardCodes([...formOutwardCodes, code]);
    setCodeInput('');
    setCodeError(null);
  };

  const handleRemoveCode = (code: string) => {
    setFormOutwardCodes(formOutwardCodes.filter((c) => c !== code));
  };

  const handleCodeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddCode();
    }
  };

  const handlePasteCodes = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const codes = pastedText.split(/[\s,;]+/).filter(Boolean);
    const validCodes: string[] = [];
    const invalidCodes: string[] = [];

    codes.forEach((code) => {
      const upperCode = code.toUpperCase();
      if (OUTWARD_CODE_REGEX.test(upperCode) && !formOutwardCodes.includes(upperCode) && !validCodes.includes(upperCode)) {
        validCodes.push(upperCode);
      } else if (!OUTWARD_CODE_REGEX.test(upperCode)) {
        invalidCodes.push(code);
      }
    });

    if (validCodes.length > 0) {
      setFormOutwardCodes([...formOutwardCodes, ...validCodes]);
    }

    if (invalidCodes.length > 0) {
      setCodeError(`Invalid codes: ${invalidCodes.join(', ')}`);
    } else {
      setCodeError(null);
    }
    setCodeInput('');
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Zone name is required');
      return;
    }

    if (formOutwardCodes.length === 0) {
      setError('At least one outward code is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const url = editingZone
        ? `${API_BASE}/admin/zones/${editingZone.zoneId}`
        : `${API_BASE}/admin/zones`;

      const response = await fetch(url, {
        method: editingZone ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          outwardCodes: formOutwardCodes,
          polygon: formPolygon || undefined,
          active: formActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${editingZone ? 'update' : 'create'} zone`);
      }

      await fetchZones();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (zone: Zone) => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/zones/${zone.zoneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ active: !zone.active }),
      });

      if (!response.ok) throw new Error('Failed to update zone');

      await fetchZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update zone');
    }
  };

  const handleDelete = async (zone: Zone) => {
    if (!confirm(`Are you sure you want to delete "${zone.name}"? This will also remove all PostcodeLookup records for this zone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/zones/${zone.zoneId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete zone');

      await fetchZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete zone');
    }
  };

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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Zones</h2>
          <p className="text-gray-600">Manage postcode zones for fixed pricing</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/zone-pricing"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Zone Pricing
          </Link>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Zone
          </button>
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

      {/* Zones Table */}
      {zones.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p>No zones configured yet</p>
          <p className="text-sm mt-1">Create your first zone to start setting up fixed pricing</p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create First Zone
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Postcodes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {zones.map((zone) => (
                <tr key={zone.zoneId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{zone.name}</div>
                      {zone.description && (
                        <div className="text-sm text-gray-500">{zone.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {zone.outwardCodes.slice(0, 6).map((code) => (
                        <span key={code} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                          {code}
                        </span>
                      ))}
                      {zone.outwardCodes.length > 6 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          +{zone.outwardCodes.length - 6} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        zone.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {zone.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => openEditModal(zone)}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(zone)}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                      >
                        {zone.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(zone)}
                        className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
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
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingZone ? 'Edit Zone' : 'Create New Zone'}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Zone Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Bournemouth Urban"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the zone coverage area"
                />
              </div>

              {/* Input Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postcode Selection Method</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inputMode === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('map')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inputMode === 'map'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Map Selection
                  </button>
                </div>
              </div>

              {/* Manual Entry Mode */}
              {inputMode === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outward Codes * <span className="text-gray-400 font-normal">({formOutwardCodes.length} codes)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => {
                        setCodeInput(e.target.value.toUpperCase());
                        setCodeError(null);
                      }}
                      onKeyDown={handleCodeInputKeyDown}
                      onPaste={handlePasteCodes}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type code and press Enter (e.g., BH1)"
                    />
                    <button
                      type="button"
                      onClick={handleAddCode}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  {codeError && (
                    <p className="text-sm text-red-600 mb-2">{codeError}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    Tip: Paste multiple codes separated by commas or spaces
                  </p>
                </div>
              )}

              {/* Map Selection Mode */}
              {inputMode === 'map' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Draw Zone on Map <span className="text-gray-400 font-normal">({formOutwardCodes.length} codes selected)</span>
                  </label>
                  <ZoneMapLoader
                    selectedCodes={formOutwardCodes}
                    onCodesChange={setFormOutwardCodes}
                    existingPolygon={formPolygon}
                    onPolygonChange={setFormPolygon}
                    postcodeAreas={postcodeAreas}
                    height="400px"
                  />
                </div>
              )}

              {/* Selected Codes Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Postcodes ({formOutwardCodes.length})
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-[60px] max-h-[150px] overflow-y-auto">
                  {formOutwardCodes.length === 0 ? (
                    <span className="text-gray-400 text-sm">No codes selected yet</span>
                  ) : (
                    formOutwardCodes.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                      >
                        {code}
                        <button
                          type="button"
                          onClick={() => handleRemoveCode(code)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))
                  )}
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
                <span className="text-sm font-medium text-gray-700">Active</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || formOutwardCodes.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingZone ? 'Update Zone' : 'Create Zone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
