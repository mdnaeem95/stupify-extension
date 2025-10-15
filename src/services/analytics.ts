/**
 * Analytics Service
 * 
 * Tracks user events and sends them to the backend
 * - Event tracking
 * - Property batching
 * - Offline queueing (via offlineStorage)
 * - Session management
 */

import { offlineDetector } from './cache';

// Analytics configuration
const ANALYTICS_ENDPOINT = 'https://stupify.ai/api/analytics/track';
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000; // 5 seconds

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
}

/**
 * Analytics Service
 */
class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private batchTimer: number | null = null;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startBatchTimer();
  }

  /**
   * Track an event
   */
  async track(event: string, properties: Record<string, any> = {}): Promise<void> {
    try {
      const analyticsEvent: AnalyticsEvent = {
        event,
        properties: {
          ...properties,
          session_id: this.sessionId,
          timestamp: Date.now(),
          platform: 'chrome_extension',
          url: window.location?.href,
        },
        timestamp: Date.now(),
      };

      // If offline, queue will be handled by offlineStorage in backgroundSync
      // Just add to local queue for batching
      this.queue.push(analyticsEvent);

      // Send immediately if queue is full
      if (this.queue.length >= BATCH_SIZE) {
        await this.flush();
      }
    } catch (error) {
      console.error('❌ Analytics tracking error:', error);
    }
  }

  /**
   * Flush queued events
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    // Don't send if offline - will be handled by offlineStorage
    if (offlineDetector.isCurrentlyOffline()) {
      console.log('📡 Offline - analytics will sync later');
      return;
    }

    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        console.warn('⚠️ Analytics failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Analytics flush error:', error);
      // Re-queue events if send failed
      this.queue.push(...events);
    }
  }

  /**
   * Start batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) return;

    this.batchTimer = window.setInterval(() => {
      this.flush();
    }, BATCH_INTERVAL);
  }

  /**
   * Stop batch timer
   */
  stopBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get auth token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const result = await chrome.storage.sync.get('auth_token');
      return result.auth_token || null;
    } catch {
      return null;
    }
  }

  /**
   * Track common events
   */

  // User actions
  async trackQuestionAsked(question: string, complexityLevel: string): Promise<void> {
    await this.track('question_asked', {
      question_length: question.length,
      complexity_level: complexityLevel,
    });
  }

  async trackExplanationReceived(question: string, responseTime: number): Promise<void> {
    await this.track('explanation_received', {
      question_length: question.length,
      response_time_ms: responseTime,
    });
  }

  async trackExplanationRated(rating: 'helpful' | 'not_helpful'): Promise<void> {
    await this.track('explanation_rated', {
      rating,
    });
  }

  async trackFollowUpClicked(question: string): Promise<void> {
    await this.track('follow_up_clicked', {
      question,
    });
  }

  // Offline events
  async trackOfflineEvent(event: string, properties: Record<string, any> = {}): Promise<void> {
    await this.track(`offline_${event}`, {
      ...properties,
      offline_tracked: true,
    });
  }

  async trackSyncCompleted(itemsSynced: number): Promise<void> {
    await this.track('sync_completed', {
      items_synced: itemsSynced,
    });
  }

  // Feature usage
  async trackFeatureUsed(feature: string, properties: Record<string, any> = {}): Promise<void> {
    await this.track('feature_used', {
      feature,
      ...properties,
    });
  }

  async trackSettingChanged(setting: string, value: any): Promise<void> {
    await this.track('setting_changed', {
      setting,
      value,
    });
  }

  // Extension lifecycle
  async trackExtensionInstalled(): Promise<void> {
    await this.track('extension_installed', {
      version: chrome.runtime.getManifest().version,
    });
  }

  async trackExtensionUninstalled(): Promise<void> {
    await this.track('extension_uninstalled', {});
  }

  async trackSidePanelOpened(): Promise<void> {
    await this.track('side_panel_opened', {});
  }

  async trackSidePanelClosed(): Promise<void> {
    await this.track('side_panel_closed', {});
  }

  // Error tracking
  async trackError(error: Error, context?: Record<string, any>): Promise<void> {
    await this.track('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }

  // Performance tracking
  async trackPerformance(metric: string, value: number, unit: string = 'ms'): Promise<void> {
    await this.track('performance_metric', {
      metric,
      value,
      unit,
    });
  }
}

// Export singleton
export const analyticsService = new AnalyticsService();

// Cleanup on unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    analyticsService.flush();
    analyticsService.stopBatchTimer();
  });
}