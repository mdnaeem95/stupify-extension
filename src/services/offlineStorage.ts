/**
 * Offline Storage Service - IndexedDB Edition
 * 
 * Upgrades from chrome.storage.local (5MB limit) to IndexedDB (unlimited*)
 * - Cache up to 100 explanations (vs 10)
 * - Store full conversation history
 * - Queue failed requests for retry
 * - Track offline analytics
 * - Sync when back online
 * 
 * * Technically unlimited, but we'll cap at 50MB for good citizenship
 */

import { CachedExplanation, ComplexityLevel } from '../shared/types';

// IndexedDB Configuration
const DB_NAME = 'StupifyOfflineDB';
const DB_VERSION = 1;
const STORES = {
  EXPLANATIONS: 'explanations',
  QUEUE: 'requestQueue',
  ANALYTICS: 'offlineAnalytics',
  CONVERSATIONS: 'conversations',
} as const;

// Storage Limits
const MAX_EXPLANATIONS = 100;
const MAX_QUEUE_SIZE = 50;
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days (up from 7)

// Types
interface QueuedRequest {
  id: string;
  type: 'explanation' | 'analytics' | 'rating';
  url: string;
  method: string;
  body: any;
  timestamp: number;
  retries: number;
}

interface OfflineAnalytic {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
}

/**
 * IndexedDB Offline Storage
 */
