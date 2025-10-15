/**
 * Offline Cache Service
 * 
 * Handles caching of explanations for offline use
 * - Cache last 10 explanations
 * - IndexedDB storage (fallback to chrome.storage)
 * - Smart invalidation
 * - Offline detection
 */

import { CachedExplanation, ComplexityLevel } from '../shared/types';

const CACHE_KEY = 'cachedExplanations';
const MAX_CACHE_SIZE = 10;
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Cache Service
 */
class CacheService {
  private cache: CachedExplanation[] = [];
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize cache
   */
  private async initialize(): Promise<void> {
    try {
      await this.loadCache();
      this.initialized = true;
    } catch (error) {
      console.error('❌ Cache initialization failed:', error);
    }
  }

  /**
   * Load cache from storage
   */
  private async loadCache(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([CACHE_KEY]);
      this.cache = result[CACHE_KEY] || [];
      
      // Remove expired items
      this.cleanExpiredItems();
    } catch (error) {
      console.error('❌ Failed to load cache:', error);
      this.cache = [];
    }
  }

  /**
   * Save cache to storage
   */
  private async saveCache(): Promise<void> {
    try {
      await chrome.storage.local.set({ [CACHE_KEY]: this.cache });
    } catch (error) {
      console.error('❌ Failed to save cache:', error);
    }
  }

  /**
   * Add explanation to cache
   */
  async add(
    question: string,
    answer: string,
    complexityLevel: ComplexityLevel
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const cached: CachedExplanation = {
      question: question.trim().toLowerCase(),
      answer,
      complexity_level: complexityLevel,
      cached_at: Date.now(),
    };

    // Remove if already exists (update)
    this.cache = this.cache.filter(
      item => !(item.question === cached.question && item.complexity_level === cached.complexity_level)
    );

    // Add to beginning
    this.cache.unshift(cached);

    // Limit cache size
    if (this.cache.length > MAX_CACHE_SIZE) {
      this.cache = this.cache.slice(0, MAX_CACHE_SIZE);
    }

    await this.saveCache();
  }

  /**
   * Get cached explanation
   */
  async get(
    question: string,
    complexityLevel: ComplexityLevel
  ): Promise<CachedExplanation | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const normalizedQuestion = question.trim().toLowerCase();

    // Exact match
    const exactMatch = this.cache.find(
      item => item.question === normalizedQuestion && item.complexity_level === complexityLevel
    );

    if (exactMatch && !this.isExpired(exactMatch)) {
      return exactMatch;
    }

    // Similar match (fuzzy search)
    const similarMatch = this.cache.find(
      item => 
        item.complexity_level === complexityLevel &&
        !this.isExpired(item) &&
        this.isSimilar(normalizedQuestion, item.question)
    );

    return similarMatch || null;
  }

  /**
   * Check if item is expired
   */
  private isExpired(item: CachedExplanation): boolean {
    return Date.now() - item.cached_at > CACHE_EXPIRY;
  }

  /**
   * Check if two questions are similar
   */
  private isSimilar(q1: string, q2: string): boolean {
    // Simple similarity check using word overlap
    const words1 = new Set(q1.split(' ').filter(w => w.length > 3));
    const words2 = new Set(q2.split(' ').filter(w => w.length > 3));

    if (words1.size === 0 || words2.size === 0) {
      return false;
    }

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const overlap = intersection.size / Math.min(words1.size, words2.size);

    return overlap > 0.6; // 60% word overlap
  }

  /**
   * Clean expired items
   */
  private cleanExpiredItems(): void {
    const before = this.cache.length;
    this.cache = this.cache.filter(item => !this.isExpired(item));
    
    if (this.cache.length < before) {
      this.saveCache();
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache = [];
    await chrome.storage.local.remove([CACHE_KEY]);
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.length;
  }

  /**
   * Get all cached items
   */
  getAll(): CachedExplanation[] {
    return [...this.cache];
  }

  /**
   * Get cache stats
   */
  getStats() {
    const now = Date.now();
    const sizes = {
      total: this.cache.length,
      expired: this.cache.filter(item => this.isExpired(item)).length,
      byLevel: {
        '5yo': this.cache.filter(item => item.complexity_level === '5yo').length,
        'normal': this.cache.filter(item => item.complexity_level === 'normal').length,
        'advanced': this.cache.filter(item => item.complexity_level === 'advanced').length,
      },
    };

    const avgAge = this.cache.length > 0
      ? this.cache.reduce((sum, item) => sum + (now - item.cached_at), 0) / this.cache.length
      : 0;

    return {
      ...sizes,
      avgAgeHours: Math.round(avgAge / (1000 * 60 * 60)),
    };
  }
}

/**
 * Offline Detection
 */
class OfflineDetector {
  private isOffline: boolean = false;
  private listeners: Set<(offline: boolean) => void> = new Set();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize offline detection
   */
  private initialize(): void {
    // Check initial state
    this.isOffline = !navigator.onLine;

    // Listen for online/offline events
    window.addEventListener('online', () => this.setOffline(false));
    window.addEventListener('offline', () => this.setOffline(true));

    // Periodic connectivity check
    setInterval(() => this.checkConnectivity(), 30000); // Every 30s
  }

  /**
   * Check connectivity by making a simple request
   */
  private async checkConnectivity(): Promise<void> {
    try {
      const response = await fetch('https://stupify.ai/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      
      this.setOffline(!response.ok);
    } catch {
      this.setOffline(true);
    }
  }

  /**
   * Set offline state
   */
  private setOffline(offline: boolean): void {
    if (this.isOffline !== offline) {
      this.isOffline = offline;
      
      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(offline);
        } catch (error) {
          console.error('❌ Offline listener error:', error);
        }
      });

      // Show notification
      if (offline) {
        this.showOfflineNotification();
      }
    }
  }

  /**
   * Show offline notification
   */
  private showOfflineNotification(): void {
    chrome.runtime.sendMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        type: 'info',
        message: 'You\'re offline. Showing cached results.',
      },
    }).catch(() => {
      // Ignore errors
    });
  }

  /**
   * Check if offline
   */
  isCurrentlyOffline(): boolean {
    return this.isOffline;
  }

  /**
   * Subscribe to offline state changes
   */
  subscribe(callback: (offline: boolean) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }
}

// Export singleton instances
export const cacheService = new CacheService();
export const offlineDetector = new OfflineDetector();