/**
 * Authentication Service
 * 
 * Handles authentication flows for the Chrome extension
 * - Login/logout
 * - Token management
 * - Session persistence
 * - Sync with web app
 * 
 * FIXED: Now listens to storage changes to sync across contexts
 */

import { apiClient } from './api';
import { User } from '../shared/types';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

/**
 * Authentication Service
 */
class AuthService {
  private listeners: Set<(state: AuthState) => void> = new Set();
  private currentState: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: true,
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize auth service
   * FIXED: Now listens to storage changes for cross-context sync
   */
  private async initialize(): Promise<void> {
    await this.checkAuthStatus();
    
    // Listen for auth changes from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'AUTH_STATE_CHANGED') {
        console.log('📨 AUTH_STATE_CHANGED message received', sender, sendResponse);
        this.checkAuthStatus();
      }
    });

    // CRITICAL: Listen for storage changes across all contexts
    // This ensures popup, sidepanel, and background stay in sync
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.auth) {
        console.log('🔄 Auth storage changed in SidePanel!', {
          had: !!changes.auth.oldValue,
          now: !!changes.auth.newValue,
        });
        this.checkAuthStatus();
      }
    });

    console.log('✅ Auth service initialized');
  }

  /**
   * Check current authentication status
   */
  async checkAuthStatus(): Promise<AuthState> {
    try {
      const isAuth = await apiClient.isAuthenticated();
      const user = isAuth ? await apiClient.getUser() : null;

      this.updateState({
        isAuthenticated: isAuth,
        user,
        loading: false,
      });

      console.log('✅ Auth status checked:', {
        isAuthenticated: isAuth,
        user: user?.email || 'none',
      });

      return this.currentState;
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      
      this.updateState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });

      return this.currentState;
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    try {
      this.updateState({ ...this.currentState, loading: true });

      await apiClient.login(email, password);
      
      // Get user data
      const user = await apiClient.getUser();
      
      this.updateState({
        isAuthenticated: true,
        user,
        loading: false,
      });

      // Notify other parts of extension
      this.broadcastAuthChange();

      // Track login
      this.trackEvent('extension_login', { method: 'email' });

      console.log('✅ Login successful:', user?.email);

    } catch (error) {
      this.updateState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
      throw error;
    }
  }

  /**
   * Signup with email and password
   */
  async signup(email: string, password: string): Promise<void> {
    try {
      this.updateState({ ...this.currentState, loading: true });

      await apiClient.signup(email, password);
      
      // Get user data
      const user = await apiClient.getUser();
      
      this.updateState({
        isAuthenticated: true,
        user,
        loading: false,
      });

      // Notify other parts of extension
      this.broadcastAuthChange();

      // Track signup
      this.trackEvent('extension_signup', { method: 'email' });

      console.log('✅ Signup successful:', user?.email);

    } catch (error) {
      this.updateState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.logout();
      
      this.updateState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });

      // Clear cache
      await chrome.storage.local.remove(['cachedExplanations', 'lastSync']);

      // Notify other parts of extension
      this.broadcastAuthChange();

      // Track logout
      this.trackEvent('extension_logout');

      console.log('✅ Logout successful');

    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }

  /**
   * Open web app for login
   */
  async loginWithWebApp(): Promise<void> {
    // Open web app in new tab
    const tab = await chrome.tabs.create({
      url: `${process.env.VITE_API_URL || 'https://stupify.app'}/login?redirect=extension`,
    });

    console.log('🌐 Opened web app for login, tab:', tab.id);

    // Listen for auth completion
    return new Promise((resolve, reject) => {
      const listener = async (message: any) => {
        if (message.type === 'WEB_AUTH_COMPLETE' && message.tabId === tab.id) {
          chrome.runtime.onMessage.removeListener(listener);
          
          console.log('✅ Web auth completed, checking status...');
          
          // Check auth status
          await this.checkAuthStatus();
          
          if (this.currentState.isAuthenticated) {
            resolve();
          } else {
            reject(new Error('Authentication failed'));
          }
        }
      };

      chrome.runtime.onMessage.addListener(listener);

      // Timeout after 5 minutes
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error('Authentication timeout'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.currentState };
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(callback: (state: AuthState) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current state
    callback(this.currentState);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(newState: AuthState): void {
    this.currentState = newState;
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(newState);
      } catch (error) {
        console.error('❌ Auth listener error:', error);
      }
    });
  }

  /**
   * Broadcast auth change to all extension parts
   */
  private broadcastAuthChange(): void {
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      payload: this.currentState,
    }).catch(() => {
      // Ignore errors (extension might be reloading)
    });
  }

  /**
   * Track analytics event
   */
  private trackEvent(eventName: string, properties?: Record<string, any>): void {
    chrome.runtime.sendMessage({
      type: 'TRACK_EVENT',
      payload: {
        event: eventName,
        properties: {
          ...properties,
          timestamp: Date.now(),
        },
      },
    }).catch(() => {
      // Ignore errors
    });
  }

  /**
   * Sync auth state with web app
   * FIXED: Save to nested auth structure
   */
  async syncWithWebApp(): Promise<void> {
    try {
      // Query all tabs to find Stupify web app
      const tabs = await chrome.tabs.query({ 
        url: `${process.env.VITE_API_URL || 'https://stupify.app'}/*` 
      });

      if (tabs.length === 0) {
        console.log('No web app tabs found');
        return;
      }

      console.log(`Found ${tabs.length} web app tab(s), syncing...`);

      // Request auth state from web app
      for (const tab of tabs) {
        if (tab.id) {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, {
              type: 'GET_AUTH_STATE',
            });

            if (response && response.isAuthenticated) {
              console.log('✅ Got auth state from web app, saving...');
              
              // FIXED: Save to nested auth structure
              await chrome.storage.local.set({
                auth: {
                  accessToken: response.accessToken,
                  refreshToken: response.refreshToken,
                  user: response.user,
                }
              });

              await this.checkAuthStatus();
              break;
            }
          } catch {
            // Tab might not have content script
          }
        }
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
    }
  }

  /**
   * Check if user has premium subscription
   */
  isPremium(): boolean {
    return this.currentState.user?.subscription_tier === 'premium';
  }

  /**
   * Get user email
   */
  getUserEmail(): string | null {
    return this.currentState.user?.email || null;
  }

  /**
   * Get user ID
   */
  getUserId(): string | null {
    return this.currentState.user?.id || null;
  }
}

// Export singleton instance
export const authService = new AuthService();