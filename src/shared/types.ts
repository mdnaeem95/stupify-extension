// Core types for Stupify Chrome Extension

export type ComplexityLevel = '5yo' | 'normal' | 'advanced';

export interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'premium';
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  complexity_level: ComplexityLevel;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Explanation {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  complexity_level: ComplexityLevel;
  source_url?: string;
  source_text?: string;
  created_at: string;
  conversation_id?: string;
}

export interface SuggestedQuestion {
  id: string;
  text: string;
  category: 'deeper' | 'related' | 'practical';
}

export interface DailyUsage {
  user_id: string;
  date: string;
  questions_asked: number;
  limit: number;
}

export interface UserStats {
  total_questions: number;
  current_streak: number;
  longest_streak: number;
  topics_explored: number;
  favorite_complexity: ComplexityLevel;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  category: 'questions' | 'topics' | 'streak' | 'sharing' | 'voice' | 'special';
}

export interface UserAchievement {
  achievement_id: string;
  user_id: string;
  unlocked_at: string;
}

export interface ExtensionSettings {
  defaultComplexity: ComplexityLevel;
  autoOpenPanel: boolean;
  showBadgeCounter: boolean;
  keyboardShortcut: string;
}

export interface AnalyticsEvent {
  event_name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

export interface CachedExplanation {
  question: string;
  answer: string;
  complexity_level: ComplexityLevel;
  cached_at: number;
}

// Chrome extension specific types
export interface SelectionData {
  text: string;
  url: string;
  title: string;
  x: number;
  y: number;
}

export interface MessageFromBackground {
  type: 'AUTH_STATUS' | 'USAGE_UPDATE' | 'ACHIEVEMENT_UNLOCKED' | 'STREAK_UPDATE';
  payload: any;
}

export interface MessageToBackground {
  type: 'GET_AUTH' | 'SEND_ANALYTICS' | 'CHECK_USAGE' | 'REFRESH_TOKEN';
  payload?: any;
}

// API Response types
export interface APIResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface StreamingResponse {
  chunk: string;
  done: boolean;
}

export interface UsageLimitResponse {
  remaining: number;
  limit: number;
  resets_at: string;
}