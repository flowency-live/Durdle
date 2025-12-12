'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

interface Destination {
  destinationId: string;
  name: string;
  placeId: string;
  locationType: 'airport' | 'train_station' | 'port' | 'other';
  alternativePlaceIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

const LOCATION_TYPES = [
  { value: 'airport', label: 'Airport' },
  { value: 'train_station', label: 'Train Station' },
  { value: 'port', label: 'Port/Ferry Terminal' },
  { value: 'other', label: 'Other' },
] as const;

export default function DestinationsManagement() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPlaceId, setFormPlaceId] = useState('');
  const [formLocationType, setFormLocationType] = useState<Destination['locationType']>('airport');
  const [formAlternativePlaceIds, setFormAlternativePlaceIds] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);

  // Places autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDestinations();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 3) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const fetchDestinations = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/destinations`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch destinations');

      const data = await response.json();
      setDestinations(data.destinations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  const searchPlaces = async (query: string) => {
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
      setSuggestions(
        data.predictions?.map((p: PlacePrediction) => ({
          place_id: p.place_id,
          description: p.description,
        })) || []
      );
      setShowSuggestions(true);
    } catch (err) {
      console.error('Failed to search places:', err);
    }
  };

  const handleSelectPlace = (prediction: PlacePrediction) => {
    setFormName(prediction.description.split(',')[0]); // Use first part as name
    setFormPlaceId(prediction.place_id);
    setSearchQuery(prediction.description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const openCreateModal = () => {
    setEditingDestination(null);
    setFormName('');
    setFormPlaceId('');
    setFormLocationType('airport');
    setFormAlternativePlaceIds([]);
    setFormActive(true);
    setSearchQuery('');
    setSuggestions([]);
    setShowModal(true);
  };

  const openEditModal = (destination: Destination) => {
    setEditingDestination(destination);
    setFormName(destination.name);
    setFormPlaceId(destination.placeId);
    setFormLocationType(destination.locationType);
    setFormAlternativePlaceIds([...destination.alternativePlaceIds]);
    setFormActive(destination.active);
    setSearchQuery(destination.name);
    setSuggestions([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDestination(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Destination name is required');
      return;
    }

    if (!formPlaceId || !formPlaceId.startsWith('ChIJ')) {
      setError('Valid Google Place ID is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const url = editingDestination
        ? `${API_BASE}/admin/destinations/${editingDestination.destinationId}`
        : `${API_BASE}/admin/destinations`;

      const response = await fetch(url, {
        method: editingDestination ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formName.trim(),
          placeId: formPlaceId,
          locationType: formLocationType,
          alternativePlaceIds: formAlternativePlaceIds.filter(Boolean),
          active: formActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${editingDestination ? 'update' : 'create'} destination`);
      }

      await fetchDestinations();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save destination');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (destination: Destination) => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/destinations/${destination.destinationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ active: !destination.active }),
      });

      if (!response.ok) throw new Error('Failed to update destination');

      await fetchDestinations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update destination');
    }
  };

  const handleDelete = async (destination: Destination) => {
    if (!confirm(`Are you sure you want to delete "${destination.name}"? This may affect existing zone pricing records.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/destinations/${destination.destinationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete destination');

      await fetchDestinations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete destination');
    }
  };

  const getLocationTypeLabel = (type: Destination['locationType']) => {
    return LOCATION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getLocationTypeIcon = (type: Destination['locationType']) => {
    switch (type) {
      case 'airport':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'train_station':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h8l4 8-4 8H8l-4-8 4-8z" />
          </svg>
        );
      case 'port':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Destinations</h2>
          <p className="text-gray-600">Manage airports, stations, and ports for zone pricing</p>
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
            + New Destination
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

      {/* Destinations Grid */}
      {destinations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>No destinations configured yet</p>
          <p className="text-sm mt-1">Add airports, stations, or ports for zone pricing</p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add First Destination
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {destinations.map((destination) => (
            <div
              key={destination.destinationId}
              className={`bg-white rounded-lg shadow-sm border p-4 ${
                destination.active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{getLocationTypeIcon(destination.locationType)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{destination.name}</h3>
                    <span className="text-xs text-gray-500">{getLocationTypeLabel(destination.locationType)}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    destination.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {destination.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="text-xs text-gray-500 mb-3 font-mono truncate" title={destination.placeId}>
                {destination.placeId}
              </div>

              {destination.alternativePlaceIds.length > 0 && (
                <div className="text-xs text-gray-400 mb-3">
                  +{destination.alternativePlaceIds.length} alternative Place ID(s)
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => openEditModal(destination)}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(destination)}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                >
                  {destination.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(destination)}
                  className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingDestination ? 'Edit Destination' : 'Add New Destination'}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Location Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Location *</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search for airport, station, or location..."
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((prediction) => (
                      <button
                        key={prediction.place_id}
                        type="button"
                        onClick={() => handleSelectPlace(prediction)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        {prediction.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Heathrow Airport"
                />
              </div>

              {/* Place ID (read-only display) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Place ID</label>
                <input
                  type="text"
                  value={formPlaceId}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                  placeholder="Select a location from search"
                />
              </div>

              {/* Location Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Type *</label>
                <select
                  value={formLocationType}
                  onChange={(e) => setFormLocationType(e.target.value as Destination['locationType'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LOCATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
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
                disabled={saving || !formName.trim() || !formPlaceId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingDestination ? 'Update Destination' : 'Add Destination'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
