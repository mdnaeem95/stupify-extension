export const APP_NAME = "Stupify";
export const APP_VERSION = "1.0.0";
export const API_BASE_URL = "https://stupify.ai/api";
export const SUPABASE_URL = "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY = "your-anon-key";
export const FREE_TIER_DAILY_LIMIT = 3;
export const PREMIUM_TIER_DAILY_LIMIT = 9999;
export const MAX_CACHED_EXPLANATIONS = 10;
export const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1e3;
export const MIN_SELECTION_LENGTH = 10;
export const MAX_SELECTION_LENGTH = 5e3;
export const SIDE_PANEL_WIDTH = 400;
export const POPUP_WIDTH = 320;
export const POPUP_HEIGHT = 480;
export const SLIDE_IN_DURATION = 300;
export const FADE_IN_DURATION = 200;
export const ANALYTICS_EVENTS = {
  EXTENSION_INSTALLED: "extension_installed",
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_SKIPPED: "onboarding_skipped",
  TEXT_SELECTED: "text_selected",
  EXPLANATION_REQUESTED: "explanation_requested",
  EXPLANATION_RECEIVED: "explanation_received",
  EXPLANATION_FAILED: "explanation_failed",
  COMPLEXITY_CHANGED: "complexity_changed",
  FOLLOW_UP_CLICKED: "follow_up_clicked",
  SIDE_PANEL_OPENED: "side_panel_opened",
  SIDE_PANEL_CLOSED: "side_panel_closed",
  RESPONSE_COPIED: "response_copied",
  RESPONSE_SHARED: "response_shared",
  OPEN_IN_APP_CLICKED: "open_in_app_clicked",
  UPGRADE_CTA_VIEWED: "upgrade_cta_viewed",
  UPGRADE_CLICKED: "upgrade_clicked",
  SETTINGS_OPENED: "settings_opened",
  SETTINGS_SAVED: "settings_saved"
};
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  AUTH_ERROR: "Authentication failed. Please sign in again.",
  RATE_LIMIT: "You've reached your daily limit. Upgrade to Premium for unlimited explanations!",
  INVALID_SELECTION: "Please select text between 10 and 5000 characters.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
  NO_TEXT_SELECTED: "Please select some text to explain."
};
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_DATA: "user_data",
  SETTINGS: "settings",
  CACHED_EXPLANATIONS: "cached_explanations",
  DAILY_USAGE: "daily_usage",
  ONBOARDING_COMPLETED: "onboarding_completed",
  LAST_SYNC: "last_sync",
  ANALYTICS_QUEUE: "analytics_queue"
};
export const DEFAULT_SETTINGS = {
  defaultComplexity: "normal",
  autoOpenPanel: true,
  showBadgeCounter: true,
  keyboardShortcut: "Ctrl+Shift+S"
};
export const CONTEXT_MENU_ID = "stupify-simplify";
export const CONTEXT_MENU_TITLE = "Simplify with Stupify";
export const KEYBOARD_SHORTCUTS = {
  SIMPLIFY: "simplify-selection"
};
export const URLS = {
  WEB_APP: "https://stupify.ai",
  LOGIN: "https://stupify.ai/login",
  SIGNUP: "https://stupify.ai/signup",
  DASHBOARD: "https://stupify.ai/chat",
  STATS: "https://stupify.ai/stats",
  UPGRADE: "https://stupify.ai/pricing",
  SUPPORT: "mailto:support@stupify.ai",
  PRIVACY: "https://stupify.ai/privacy"
};
export const BADGE_COLORS = {
  DEFAULT: "#a855f7",
  WARNING: "#f59e0b",
  ERROR: "#ef4444",
  SUCCESS: "#10b981"
};
export const COMPLEXITY_LABELS = {
  "5yo": "5-Year-Old",
  "normal": "Normal",
  "advanced": "Advanced"
};
export const COMPLEXITY_DESCRIPTIONS = {
  "5yo": "Simple explanations anyone can understand",
  "normal": "Clear and conversational",
  "advanced": "Detailed and technical"
};
export const FOLLOW_UP_CATEGORIES = {
  deeper: "Go Deeper",
  related: "Related Topics",
  practical: "Practical Use"
};
