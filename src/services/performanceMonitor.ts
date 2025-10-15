/**
 * Performance Monitoring Service
 *
 * Tracks and reports performance metrics for the extension:
 * - Load times
 * - Memory usage
 * - Bundle sizes
 * - Component render times
 * - User interactions
 *
 * Features:
 * - Performance marks & measures
 * - Memory profiling
 * - Automatic reporting
 * - Lighthouse metrics
 */

import React from 'react';
import { logger } from '../shared/utils';

// ---------------- Types ----------------

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp?: number;
}

export interface LoadMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
}

type PerfWithMemory = Performance & { memory?: MemoryMetrics };

// ---------------- Config ----------------

const THRESHOLDS = {
  LOAD_TIME_WARNING: 2000, // 2s
  LOAD_TIME_CRITICAL: 5000, // 5s
  MEMORY_WARNING: 50 * 1024 * 1024, // 50MB
  MEMORY_CRITICAL: 100 * 1024 * 1024, // 100MB
  BUNDLE_SIZE_WARNING: 200 * 1024, // 200KB
  BUNDLE_SIZE_CRITICAL: 500 * 1024, // 500KB
};

// ---------------- Monitor ----------------

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private memoryCheckInterval: number | null = null;
  private reportInterval: number | null = null;
  private isEnabled = true;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize performance monitoring
   */
  private initialize(): void {
    // Only enable in production for real metrics
    this.isEnabled = process.env.NODE_ENV === 'production';

    if (!this.isEnabled) {
      logger.info('📊 Performance monitoring disabled in development');
      return;
    }

    // Track page load metrics
    this.trackLoadMetrics();

    // Start memory monitoring (every 30s)
    this.startMemoryMonitoring(30000);

    // Start periodic reporting (every 5 minutes)
    this.startPeriodicReporting(5 * 60 * 1000);

    // Track unload
    const handleBeforeUnload = () => {
      this.reportAll();
      this.cleanup();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    logger.info('📊 Performance monitoring initialized');
  }

  /**
   * Track page load metrics
   */
  private trackLoadMetrics(): void {
    window.addEventListener('load', () => {
      // next tick so perf entries are populated
      setTimeout(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;

        if (nav) {
          const metrics: LoadMetrics = {
            domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
            loadComplete: nav.loadEventEnd - nav.startTime,
            firstPaint: 0,
            firstContentfulPaint: 0,
          }

          // Get paint metrics
          const paintEntries = performance.getEntriesByType('paint');
          for (const entry of paintEntries) {
            if (entry.name === 'first-paint') metrics.firstPaint = entry.startTime;
            if (entry.name === 'first-contentful-paint') metrics.firstContentfulPaint = entry.startTime;
          }

          this.recordMetric('dom_content_loaded', metrics.domContentLoaded, 'ms');
          this.recordMetric('load_complete', metrics.loadComplete, 'ms');
          this.recordMetric('first_paint', metrics.firstPaint, 'ms');
          this.recordMetric('first_contentful_paint', metrics.firstContentfulPaint, 'ms');

          // Check thresholds
          if (metrics.loadComplete > THRESHOLDS.LOAD_TIME_CRITICAL) {
            logger.error('🐌 Critical: Page load time exceeds 5s');
          } else if (metrics.loadComplete > THRESHOLDS.LOAD_TIME_WARNING) {
            logger.warn('⚠️ Warning: Page load time exceeds 2s');
          } else {
            logger.info('✅ Page load time acceptable');
          }
        }
      }, 0);
    });
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(interval: number): void {
    const perf = performance as PerfWithMemory;
    if (!perf.memory) {
      logger.warn('⚠️ Memory API not available');
      return;
    }

    this.memoryCheckInterval = window.setInterval(() => {
      this.checkMemoryUsage();
    }, interval);

    // Initial check
    this.checkMemoryUsage();
  }

  /**
   * Check current memory usage
   */
  private checkMemoryUsage(): void {
    const perf = performance as PerfWithMemory;
    if (!perf.memory) return;

    const memory = perf.memory;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;

    this.recordMetric('memory_used', memory.usedJSHeapSize, 'bytes');
    this.recordMetric('memory_total', memory.totalJSHeapSize, 'bytes');

    // Check thresholds
    if (memory.usedJSHeapSize > THRESHOLDS.MEMORY_CRITICAL) {
      logger.error(`🚨 Critical: Memory usage at ${usedMB.toFixed(2)}MB`);
    } else if (memory.usedJSHeapSize > THRESHOLDS.MEMORY_WARNING) {
      logger.warn(`⚠️ Warning: Memory usage at ${usedMB.toFixed(2)}MB`);
    }
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(interval: number): void {
    this.reportInterval = window.setInterval(() => {
      this.reportAll();
    }, interval);
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' = 'ms',
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) this.metrics.shift();

    logger.debug(`📊 Metric recorded: ${name} = ${value}${unit}`);
  }

  /**
   * Mark a performance point
   */
  mark(name: string): void {
    if (!this.isEnabled) return;
    performance.mark(name);
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number {
    if (!this.isEnabled) return 0;

    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      const measure = performance.getEntriesByName(name)[0];
      const duration = measure?.duration ?? 0;

      this.recordMetric(name, duration, 'ms');
      return duration;
    } catch (error) {
      logger.error('Failed to measure performance:', error);
      return 0;
    }
  }

  /**
   * Track component render time
   */
  trackRender(componentName: string, callback: () => void): void {
    if (!this.isEnabled) {
      callback();
      return;
    }

    const startMark = `${componentName}-render-start`;
    const endMark = `${componentName}-render-end`;

    this.mark(startMark);
    callback();
    this.mark(endMark);

    const duration = this.measure(`${componentName}-render`, startMark, endMark);

    if (duration > 16) { // ~60fps
      logger.warn(`⚠️ Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Track user interaction
   */
  trackInteraction(action: string, duration: number): void {
    this.recordMetric(`interaction_${action}`, duration, 'ms', { action });

    if (duration > 100) {
      logger.warn(`⚠️ Slow interaction: ${action} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Report all metrics
   */
  async reportAll(): Promise<void> {
    if (!this.isEnabled || this.metrics.length === 0) return;

    try {
      logger.info('📊 Reporting performance metrics...');

      const summary = this.getSummary();

      // Log summary to console (or ship to your analytics endpoint)
      console.table(summary);

      // Example: await this.sendToAnalytics(summary);
      logger.info('✅ Performance metrics reported');
    } catch (error) {
      logger.error('Failed to report metrics:', error);
    }
  }

  /**
   * Get performance summary
   */
  private getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    // Group metrics by name
    const grouped = this.metrics.reduce((acc, metric) => {
      (acc[metric.name] ??= []).push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate statistics
    for (const [name, values] of Object.entries(grouped)) {
      const sorted = [...values].sort((a, b) => a - b);
      const count = values.length;
      const avg = values.reduce((a, b) => a + b, 0) / count;
      const pIndex = (p: number) => Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)));

      summary[name] = {
        count,
        avg: avg.toFixed(2),
        min: sorted[0]?.toFixed(2) ?? '0.00',
        max: sorted[sorted.length - 1]?.toFixed(2) ?? '0.00',
        p50: sorted[pIndex(0.5)]?.toFixed(2) ?? '0.00',
        p95: sorted[pIndex(0.95)]?.toFixed(2) ?? '0.00',
      };
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    logger.info('📊 Performance metrics cleared');
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    logger.info('📊 Performance monitoring cleaned up');
  }

  /**
   * Get bundle size info (approx; for real sizes, use build-time stats)
   */
  async getBundleInfo(): Promise<{ total: number; gzipped: number }> {
    try {
      const base = chrome?.runtime?.getURL?.('manifest.json');
      if (!base) return { total: 0, gzipped: 0 };

      const manifestRes = await fetch(base);
      const manifest = await manifestRes.json() as any;

      const scripts: string[] = [];
      if (manifest.background?.service_worker) scripts.push(manifest.background.service_worker);
      if (Array.isArray(manifest.content_scripts)) {
        for (const cs of manifest.content_scripts) {
          if (Array.isArray(cs.js)) scripts.push(...cs.js);
        }
      }

      let totalSize = 0;
      for (const script of scripts) {
        const url = chrome.runtime.getURL(script);
        const scriptResponse = await fetch(url);
        const blob = await scriptResponse.blob();
        totalSize += blob.size;
      }

      return {
        total: totalSize,
        gzipped: Math.round(totalSize * 0.3), // rough gzip ratio
      };
    } catch (error) {
      logger.error('Failed to get bundle info:', error);
      return { total: 0, gzipped: 0 };
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// ---------------- React helpers ----------------

/**
 * React hook for performance tracking
 */
export function usePerformanceTracking(componentName: string) {
  React.useEffect(() => {
    performanceMonitor.mark(`${componentName}-mount`);
    return () => {
      performanceMonitor.mark(`${componentName}-unmount`);
      performanceMonitor.measure(
        `${componentName}-lifetime`,
        `${componentName}-mount`,
        `${componentName}-unmount`
      );
    };
  }, [componentName]);
}

/**
 * HOC for performance tracking
 * (No JSX here so this works in a .ts file)
 */
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.FC<P> {
  const name = componentName || (WrappedComponent.displayName || WrappedComponent.name || 'Unknown');

  const Tracked: React.FC<P> = (props: P) => {
    usePerformanceTracking(name);
    // Avoid JSX in .ts files; use createElement instead.
    return React.createElement(WrappedComponent, { ...(props as P) });
  };

  Tracked.displayName = `withPerformanceTracking(${name})`;
  return Tracked;
}
