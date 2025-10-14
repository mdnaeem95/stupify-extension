// Auth Store - Manages authentication state

import { create } from 'zustand';
import type { User } from '../shared/types';
import { authStorage, userStorage } from '../lib/storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setToken: (token) => {
    set({ token, isAuthenticated: !!token });
  },

  login: async (user, token) => {
    // Save to storage
    await authStorage.set(token);
    await userStorage.set(user);
    
    // Update state
    set({ 
      user, 
      token, 
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    // Clear storage
    await authStorage.remove();
    await userStorage.remove();
    
    // Clear state
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    
    try {
      const token = await authStorage.get();
      const user = await userStorage.get();
      
      if (token && user) {
        set({ 
          token, 
          user, 
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } else {
        set({ 
          token: null, 
          user: null, 
          isAuthenticated: false,
          isLoading: false,
        });
        return false;
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      set({ 
        token: null, 
        user: null, 
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },

  refreshToken: async () => {
    // TODO: Implement token refresh logic with API
    // For now, just return the current auth status
    return get().isAuthenticated;
  },
}));

// Initialize auth state on load
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}