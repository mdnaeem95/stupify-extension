/**
 * Streaming Handler
 * 
 * Handles streaming responses from the OpenAI chat API
 * - Real-time token streaming
 * - Cancellation support
 * - Reconnection logic
 * - Error handling
 */

import { apiClient } from './api';
import { ComplexityLevel } from '../shared/types';

interface StreamOptions {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Stream chat response from API
 */
export async function streamChatResponse(
  question: string,
  complexityLevel: ComplexityLevel,
  conversationHistory: ChatMessage[] = [],
  options: StreamOptions
): Promise<void> {
  const { onToken, onComplete, onError, signal } = options;

  let fullResponse = '';
  let controller: AbortController | null = null;

  try {
    // Get access token
    const token = await apiClient.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    // Create abort controller (combine with external signal if provided)
    controller = new AbortController();
    
    if (signal) {
      signal.addEventListener('abort', () => {
        controller?.abort();
      });
    }

    // Build messages array
    const messages: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: question },
    ];

    // Make streaming request
    const response = await fetch(`${process.env.VITE_API_URL || 'https://stupify.ai'}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        simplicityLevel: complexityLevel,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Chat request failed');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    // Process stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk
      const chunk = decoder.decode(value, { stream: true });
      
      // Parse data stream format (e.g., "0:Hello\n" format from Vercel AI SDK)
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          // Skip empty lines
          if (!line.trim()) continue;

          // Parse line (format: "0:token" or just "token")
          let content = line;
          
          // Handle Vercel AI SDK format
          if (line.includes(':')) {
            const parts = line.split(':');
            content = parts.slice(1).join(':');
          }

          // Try to parse as JSON (some APIs return JSON chunks)
          try {
            const parsed = JSON.parse(content);
            if (parsed.content) {
              content = parsed.content;
            } else if (typeof parsed === 'string') {
              content = parsed;
            }
          } catch {
            // Not JSON, use as-is
          }

          // Emit token
          if (content && content.trim()) {
            onToken(content);
            fullResponse += content;
          }
        } catch (parseError) {
          console.error('Error parsing chunk:', parseError);
          // Continue processing other chunks
        }
      }
    }

    // Stream complete
    onComplete(fullResponse);

  } catch (error) {
    // Check if it was cancelled
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('🛑 Stream cancelled');
      return;
    }

    console.error('❌ Stream error:', error);
    onError(error as Error);
  }
}

/**
 * Cancel ongoing stream
 */
export function createStreamCanceller(): {
  signal: AbortSignal;
  cancel: () => void;
} {
  const controller = new AbortController();
  
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
}

/**
 * Stream with automatic retry
 */
export async function streamWithRetry(
  question: string,
  complexityLevel: ComplexityLevel,
  conversationHistory: ChatMessage[] = [],
  options: StreamOptions,
  maxRetries: number = 2
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await streamChatResponse(question, complexityLevel, conversationHistory, options);
      return; // Success!
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on auth errors or cancellation
      if (
        lastError.message.includes('authenticated') ||
        lastError.name === 'AbortError'
      ) {
        throw lastError;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Stream failed after retries');
}

/**
 * Helper to track streaming metrics
 */
export class StreamMetrics {
  private startTime: number = 0;
  private firstTokenTime: number = 0;
  private tokenCount: number = 0;

  start(): void {
    this.startTime = Date.now();
    this.firstTokenTime = 0;
    this.tokenCount = 0;
  }

  recordToken(): void {
    if (this.firstTokenTime === 0) {
      this.firstTokenTime = Date.now();
    }
    this.tokenCount++;
  }

  getMetrics() {
    const now = Date.now();
    const totalTime = now - this.startTime;
    const timeToFirstToken = this.firstTokenTime > 0 
      ? this.firstTokenTime - this.startTime 
      : 0;
    const tokensPerSecond = totalTime > 0 
      ? (this.tokenCount / (totalTime / 1000)).toFixed(2) 
      : '0';

    return {
      totalTime,
      timeToFirstToken,
      tokenCount: this.tokenCount,
      tokensPerSecond,
    };
  }
}

// Export types
export type { ChatMessage, StreamOptions };