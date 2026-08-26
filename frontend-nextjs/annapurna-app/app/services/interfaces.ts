export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  username?: string;
  imageUrl?: string;
}

export interface AuthResponse {
  message?: string;
  token: string;
  expires_in?: number;
  user: {
    id: string;
    name: string;
    email: string;
    username?: string;
    imageUrl?: string | null;
  };
}

export interface AuthError {
  message: string;
  status?: number;
}
