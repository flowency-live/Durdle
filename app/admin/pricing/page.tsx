'use client';

import { useState, useEffect } from 'react';

interface VehiclePricing {
  vehicleId: string;
  name: string;
  description: string;
  baseFare: number;
  perMile: number;
  perMinute: number;
  returnDiscount: number; // Percentage discount for return journeys (0-100)
  capacity: number;
  features: string[];
  imageUrl: string;
}

export default function PricingManagement() {
  const [vehicles, setVehicles] = useState<VehiclePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Partial<VehiclePricing>>({});

  // Pricing calculator state
  const [calcDistance, setCalcDistance] = useState('10');
  const [calcDuration, setCalcDuration] = useState('15');
  const [calcVehicle, setCalcVehicle] = useState('standard');

  useEffect(() => {
    fetchVehicles();
  }, []);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vehicle: VehiclePricing) => {
    setEditingId(vehicle.vehicleId);
    setEditedValues({
      baseFare: vehicle.baseFare,
      perMile: vehicle.perMile,
      perMinute: vehicle.perMinute,
      returnDiscount: vehicle.returnDiscount,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedValues({});
  };

  const handleSave = async (vehicleId: string) => {
    setSaving(vehicleId);
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/pricing/vehicles/${vehicleId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify(editedValues),
        }
      );

      if (!response.ok) throw new Error('Failed to update pricing');

      await fetchVehicles();
      setEditingId(null);
      setEditedValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(null);
    }
  };

  const calculatePreview = () => {
    const vehicle = vehicles.find((v) => v.vehicleId === calcVehicle);
    if (!vehicle) return null;

    const distance = parseFloat(calcDistance) || 0;
    const duration = parseFloat(calcDuration) || 0;

    const baseFare = vehicle.baseFare;
    const distanceCharge = Math.round(distance * vehicle.perMile);
    const timeCharge = Math.round(duration * vehicle.perMinute);
    const total = baseFare + distanceCharge + timeCharge;

    return {
      baseFare,
      distanceCharge,
      timeCharge,
      total,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const preview = calculatePreview();

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Variable Pricing</h2>
        <p className="text-gray-600">Configure base fares, per-mile, and per-minute rates for each vehicle type</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pricing Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Fare
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Per Mile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Per Minute
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Return Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.map((vehicle) => {
                const isEditing = editingId === vehicle.vehicleId;
                const isSaving = saving === vehicle.vehicleId;

                return (
                  <tr key={vehicle.vehicleId} className={isEditing ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{vehicle.name}</div>
                        <div className="text-sm text-gray-500">{vehicle.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">£</span>
                          <input
                            type="number"
                            step="0.01"
                            value={(editedValues.baseFare || 0) / 100}
                            onChange={(e) =>
                              setEditedValues({
                                ...editedValues,
                                baseFare: Math.round(parseFloat(e.target.value) * 100),
                              })
                            }
                            className="w-24 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">£{(vehicle.baseFare / 100).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">£</span>
                          <input
                            type="number"
                            step="0.01"
                            value={(editedValues.perMile || 0) / 100}
                            onChange={(e) =>
                              setEditedValues({
                                ...editedValues,
                                perMile: Math.round(parseFloat(e.target.value) * 100),
                              })
                            }
                            className="w-24 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">£{(vehicle.perMile / 100).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">£</span>
                          <input
                            type="number"
                            step="0.01"
                            value={(editedValues.perMinute || 0) / 100}
                            onChange={(e) =>
                              setEditedValues({
                                ...editedValues,
                                perMinute: Math.round(parseFloat(e.target.value) * 100),
                              })
                            }
                            className="w-24 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">£{(vehicle.perMinute / 100).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={editedValues.returnDiscount ?? 0}
                            onChange={(e) =>
                              setEditedValues({
                                ...editedValues,
                                returnDiscount: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                              })
                            }
                            className="w-16 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">{vehicle.returnDiscount || 0}%</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(vehicle.vehicleId)}
                            disabled={isSaving}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Calculator */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Calculator</h3>
        <p className="text-sm text-gray-600 mb-4">
          Preview how pricing is calculated based on current rates
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
            <select
              value={calcVehicle}
              onChange={(e) => setCalcVehicle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {vehicles.map((v) => (
                <option key={v.vehicleId} value={v.vehicleId}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distance (miles)</label>
            <input
              type="number"
              step="0.1"
              value={calcDistance}
              onChange={(e) => setCalcDistance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              step="1"
              value={calcDuration}
              onChange={(e) => setCalcDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {preview && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Base Fare</p>
                <p className="text-lg font-semibold text-gray-900">£{(preview.baseFare / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Distance Charge</p>
                <p className="text-lg font-semibold text-gray-900">£{(preview.distanceCharge / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Time Charge</p>
                <p className="text-lg font-semibold text-gray-900">£{(preview.timeCharge / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total</p>
                <p className="text-2xl font-bold text-blue-600">£{(preview.total / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
