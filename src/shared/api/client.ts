import { getClientBasePath, withBasePath } from '@/utils/basePath';

export const CLIENT_BASE_PATH = getClientBasePath();
export const API_BASE_PATH = withBasePath('/api', CLIENT_BASE_PATH);

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath === '/api') {
    return API_BASE_PATH;
  }
  if (normalizedPath.startsWith('/api/')) {
    return `${API_BASE_PATH}${normalizedPath.slice('/api'.length)}`;
  }
  return withBasePath(normalizedPath, CLIENT_BASE_PATH);
}

export function buildQuery(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    searchParams.set(key, String(value));
  }
  const encoded = searchParams.toString();
  return encoded ? `?${encoded}` : '';
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(apiUrl(url));
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