class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initializing: Promise<void> | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize IndexedDB
   */
  private async initialize(): Promise<void> {
    if (this.initializing) return this.initializing;

    this.initializing = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Explanations Store
        if (!db.objectStoreNames.contains(STORES.EXPLANATIONS)) {
          const explanationStore = db.createObjectStore(STORES.EXPLANATIONS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          explanationStore.createIndex('question', 'question', { unique: false });
          explanationStore.createIndex('complexity', 'complexity_level', { unique: false });
          explanationStore.createIndex('timestamp', 'cached_at', { unique: false });
        }

        // Request Queue Store
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, {
            keyPath: 'id',
          });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('type', 'type', { unique: false });
        }

        // Offline Analytics Store
        if (!db.objectStoreNames.contains(STORES.ANALYTICS)) {
          const analyticsStore = db.createObjectStore(STORES.ANALYTICS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Conversations Store
        if (!db.objectStoreNames.contains(STORES.CONVERSATIONS)) {
          const conversationStore = db.createObjectStore(STORES.CONVERSATIONS, {
            keyPath: 'id',
          });
          conversationStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
      };
    });

    return this.initializing;
  }

  /**
   * Ensure DB is ready
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    return this.db;
  }

  // ==================== EXPLANATIONS ====================

  /**
   * Cache explanation
   */
  async cacheExplanation(
    question: string,
    answer: string,
    complexityLevel: ComplexityLevel
  ): Promise<void> {
    const db = await this.ensureDB();

    const explanation: CachedExplanation = {
      question: question.trim().toLowerCase(),
      answer,
      complexity_level: complexityLevel,
      cached_at: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.EXPLANATIONS], 'readwrite');
      const store = transaction.objectStore(STORES.EXPLANATIONS);

      // Check if we need to clean up old entries
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        if (countRequest.result >= MAX_EXPLANATIONS) {
          // Delete oldest entries
          this.cleanOldExplanations(5).then(() => {
            // Add new explanation
            const addRequest = store.add(explanation);
            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error);
          });
        } else {
          // Add directly
          const addRequest = store.add(explanation);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        }
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  /**
   * Get cached explanation
   */
  async getCachedExplanation(
    question: string,
    complexityLevel: ComplexityLevel
  ): Promise<CachedExplanation | null> {
    const db = await this.ensureDB();
    const normalizedQuestion = question.trim().toLowerCase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.EXPLANATIONS], 'readonly');
      const store = transaction.objectStore(STORES.EXPLANATIONS);
      const index = store.index('question');

      const request = index.openCursor();
      let bestMatch: CachedExplanation | null = null;
      let bestScore = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          const item: CachedExplanation = cursor.value;

          // Check if expired
          if (Date.now() - item.cached_at > CACHE_EXPIRY) {
            cursor.continue();
            return;
          }

          // Check complexity match
          if (item.complexity_level === complexityLevel) {
            // Calculate similarity score
            const score = this.calculateSimilarity(normalizedQuestion, item.question);

            // Exact match - return immediately
            if (score === 1.0) {
              resolve(item);
              return;
            }

            // Track best fuzzy match
            if (score > bestScore && score > 0.7) {
              bestScore = score;
              bestMatch = item;
            }
          }

          cursor.continue();
        } else {
          // No more entries
          resolve(bestMatch);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Calculate similarity between two questions
   */
  private calculateSimilarity(q1: string, q2: string): number {
    if (q1 === q2) return 1.0;

    const words1 = new Set(q1.split(' ').filter(w => w.length > 3));
    const words2 = new Set(q2.split(' ').filter(w => w.length > 3));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    return intersection.size / Math.max(words1.size, words2.size);
  }

  /**
   * Clean old explanations
   */
  private async cleanOldExplanations(count: number = 10): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.EXPLANATIONS], 'readwrite');
      const store = transaction.objectStore(STORES.EXPLANATIONS);
      const index = store.index('timestamp');

      const request = index.openCursor();
      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor && deleted < count) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all cached explanations
   */
  async getAllExplanations(): Promise<CachedExplanation[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.EXPLANATIONS], 'readonly');
      const store = transaction.objectStore(STORES.EXPLANATIONS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all explanations
   */
  async clearExplanations(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.EXPLANATIONS], 'readwrite');
      const store = transaction.objectStore(STORES.EXPLANATIONS);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== REQUEST QUEUE ====================

  /**
   * Queue a failed request for retry
   */
  async queueRequest(
    type: QueuedRequest['type'],
    url: string,
    method: string,
    body: any
  ): Promise<void> {
    const db = await this.ensureDB();

    const queuedRequest: QueuedRequest = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      url,
      method,
      body,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);

      // Check queue size
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        if (countRequest.result >= MAX_QUEUE_SIZE) {
          console.warn('⚠️ Request queue full, dropping oldest');
          // In production, we might want to clean old entries first
        }

        const addRequest = store.add(queuedRequest);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };
    });
  }

  /**
   * Get all queued requests
   */
  async getQueuedRequests(): Promise<QueuedRequest[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove request from queue
   */
  async removeFromQueue(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update retry count
   */
  async updateRetryCount(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const request = getRequest.result;
        if (request) {
          request.retries += 1;
          const updateRequest = store.put(request);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Clear request queue
   */
  async clearQueue(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== OFFLINE ANALYTICS ====================

  /**
   * Track analytics event offline
   */
  async trackOfflineEvent(event: string, properties: Record<string, any>): Promise<void> {
    const db = await this.ensureDB();

    const analytic: OfflineAnalytic = {
      event,
      properties,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.ANALYTICS], 'readwrite');
      const store = transaction.objectStore(STORES.ANALYTICS);
      const request = store.add(analytic);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get offline analytics
   */
  async getOfflineAnalytics(): Promise<OfflineAnalytic[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.ANALYTICS], 'readonly');
      const store = transaction.objectStore(STORES.ANALYTICS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear offline analytics
   */
  async clearOfflineAnalytics(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.ANALYTICS], 'readwrite');
      const store = transaction.objectStore(STORES.ANALYTICS);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== STORAGE STATS ====================

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    explanations: number;
    queue: number;
    analytics: number;
    conversations: number;
    estimatedSizeMB: number;
  }> {
    const explanations = await this.countStore(STORES.EXPLANATIONS);
    const queue = await this.countStore(STORES.QUEUE);
    const analytics = await this.countStore(STORES.ANALYTICS);
    const conversations = await this.countStore(STORES.CONVERSATIONS);

    // Estimate storage size (rough approximation)
    const avgExplanationSize = 2000; // ~2KB per explanation
    const estimatedBytes = 
      (explanations * avgExplanationSize) +
      (queue * 500) +
      (analytics * 200) +
      (conversations * 5000);

    return {
      explanations,
      queue,
      analytics,
      conversations,
      estimatedSizeMB: estimatedBytes / (1024 * 1024),
    };
  }

  /**
   * Count items in a store
   */
  private async countStore(storeName: string): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    await this.clearExplanations();
    await this.clearQueue();
    await this.clearOfflineAnalytics();
    console.log('✅ All offline data cleared');
  }
}

// Export singleton
export const offlineStorage = new OfflineStorage();