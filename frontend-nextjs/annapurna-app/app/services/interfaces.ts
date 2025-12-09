export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface RegisterData {
    name: string;
    email: string;
    password: string;
    username?: string;
    userRole?: string;
  }
  
  export interface AuthResponse {
    message?: string;
    token: string;
    expires_in?: number;
    user: {
      id: string;
      name: string;
      email?: string;
      user_role?: string;
    };
  }
  
  export interface AuthError {
    message: string;
    status?: number;
  }

