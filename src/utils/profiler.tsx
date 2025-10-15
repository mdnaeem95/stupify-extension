/**
 * React Profiler Utility
 *
 * Wrapper for React Profiler to track component performance:
 * - Render times
 * - Re-render frequency
 * - Slow components
 * - Automatic logging
 */

import React, { Profiler, ProfilerOnRenderCallback } from 'react';
import { logger } from '../shared/utils';

// ---- Types ------------------------------------------------------------------

type InteractionSet = Set<unknown>;

interface ProfilerData {
  componentName: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: InteractionSet;
}

// React 17 typed callback (6 args, no interactions)
type ProfilerArgsV17 = [
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
];
// React 18 typed callback (adds interactions)
type ProfilerArgsV18 = [...ProfilerArgsV17, interactions: InteractionSet];
// React 19+ may add trailing args (lanes, effect durations, etc.)
type ProfilerArgsV19 = [...ProfilerArgsV18, ...unknown[]];
type AnyProfilerArgs = ProfilerArgsV17 | ProfilerArgsV18 | ProfilerArgsV19;

// ---- Manager ----------------------------------------------------------------

class ProfilerManager {
  private data: ProfilerData[] = [];
  private slowRenders: ProfilerData[] = [];
  private readonly SLOW_THRESHOLD = 16; // 16ms ~= 60fps

