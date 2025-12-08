'use client';

import { ArrowLeft, Edit, Save, X, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

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

export default function DocumentViewerPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [docData, setDocData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    fetchDocument();
  }, [slug, fetchDocument]);

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
            <p className="text-xs text-gray-500 mt-1">
              Stored in GitHub with version control
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
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
    </div>
  );
}
