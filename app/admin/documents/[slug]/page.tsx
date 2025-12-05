'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ArrowLeft, Edit, Save, X, Loader2, MessageSquare, Check, Download } from 'lucide-react';

interface DocumentData {
  filename: string;
  content: string;
  lastModified: string;
}

interface Comment {
  commentId: string;
  documentPath: string;
  username: string;
  comment: string;
  status: 'active' | 'resolved';
  created: string;
  updated: string;
}

export default function DocumentViewerPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [docData, setDocData] = useState<DocumentData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [username, setUsername] = useState('');

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/documents/${slug}`);

      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const data = await response.json();
      setDocData(data);
      setEditedContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/documents/${slug}/comments`
      );

      if (!response.ok) {
        console.error('Failed to fetch comments');
        return;
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  }, [slug]);

  useEffect(() => {
    fetchDocument();
    fetchComments();

    const storedUsername = localStorage.getItem('durdle_admin_username') || 'Admin';
    setUsername(storedUsername);
  }, [slug, fetchDocument, fetchComments]);

  const handleSave = async () => {
    if (!docData) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/documents/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editedContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      const updated = await response.json();
      setDocData(updated);
      setEditMode(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(docData?.content || '');
    setEditMode(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setAddingComment(true);
      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/documents/${slug}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            comment: newComment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setNewComment('');
      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const handleToggleStatus = async (comment: Comment) => {
    try {
      const newStatus = comment.status === 'active' ? 'resolved' : 'active';
      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/documents/${slug}/comments/${comment.commentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update comment status');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(
        `https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev/admin/documents/${slug}/comments/${commentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  const handleExport = () => {
    if (!docData) return;

    const exportContent = `# ${docData.filename}

${docData.content}

---

## Comments (${comments.length})

${comments.length === 0 ? 'No comments yet.' : comments.map(c => `
### Comment by ${c.username} - ${c.status === 'resolved' ? 'RESOLVED' : 'ACTIVE'}
**Created:** ${new Date(c.created).toLocaleString()}
**Updated:** ${new Date(c.updated).toLocaleString()}

${c.comment}

---
`).join('\n')}

---
Generated: ${new Date().toLocaleString()}
`;

    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-with-comments.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !docData) {
    return (
      <div>
        <Link
          href="/admin/documents"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Document not found'}</p>
        </div>
      </div>
    );
  }

  const activeComments = comments.filter(c => c.status === 'active');
  const resolvedComments = comments.filter(c => c.status === 'resolved');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/documents"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </Link>

        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{docData.filename}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Last modified: {new Date(docData.lastModified).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {activeComments.length} active comment{activeComments.length !== 1 ? 's' : ''}, {resolvedComments.length} resolved
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {editMode ? (
          <div className="p-6">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-[600px] font-mono text-sm border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter markdown content..."
            />
          </div>
        ) : (
          <div className="prose prose-sm sm:prose lg:prose-lg max-w-none p-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {docData.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Comments section */}
      {!editMode && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              <MessageSquare className="inline w-5 h-5 mr-2" />
              Comments
            </h2>
          </div>

          {/* Add Comment */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
              placeholder="Add a comment..."
            />
            <button
              onClick={handleAddComment}
              disabled={addingComment || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {addingComment ? 'Adding...' : 'Add Comment'}
            </button>
          </div>

          {/* Active Comments */}
          {activeComments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Comments</h3>
              <div className="space-y-3">
                {activeComments.map((comment) => (
                  <div key={comment.commentId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{comment.username}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleStatus(comment)}
                          className="text-green-600 hover:text-green-700 text-sm"
                          title="Mark as resolved"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.commentId)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolved Comments */}
          {resolvedComments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Resolved Comments</h3>
              <div className="space-y-3">
                {resolvedComments.map((comment) => (
                  <div key={comment.commentId} className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-75">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-700">{comment.username}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleStatus(comment)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                          title="Mark as active"
                        >
                          Reopen
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.commentId)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {comments.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No comments yet. Add the first comment above!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