  /**
   * Handle profiler callback (compatible with React 17/18/19+)
   */
  onRender: ProfilerOnRenderCallback = ((...raw: AnyProfilerArgs) => {
    const [id, phase, actualDuration, baseDuration, startTime, commitTime] = raw;

    // Interactions exist in React 18+. Guard for React 17 typings.
    const interactions =
      (raw as unknown[]).length >= 7 && (raw as unknown[])[6] instanceof Set
        ? ((raw as unknown[])[6] as InteractionSet)
        : new Set<unknown>();

    const data: ProfilerData = {
      componentName: id,
      phase: (phase as ProfilerData['phase']) ?? 'update',
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions,
    };

    this.data.push(data);

    // Track slow renders
    if (actualDuration > this.SLOW_THRESHOLD) {
      this.slowRenders.push(data);
      logger.warn(`🐌 Slow render: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`⚡ ${id} (${phase}): ${actualDuration.toFixed(2)}ms`);
    }

    // Keep only last 100 renders
    if (this.data.length > 100) this.data.shift();
  }) as ProfilerOnRenderCallback;

  /**
   * Get all profiler data
   */
  getData(): ProfilerData[] {
    return [...this.data];
  }

  /**
   * Get slow renders
   */
  getSlowRenders(): ProfilerData[] {
    return [...this.slowRenders];
  }

  /**
   * Get average render time for a component
   */
  getAverageRenderTime(componentName: string): number {
    const renders = this.data.filter((d) => d.componentName === componentName);
    if (renders.length === 0) return 0;
    const sum = renders.reduce((acc, d) => acc + d.actualDuration, 0);
    return sum / renders.length;
  }

  /**
   * Get render count for a component
   */
  getRenderCount(componentName: string, phase?: ProfilerData['phase']): number {
    return this.data.filter((d) => d.componentName === componentName && (!phase || d.phase === phase)).length;
  }

  /**
   * Get summary report
   */
  getSummary(): Record<string, any> {
    const components = new Set(this.data.map((d) => d.componentName));
    const summary: Record<string, any> = {};

    for (const component of components) {
      const renders = this.data.filter((d) => d.componentName === component);
      if (renders.length === 0) continue;

      const avgDuration = this.getAverageRenderTime(component);
      const mountCount = this.getRenderCount(component, 'mount');
      const updateCount = this.getRenderCount(component, 'update');

      summary[component] = {
        totalRenders: renders.length,
        mounts: mountCount,
        updates: updateCount,
        avgDuration: avgDuration.toFixed(2),
        minDuration: Math.min(...renders.map((r) => r.actualDuration)).toFixed(2),
        maxDuration: Math.max(...renders.map((r) => r.actualDuration)).toFixed(2),
      };
    }

    return summary;
  }

  /**
   * Log summary to console
   */
  logSummary(): void {
    const summary = this.getSummary();

    console.log('\n📊 COMPONENT PERFORMANCE SUMMARY\n');
    console.table(summary);

    if (this.slowRenders.length > 0) {
      console.log(`\n⚠️  Found ${this.slowRenders.length} slow renders (>${this.SLOW_THRESHOLD}ms)\n`);
      console.table(
        this.slowRenders.map((r) => ({
          component: r.componentName,
          phase: r.phase,
          duration: `${r.actualDuration.toFixed(2)}ms`,
        }))
      );
    }

    console.log('\n');
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data = [];
    this.slowRenders = [];
  }

  /**
   * Export data as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        data: this.data,
        slowRenders: this.slowRenders,
        summary: this.getSummary(),
      },
      null,
      2
    );
  }
}

// Singleton instance
export const profilerManager = new ProfilerManager();

// ---- HOC & Wrapper ----------------------------------------------------------

/**
 * Profiler HOC
 * Wrap components to track their performance
 */
export function withProfiler<P extends object>(
  Component: React.ComponentType<P>,
  id?: string
): React.FC<P> {
  const componentId = id || Component.displayName || Component.name || 'Unknown';

  const Wrapped: React.FC<P> = (props: P) => (
    <Profiler id={componentId} onRender={profilerManager.onRender}>
      <Component {...props} />
    </Profiler>
  );

  Wrapped.displayName = `withProfiler(${componentId})`;
  return Wrapped;
}

/**
 * Profiler wrapper component
 */
interface ProfilerWrapperProps {
  id: string;
  children: React.ReactNode;
}

export const ProfilerWrapper: React.FC<ProfilerWrapperProps> = ({ id, children }) => {
  return (
    <Profiler id={id} onRender={profilerManager.onRender}>
      {children}
    </Profiler>
  );
};

// ---- Hooks ------------------------------------------------------------------

/**
 * Hook to track component lifecycle
 */
export function useComponentProfiler(componentName: string) {
  const mountTimeRef = React.useRef<number>(0);
  const renderCountRef = React.useRef<number>(0);

  React.useEffect(() => {
    mountTimeRef.current = Date.now();
    renderCountRef.current = 0;

    logger.debug(`🔵 ${componentName} mounted`);

    return () => {
      const lifetime = Date.now() - mountTimeRef.current;
      logger.debug(
        `🔴 ${componentName} unmounted (lifetime: ${lifetime}ms, renders: ${renderCountRef.current})`
      );
    };
    // componentName is a stable string; safe as dep
  }, [componentName]);

  React.useEffect(() => {
    renderCountRef.current++;
  });

  const lifetime = mountTimeRef.current ? Date.now() - mountTimeRef.current : 0;

  return {
    renderCount: renderCountRef.current,
    lifetime,
  };
}

/**
 * Hook to measure render time
 */
export function useRenderTime(componentName: string): number {
  const startTimeRef = React.useRef<number>(0);
  const [renderTime, setRenderTime] = React.useState<number>(0);

  // Mark start of render (executes on each render)
  startTimeRef.current = performance.now();

  React.useEffect(() => {
    // Calculate render time after commit
    const duration = performance.now() - startTimeRef.current;
    setRenderTime(duration);

    if (duration > 16) {
      logger.warn(`🐌 ${componentName} render took ${duration.toFixed(2)}ms`);
    }
  });

  return renderTime;
}

// ---- DevTools ---------------------------------------------------------------

/**
 * Performance DevTools
 *
 * Add to app root for performance monitoring in development
 */
export const PerformanceDevTools: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    // Add keyboard shortcut: Ctrl+Shift+P
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (process.env.NODE_ENV !== 'development' || !isOpen) return null;

  const summary = profilerManager.getSummary();
  const slowRenders = profilerManager.getSlowRenders();

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto bg-gray-900 text-white p-4 rounded-lg shadow-2xl z-50 text-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">⚡ Performance</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-yellow-400 mb-2">Component Renders</h4>
          <div className="space-y-2">
            {Object.entries(summary).map(([name, data]) => {
              const s = data as {
                totalRenders: number;
                avgDuration: string;
                minDuration: string;
                maxDuration: string;
              };
              return (
                <div key={name} className="text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono">{name}</span>
                    <span className="text-gray-400">{s.totalRenders} renders</span>
                  </div>
                  <div className="text-gray-500">
                    Avg: {s.avgDuration}ms | Min: {s.minDuration}ms | Max: {s.maxDuration}ms
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {slowRenders.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-400 mb-2">Slow Renders ({slowRenders.length})</h4>
            <div className="space-y-1">
              {slowRenders.slice(0, 5).map((render, i) => (
                <div key={i} className="text-xs text-gray-300">
                  {render.componentName}: {render.actualDuration.toFixed(2)}ms
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => profilerManager.logSummary()}
            className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
          >
            Log to Console
          </button>
          <button
            onClick={() => profilerManager.clear()}
            className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
          >
            Clear Data
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">Press Ctrl+Shift+P to toggle</div>
    </div>
  );
};

/**
 * Usage Examples:
 *
 * // HOC usage
 * const OptimizedComponent = withProfiler(MyComponent, 'MyComponent');
 *
 * // Wrapper usage
 * <ProfilerWrapper id="ChatInterface">
 *   <ChatInterface />
 * </ProfilerWrapper>
 *
 * // Hook usage
 * function MyComponent() {
 *   const renderTime = useRenderTime('MyComponent');
 *   const { renderCount, lifetime } = useComponentProfiler('MyComponent');
 *   return <div>Render time: {renderTime}ms</div>;
 * }
 *
 * // DevTools
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <PerformanceDevTools />
 *     </>
 *   );
 * }
 */
