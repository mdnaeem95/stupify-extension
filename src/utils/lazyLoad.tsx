/**
 * Lazy Loading Utility
 * 
 * Provides utilities for lazy loading React components with
 * loading states, error boundaries, and retry logic.
 * 
 * Usage:
 * ```tsx
 * const Settings = lazyLoad(() => import('./Settings'));
 * ```
 */

import React, { Suspense, ComponentType, lazy } from 'react';

// Loading fallback component
interface LoadingFallbackProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  size = 'medium',
  message = 'Loading...' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <div className={`${sizeClasses[size]} border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto`} />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
};

// Error boundary for lazy loaded components
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Lazy load error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// Default error fallback
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-4 max-w-md">
      <div className="text-red-500 text-4xl">⚠️</div>
      <h3 className="text-lg font-semibold text-gray-900">
        Failed to load component
      </h3>
      <p className="text-sm text-gray-600">
        {error.message}
      </p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

// Retry configuration
interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
}

// Lazy load with retry logic
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  config: RetryConfig = {}
): React.LazyExoticComponent<T> {
  const { maxRetries = 3, retryDelay = 1000 } = config;

  return lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      const attemptImport = (attempt: number = 1) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (attempt >= maxRetries) {
              console.error(`❌ Failed to load component after ${maxRetries} attempts:`, error);
              reject(error);
              return;
            }

            console.warn(`⚠️ Lazy load attempt ${attempt} failed, retrying...`);
            setTimeout(() => attemptImport(attempt + 1), retryDelay * attempt);
          });
      };

      attemptImport();
    });
  });
}

// Main lazy load function with all features
export interface LazyLoadOptions {
  loading?: React.ComponentType<LoadingFallbackProps>;
  error?: React.ComponentType<{ error: Error; retry: () => void }>;
  retry?: RetryConfig;
}

export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = lazyWithRetry(importFn, options.retry);
  const LoadingComponent = options.loading || LoadingFallback;
  const ErrorComponent = options.error;

  return (props: React.ComponentProps<T>) => (
    <LazyErrorBoundary fallback={ErrorComponent}>
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    </LazyErrorBoundary>
  );
}

// Preload function for hover/focus optimization
export function preloadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): void {
  importFn().catch((error) => {
    console.warn('⚠️ Component preload failed:', error);
  });
}

// Lazy load multiple components
export function lazyLoadBatch(
  imports: Record<string, () => Promise<{ default: ComponentType<any> }>>
): Record<string, React.FC<any>> {
  const result: Record<string, React.FC<any>> = {};

  for (const [key, importFn] of Object.entries(imports)) {
    result[key] = lazyLoad(importFn);
  }

  return result;
}

/**
 * Example Usage:
 * 
 * // Basic lazy load
 * const Settings = lazyLoad(() => import('./Settings'));
 * 
 * // With custom loading
 * const Stats = lazyLoad(
 *   () => import('./Stats'),
 *   {
 *     loading: () => <div>Loading stats...</div>,
 *     retry: { maxRetries: 5 }
 *   }
 * );
 * 
 * // Batch lazy load
 * const { Settings, Stats, Onboarding } = lazyLoadBatch({
 *   Settings: () => import('./Settings'),
 *   Stats: () => import('./Stats'),
 *   Onboarding: () => import('./Onboarding')
 * });
 * 
 * // Preload on hover
 * <button 
 *   onMouseEnter={() => preloadComponent(() => import('./Settings'))}
 * >
 *   Settings
 * </button>
 */