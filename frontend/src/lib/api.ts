const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isNative = typeof window !== 'undefined' && (
  window.location.protocol === 'capacitor:' || 
  window.location.href.includes('android') || 
  /android/i.test(navigator.userAgent)
);

export const API_BASE_URL = isNative
  ? 'http://10.42.48.117:8000'
  : (hostname === 'localhost' || hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : `http://${hostname}:8000`;

export async function apiRequest<T>(
  path: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network request failed' }));
    throw new Error(errorData.detail || 'Network request failed');
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) as T : {} as T;
}
