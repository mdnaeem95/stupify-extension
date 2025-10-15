/**
 * API Client Service
 * 
 * Handles all HTTP communication with Stupify backend
 * - Authentication token management
 * - Request/response interceptors
 * - Error handling
 * - Retry logic
 */

const API_BASE_URL = process.env.VITE_API_URL || 'https://stupify.ai';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
  retries?: number;
  timeout?: number;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Core API Client
 */
class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.loadTokens();
  }

  /**
   * Load tokens from chrome.storage
   */
  private async loadTokens(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['accessToken', 'refreshToken']);
      this.accessToken = result.accessToken || null;
      this.refreshToken = result.refreshToken || null;
    } catch (error) {
      console.error('❌ Failed to load tokens:', error);
    }
  }

  /**
   * Save tokens to chrome.storage
   */
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    await chrome.storage.local.set({
      accessToken,
      refreshToken,
    });
  }

  /**
   * Clear tokens
   */
  private async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    
    await chrome.storage.local.remove(['accessToken', 'refreshToken', 'user']);
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) {
      await this.loadTokens();
    }
    return this.accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        if (!this.refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            refresh_token: this.refreshToken,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        
        if (data.access_token && data.refresh_token) {
          await this.saveTokens(data.access_token, data.refresh_token);
        } else {
          throw new Error('Invalid token response');
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        await this.clearTokens();
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Make authenticated request with retry logic
   */
  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      requiresAuth = true,
      retries = 3,
      timeout = 30000,
      ...fetchConfig
    } = config;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Build headers
        const headers = new Headers(fetchConfig.headers);
        headers.set('Content-Type', 'application/json');

        // Add auth token if required
        if (requiresAuth) {
          const token = await this.getAccessToken();
          if (!token) {
            throw new Error('Not authenticated');
          }
          headers.set('Authorization', `Bearer ${token}`);
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Make request
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...fetchConfig,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle 401 - token expired
        if (response.status === 401 && requiresAuth && attempt < retries - 1) {
          console.log('🔄 Token expired, refreshing...');
          await this.refreshAccessToken();
          continue; // Retry with new token
        }

        // Handle other errors
        if (!response.ok) {
          const error: ApiError = {
            message: `Request failed: ${response.statusText}`,
            status: response.status,
          };

          try {
            const errorData = await response.json();
            error.message = errorData.error || errorData.message || error.message;
            error.code = errorData.code;
          } catch {
            // Response is not JSON
          }

          throw error;
        }

        // Parse response
        const data = await response.json();
        return data as T;

      } catch (error) {
        lastError = error as Error;

        // Don't retry on auth errors
        if ((error as ApiError).status === 401 || (error as ApiError).status === 403) {
          throw error;
        }

        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || error.message || 'Login failed');
    }

    const data = await response.json();
    
    if (!data.access_token || !data.refresh_token) {
      throw new Error('Invalid login response');
    }

    await this.saveTokens(data.access_token, data.refresh_token);

    // Save user data
    if (data.user) {
      await chrome.storage.local.set({ user: data.user });
    }
  }

  /**
   * Signup with email and password
   */
  async signup(email: string, password: string): Promise<void> {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || error.message || 'Signup failed');
    }

    const data = await response.json();
    
    if (!data.access_token || !data.refresh_token) {
      throw new Error('Invalid signup response');
    }

    await this.saveTokens(data.access_token, data.refresh_token);

    // Save user data
    if (data.user) {
      await chrome.storage.local.set({ user: data.user });
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      // Revoke token on server
      if (this.accessToken) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'apikey': SUPABASE_ANON_KEY!,
          },
        });
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      await this.clearTokens();
    }
  }

  /**
   * Get current user
   */
  async getUser(): Promise<any> {
    const result = await chrome.storage.local.get(['user']);
    return result.user || null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Check daily usage limit
   */
  async checkUsage(): Promise<{ remaining: number; limit: number; resetAt: string }> {
    return this.request('/api/usage', { requiresAuth: true });
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<any> {
    return this.request('/api/user/profile', { requiresAuth: true });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiError, RequestConfig };