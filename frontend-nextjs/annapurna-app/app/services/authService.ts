

import { LoginCredentials, RegisterData, AuthResponse, AuthError } from './interfaces';

const API_BASE_URL = 'http://localhost:3001/api/auth';

class AuthService {
  /**
   * Login with email and password
   * @param credentials - Login credentials
   * @returns Promise with auth response containing token and user data
   * @throws AuthError if login fails
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // The backend expects the GraphQL action format: { input: { input: { email, password } } }
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            input: {
              email: credentials.email,
              password: credentials.password,
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          message: data.message || 'Login failed',
          status: response.status,
        } as AuthError;
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
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

  /**
   * Register a new user
   * @param registerData - Registration data
   * @returns Promise with auth response containing token and user data
   * @throws AuthError if registration fails
   */
  async register(registerData: RegisterData): Promise<AuthResponse> {
    try {
      // The backend expects the GraphQL action format: { input: { input: { ... } } }
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            input: {
              name: registerData.name,
              email: registerData.email,
              password: registerData.password,
              username: registerData.username,
              userRole: registerData.userRole || 'patient', // Default to patient if not specified
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          message: data.message || 'Registration failed',
          status: response.status,
        } as AuthError;
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
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

  /**
   * Logout the current user
   */
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  /**
   * Get the current auth token
   * @returns The auth token or null if not logged in
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
  }

  /**
   * Get the current user data
   * @returns The user data or null if not logged in
   */
  getUser(): AuthResponse['user'] | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * @returns True if user has a valid token
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}

// Export a singleton instance
export const authService = new AuthService();
export default authService;

