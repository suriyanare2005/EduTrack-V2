import { create } from 'zustand';
import { apiRequest } from '../lib/api';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  created_at: string;
}

interface AuthState {
  user: any | null; // Supabase/JWT user shape
  profile: UserProfile | null;
  session: string | null; // JWT token string or session object
  loading: boolean;
  setUser: (user: any) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSession: (session: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;

  // API triggers
  loginAction: (email: string, password: string) => Promise<any>;
  registerAction: (email: string, password: string, fullName: string) => Promise<any>;
  googleLoginAction: (idToken: string) => Promise<any>;
  updateProfileAction: (fullName: string, email: string) => Promise<UserProfile>;
  checkSessionAction: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  
  clearAuth: () => {
    localStorage.removeItem('token');
    set({ user: null, profile: null, session: null, loading: false });
  },

  loginAction: async (email, password) => {
    const data = await apiRequest<{ access_token: string; token_type: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('token', data.access_token);
    
    const userProfile: UserProfile = {
      id: data.user.id,
      fullName: data.user.full_name,
      email: data.user.email,
      created_at: data.user.created_at,
    };

    set({
      user: data.user,
      profile: userProfile,
      session: data.access_token,
      loading: false,
    });

    return data.user;
  },

  registerAction: async (email, password, fullName) => {
    const user = await apiRequest<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    return user;
  },

  googleLoginAction: async (idToken) => {
    const data = await apiRequest<{ access_token: string; token_type: string; user: any }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });

    localStorage.setItem('token', data.access_token);
    
    const userProfile: UserProfile = {
      id: data.user.id,
      fullName: data.user.full_name,
      email: data.user.email,
      created_at: data.user.created_at,
    };

    set({
      user: data.user,
      profile: userProfile,
      session: data.access_token,
      loading: false,
    });

    return data.user;
  },

  updateProfileAction: async (fullName, email) => {
    const user = await apiRequest<any>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ fullName, email }),
    });
    const userProfile: UserProfile = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      created_at: user.created_at,
    };
    set({
      user,
      profile: userProfile,
    });
    return userProfile;
  },

  checkSessionAction: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ loading: false });
      return;
    }

    try {
      const user = await apiRequest<any>('/api/auth/me');
      const userProfile: UserProfile = {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        created_at: user.created_at,
      };

      set({
        user,
        profile: userProfile,
        session: token,
        loading: false,
      });
    } catch (err) {
      // Token is invalid or expired
      get().clearAuth();
    }
  },
}));
