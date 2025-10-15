/**
 * Background Sync Service
 * 
 * Automatically retries failed requests when connection is restored
 * - Processes request queue
 * - Syncs offline analytics
 * - Exponential backoff for retries
 * - Network-aware scheduling
 */

import { offlineStorage } from './offlineStorage';
import { offlineDetector } from './cache';
import { analyticsService } from './analytics';

// Retry Configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s
const SYNC_INTERVAL = 60000; // Check every minute

interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Background Sync Manager
 */
class BackgroundSync {
  private syncInterval: number | null = null;
  private isSyncing: boolean = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize background sync
   */
  private initialize(): void {
    // Listen for online events
    offlineDetector.subscribe((isOffline) => {
      if (!isOffline) {
        console.log('🌐 Connection restored, starting sync...');
        this.syncNow();
      } else {
        console.log('📡 Connection lost, pausing sync');
        this.stopSync();
      }
    });

    // Start periodic sync if online
    if (!offlineDetector.isCurrentlyOffline()) {
      this.startSync();
    }

    // Sync on extension startup
    if (!offlineDetector.isCurrentlyOffline()) {
      setTimeout(() => this.syncNow(), 2000); // Wait 2s for extension to settle
    }
  }

  /**
   * Start periodic sync
   */
  private startSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      if (!offlineDetector.isCurrentlyOffline() && !this.isSyncing) {
        this.syncNow();
      }
    }, SYNC_INTERVAL);

    console.log('✅ Background sync started');
  }

  /**
   * Stop periodic sync
   */
  private stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏸️  Background sync stopped');
    }
  }

  /**
   * Sync immediately
   */
  async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return { success: 0, failed: 0, errors: [] };
    }

    if (offlineDetector.isCurrentlyOffline()) {
      console.log('📡 Still offline, skipping sync');
      return { success: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'syncing', progress: 0 });

    try {
      const result: SyncResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // 1. Sync queued requests
      const requestResult = await this.syncQueuedRequests();
      result.success += requestResult.success;
      result.failed += requestResult.failed;
      result.errors.push(...requestResult.errors);

      // 2. Sync offline analytics
      const analyticsResult = await this.syncOfflineAnalytics();
      result.success += analyticsResult.success;
      result.failed += analyticsResult.failed;

      // Log results
      if (result.success > 0) {
        console.log(`✅ Sync complete: ${result.success} items synced`);
        this.notifyListeners({ status: 'success', synced: result.success });
      }

      if (result.failed > 0) {
        console.warn(`⚠️ Sync partial: ${result.failed} items failed`);
        this.notifyListeners({ status: 'partial', synced: result.success, failed: result.failed });
      }

      if (result.success === 0 && result.failed === 0) {
        console.log('✨ Nothing to sync');
        this.notifyListeners({ status: 'idle' });
      }

      return result;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.notifyListeners({ status: 'error', error: String(error) });
      return { success: 0, failed: 0, errors: [] };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync queued requests
   */
  private async syncQueuedRequests(): Promise<SyncResult> {
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    try {
      const queue = await offlineStorage.getQueuedRequests();

      if (queue.length === 0) {
        return result;
      }

      console.log(`📤 Syncing ${queue.length} queued requests...`);

      for (const request of queue) {
        try {
          // Skip if too many retries
          if (request.retries >= MAX_RETRIES) {
            console.warn(`⚠️ Max retries reached for ${request.id}, removing from queue`);
            await offlineStorage.removeFromQueue(request.id);
            result.failed++;
            result.errors.push({ id: request.id, error: 'Max retries exceeded' });
            continue;
          }

          // Wait based on retry count
          if (request.retries > 0) {
            const delay = RETRY_DELAYS[request.retries - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            await this.sleep(delay);
          }

          // Retry request
          const response = await fetch(request.url, {
            method: request.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: request.body ? JSON.stringify(request.body) : undefined,
          });

          if (response.ok) {
            // Success - remove from queue
            await offlineStorage.removeFromQueue(request.id);
            result.success++;
            console.log(`✅ Synced request: ${request.type}`);
          } else {
            // Failed - increment retry count
            await offlineStorage.updateRetryCount(request.id);
            result.failed++;
            result.errors.push({ id: request.id, error: `HTTP ${response.status}` });
            console.warn(`⚠️ Retry failed for ${request.id}: ${response.status}`);
          }
        } catch (error) {
          // Network error - increment retry count
          await offlineStorage.updateRetryCount(request.id);
          result.failed++;
          result.errors.push({ id: request.id, error: String(error) });
          console.error(`❌ Sync error for ${request.id}:`, error);
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to sync queued requests:', error);
      return result;
    }
  }

  /**
   * Sync offline analytics
   */
  private async syncOfflineAnalytics(): Promise<SyncResult> {
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    try {
      const analytics = await offlineStorage.getOfflineAnalytics();

      if (analytics.length === 0) {
        return result;
      }

      console.log(`📊 Syncing ${analytics.length} offline analytics...`);

      // Send analytics in batches
      for (const analytic of analytics) {
        try {
          await analyticsService.track(analytic.event, {
            ...analytic.properties,
            offline_tracked: true,
            original_timestamp: analytic.timestamp,
          });

          result.success++;
        } catch (error) {
          result.failed++;
          console.error('❌ Failed to sync analytic:', error);
        }
      }

      // Clear synced analytics
      if (result.success > 0) {
        await offlineStorage.clearOfflineAnalytics();
        console.log(`✅ Synced ${result.success} analytics events`);
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to sync offline analytics:', error);
      return result;
    }
  }

  /**
   * Subscribe to sync status updates
   */
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(status: SyncStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('❌ Sync listener error:', error);
      }
    });
  }

  /**
   * Get current sync status
   */
  getStatus(): { isSyncing: boolean; isOnline: boolean } {
    return {
      isSyncing: this.isSyncing,
      isOnline: !offlineDetector.isCurrentlyOffline(),
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    oldestTimestamp: number | null;
  }> {
    const queue = await offlineStorage.getQueuedRequests();

    const byType: Record<string, number> = {};
    let oldestTimestamp: number | null = null;

    queue.forEach(request => {
      byType[request.type] = (byType[request.type] || 0) + 1;
      
      if (!oldestTimestamp || request.timestamp < oldestTimestamp) {
        oldestTimestamp = request.timestamp;
      }
    });

    return {
      total: queue.length,
      byType,
      oldestTimestamp,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Force sync (for testing)
   */
  async forceSyncAll(): Promise<void> {
    console.log('🔄 Force syncing all queued data...');
    await this.syncNow();
  }

  /**
   * Clear all queued data (for testing)
   */
  async clearAll(): Promise<void> {
    await offlineStorage.clearQueue();
    await offlineStorage.clearOfflineAnalytics();
    console.log('🗑️  All queued data cleared');
  }
}

// Sync Status Types
export type SyncStatus = 
  | { status: 'idle' }
  | { status: 'syncing'; progress: number }
  | { status: 'success'; synced: number }
  | { status: 'partial'; synced: number; failed: number }
  | { status: 'error'; error: string };

// Export singleton
export const backgroundSync = new BackgroundSync();