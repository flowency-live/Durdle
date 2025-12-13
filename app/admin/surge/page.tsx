'use client';

import { Plus, Trash2, Edit2, Check, X, RefreshCw, Zap, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { ConfirmModal } from '@/components/admin/Modal';

interface SurgeRule {
  ruleId: string;
  name: string;
  ruleType: 'specific_dates' | 'date_range' | 'day_of_week' | 'time_of_day';
  multiplier: number;
  isActive: boolean;
  priority: number;
  dates?: string[];
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface Template {
  templateId: string;
  name: string;
  ruleType: string;
  multiplier: number;
  description: string;
  dates?: string[];
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SurgePricingPage() {
  const [rules, setRules] = useState<SurgeRule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<SurgeRule | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    ruleType: 'specific_dates' as SurgeRule['ruleType'],
    multiplier: 1.5,
    isActive: true,
    priority: 0,
    dates: [] as string[],
    startDate: '',
    endDate: '',
    daysOfWeek: [] as number[],
    startTime: '',
    endTime: '',
    newDate: '',
  });

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('durdle_admin_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/pricing/surge`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch surge rules');
      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load surge rules');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/pricing/surge/templates`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchRules();
    fetchTemplates();
  }, [fetchRules, fetchTemplates]);

  const handleCreate = async () => {
    // Client-side validation
    if (formData.ruleType === 'specific_dates' && formData.dates.length === 0) {
      setError('Please add at least one date');
      return;
    }
    if (formData.ruleType === 'date_range' && (!formData.startDate || !formData.endDate)) {
      setError('Please select both start and end dates');
      return;
    }
    if (formData.ruleType === 'day_of_week' && formData.daysOfWeek.length === 0) {
      setError('Please select at least one day of the week');
      return;
    }
    if (formData.ruleType === 'time_of_day' && (!formData.startTime || !formData.endTime)) {
      setError('Please select both start and end times');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        ruleType: formData.ruleType,
        multiplier: formData.multiplier,
        isActive: formData.isActive,
        priority: formData.priority,
      };

      if (formData.ruleType === 'specific_dates') {
        payload.dates = formData.dates;
      } else if (formData.ruleType === 'date_range') {
        payload.startDate = formData.startDate;
        payload.endDate = formData.endDate;
      } else if (formData.ruleType === 'day_of_week') {
        payload.daysOfWeek = formData.daysOfWeek;
      } else if (formData.ruleType === 'time_of_day') {
        payload.startTime = formData.startTime;
        payload.endTime = formData.endTime;
      }

      const response = await fetch(`${API_BASE}/admin/pricing/surge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to create rule');
      }

      await fetchRules();
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingRule) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        multiplier: formData.multiplier,
        isActive: formData.isActive,
        priority: formData.priority,
      };

      if (formData.ruleType === 'specific_dates') {
        payload.dates = formData.dates;
      } else if (formData.ruleType === 'date_range') {
        payload.startDate = formData.startDate;
        payload.endDate = formData.endDate;
      } else if (formData.ruleType === 'day_of_week') {
        payload.daysOfWeek = formData.daysOfWeek;
      } else if (formData.ruleType === 'time_of_day') {
        payload.startTime = formData.startTime;
        payload.endTime = formData.endTime;
      }

      const response = await fetch(`${API_BASE}/admin/pricing/surge/${editingRule.ruleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to update rule');
      }

      await fetchRules();
      setEditingRule(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (ruleId: string) => {
    setDeleteConfirm(ruleId);
  };

  const handleDelete = async (ruleId: string) => {
    setDeleteConfirm(null);
    try {
      const response = await fetch(`${API_BASE}/admin/pricing/surge/${ruleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete rule');
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    setApplyingTemplate(templateId);
    try {
      const response = await fetch(`${API_BASE}/admin/pricing/surge/templates/${templateId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to apply template');
      }

      await fetchRules();
      setShowTemplates(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setApplyingTemplate(null);
    }
  };

  const startEdit = (rule: SurgeRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      ruleType: rule.ruleType,
      multiplier: rule.multiplier,
      isActive: rule.isActive,
      priority: rule.priority,
      dates: rule.dates || [],
      startDate: rule.startDate || '',
      endDate: rule.endDate || '',
      daysOfWeek: rule.daysOfWeek || [],
      startTime: rule.startTime || '',
      endTime: rule.endTime || '',
      newDate: '',
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ruleType: 'specific_dates',
      multiplier: 1.5,
      isActive: true,
      priority: 0,
      dates: [],
      startDate: '',
      endDate: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      newDate: '',
    });
  };

  const addDate = (dateToAdd?: string) => {
    const date = dateToAdd || formData.newDate;
    if (date && !formData.dates.includes(date)) {
      setFormData({
        ...formData,
        dates: [...formData.dates, date].sort(),
        newDate: '',
      });
    }
  };

  const removeDate = (date: string) => {
    setFormData({
      ...formData,
      dates: formData.dates.filter(d => d !== date),
    });
  };

  const toggleDayOfWeek = (day: number) => {
    const newDays = formData.daysOfWeek.includes(day)
      ? formData.daysOfWeek.filter(d => d !== day)
      : [...formData.daysOfWeek, day].sort((a, b) => a - b);
    setFormData({ ...formData, daysOfWeek: newDays });
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'specific_dates': return 'Specific Dates';
      case 'date_range': return 'Date Range';
      case 'day_of_week': return 'Day of Week';
      case 'time_of_day': return 'Time of Day';
      default: return type;
    }
  };

  const getRuleDescription = (rule: SurgeRule) => {
    switch (rule.ruleType) {
      case 'specific_dates':
        return `${rule.dates?.length || 0} dates`;
      case 'date_range':
        return `${rule.startDate} to ${rule.endDate}`;
      case 'day_of_week':
        return rule.daysOfWeek?.map(d => DAY_NAMES[d].slice(0, 3)).join(', ') || 'No days';
      case 'time_of_day':
        return `${rule.startTime} - ${rule.endTime}`;
      default:
        return '';
    }
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'specific_dates': return <Calendar className="w-4 h-4" />;
      case 'date_range': return <Calendar className="w-4 h-4" />;
      case 'day_of_week': return <Calendar className="w-4 h-4" />;
      case 'time_of_day': return <Clock className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-500" />
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Surge Pricing</h2>
              <p className="text-gray-600">Configure peak pricing rules for busy periods</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchRules()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => { setShowCreateForm(true); resetForm(); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-sm text-red-600 hover:text-red-800">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-orange-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">How Surge Pricing Works</p>
            <p className="text-sm text-orange-700 mt-1">
              When multiple rules apply, multipliers stack together (e.g., 1.5x + 1.25x = 1.875x).
              The maximum combined multiplier is capped at 3.0x. Surge pricing only applies to
              distance-based pricing, not hourly or fixed routes.
            </p>
          </div>
        </div>
      </div>

      {/* Active Rules Count */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Rules</p>
          <p className="text-2xl font-bold text-gray-900">{rules.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Rules</p>
          <p className="text-2xl font-bold text-green-600">{rules.filter(r => r.isActive).length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Inactive Rules</p>
          <p className="text-2xl font-bold text-gray-400">{rules.filter(r => !r.isActive).length}</p>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {rules.length === 0 ? (
          <div className="p-12 text-center">
            <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No surge rules yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first surge pricing rule or apply a template to get started.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowTemplates(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Browse Templates
              </button>
              <button
                onClick={() => { setShowCreateForm(true); resetForm(); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Rule
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conditions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Multiplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rules.map((rule) => (
                  <tr key={rule.ruleId} className={!rule.isActive ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      <div className="text-xs text-gray-500">Priority: {rule.priority}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {getRuleTypeIcon(rule.ruleType)}
                        {getRuleTypeLabel(rule.ruleType)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getRuleDescription(rule)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                        {rule.multiplier}x
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(rule)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(rule.ruleId)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateForm || editingRule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRule ? 'Edit Surge Rule' : 'Create Surge Rule'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Christmas Peak Period"
                />
              </div>

              {!editingRule && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
                  <select
                    value={formData.ruleType}
                    onChange={(e) => setFormData({ ...formData, ruleType: e.target.value as SurgeRule['ruleType'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="specific_dates">Specific Dates</option>
                    <option value="date_range">Date Range</option>
                    <option value="day_of_week">Day of Week</option>
                    <option value="time_of_day">Time of Day</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Multiplier ({formData.multiplier}x)
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.05"
                  value={formData.multiplier}
                  onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1.0x (no surge)</span>
                  <span>2.0x</span>
                  <span>3.0x (max)</span>
                </div>
              </div>

              {/* Type-specific fields */}
              {formData.ruleType === 'specific_dates' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dates</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="date"
                      value={formData.newDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          addDate(val);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => addDate()}
                      type="button"
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.dates.map((date) => (
                      <span key={date} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                        {date}
                        <button onClick={() => removeDate(date)} className="text-gray-400 hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.ruleType === 'date_range' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {formData.ruleType === 'day_of_week' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_NAMES.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayOfWeek(index)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          formData.daysOfWeek.includes(index)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.ruleType === 'time_of_day' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Priority:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateForm(false); setEditingRule(null); resetForm(); }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={editingRule ? handleUpdate : handleCreate}
                disabled={saving || !formData.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : editingRule ? (
                  <>
                    <Check className="w-4 h-4" />
                    Update Rule
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Rule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Surge Rule"
        message="Are you sure you want to delete this surge rule? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Quick Templates</h3>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Apply a pre-configured template to quickly set up common surge pricing rules.
              </p>
              <div className="space-y-3">
                {templates.map((template) => (
                  <div key={template.templateId} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            {getRuleTypeIcon(template.ruleType)}
                            {getRuleTypeLabel(template.ruleType)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                            {template.multiplier}x
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplyTemplate(template.templateId)}
                        disabled={applyingTemplate === template.templateId}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {applyingTemplate === template.templateId ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
