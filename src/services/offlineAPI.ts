/**
 * Enhanced API Service with Offline Support
 * 
 * Upgrades existing API client to:
 * - Use offlineStorage for better caching
 * - Queue failed requests automatically
 * - Track offline analytics
 * - Seamless online/offline transitions
 */

import { offlineStorage } from './offlineStorage';
import { offlineDetector } from './cache';
import { backgroundSync } from './backgroundSync';
import { ComplexityLevel } from '../shared/types';

/**
 * Enhanced API Request with Offline Support
 */
export class OfflineAwareAPI {
  
  /**
   * Make request with offline handling
   */
  static async request<T>(
    url: string,
    options: RequestInit & { requiresAuth?: boolean; queueIfOffline?: boolean } = {}
  ): Promise<T> {
    const {
      requiresAuth = false,
      queueIfOffline = true,
      ...fetchOptions
    } = options;

    // Check if offline
    if (offlineDetector.isCurrentlyOffline()) {
      // Queue request for later if enabled
      if (queueIfOffline && fetchOptions.method !== 'GET') {
        await this.queueRequest(url, fetchOptions);
        throw new Error('QUEUED_OFFLINE');
      }

      // For GET requests, check cache
      if (fetchOptions.method === 'GET' || !fetchOptions.method) {
        const cached = await this.getCachedResponse<T>(url);
        if (cached) {
          return cached;
        }
      }

      throw new Error('OFFLINE_NO_CACHE');
    }

    try {
      // Add auth header if required
      if (requiresAuth) {
        const token = await this.getAuthToken();
        if (token) {
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Authorization': `Bearer ${token}`,
          };
        }
      }

      // Make request
      const response = await fetch(url, fetchOptions);

      // Handle auth errors
      if (response.status === 401) {
        await this.handleAuthError();
        throw new Error('UNAUTHORIZED');
      }

      // Parse response
      const data = await response.json();

      // Cache GET responses
      if ((fetchOptions.method === 'GET' || !fetchOptions.method) && response.ok) {
        await this.cacheResponse(url, data);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || 'Request failed'}`);
      }

      return data;
    } catch (error) {
      // Network error - queue if offline and queueing enabled
      if (queueIfOffline && fetchOptions.method !== 'GET') {
        await this.queueRequest(url, fetchOptions);
        throw new Error('QUEUED_NETWORK_ERROR');
      }

      // Try cache for GET requests
      if (fetchOptions.method === 'GET' || !fetchOptions.method) {
        const cached = await this.getCachedResponse<T>(url);
        if (cached) {
          console.warn('📦 Using cached response due to network error');
          return cached;
        }
      }

      throw error;
    }
  }

  /**
   * Get explanation with offline support
   */
  static async getExplanation(
    question: string,
    complexityLevel: ComplexityLevel
  ): Promise<{ answer: string; fromCache: boolean }> {
    // Check offline cache first
    const cached = await offlineStorage.getCachedExplanation(question, complexityLevel);
    if (cached) {
      console.log('✅ Returning cached explanation');
      return {
        answer: cached.answer,
        fromCache: true,
      };
    }

    // If offline, return error
    if (offlineDetector.isCurrentlyOffline()) {
      throw new Error('OFFLINE_NO_CACHE');
    }

    try {
      // Fetch from API
      const response = await this.request<{ answer: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ question, complexityLevel }),
        requiresAuth: true,
        queueIfOffline: false, // Don't queue explanation requests
      });

      // Cache the response
      await offlineStorage.cacheExplanation(question, response.answer, complexityLevel);

      return {
        answer: response.answer,
        fromCache: false,
      };
    } catch (error) {
      // Try cache one more time
      const fallbackCached = await offlineStorage.getCachedExplanation(question, complexityLevel);
      if (fallbackCached) {
        return {
          answer: fallbackCached.answer,
          fromCache: true,
        };
      }

      throw error;
    }
  }

  /**
   * Track analytics with offline support
   */
  static async trackEvent(event: string, properties: Record<string, any>): Promise<void> {
    if (offlineDetector.isCurrentlyOffline()) {
      // Store offline for later sync
      await offlineStorage.trackOfflineEvent(event, properties);
      return;
    }

    try {
      await this.request('/api/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ event, properties }),
        requiresAuth: true,
        queueIfOffline: true,
      });
    } catch (error) {
      // Store offline if failed
      await offlineStorage.trackOfflineEvent(event, properties);
    }
  }

  /**
   * Rate explanation with offline support
   */
  static async rateExplanation(
    explanationId: string,
    rating: 'helpful' | 'not_helpful'
  ): Promise<void> {
    const url = '/api/explanations/rate';
    const body = { explanationId, rating };

    if (offlineDetector.isCurrentlyOffline()) {
      await offlineStorage.queueRequest('rating', url, 'POST', body);
      return;
    }

    try {
      await this.request(url, {
        method: 'POST',
        body: JSON.stringify(body),
        requiresAuth: true,
        queueIfOffline: true,
      });
    } catch (error) {
      // Queued automatically by request method
      console.warn('⚠️ Rating queued for later:', error);
    }
  }

  /**
   * Queue request for later
   */
  private static async queueRequest(url: string, options: RequestInit): Promise<void> {
    const type = this.getRequestType(url);
    await offlineStorage.queueRequest(
      type,
      url,
      options.method || 'POST',
      options.body ? JSON.parse(options.body as string) : null
    );

    console.log(`📥 Request queued for sync: ${type}`);
  }

  /**
   * Get request type from URL
   */
  private static getRequestType(url: string): 'explanation' | 'analytics' | 'rating' {
    if (url.includes('/chat')) return 'explanation';
    if (url.includes('/analytics')) return 'analytics';
    if (url.includes('/rate')) return 'rating';
    return 'explanation';
  }

  /**
   * Cache response
   */
  private static async cacheResponse(url: string, data: any): Promise<void> {
    try {
      const cacheKey = `api:${url}`;
      await chrome.storage.local.set({ [cacheKey]: { data, timestamp: Date.now() } });
    } catch (error) {
      console.warn('⚠️ Failed to cache response:', error);
    }
  }

  /**
   * Get cached response
   */
  private static async getCachedResponse<T>(url: string): Promise<T | null> {
    try {
      const cacheKey = `api:${url}`;
      const result = await chrome.storage.local.get(cacheKey);
      const cached = result[cacheKey];

      if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour
        return cached.data as T;
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * Get auth token
   */
  private static async getAuthToken(): Promise<string | null> {
    const result = await chrome.storage.sync.get('auth_token');
    return result.auth_token || null;
  }

  /**
   * Handle auth error
   */
  private static async handleAuthError(): Promise<void> {
    await chrome.storage.sync.remove('auth_token');
    chrome.runtime.sendMessage({ type: 'AUTH_ERROR' });
  }

  /**
   * Get offline stats
   */
  static async getOfflineStats() {
    const storage = await offlineStorage.getStats();
    const queue = await backgroundSync.getQueueStats();
    const syncStatus = backgroundSync.getStatus();

    return {
      storage,
      queue,
      syncStatus,
      isOffline: offlineDetector.isCurrentlyOffline(),
    };
  }

  /**
   * Force sync now
   */
  static async syncNow(): Promise<void> {
    await backgroundSync.syncNow();
  }

  /**
   * Clear all offline data
   */
  static async clearOfflineData(): Promise<void> {
    await offlineStorage.clearAll();
    await backgroundSync.clearAll();
  }
}

// Export for convenience
export const offlineAPI = OfflineAwareAPI;