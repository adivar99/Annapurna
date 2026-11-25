import { LoginCredentials, RegisterData, AuthResponse, AuthError } from './interfaces';
import { User } from '../models/user';
import { ApiClient, apiOrigin } from './apiClient';

// NEXT_PUBLIC_AUTH_URL wins when set; otherwise derive the origin from the
// serving host (same scheme/host as the site, API port) so logins work from
// LAN addresses, not just localhost. Kept in sync with apiClient's resolver.
const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_URL || `${apiOrigin()}/api/auth`;

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: credentials.email,
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          message: data.message || 'Login failed',
          status: response.status,
        } as AuthError;
      }

      if (data.token) {
        this.saveAuth(data.token, data.user);
      }

      return data;
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw error;
      }
      throw {
        message: 'Network error. Please check your connection.',
        status: 0,
      } as AuthError;
    }
  }

  async register(registerData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${AUTH_API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          username: registerData.username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          message: data.message || 'Registration failed',
          status: response.status,
        } as AuthError;
      }

      if (data.token) {
        this.saveAuth(data.token, data.user);
      }

      return data;
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw error;
      }
      throw {
        message: 'Network error. Please check your connection.',
        status: 0,
      } as AuthError;
    }
  }

  async refreshCurrentUser(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const user = await ApiClient.get<User>('/auth/me');
      if (user && typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
      return user;
    } catch (error) {
      console.warn('Failed to refresh current user:', error);
      return this.getUser() as User;
    }
  }

  saveAuth(token: string, user?: any): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
    localStorage.setItem('authToken', token);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    ApiClient.post('/auth/logout').catch(() => {});
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  }

  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}

export const authService = new AuthService();
export default authService;
