import { sessionOnlyStorage } from './sessionOnlyStorage';

// backend base URL (include prefix if you want, e.g. http://localhost:3000/api/v1)
const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// optional prefix (can also be baked into VITE_BACKEND_URL)
const PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';

const TOKEN_KEY = 'godfray_access_token';

export function setAccessToken(token: string) {
  sessionOnlyStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  sessionOnlyStorage.removeItem(TOKEN_KEY);
}

export function getStoredAccessToken(): string | null {
  return sessionOnlyStorage.getItem(TOKEN_KEY);
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('No access token available');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export type RequestOptions = {
  includeAuth?: boolean;
  rawResponse?: boolean;
};

export async function apiRequest<T = any>(method: string, path: string, body?: any, opts: RequestOptions = {}) {
  const url = `${BASE}${PREFIX}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (opts.includeAuth ?? true) {
    const token = getStoredAccessToken();
    if (!token) throw new Error('Not authenticated');
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (opts.rawResponse) return res as unknown as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message || data?.error || res.statusText || 'Request failed';
    throw new Error(message);
  }

  if (data && typeof data === 'object' && data.success === false) {
    const msg = data.message || (data.error && data.error.code) || 'API error';
    throw new Error(msg);
  }

  return data?.data ?? data as T;
}

export default {
  setAccessToken,
  clearAccessToken,
  getStoredAccessToken,
  getAuthHeaders,
  apiRequest,
};
