'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Edit, Save, X, Loader2, MessageSquare, Check, Download } from 'lucide-react';
import { getDocument, updateDocument, isGitHubError } from '@/lib/services/github-service';

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview'),
  { ssr: false }
);

interface DocumentData {
  content: string;
  sha: string;
  name: string;
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
      const result = await getDocument(slug);

      if (isGitHubError(result)) {
        throw new Error(result.message);
      }

      setDocData({
        content: result.content,
        sha: result.sha,
        name: result.name
      });
      setEditedContent(result.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchComments = useCallback(async () => {
    // Comments feature temporarily disabled - Lambda endpoint not yet deployed
    // Will be re-enabled once document-comments Lambda is available
    return;
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
      const result = await updateDocument(
        slug,
        editedContent,
        docData.sha,
        `Update ${slug} via admin panel`
      );

      if (isGitHubError(result)) {
        throw new Error(result.message);
      }

      setDocData({
        content: result.content,
        sha: result.sha,
        name: result.name
      });
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
    alert('Comments feature coming soon - Lambda endpoint not yet deployed');
    return;
  };

  const handleToggleStatus = async (comment: Comment) => {
    alert('Comments feature coming soon - Lambda endpoint not yet deployed');
    return;
  };

  const handleDeleteComment = async (commentId: string) => {
    alert('Comments feature coming soon - Lambda endpoint not yet deployed');
    return;
  };

  const handleExport = () => {
    if (!docData) return;

    const exportContent = `# ${docData.name}

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
            <h1 className="text-2xl font-bold text-gray-900">{docData.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {activeComments.length} active comment{activeComments.length !== 1 ? 's' : ''}, {resolvedComments.length} resolved
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Stored in GitHub with version control
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {editMode ? (
          <div className="p-6" data-color-mode="dark">
            <MDEditor
              value={editedContent}
              onChange={(val) => setEditedContent(val || '')}
              height={600}
              preview="live"
              hideToolbar={false}
              enableScroll={true}
              visibleDragbar={false}
            />
          </div>
        ) : (
          <div className="p-6" data-color-mode="dark">
            <MarkdownPreview
              source={docData.content}
              style={{ backgroundColor: 'transparent', color: 'inherit' }}
            />
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
