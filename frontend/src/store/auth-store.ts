import { create } from 'zustand';
import { api } from '@/lib/api';

export interface UserPreference {
  id?: string;
  theme?: string;
  timezone?: string;
  energyLevel?: number;
  morningBriefingEnabled?: boolean;
  morningBriefingTime?: string;
  nightReviewEnabled?: boolean;
  nightReviewTime?: string;
  dailyWaterTargetMl?: number;
  defaultPomodoroLength?: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
  preference?: UserPreference;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  login: (data: { email: string; password: string }) => Promise<void>;
  loginDemo: () => void;
  register: (data: { email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<User & UserPreference>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/auth/me');
      if (response.data?.success && response.data?.user) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
          error: null,
        });
        return;
      }
    } catch {
      // Backend returned 401 or token invalid
    }

    if (typeof window !== 'undefined') {
      const demoSaved = localStorage.getItem('lifepilot_demo_session');
      const token = localStorage.getItem('lifepilot_token');
      // Only keep demo session if there is no real token flow
      if (demoSaved && !token) {
        try {
          const user = JSON.parse(demoSaved);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
          return;
        } catch {}
      }
    }

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    });
  },

  loginDemo: () => {
    const demoUser: User = {
      id: 'demo-pilot-001',
      email: 'pilot@lifepilot.ai',
      fullName: 'Alex Vance',
      role: 'USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preference: {
        theme: 'dark',
        timezone: 'UTC',
        energyLevel: 4,
        morningBriefingEnabled: true,
        morningBriefingTime: '07:30',
        nightReviewEnabled: true,
        nightReviewTime: '21:30',
        dailyWaterTargetMl: 2500,
        defaultPomodoroLength: 25,
      },
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifepilot_demo_session', JSON.stringify(demoUser));
    }
    set({
      user: demoUser,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data?.success && response.data?.user) {
        if (response.data.token && typeof window !== 'undefined') {
          localStorage.setItem('lifepilot_token', response.data.token);
          localStorage.removeItem('lifepilot_demo_session');
        }
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      set({
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', data);
      if (response.data?.success && response.data?.user) {
        if (response.data.token && typeof window !== 'undefined') {
          localStorage.setItem('lifepilot_token', response.data.token);
          localStorage.removeItem('lifepilot_demo_session');
        }
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed.';
      set({
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lifepilot_token');
        localStorage.removeItem('lifepilot_demo_session');
      }
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch('/auth/profile', data);
      if (response.data?.success && response.data?.profile) {
        set({
          user: response.data.profile,
          isLoading: false,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile.';
      set({
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },
}));
