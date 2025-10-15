// Constants for Stupify Chrome Extension

export const APP_NAME = 'Stupify';
export const APP_VERSION = '1.0.0';

// API Configuration
export const API_BASE_URL = 'https://stupify.app/api';
export const SUPABASE_URL = 'https://uoylkabywklpmuhoxopr.supabase.co'; // TODO: Replace with actual URL
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveWxrYWJ5d2tscG11aG94b3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MjUzNzMsImV4cCI6MjA3NTMwMTM3M30.GDHquoyblmr-tq4Vo-FISoSQejFENnMsFHQg3cTN4fM'; // TODO: Replace with actual key

// Usage Limits
export const FREE_TIER_DAILY_LIMIT = 3;
export const PREMIUM_TIER_DAILY_LIMIT = 9999; // Effectively unlimited

// Cache Configuration
export const MAX_CACHED_EXPLANATIONS = 10;
export const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Selection Constraints
export const MIN_SELECTION_LENGTH = 10;
export const MAX_SELECTION_LENGTH = 5000;

// UI Configuration
export const SIDE_PANEL_WIDTH = 400;
export const POPUP_WIDTH = 320;
export const POPUP_HEIGHT = 480;

// Animation Durations (ms)
export const SLIDE_IN_DURATION = 300;
export const FADE_IN_DURATION = 200;

// Analytics Events
export const ANALYTICS_EVENTS = {
  EXTENSION_INSTALLED: 'extension_installed',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  TEXT_SELECTED: 'text_selected',
  EXPLANATION_REQUESTED: 'explanation_requested',
  EXPLANATION_RECEIVED: 'explanation_received',
  EXPLANATION_FAILED: 'explanation_failed',
  COMPLEXITY_CHANGED: 'complexity_changed',
  FOLLOW_UP_CLICKED: 'follow_up_clicked',
  SIDE_PANEL_OPENED: 'side_panel_opened',
  SIDE_PANEL_CLOSED: 'side_panel_closed',
  RESPONSE_COPIED: 'response_copied',
  RESPONSE_SHARED: 'response_shared',
  OPEN_IN_APP_CLICKED: 'open_in_app_clicked',
  UPGRADE_CTA_VIEWED: 'upgrade_cta_viewed',
  UPGRADE_CLICKED: 'upgrade_clicked',
  SETTINGS_OPENED: 'settings_opened',
  SETTINGS_SAVED: 'settings_saved',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  RATE_LIMIT: 'You\'ve reached your daily limit. Upgrade to Premium for unlimited explanations!',
  INVALID_SELECTION: 'Please select text between 10 and 5000 characters.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  NO_TEXT_SELECTED: 'Please select some text to explain.',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  SETTINGS: 'settings',
  CACHED_EXPLANATIONS: 'cached_explanations',
  DAILY_USAGE: 'daily_usage',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  LAST_SYNC: 'last_sync',
  ANALYTICS_QUEUE: 'analytics_queue',
} as const;

// Default Settings
export const DEFAULT_SETTINGS = {
  defaultComplexity: 'normal' as const,
  autoOpenPanel: true,
  showBadgeCounter: true,
  keyboardShortcut: 'Ctrl+Shift+S',
};

// Context Menu
export const CONTEXT_MENU_ID = 'stupify-simplify';
export const CONTEXT_MENU_TITLE = 'Simplify with Stupify';

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  SIMPLIFY: 'simplify-selection',
};

// URLs
export const URLS = {
  WEB_APP: 'https://stupify.app',
  LOGIN: 'https://stupify.app/login',
  SIGNUP: 'https://stupify.app/signup',
  DASHBOARD: 'https://stupify.app/chat',
  STATS: 'https://stupify.app/stats',
  UPGRADE: 'https://stupify.app/pricing',
  SUPPORT: 'mailto:support@stupify.app',
  PRIVACY: 'https://stupify.app/privacy',
} as const;

// Badge Colors
export const BADGE_COLORS = {
  DEFAULT: '#a855f7',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  SUCCESS: '#10b981',
} as const;

// Complexity Level Display Names
export const COMPLEXITY_LABELS = {
  '5yo': '5-Year-Old',
  'normal': 'Normal',
  'advanced': 'Advanced',
} as const;

// Complexity Level Descriptions
export const COMPLEXITY_DESCRIPTIONS = {
  '5yo': 'Simple explanations anyone can understand',
  'normal': 'Clear and conversational',
  'advanced': 'Detailed and technical',
} as const;

// Follow-up Question Categories
export const FOLLOW_UP_CATEGORIES = {
  deeper: 'Go Deeper',
  related: 'Related Topics',
  practical: 'Practical Use',
} as const;