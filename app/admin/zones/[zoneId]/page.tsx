'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import ZoneMapLoader from '@/components/admin/ZoneMapLoader';

interface Zone {
  zoneId: string;
  name: string;
  description: string;
  outwardCodes: string[];
  polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  active: boolean;
}

interface PostcodeArea {
  outwardCode: string;
  lat: number;
  lon: number;
  area: string;
  isDorset: boolean;
}

const API_BASE = 'https://qcfd5p4514.execute-api.eu-west-2.amazonaws.com/dev';
const OUTWARD_CODE_REGEX = /^[A-Z]{1,2}\d{1,2}[A-Z]?$/i;

type InputMode = 'manual' | 'map';

export default function EditZonePage() {
  const router = useRouter();
  const params = useParams();
  const zoneId = params.zoneId as string;

  const [zone, setZone] = useState<Zone | null>(null);
  const [postcodeAreas, setPostcodeAreas] = useState<PostcodeArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('manual');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOutwardCodes, setFormOutwardCodes] = useState<string[]>([]);
  const [formPolygon, setFormPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [formActive, setFormActive] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    fetchZone();
    fetchPostcodeAreas();
  }, [zoneId]);

  const fetchZone = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/zones/${zoneId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/admin/zones');
          return;
        }
        throw new Error('Failed to fetch zone');
      }

      const data = await response.json();
      const zoneData = data.zone;
      setZone(zoneData);
      setFormName(zoneData.name);
      setFormDescription(zoneData.description || '');
      setFormOutwardCodes([...zoneData.outwardCodes]);
      setFormPolygon(zoneData.polygon as GeoJSON.Polygon || null);
      setFormActive(zoneData.active);
      setInputMode(zoneData.polygon ? 'map' : 'manual');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load zone');
    } finally {
      setLoading(false);
    }
  };

  const fetchPostcodeAreas = async () => {
    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/postcodes`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPostcodeAreas(data.postcodes || []);
      }
    } catch (err) {
      console.error('Failed to fetch postcode areas:', err);
    }
  };

  const handleAddCode = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;

    if (!OUTWARD_CODE_REGEX.test(code)) {
      setCodeError('Invalid UK outward code format (e.g., BH1, DT3, SO41)');
      return;
    }

    if (formOutwardCodes.includes(code)) {
      setCodeError('Code already added');
      return;
    }

    setFormOutwardCodes([...formOutwardCodes, code]);
    setCodeInput('');
    setCodeError(null);
  };

  const handleRemoveCode = (code: string) => {
    setFormOutwardCodes(formOutwardCodes.filter((c) => c !== code));
  };

  const handleCodeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddCode();
    }
  };

  const handlePasteCodes = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const codes = pastedText.split(/[\s,;]+/).filter(Boolean);
    const validCodes: string[] = [];
    const invalidCodes: string[] = [];

    codes.forEach((code) => {
      const upperCode = code.toUpperCase();
      if (OUTWARD_CODE_REGEX.test(upperCode) && !formOutwardCodes.includes(upperCode) && !validCodes.includes(upperCode)) {
        validCodes.push(upperCode);
      } else if (!OUTWARD_CODE_REGEX.test(upperCode)) {
        invalidCodes.push(code);
      }
    });

    if (validCodes.length > 0) {
      setFormOutwardCodes([...formOutwardCodes, ...validCodes]);
    }

    if (invalidCodes.length > 0) {
      setCodeError(`Invalid codes: ${invalidCodes.join(', ')}`);
    } else {
      setCodeError(null);
    }
    setCodeInput('');
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Zone name is required');
      return;
    }

    if (formOutwardCodes.length === 0) {
      setError('At least one outward code is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('durdle_admin_token');
      const response = await fetch(`${API_BASE}/admin/zones/${zoneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          outwardCodes: formOutwardCodes,
          polygon: formPolygon || undefined,
          active: formActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update zone');
      }

      router.push('/admin/zones');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update zone');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Zone not found</p>
        <Link href="/admin/zones" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to Zones
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/zones"
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Zones
        </Link>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Edit Zone</h2>
        <p className="text-gray-600">Modify the postcode zone configuration</p>
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Zone Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name *</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Bournemouth Urban"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of the zone coverage area"
          />
        </div>

        {/* Input Mode Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Postcode Selection Method</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode('map')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Map Selection
            </button>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Manual Entry
            </button>
          </div>
        </div>

        {/* Map Selection Mode */}
        {inputMode === 'map' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Draw Zone on Map <span className="text-gray-400 font-normal">({formOutwardCodes.length} codes selected)</span>
            </label>
            <ZoneMapLoader
              selectedCodes={formOutwardCodes}
              onCodesChange={setFormOutwardCodes}
              existingPolygon={formPolygon}
              onPolygonChange={setFormPolygon}
              postcodeAreas={postcodeAreas}
              height="500px"
            />
          </div>
        )}

        {/* Manual Entry Mode */}
        {inputMode === 'manual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outward Codes * <span className="text-gray-400 font-normal">({formOutwardCodes.length} codes)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  setCodeError(null);
                }}
                onKeyDown={handleCodeInputKeyDown}
                onPaste={handlePasteCodes}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type code and press Enter (e.g., BH1)"
              />
              <button
                type="button"
                onClick={handleAddCode}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            {codeError && <p className="text-sm text-red-600 mb-2">{codeError}</p>}
            <p className="text-xs text-gray-500 mb-2">Tip: Paste multiple codes separated by commas or spaces</p>
          </div>
        )}

        {/* Selected Codes Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Selected Postcodes ({formOutwardCodes.length})
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-[60px] max-h-[200px] overflow-y-auto">
            {formOutwardCodes.length === 0 ? (
              <span className="text-gray-400 text-sm">No codes selected yet</span>
            ) : (
              formOutwardCodes.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                >
                  {code}
                  <button
                    type="button"
                    onClick={() => handleRemoveCode(code)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-700">Active</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving || !formName.trim() || formOutwardCodes.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/admin/zones"
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
