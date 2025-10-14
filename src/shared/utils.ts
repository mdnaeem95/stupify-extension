// Utility functions for Stupify Chrome Extension

import { MIN_SELECTION_LENGTH, MAX_SELECTION_LENGTH } from './constants';

/**
 * Logger utility for consistent logging across the extension
 * Adds [Stupify] prefix and colors for easy filtering in DevTools
 */
export const logger = {
  /**
   * Log informational messages (purple in console)
   */
  info: (...args: any[]): void => {
    if (isDevelopment() || shouldLog('info')) {
      console.log(
        '%c[Stupify]%c',
        'color: #8b5cf6; font-weight: bold;',
        'color: inherit;',
        ...args
      );
    }
  },

  /**
   * Log debug messages (gray in console, only in dev mode)
   */
  debug: (...args: any[]): void => {
    if (isDevelopment() || shouldLog('debug')) {
      console.debug(
        '%c[Stupify Debug]%c',
        'color: #6b7280; font-weight: bold;',
        'color: inherit;',
        ...args
      );
    }
  },

  /**
   * Log warnings (orange in console)
   */
  warn: (...args: any[]): void => {
    if (shouldLog('warn')) {
      console.warn(
        '%c[Stupify Warning]%c',
        'color: #f59e0b; font-weight: bold;',
        'color: inherit;',
        ...args
      );
    }
  },

  /**
   * Log errors (red in console)
   */
  error: (...args: any[]): void => {
    if (shouldLog('error')) {
      console.error(
        '%c[Stupify Error]%c',
        'color: #ef4444; font-weight: bold;',
        'color: inherit;',
        ...args
      );
    }
  },

  /**
   * Log success messages (green in console)
   */
  success: (...args: any[]): void => {
    if (isDevelopment() || shouldLog('info')) {
      console.log(
        '%c[Stupify Success]%c',
        'color: #10b981; font-weight: bold;',
        'color: inherit;',
        ...args
      );
    }
  },

  /**
   * Group related logs together
   */
  group: (label: string, collapsed = false): void => {
    if (isDevelopment() || shouldLog('info')) {
      if (collapsed) {
        console.groupCollapsed(`%c[Stupify] ${label}`, 'color: #8b5cf6; font-weight: bold;');
      } else {
        console.group(`%c[Stupify] ${label}`, 'color: #8b5cf6; font-weight: bold;');
      }
    }
  },

  /**
   * End a log group
   */
  groupEnd: (): void => {
    if (isDevelopment() || shouldLog('info')) {
      console.groupEnd();
    }
  },

  /**
   * Log a table (useful for arrays of objects)
   */
  table: (data: any): void => {
    if (isDevelopment() || shouldLog('info')) {
      console.log('%c[Stupify Table]', 'color: #8b5cf6; font-weight: bold;');
      console.table(data);
    }
  },

  /**
   * Start a timer
   */
  time: (label: string): void => {
    if (isDevelopment()) {
      console.time(`[Stupify] ${label}`);
    }
  },

  /**
   * End a timer and log the duration
   */
  timeEnd: (label: string): void => {
    if (isDevelopment()) {
      console.timeEnd(`[Stupify] ${label}`);
    }
  },
};

/**
 * Determines if a log level should be shown
 */
function shouldLog(level: 'info' | 'debug' | 'warn' | 'error'): boolean {
  // Always show warnings and errors
  if (level === 'warn' || level === 'error') return true;
  
  // In development, show everything
  if (isDevelopment()) return true;
  
  // In production, only show info and above (not debug)
  return level !== 'debug';
}

/**
 * Validates selected text length
 */
export function isValidSelection(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= MIN_SELECTION_LENGTH && trimmed.length <= MAX_SELECTION_LENGTH;
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Formats a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  
  return past.toLocaleDateString();
}

/**
 * Extracts domain from URL
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Generates a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Delays execution for a specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounces a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), waitMs);
  };
}

/**
 * Throttles a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limitMs);
    }
  };
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Checks if the extension is running in development mode
 */
export function isDevelopment(): boolean {
  return !('update_url' in chrome.runtime.getManifest());
}

/**
 * Gets the current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Checks if two dates are the same day
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
}

/**
 * Formats a number with commas (e.g., 1000 -> "1,000")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Calculates percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Sanitizes HTML to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Checks if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the position of selected text on the page
 */
export function getSelectionPosition(): { x: number; y: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
  };
}

/**
 * Clears the current text selection
 */
export function clearSelection(): void {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
}

/**
 * Checks if dark mode is enabled
 */
export function isDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Converts RGB to Hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Escapes special characters in a string for use in regex
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if the browser supports the required APIs
 */
export function checkBrowserSupport(): {
  supported: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!chrome?.storage) missing.push('chrome.storage');
  if (!chrome?.contextMenus) missing.push('chrome.contextMenus');
  if (!chrome?.runtime) missing.push('chrome.runtime');

  return {
    supported: missing.length === 0,
    missing,
  };
}