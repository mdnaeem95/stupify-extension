/**
 * Services Index
 * 
 * Central export point for all services
 */

// Core services
export { apiClient } from './api';
export { authService } from './auth';
export { cacheService, offlineDetector } from './cache';
export { followUpService } from './followups';
export { rateLimiter } from './rateLimiter';

// Streaming
export {
  streamChatResponse,
  streamWithRetry,
  createStreamCanceller,
  StreamMetrics,
} from './streaming';

// Types
export type { ApiError, RequestConfig } from './api';
export type { AuthState } from './auth';
export type { ChatMessage, StreamOptions } from './streaming';
export type { UsageState } from './rateLimiter';