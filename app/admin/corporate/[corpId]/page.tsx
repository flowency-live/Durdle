'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { API_BASE_URL, API_ENDPOINTS } from '../../../../lib/config/api';
import { AlertModal, ConfirmModal, InputConfirmModal, Toast } from '../../../../components/admin/Modal';

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
  allowedDomains: string[];
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
  const router = useRouter();
  const corpId = params.corpId as string;

  const [account, setAccount] = useState<CorporateAccount | null>(null);
  const [users, setUsers] = useState<CorporateUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'users'>('details');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [newUser, setNewUser] = useState<{ email: string; name: string; role: 'admin' | 'booker' }>({ email: '', name: '', role: 'booker' });
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [editingDomains, setEditingDomains] = useState(false);
  const [domainsInput, setDomainsInput] = useState('');
  const [savingDomains, setSavingDomains] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    discountPercentage: 0,
    paymentTerms: 'immediate' as 'immediate' | 'net7' | 'net14' | 'net30',
    billingLine1: '',
    billingLine2: '',
    billingCity: '',
    billingPostcode: '',
    notes: '',
    allowedDomains: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal states
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'default' }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [deleteModal, setDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ isVisible: false, message: '', type: 'info' });
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<'active' | 'suspended' | 'closed' | null>(null);

  const fetchAccount = useCallback(async () => {
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
  }, [corpId]);

  const fetchUsers = useCallback(async () => {
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
  }, [corpId]);

  useEffect(() => {
    fetchAccount();
    fetchUsers();
  }, [fetchAccount, fetchUsers]);

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
      setAlertModal({ isOpen: true, title: 'Error', message: err instanceof Error ? err.message : 'Failed to add user', type: 'error' });
    } finally {
      setAddUserLoading(false);
    }
  }

  function handleCloseAddUserModal() {
    setShowAddUserModal(false);
    setMagicLink(null);
    setNewUser({ email: '', name: '', role: 'booker' });
  }

  function handleRemoveUser(userId: string) {
    setPendingRemoveUserId(userId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove User',
      message: 'Are you sure you want to remove this user from the corporate account?',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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

          setToast({ isVisible: true, message: 'User removed successfully', type: 'success' });
          fetchUsers();
          fetchAccount();
        } catch (err) {
          setAlertModal({ isOpen: true, title: 'Error', message: err instanceof Error ? err.message : 'Failed to remove user', type: 'error' });
        } finally {
          setPendingRemoveUserId(null);
        }
      },
    });
  }

  async function handleResendLink(userId: string) {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.adminCorporate}/${corpId}/users/${userId}/magic-link`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate magic link');
      }

      const data = await response.json();
      setMagicLink(data.magicLink);
      setShowAddUserModal(true); // Reuse the modal to show the magic link
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Error', message: err instanceof Error ? err.message : 'Failed to generate magic link', type: 'error' });
    }
  }

  function handleStatusChange(newStatus: 'active' | 'suspended' | 'closed') {
    setPendingStatusChange(newStatus);
    const variant = newStatus === 'closed' ? 'danger' : newStatus === 'suspended' ? 'warning' : 'default';
    setConfirmModal({
      isOpen: true,
      title: 'Change Account Status',
      message: `Are you sure you want to change the account status to "${newStatus}"?`,
      variant,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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

          setToast({ isVisible: true, message: `Account status changed to ${newStatus}`, type: 'success' });
          fetchAccount();
        } catch (err) {
          setAlertModal({ isOpen: true, title: 'Error', message: err instanceof Error ? err.message : 'Failed to update status', type: 'error' });
        } finally {
          setPendingStatusChange(null);
        }
      },
    });
  }

  function startEditingDomains() {
    setDomainsInput(account?.allowedDomains?.join(', ') || '');
    setEditingDomains(true);
  }

  async function handleSaveDomains() {
    setSavingDomains(true);

    try {
      // Parse domains from input (comma or newline separated)
      const domains = domainsInput
        .split(/[,\n]/)
        .map(d => d.trim().toLowerCase().replace(/^@/, ''))
        .filter(d => d.length > 0);

      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.adminCorporate}/${corpId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ allowedDomains: domains }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update allowed domains');
      }

      setEditingDomains(false);
      setToast({ isVisible: true, message: 'Allowed domains updated', type: 'success' });
      fetchAccount();
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Error', message: err instanceof Error ? err.message : 'Failed to update allowed domains', type: 'error' });
    } finally {
      setSavingDomains(false);
    }
  }

  function startEditing() {
    if (!account) return;
    setEditForm({
      companyName: account.companyName,
      contactName: account.contactName,
      contactEmail: account.contactEmail,
      contactPhone: account.contactPhone || '',
      discountPercentage: account.discountPercentage,
      paymentTerms: account.paymentTerms as 'immediate' | 'net7' | 'net14' | 'net30',
      billingLine1: account.billingAddress?.line1 || '',
      billingLine2: account.billingAddress?.line2 || '',
      billingCity: account.billingAddress?.city || '',
      billingPostcode: account.billingAddress?.postcode || '',
      notes: account.notes || '',
      allowedDomains: account.allowedDomains?.join(', ') || '',
    });
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    setSavingEdit(true);

    try {
      const token = localStorage.getItem('durdle_admin_token');

      // Build payload
      const payload: Record<string, unknown> = {
        companyName: editForm.companyName,
        contactName: editForm.contactName,
        contactEmail: editForm.contactEmail,
        discountPercentage: editForm.discountPercentage,
        paymentTerms: editForm.paymentTerms,
      };

      if (editForm.contactPhone) payload.contactPhone = editForm.contactPhone;
      if (editForm.notes) payload.notes = editForm.notes;

      // Parse allowed domains
      if (editForm.allowedDomains.trim()) {
        const domains = editForm.allowedDomains
          .split(/[,\n]/)
          .map(d => d.trim().toLowerCase().replace(/^@/, ''))
          .filter(d => d.length > 0);
        payload.allowedDomains = domains;
      } else {
        payload.allowedDomains = [];
      }

      // Build billing address if provided
      if (editForm.billingLine1 && editForm.billingCity && editForm.billingPostcode) {
        payload.billingAddress = {
          line1: editForm.billingLine1,
          line2: editForm.billingLine2 || undefined,
          city: editForm.billingCity,
          postcode: editForm.billingPostcode,
          country: 'UK',
        };
      }

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.adminCorporate}/${corpId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update account');
      }

      setIsEditing(false);
      setToast({ isVisible: true, message: 'Account updated successfully', type: 'success' });
      fetchAccount();
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Error', message: err instanceof Error ? err.message : 'Failed to update account', type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  }

  function handleDeleteAccount() {
    if (!account) return;
    setDeleteModal(true);
  }

  async function confirmDeleteAccount(inputValue: string) {
    if (!account || inputValue !== account.companyName) {
      setAlertModal({ isOpen: true, title: 'Error', message: 'Company name did not match. Deletion cancelled.', type: 'warning' });
      return;
    }

    setDeleteModal(false);
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.adminCorporate}/${corpId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Corporate account permanently deleted',
        type: 'success',
      });
      setTimeout(() => router.push('/admin/corporate'), 1500);
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Error', message: err instanceof Error ? err.message : 'Failed to delete account', type: 'error' });
    } finally {
      setIsDeleting(false);
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
            <button
              onClick={startEditing}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Edit Account
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Allowed Email Domains</h3>
                  {!editingDomains && (
                    <button
                      onClick={startEditingDomains}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingDomains ? (
                  <div className="space-y-3">
                    <textarea
                      value={domainsInput}
                      onChange={(e) => setDomainsInput(e.target.value)}
                      placeholder="flowency.co.uk, flowency.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={2}
                    />
                    <p className="text-xs text-gray-500">
                      Enter the company&apos;s email domains (e.g., acme.co.uk, acme.com).
                      Users can only be added with emails from these domains.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDomains}
                        disabled={savingDomains}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingDomains ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingDomains(false)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {account.allowedDomains && account.allowedDomains.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {account.allowedDomains.map((domain, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                          >
                            @{domain}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm italic">No domain restrictions (any email allowed)</p>
                    )}
                  </div>
                )}
              </div>

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
                          <td className="px-4 py-3 text-right space-x-3">
                            <button
                              onClick={() => handleResendLink(user.userId)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Regenerate
                            </button>
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
                  <h2 className="mt-4 text-lg font-semibold text-gray-900">Magic Link Ready</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Copy this magic link and send it to the user to access their account.
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
                      setToast({ isVisible: true, message: 'Magic link copied to clipboard!', type: 'success' });
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

      {/* Edit Account Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 my-8">
            <h2 className="text-lg font-semibold mb-6">Edit Corporate Account</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-6">
              {/* Company Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Company Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.companyName}
                      onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.contactName}
                      onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={editForm.contactEmail}
                      onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editForm.contactPhone}
                      onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Pricing</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={editForm.discountPercentage}
                      onChange={(e) => setEditForm({ ...editForm, discountPercentage: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
                    <select
                      value={editForm.paymentTerms}
                      onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value as 'immediate' | 'net7' | 'net14' | 'net30' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="net7">Net 7 Days</option>
                      <option value="net14">Net 14 Days</option>
                      <option value="net30">Net 30 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Billing Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={editForm.billingLine1}
                      onChange={(e) => setEditForm({ ...editForm, billingLine1: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={editForm.billingLine2}
                      onChange={(e) => setEditForm({ ...editForm, billingLine2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.billingCity}
                      onChange={(e) => setEditForm({ ...editForm, billingCity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={editForm.billingPostcode}
                      onChange={(e) => setEditForm({ ...editForm, billingPostcode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Allowed Domains */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allowed Email Domains</label>
                <textarea
                  rows={2}
                  value={editForm.allowedDomains}
                  onChange={(e) => setEditForm({ ...editForm, allowedDomains: e.target.value })}
                  placeholder="flowency.co.uk, flowency.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated. Leave blank to allow any domain.</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Internal notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branded Modals */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText="Confirm"
        cancelText="Cancel"
      />

      <InputConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={confirmDeleteAccount}
        title="Delete Corporate Account"
        message={`This will PERMANENTLY DELETE "${account?.companyName}" and all its users. This action cannot be undone.`}
        inputLabel="Type the company name to confirm:"
        inputPlaceholder={account?.companyName || ''}
        expectedValue={account?.companyName}
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}
