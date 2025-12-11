'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '../../../../lib/config/api';

interface CorporateAccount {
  corpId: string;
  companyName: string;
  companyNumber: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  } | null;
  discountPercentage: number;
  paymentTerms: string;
  status: 'active' | 'suspended' | 'closed';
  stats: {
    usersCount: number;
    totalBookings: number;
    totalSpend: number;
  };
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CorporateUser {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'booker';
  status: 'active' | 'pending' | 'suspended' | 'removed';
  createdAt: string;
  lastLoginAt: string | null;
}

export default function CorporateAccountDetailPage() {
  const params = useParams();
  const corpId = params.corpId as string;

  const [account, setAccount] = useState<CorporateAccount | null>(null);
  const [users, setUsers] = useState<CorporateUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'users'>('details');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'booker' as const });
  const [magicLink, setMagicLink] = useState<string | null>(null);

  useEffect(() => {
    fetchAccount();
    fetchUsers();
  }, [corpId]);

  async function fetchAccount() {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.adminCorporate}/${corpId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch corporate account');
      }

      const data = await response.json();
      setAccount(data.corporateAccount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.adminCorporate}/${corpId}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users.filter((u: CorporateUser) => u.status !== 'removed'));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddUserLoading(true);

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.adminCorporate}/${corpId}/users`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newUser),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user');
      }

      // Show magic link if returned (for testing)
      if (data.magicLink) {
        setMagicLink(data.magicLink);
      } else {
        setShowAddUserModal(false);
      }

      setNewUser({ email: '', name: '', role: 'booker' });
      fetchUsers();
      fetchAccount(); // Refresh stats
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setAddUserLoading(false);
    }
  }

  function handleCloseAddUserModal() {
    setShowAddUserModal(false);
    setMagicLink(null);
    setNewUser({ email: '', name: '', role: 'booker' });
  }

  async function handleRemoveUser(userId: string) {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.adminCorporate}/${corpId}/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      fetchUsers();
      fetchAccount(); // Refresh stats
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove user');
    }
  }

  async function handleStatusChange(newStatus: 'active' | 'suspended' | 'closed') {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.adminCorporate}/${corpId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      fetchAccount();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
      }`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Account not found'}</p>
        <Link href="/admin/corporate" className="mt-4 text-blue-600 hover:underline">
          Back to Corporate Accounts
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/corporate"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Corporate Accounts
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{account.companyName}</h1>
            <p className="text-gray-500 mt-1">{account.corpId}</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-4">
            {getStatusBadge(account.status)}
            <select
              value={account.status}
              onChange={(e) => handleStatusChange(e.target.value as 'active' | 'suspended' | 'closed')}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{account.stats.usersCount}</p>
            <p className="text-sm text-gray-500">Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{account.stats.totalBookings}</p>
            <p className="text-sm text-gray-500">Bookings</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{account.discountPercentage}%</p>
            <p className="text-sm text-gray-500">Discount</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Account Details
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Users ({users.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {account.contactName}</p>
                  <p><span className="font-medium">Email:</span> {account.contactEmail}</p>
                  {account.contactPhone && (
                    <p><span className="font-medium">Phone:</span> {account.contactPhone}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Pricing</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Discount:</span> {account.discountPercentage}%</p>
                  <p><span className="font-medium">Payment Terms:</span> {account.paymentTerms}</p>
                </div>
              </div>

              {account.billingAddress && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Billing Address</h3>
                  <div className="space-y-1 text-sm">
                    <p>{account.billingAddress.line1}</p>
                    {account.billingAddress.line2 && <p>{account.billingAddress.line2}</p>}
                    <p>{account.billingAddress.city}</p>
                    <p>{account.billingAddress.postcode}</p>
                    <p>{account.billingAddress.country}</p>
                  </div>
                </div>
              )}

              {account.companyNumber && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Company Number</h3>
                  <p>{account.companyNumber}</p>
                </div>
              )}

              {account.notes && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{account.notes}</p>
                </div>
              )}

              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Timestamps</h3>
                <div className="flex gap-8 text-sm text-gray-600">
                  <p>Created: {new Date(account.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(account.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add User
                </button>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No users added yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.userId}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                          <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveUser(user.userId)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            {magicLink ? (
              // Show magic link success state
              <div>
                <div className="text-center mb-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-gray-900">User Added Successfully</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Copy this magic link and send it to the user to set up their account.
                  </p>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs font-medium text-yellow-800 mb-2">Magic Link (expires in 15 minutes)</p>
                  <div className="bg-white p-2 rounded border border-yellow-300 overflow-x-auto">
                    <code className="text-xs text-blue-600 break-all">{magicLink}</code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(magicLink);
                      alert('Magic link copied to clipboard!');
                    }}
                    className="mt-3 w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-sm font-medium"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleCloseAddUserModal}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              // Show add user form
              <>
                <h2 className="text-lg font-semibold mb-4">Add Team Member</h2>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'booker' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="booker">Booker</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseAddUserModal}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addUserLoading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {addUserLoading ? 'Adding...' : 'Add User'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
