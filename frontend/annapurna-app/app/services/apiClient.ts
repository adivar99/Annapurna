// Resolve the API origin once per module load. NEXT_PUBLIC_API_URL wins when
// set (build-time inlined); otherwise we derive the origin from wherever the
// site is being served from, so the app works on LAN IPs/hostnames and not
// just localhost. Example: site opened at http://192.168.1.20:3004 talks to
// http://192.168.1.20:3001.
export function apiOrigin(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    // Strip a trailing /api/v1-style path if someone set the full base here;
    // callers of apiOrigin() want the bare origin.
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api(\/v1)?\/?$/, '');
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

const API_ORIGIN = apiOrigin();
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || `${API_ORIGIN}/api/v1`;

// WebSocket base for realtime endpoints: same host as the API origin, with
// the scheme flipped (http->ws, https->wss).
export function apiWsBase(): string {
  return API_ORIGIN.replace(/^http/, 'ws');
}

export class ApiClient {
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token');
  }

  static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // If endpoint already starts with http, use as is; otherwise prepend BASE_URL
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${cleanEndpoint}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      throw new Error(errorData.message || errorData.error || `HTTP error ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  static get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  static post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  static async uploadFile(file: File, endpoint?: string): Promise<any> {
    const uploadUrl = endpoint || `${API_ORIGIN}/api/files/upload-image`;
    const token = this.getToken();
    const formData = new FormData();
    formData.append('image', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || 'File upload failed');
    }

    return response.json();
  }
}
