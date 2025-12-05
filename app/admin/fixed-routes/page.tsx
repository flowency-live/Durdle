'use client';

import { useState, useEffect } from 'react';

interface Location {
  placeId: string;
  description: string;
}

interface Vehicle {
  vehicleId: string;
  name: string;
  description: string;
  active: boolean;
}

interface FixedRoute {
  routeId: string;
  originPlaceId: string;
  destinationPlaceId: string;
  originName: string;
  destinationName: string;
  vehicleId: string;
  vehicleName: string;
  price: number;
  distance: number;
  estimatedDuration: number;
  active: boolean;
  createdAt: string;
}

interface GooglePlacesPrediction {
  place_id: string;
  description: string;
}

type GroupBy = 'none' | 'vehicle' | 'route';
type FilterStatus = 'all' | 'active' | 'inactive';

export default function FixedRoutesManagement() {
  const [routes, setRoutes] = useState<FixedRoute[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<FixedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');

  // Form state
  const [originSearch, setOriginSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<Location[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<Location[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<Location | null>(null);
  const [selectedDest, setSelectedDest] = useState<Location | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [price, setPrice] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (originSearch.length >= 3) {
      searchLocations(originSearch, 'origin');
    } else {
      setOriginSuggestions([]);
    }
  }, [originSearch]);

  useEffect(() => {
    if (destSearch.length >= 3) {
      searchLocations(destSearch, 'dest');
    } else {
      setDestSuggestions([]);
    }
  }, [destSearch]);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/pricing/vehicles',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to fetch vehicles');

      const data = await response.json();
      setVehicles(data.vehicles || []);
      if (data.vehicles && data.vehicles.length > 0) {
        setSelectedVehicle(data.vehicles[0].vehicleId);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/pricing/fixed-routes',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to fetch routes');

      const data = await response.json();
      setRoutes(data.routes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const searchLocations = async (query: string, type: 'origin' | 'dest') => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/locations/autocomplete?input=${encodeURIComponent(
          query
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      const suggestions = data.predictions.map((p: GooglePlacesPrediction) => ({
        placeId: p.place_id,
        description: p.description,
      }));

      if (type === 'origin') {
        setOriginSuggestions(suggestions);
      } else {
        setDestSuggestions(suggestions);
      }
    } catch (err) {
      console.error('Failed to search locations:', err);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrigin || !selectedDest) {
      setError('Please select both origin and destination');
      return;
    }

    if (!price || !selectedVehicle) {
      setError('Please enter a price and select a vehicle');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const vehicle = vehicles.find(v => v.vehicleId === selectedVehicle);

      const response = await fetch(
        'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/pricing/fixed-routes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            originPlaceId: selectedOrigin.placeId,
            originName: selectedOrigin.description,
            destinationPlaceId: selectedDest.placeId,
            destinationName: selectedDest.description,
            vehicleId: selectedVehicle,
            vehicleName: vehicle?.name || '',
            price: Math.round(parseFloat(price) * 100),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create route');
      }

      await fetchRoutes();
      resetForm();
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create route');
    } finally {
      setCreating(false);
    }
  };

  const handleEditRoute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingRoute || !price) {
      setError('Price is required');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const vehicle = vehicles.find(v => v.vehicleId === selectedVehicle);

      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/pricing/fixed-routes/${editingRoute.routeId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            price: Math.round(parseFloat(price) * 100),
            vehicleName: vehicle?.name || editingRoute.vehicleName,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update route');
      }

      await fetchRoutes();
      setEditingRoute(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route');
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (route: FixedRoute) => {
    setEditingRoute(route);
    setPrice((route.price / 100).toString());
    setSelectedVehicle(route.vehicleId);
    setShowCreateForm(false);
  };

  const cancelEditing = () => {
    setEditingRoute(null);
    resetForm();
  };

  const handleToggleActive = async (routeId: string, currentActive: boolean) => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/pricing/fixed-routes/${routeId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            active: !currentActive,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update route');

      await fetchRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route');
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/pricing/fixed-routes/${routeId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to delete route');

      await fetchRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete route');
    }
  };

  const resetForm = () => {
    setOriginSearch('');
    setDestSearch('');
    setSelectedOrigin(null);
    setSelectedDest(null);
    setSelectedVehicle(vehicles.length > 0 ? vehicles[0].vehicleId : '');
    setPrice('');
    setOriginSuggestions([]);
    setDestSuggestions([]);
  };

  // Apply filters
  const filteredRoutes = routes.filter(route => {
    if (filterStatus === 'active' && !route.active) return false;
    if (filterStatus === 'inactive' && route.active) return false;
    if (filterVehicle !== 'all' && route.vehicleId !== filterVehicle) return false;
    return true;
  });

  // Group routes
  const groupedRoutes = groupBy === 'none'
    ? { 'All Routes': filteredRoutes }
    : groupBy === 'vehicle'
    ? filteredRoutes.reduce((acc, route) => {
        const key = route.vehicleName || route.vehicleId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(route);
        return acc;
      }, {} as Record<string, FixedRoute[]>)
    : filteredRoutes.reduce((acc, route) => {
        const key = `${route.originName} → ${route.destinationName}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(route);
        return acc;
      }, {} as Record<string, FixedRoute[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Fixed Routes</h2>
          <p className="text-gray-600">Manage popular routes with guaranteed fixed pricing</p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingRoute(null);
            resetForm();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ New Route'}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-sm text-red-600 hover:text-red-800">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters & Grouping */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">No Grouping</option>
              <option value="vehicle">By Vehicle</option>
              <option value="route">By Route</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.vehicleId} value={v.vehicleId}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create Route Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Fixed Route</h3>
          <form onSubmit={handleCreateRoute}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Origin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                <input
                  type="text"
                  value={selectedOrigin ? selectedOrigin.description : originSearch}
                  onChange={(e) => {
                    setOriginSearch(e.target.value);
                    setSelectedOrigin(null);
                  }}
                  placeholder="Start typing location..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {originSuggestions.length > 0 && !selectedOrigin && (
                  <div className="mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {originSuggestions.map((loc) => (
                      <button
                        key={loc.placeId}
                        type="button"
                        onClick={() => {
                          setSelectedOrigin(loc);
                          setOriginSearch(loc.description);
                          setOriginSuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        {loc.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <input
                  type="text"
                  value={selectedDest ? selectedDest.description : destSearch}
                  onChange={(e) => {
                    setDestSearch(e.target.value);
                    setSelectedDest(null);
                  }}
                  placeholder="Start typing location..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {destSuggestions.length > 0 && !selectedDest && (
                  <div className="mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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

              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Price (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !selectedOrigin || !selectedDest || !price}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Route'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
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

      {/* Edit Route Form */}
      {editingRoute && (
        <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-300 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Edit Fixed Route</h3>
          <div className="text-sm text-gray-600 mb-4">
            <strong>{editingRoute.originName}</strong> → <strong>{editingRoute.destinationName}</strong>
          </div>
          <form onSubmit={handleEditRoute}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Price (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !price}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Updating...' : 'Update Route'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routes List */}
      {filteredRoutes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p>No fixed routes match your filters</p>
          <p className="text-sm mt-1">Try adjusting your filters or create a new route</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRoutes).map(([groupName, groupRoutes]) => (
            <div key={groupName} className="bg-white rounded-lg shadow-sm border border-gray-200">
              {groupBy !== 'none' && (
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900">{groupName}</h4>
                  <p className="text-xs text-gray-500 mt-1">{groupRoutes.length} route{groupRoutes.length !== 1 ? 's' : ''}</p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupRoutes.map((route) => (
                      <tr key={route.routeId} className={editingRoute?.routeId === route.routeId ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{route.originName}</div>
                            <div className="text-gray-500">to {route.destinationName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.vehicleName || route.vehicleId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {route.distance.toFixed(1)} mi
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.estimatedDuration} mins</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          £{(route.price / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              route.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {route.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => startEditing(route)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(route.routeId, route.active)}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              {route.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteRoute(route.routeId)}
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
          ))}
        </div>
      )}
    </div>
  );
}
