'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Trash2, RefreshCw } from 'lucide-react';

interface Feedback {
  feedbackId: string;
  type: string;
  page: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('durdle_admin_token');

      const response = await fetch('https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/feedback', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }

      const data = await response.json();
      setFeedback(data.feedback || []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const updateStatus = async (feedbackId: string, newStatus: string) => {
    setUpdatingId(feedbackId);

    try {
      const token = localStorage.getItem('durdle_admin_token');

      const response = await fetch(`https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update feedback');
      }

      fetchFeedback();
    } catch (err) {
      console.error('Error updating feedback:', err);
      alert('Failed to update feedback status');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    setUpdatingId(feedbackId);

    try {
      const token = localStorage.getItem('durdle_admin_token');

      const response = await fetch(`https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete feedback');
      }

      fetchFeedback();
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback');
    } finally {
      setUpdatingId(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Bug':
        return 'bg-red-100 text-red-800';
      case 'Feature':
        return 'bg-blue-100 text-blue-800';
      case 'Copy Change':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-yellow-100 text-yellow-800';
      case 'Done':
        return 'bg-green-100 text-green-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
            <p className="text-sm text-gray-600">
              {feedback.length} total submissions
            </p>
          </div>
        </div>
        <button
          onClick={fetchFeedback}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {feedback.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No feedback yet</h3>
          <p className="text-gray-500">
            Feedback submissions will appear here when users submit them
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feedback.map((item) => (
                  <tr key={item.feedbackId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.page}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div
                        onClick={() => setExpandedId(expandedId === item.feedbackId ? null : item.feedbackId)}
                        className={`cursor-pointer hover:bg-gray-100 rounded p-1 -m-1 ${expandedId === item.feedbackId ? '' : 'line-clamp-2'}`}
                        title={expandedId === item.feedbackId ? 'Click to collapse' : 'Click to expand'}
                      >
                        {item.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item.feedbackId, e.target.value)}
                        disabled={updatingId === item.feedbackId}
                        className={`px-2 py-1 text-xs font-semibold rounded-full border-none ${getStatusColor(item.status)} disabled:opacity-50`}
                      >
                        <option value="New">New</option>
                        <option value="Done">Done</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => deleteFeedback(item.feedbackId)}
                        disabled={updatingId === item.feedbackId}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
