/**
 * Thin admin API helper - attaches admin JWT from localStorage and
 * exposes quote-related endpoints used by the admin UI.
 */
import { getApiUrl, API_ENDPOINTS } from '../config/api';
import { QuoteFilters } from '../types/quotes';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('durdle_admin_token');
}

function buildQuery(params: Record<string, unknown> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach(x => qs.append(k, String(x)));
    } else {
      qs.set(k, String(v));
    }
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

async function authFetch(inputUrl: string, opts: RequestInit = {}): Promise<Response | unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(inputUrl, { ...opts, headers, credentials: 'include' });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }

  // For non-JSON responses (csv blob) callers will handle
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res;
}

export async function listQuotes(filters: QuoteFilters = {}): Promise<unknown> {
  const url = `${getApiUrl(API_ENDPOINTS.adminQuotes)}${buildQuery(filters as Record<string, unknown>)}`;
  return authFetch(url, { method: 'GET' });
}

export async function getQuoteDetails(quoteId: string): Promise<unknown> {
  const encoded = encodeURIComponent(quoteId);
  const url = `${getApiUrl(`${API_ENDPOINTS.adminQuotes}/${encoded}`)}`;
  return authFetch(url, { method: 'GET' });
}

export async function exportQuotes(filters: QuoteFilters = {}): Promise<Blob> {
  const url = `${getApiUrl(API_ENDPOINTS.adminQuotesExport)}${buildQuery(filters as Record<string, unknown>)}`;
  const res = (await authFetch(url, { method: 'GET' })) as Response;
  // If authFetch returned parsed JSON, wrap; otherwise it's a Response
  if (res instanceof Response) return res.blob();
  // fallback: return blob from JSON (unlikely)
  throw new Error('Unexpected response when exporting CSV');
}

const adminApi = {
  listQuotes,
  getQuoteDetails,
  exportQuotes,
};

export default adminApi;
