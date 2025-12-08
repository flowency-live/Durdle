'use client';

import Image from 'next/image';
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
  active: boolean;
}

export default function VehicleTypesManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Partial<Vehicle>>({});
  const [uploading, setUploading] = useState(false);

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
      setError(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.vehicleId);
    setEditedValues({
      name: vehicle.name,
      description: vehicle.description,
      capacity: vehicle.capacity,
      features: [...vehicle.features],
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedValues({});
  };

  const handleSave = async (vehicleId: string) => {
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

      if (!response.ok) throw new Error('Failed to update vehicle');

      await fetchVehicles();
      setEditingId(null);
      setEditedValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  };

  const handleImageUpload = async (vehicleId: string, file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('durdle_admin_token');

      // Get presigned URL
      const presignResponse = await fetch(
        'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/uploads/presigned',
        {
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
        }
      );

      if (!presignResponse.ok) throw new Error('Failed to get upload URL');

      const { uploadUrl, publicUrl } = await presignResponse.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload image');

      // Update vehicle with new image URL
      const updateResponse = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/pricing/vehicles/${vehicleId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            imageUrl: publicUrl,
          }),
        }
      );

      if (!updateResponse.ok) throw new Error('Failed to update vehicle image');

      await fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...(editedValues.features || [])];
    newFeatures[index] = value;
    setEditedValues({ ...editedValues, features: newFeatures });
  };

  const handleAddFeature = () => {
    setEditedValues({
      ...editedValues,
      features: [...(editedValues.features || []), ''],
    });
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = [...(editedValues.features || [])];
    newFeatures.splice(index, 1);
    setEditedValues({ ...editedValues, features: newFeatures });
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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Vehicle Types</h2>
        <p className="text-gray-600">Manage vehicle categories, descriptions, and images</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-sm text-red-600 hover:text-red-800">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {vehicles.map((vehicle) => {
          const isEditing = editingId === vehicle.vehicleId;

          return (
            <div
              key={vehicle.vehicleId}
              className={`bg-white rounded-lg shadow-sm border ${
                isEditing ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
              } overflow-hidden`}
            >
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Image Section */}
                  <div>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
                      {vehicle.imageUrl ? (
                        <Image
                          src={vehicle.imageUrl}
                          alt={vehicle.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
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
                        disabled={uploading}
                      />
                      <label
                        htmlFor={`image-upload-${vehicle.vehicleId}`}
                        className="block w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 cursor-pointer text-center disabled:opacity-50"
                      >
                        {uploading ? 'Uploading...' : 'Upload Image'}
                      </label>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedValues.name || ''}
                            onChange={(e) => setEditedValues({ ...editedValues, name: e.target.value })}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-gray-900">{vehicle.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editedValues.capacity || 0}
                            onChange={(e) =>
                              setEditedValues({ ...editedValues, capacity: parseInt(e.target.value) })
                            }
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{vehicle.capacity} passengers</p>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      {isEditing ? (
                        <textarea
                          value={editedValues.description || ''}
                          onChange={(e) => setEditedValues({ ...editedValues, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-600">{vehicle.description}</p>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                      {isEditing ? (
                        <div className="space-y-2">
                          {(editedValues.features || []).map((feature, index) => (
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
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Pricing:</span> Base £{(vehicle.baseFare / 100).toFixed(2)} |
                        Per Mile £{(vehicle.perMile / 100).toFixed(2)} | Per Minute £
                        {(vehicle.perMinute / 100).toFixed(2)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSave(vehicle.vehicleId)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Edit Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
