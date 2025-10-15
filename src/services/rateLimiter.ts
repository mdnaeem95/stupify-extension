/**
 * Rate Limiter Service
 * 
 * Handles usage tracking and limits
 * - Track daily usage
 * - Display remaining questions
 * - Handle limit exceeded
 * - Premium upgrade prompts
 */

import { apiClient } from './api';
import { authService } from './auth';

const FREE_DAILY_LIMIT = 10;
const PREMIUM_DAILY_LIMIT = 1000; // Effectively unlimited

interface UsageState {
  remaining: number;
  limit: number;
  used: number;
  resetAt: string;
  isPremium: boolean;
  isLoading: boolean;
}

/**
 * Rate Limiter Service
 */
class RateLimiterService {
  private currentState: UsageState = {
    remaining: FREE_DAILY_LIMIT,
    limit: FREE_DAILY_LIMIT,
    used: 0,
    resetAt: this.getNextResetTime(),
    isPremium: false,
    isLoading: true,
  };

  private listeners: Set<(state: UsageState) => void> = new Set();
  private syncInterval: number | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize rate limiter
   */
  private async initialize(): Promise<void> {
    // Load cached usage
    await this.loadCachedUsage();

    // Check if premium
    const isPremium = authService.isPremium();
    this.updateState({ ...this.currentState, isPremium });

    // Sync with server
    await this.sync();

    // Start periodic sync (every 5 minutes)
    this.syncInterval = window.setInterval(() => this.sync(), 5 * 60 * 1000);

    // Listen for auth changes
    authService.subscribe((authState: any) => {
      const isPremium = authState.user?.subscription_tier === 'premium';
      this.updateState({ ...this.currentState, isPremium });
      this.sync();
    });
  }

  /**
   * Load cached usage from storage
   */
  private async loadCachedUsage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['dailyUsage']);
      const cached = result.dailyUsage;

      if (cached && this.isToday(cached.date)) {
        this.updateState({
          ...this.currentState,
          used: cached.used || 0,
          remaining: Math.max(0, this.currentState.limit - (cached.used || 0)),
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('❌ Failed to load cached usage:', error);
    }
  }

  /**
   * Save usage to storage
   */
  private async saveUsage(): Promise<void> {
    try {
      await chrome.storage.local.set({
        dailyUsage: {
          date: this.getCurrentDate(),
          used: this.currentState.used,
          limit: this.currentState.limit,
        },
      });
    } catch (error) {
      console.error('❌ Failed to save usage:', error);
    }
  }

  /**
   * Sync usage with server
   */
  async sync(): Promise<void> {
    try {
      const isAuth = await apiClient.isAuthenticated();
      if (!isAuth) {
        // Not authenticated, use local tracking
        this.updateState({
          ...this.currentState,
          isLoading: false,
        });
        return;
      }

      // Fetch from server
      const usage = await apiClient.checkUsage();

      const isPremium = authService.isPremium();
      const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
      const used = limit - usage.remaining;

      this.updateState({
        remaining: usage.remaining,
        limit,
        used,
        resetAt: usage.resetAt,
        isPremium,
        isLoading: false,
      });

      await this.saveUsage();

    } catch (error) {
      console.error('❌ Usage sync failed:', error);
      
      // Use cached data
      this.updateState({
        ...this.currentState,
        isLoading: false,
      });
    }
  }

  /**
   * Check if user can ask a question
   */
  canAsk(): boolean {
    // Premium users have unlimited questions
    if (this.currentState.isPremium) {
      return true;
    }

    // Check remaining questions
    return this.currentState.remaining > 0;
  }

  /**
   * Record a question asked
   */
  async recordQuestion(): Promise<void> {
    // Premium users don't need tracking
    if (this.currentState.isPremium) {
      return;
    }

    // Increment used count
    const used = this.currentState.used + 1;
    const remaining = Math.max(0, this.currentState.limit - used);

    this.updateState({
      ...this.currentState,
      used,
      remaining,
    });

    await this.saveUsage();

    // Show warning if running low
    if (remaining === 3) {
      this.showLowUsageWarning();
    } else if (remaining === 0) {
      this.showLimitReached();
    }

    // Sync with server in background
    setTimeout(() => this.sync(), 1000);
  }

  /**
   * Get current usage state
   */
  getState(): UsageState {
    return { ...this.currentState };
  }

  /**
   * Subscribe to usage changes
   */
  subscribe(callback: (state: UsageState) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(newState: UsageState): void {
    this.currentState = newState;
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(newState);
      } catch (error) {
        console.error('❌ Usage listener error:', error);
      }
    });

    // Update badge
    this.updateBadge();
  }

  /**
   * Update extension badge
   */
  private updateBadge(): void {
    if (this.currentState.isPremium) {
      chrome.action.setBadgeText({ text: '∞' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green
      return;
    }

    const remaining = this.currentState.remaining;
    
    if (remaining === 0) {
      chrome.action.setBadgeText({ text: '0' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red
    } else if (remaining <= 3) {
      chrome.action.setBadgeText({ text: remaining.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Orange
    } else {
      chrome.action.setBadgeText({ text: remaining.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' }); // Purple
    }
  }

  /**
   * Show low usage warning
   */
  private showLowUsageWarning(): void {
    chrome.runtime.sendMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        type: 'warning',
        message: `Only ${this.currentState.remaining} questions left today!`,
        action: {
          text: 'Upgrade',
          onClick: () => this.openPricingPage(),
        },
      },
    }).catch(() => {
      // Ignore errors
    });
  }

  /**
   * Show limit reached notification
   */
  private showLimitReached(): void {
    chrome.runtime.sendMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        type: 'error',
        message: 'Daily limit reached! Upgrade for unlimited questions.',
        action: {
          text: 'Upgrade Now',
          onClick: () => this.openPricingPage(),
        },
      },
    }).catch(() => {
      // Ignore errors
    });
  }

  /**
   * Open pricing page
   */
  openPricingPage(): void {
    chrome.tabs.create({
      url: `${process.env.VITE_API_URL || 'https://stupify.ai'}/pricing?ref=extension`,
    });
  }

  /**
   * Get time until reset
   */
  getTimeUntilReset(): string {
    const now = new Date();
    const reset = new Date(this.currentState.resetAt);
    const diff = reset.getTime() - now.getTime();

    if (diff < 0) {
      return 'Soon';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  }

  /**
   * Get percentage used
   */
  getPercentageUsed(): number {
    if (this.currentState.limit === 0) {
      return 0;
    }
    
    return Math.round((this.currentState.used / this.currentState.limit) * 100);
  }

  /**
   * Check if it's today
   */
  private isToday(date: string): boolean {
    return date === this.getCurrentDate();
  }

  /**
   * Get current date in YYYY-MM-DD format
   */
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get next reset time (midnight UTC)
   */
  private getNextResetTime(): string {
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow.toISOString();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.listeners.clear();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiterService();

// Export types
export type { UsageState };