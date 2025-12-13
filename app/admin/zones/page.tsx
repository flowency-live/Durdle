'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

import { ConfirmModal } from '@/components/admin/Modal';

interface Zone {
  zoneId: string;
  name: string;
  description: string;
  outwardCodes: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

export default function ZonesManagement() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; zone: Zone | null; isDeleting: boolean }>({
    isOpen: false,
    zone: null,
    isDeleting: false,
  });

  useEffect(() => {
    fetchZones();
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

  const handleDeleteClick = (zone: Zone) => {
    setDeleteConfirm({ isOpen: true, zone, isDeleting: false });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.zone) return;

    setDeleteConfirm(prev => ({ ...prev, isDeleting: true }));

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/zones/${deleteConfirm.zone.zoneId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete zone');

      setDeleteConfirm({ isOpen: false, zone: null, isDeleting: false });
      await fetchZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete zone');
      setDeleteConfirm({ isOpen: false, zone: null, isDeleting: false });
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
          <Link
            href="/admin/zones/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Zone
          </Link>
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
          <Link
            href="/admin/zones/new"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create First Zone
          </Link>
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
                      <Link
                        href={`/admin/zones/${zone.zoneId}`}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleToggleActive(zone)}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                      >
                        {zone.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(zone)}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, zone: null, isDeleting: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Zone"
        message={`Are you sure you want to delete "${deleteConfirm.zone?.name}"? This will also remove all PostcodeLookup records for this zone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteConfirm.isDeleting}
      />
    </div>
  );
}
