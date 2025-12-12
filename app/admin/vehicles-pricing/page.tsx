'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Vehicle {
  vehicleId: string;
  name: string;
  description: string;
  capacity: number;
  features: string[];
  imageUrl: string;
  baseFare: number;
  perMile: number;
  perMinute: number;
  returnDiscount: number;
  active: boolean;
}

type PricingFields = Pick<Vehicle, 'baseFare' | 'perMile' | 'perMinute' | 'returnDiscount'>;
type DetailsFields = Pick<Vehicle, 'name' | 'description' | 'capacity' | 'features'>;

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

export default function VehiclesPricingPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing states - separate for pricing (inline) and details (modal-like)
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [editedDetails, setEditedDetails] = useState<Partial<DetailsFields>>({});

  // Pricing is always editable inline - track which ones have changed
  const [pricingChanges, setPricingChanges] = useState<Record<string, Partial<PricingFields>>>({});
  const [savingPricing, setSavingPricing] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);

  // Image upload state
  const [uploading, setUploading] = useState<string | null>(null);

  // Add vehicle modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [copyFromVehicle, setCopyFromVehicle] = useState<string>('');
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    name: '',
    description: '',
    capacity: 4,
    features: [],
    baseFare: 2500,
    perMile: 200,
    perMinute: 30,
    returnDiscount: 10,
  });
  const [creatingVehicle, setCreatingVehicle] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/pricing/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch vehicles');

      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  // Get current pricing value (from changes or original)
  const getPricingValue = (vehicle: Vehicle, field: keyof PricingFields): number => {
    const changes = pricingChanges[vehicle.vehicleId];
    if (changes && changes[field] !== undefined) {
      return changes[field] as number;
    }
    return vehicle[field];
  };

  // Update pricing change
  const handlePricingChange = (vehicleId: string, field: keyof PricingFields, value: number) => {
    setPricingChanges((prev) => ({
      ...prev,
      [vehicleId]: {
        ...prev[vehicleId],
        [field]: value,
      },
    }));
  };

  // Check if pricing has changed
  const hasPricingChanges = (vehicleId: string): boolean => {
    return !!pricingChanges[vehicleId] && Object.keys(pricingChanges[vehicleId]).length > 0;
  };

  // Save pricing
  const handleSavePricing = async (vehicleId: string) => {
    const changes = pricingChanges[vehicleId];
    if (!changes) return;

    setSavingPricing(vehicleId);
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/pricing/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(changes),
      });

      if (!response.ok) throw new Error('Failed to update pricing');

      await fetchVehicles();
      setPricingChanges((prev) => {
        const newChanges = { ...prev };
        delete newChanges[vehicleId];
        return newChanges;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing');
    } finally {
      setSavingPricing(null);
    }
  };

  // Cancel pricing changes
  const handleCancelPricing = (vehicleId: string) => {
    setPricingChanges((prev) => {
      const newChanges = { ...prev };
      delete newChanges[vehicleId];
      return newChanges;
    });
  };

  // Start editing details
  const handleEditDetails = (vehicle: Vehicle) => {
    setEditingDetailsId(vehicle.vehicleId);
    setEditedDetails({
      name: vehicle.name,
      description: vehicle.description,
      capacity: vehicle.capacity,
      features: [...vehicle.features],
    });
  };

  // Save details
  const handleSaveDetails = async (vehicleId: string) => {
    setSavingDetails(true);
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/pricing/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(editedDetails),
      });

      if (!response.ok) throw new Error('Failed to update vehicle');

      await fetchVehicles();
      setEditingDetailsId(null);
      setEditedDetails({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSavingDetails(false);
    }
  };

  // Image upload
  const handleImageUpload = async (vehicleId: string, file: File) => {
    setUploading(vehicleId);
    try {
      const token = localStorage.getItem('durdle_admin_token');

      const presignResponse = await fetch(`${API_BASE}/admin/uploads/presigned`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: `vehicles/${vehicleId}`,
        }),
      });

      if (!presignResponse.ok) throw new Error('Failed to get upload URL');

      const { uploadUrl, publicUrl } = await presignResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload image');

      const updateResponse = await fetch(`${API_BASE}/admin/pricing/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ imageUrl: publicUrl }),
      });

      if (!updateResponse.ok) throw new Error('Failed to update vehicle image');

      await fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(null);
    }
  };

  // Feature management
  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...(editedDetails.features || [])];
    newFeatures[index] = value;
    setEditedDetails({ ...editedDetails, features: newFeatures });
  };

  const handleAddFeature = () => {
    setEditedDetails({
      ...editedDetails,
      features: [...(editedDetails.features || []), ''],
    });
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = [...(editedDetails.features || [])];
    newFeatures.splice(index, 1);
    setEditedDetails({ ...editedDetails, features: newFeatures });
  };

  // Copy from vehicle
  const handleCopyFrom = (vehicleId: string) => {
    setCopyFromVehicle(vehicleId);
    const vehicle = vehicles.find((v) => v.vehicleId === vehicleId);
    if (vehicle) {
      setNewVehicle({
        name: '',
        description: vehicle.description,
        capacity: vehicle.capacity,
        features: [...vehicle.features],
        baseFare: vehicle.baseFare,
        perMile: vehicle.perMile,
        perMinute: vehicle.perMinute,
        returnDiscount: vehicle.returnDiscount,
      });
    }
  };

  // Create new vehicle
  const handleCreateVehicle = async () => {
    if (!newVehicle.name?.trim()) {
      setError('Vehicle name is required');
      return;
    }

    setCreatingVehicle(true);
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/pricing/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(newVehicle),
      });

      if (!response.ok) throw new Error('Failed to create vehicle');

      await fetchVehicles();
      setShowAddModal(false);
      setNewVehicle({
        name: '',
        description: '',
        capacity: 4,
        features: [],
        baseFare: 2500,
        perMile: 200,
        perMinute: 30,
        returnDiscount: 10,
      });
      setCopyFromVehicle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setCreatingVehicle(false);
    }
  };

  // New vehicle feature management
  const handleNewVehicleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...(newVehicle.features || [])];
    newFeatures[index] = value;
    setNewVehicle({ ...newVehicle, features: newFeatures });
  };

  const handleAddNewVehicleFeature = () => {
    setNewVehicle({
      ...newVehicle,
      features: [...(newVehicle.features || []), ''],
    });
  };

  const handleRemoveNewVehicleFeature = (index: number) => {
    const newFeatures = [...(newVehicle.features || [])];
    newFeatures.splice(index, 1);
    setNewVehicle({ ...newVehicle, features: newFeatures });
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Vehicles & Pricing</h2>
          <p className="text-gray-600">Manage your fleet and configure pricing for each vehicle type</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/test-pricing"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Test Pricing Calculator
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Vehicle
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

      {/* Vehicle Cards */}
      <div className="space-y-6">
        {vehicles.map((vehicle) => {
          const isEditingDetails = editingDetailsId === vehicle.vehicleId;
          const hasChanges = hasPricingChanges(vehicle.vehicleId);
          const isSavingPricing = savingPricing === vehicle.vehicleId;
          const isUploading = uploading === vehicle.vehicleId;

          return (
            <div
              key={vehicle.vehicleId}
              className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
                isEditingDetails ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
              }`}
            >
              <div className="p-6">
                {/* Top Section: Image + Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  {/* Image */}
                  <div>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
                      {vehicle.imageUrl ? (
                        <Image src={vehicle.imageUrl} alt={vehicle.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {isEditingDetails && (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(vehicle.vehicleId, file);
                          }}
                          className="hidden"
                          id={`image-upload-${vehicle.vehicleId}`}
                          disabled={isUploading}
                        />
                        <label
                          htmlFor={`image-upload-${vehicle.vehicleId}`}
                          className="block w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 cursor-pointer text-center"
                        >
                          {isUploading ? 'Uploading...' : 'Upload Image'}
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="md:col-span-3">
                    <div className="flex justify-between items-start mb-4">
                      {isEditingDetails ? (
                        <input
                          type="text"
                          value={editedDetails.name || ''}
                          onChange={(e) => setEditedDetails({ ...editedDetails, name: e.target.value })}
                          className="text-xl font-semibold text-gray-900 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
                          placeholder="Vehicle Name"
                        />
                      ) : (
                        <h3 className="text-xl font-semibold text-gray-900">{vehicle.name}</h3>
                      )}
                      {!isEditingDetails && (
                        <button
                          onClick={() => handleEditDetails(vehicle)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                        >
                          Edit Details
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                        {isEditingDetails ? (
                          <input
                            type="number"
                            value={editedDetails.capacity || 0}
                            onChange={(e) => setEditedDetails({ ...editedDetails, capacity: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{vehicle.capacity} passengers</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        {isEditingDetails ? (
                          <textarea
                            value={editedDetails.description || ''}
                            onChange={(e) => setEditedDetails({ ...editedDetails, description: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-600 text-sm">{vehicle.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                      {isEditingDetails ? (
                        <div className="space-y-2">
                          {(editedDetails.features || []).map((feature, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => handleFeatureChange(index, e.target.value)}
                                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Feature name"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveFeature(index)}
                                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleAddFeature}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + Add Feature
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {vehicle.features.map((feature, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Details Save/Cancel */}
                    {isEditingDetails && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleSaveDetails(vehicle.vehicleId)}
                          disabled={savingDetails}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingDetails ? 'Saving...' : 'Save Details'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingDetailsId(null);
                            setEditedDetails({});
                          }}
                          disabled={savingDetails}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Section - Always Editable */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pricing</h4>
                    {hasChanges && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">Unsaved changes</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Base Fare</label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={(getPricingValue(vehicle, 'baseFare') / 100).toFixed(2)}
                          onChange={(e) =>
                            handlePricingChange(vehicle.vehicleId, 'baseFare', Math.round(parseFloat(e.target.value) * 100))
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Per Mile</label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={(getPricingValue(vehicle, 'perMile') / 100).toFixed(2)}
                          onChange={(e) =>
                            handlePricingChange(vehicle.vehicleId, 'perMile', Math.round(parseFloat(e.target.value) * 100))
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Per Minute</label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={(getPricingValue(vehicle, 'perMinute') / 100).toFixed(2)}
                          onChange={(e) =>
                            handlePricingChange(vehicle.vehicleId, 'perMinute', Math.round(parseFloat(e.target.value) * 100))
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Return Discount</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={getPricingValue(vehicle, 'returnDiscount')}
                          onChange={(e) =>
                            handlePricingChange(
                              vehicle.vehicleId,
                              'returnDiscount',
                              Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                            )
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      {hasChanges && (
                        <>
                          <button
                            onClick={() => handleSavePricing(vehicle.vehicleId)}
                            disabled={isSavingPricing}
                            className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isSavingPricing ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => handleCancelPricing(vehicle.vehicleId)}
                            disabled={isSavingPricing}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add New Vehicle</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Copy from existing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Copy pricing from existing vehicle</label>
                <select
                  value={copyFromVehicle}
                  onChange={(e) => handleCopyFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Start fresh (default values)</option>
                  {vehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.name} - £{(v.baseFare / 100).toFixed(2)} base, £{(v.perMile / 100).toFixed(2)}/mi
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name *</label>
                  <input
                    type="text"
                    value={newVehicle.name || ''}
                    onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mercedes V-Class"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={newVehicle.capacity || 4}
                    onChange={(e) => setNewVehicle({ ...newVehicle, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newVehicle.description || ''}
                  onChange={(e) => setNewVehicle({ ...newVehicle, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the vehicle"
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                <div className="space-y-2">
                  {(newVehicle.features || []).map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleNewVehicleFeatureChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Feature name"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewVehicleFeature(index)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddNewVehicleFeature}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Feature
                  </button>
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Pricing</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Base Fare</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">£</span>
                      <input
                        type="number"
                        step="0.01"
                        value={((newVehicle.baseFare || 0) / 100).toFixed(2)}
                        onChange={(e) =>
                          setNewVehicle({ ...newVehicle, baseFare: Math.round(parseFloat(e.target.value) * 100) })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Per Mile</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">£</span>
                      <input
                        type="number"
                        step="0.01"
                        value={((newVehicle.perMile || 0) / 100).toFixed(2)}
                        onChange={(e) =>
                          setNewVehicle({ ...newVehicle, perMile: Math.round(parseFloat(e.target.value) * 100) })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Per Minute</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">£</span>
                      <input
                        type="number"
                        step="0.01"
                        value={((newVehicle.perMinute || 0) / 100).toFixed(2)}
                        onChange={(e) =>
                          setNewVehicle({ ...newVehicle, perMinute: Math.round(parseFloat(e.target.value) * 100) })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Return Discount</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={newVehicle.returnDiscount || 0}
                        onChange={(e) =>
                          setNewVehicle({
                            ...newVehicle,
                            returnDiscount: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                          })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setCopyFromVehicle('');
                  setNewVehicle({
                    name: '',
                    description: '',
                    capacity: 4,
                    features: [],
                    baseFare: 2500,
                    perMile: 200,
                    perMinute: 30,
                    returnDiscount: 10,
                  });
                }}
                disabled={creatingVehicle}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVehicle}
                disabled={creatingVehicle || !newVehicle.name?.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingVehicle ? 'Creating...' : 'Create Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
