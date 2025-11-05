import { useAppStore } from '../store/useAppStore';

type RequestOptions = RequestInit & { skipAuth?: boolean };

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { apiBaseUrl, apiToken } = useAppStore.getState();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (!options.skipAuth && apiToken) {
    headers.set('Authorization', `Bearer ${apiToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
