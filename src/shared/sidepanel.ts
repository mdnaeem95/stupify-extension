/**
 * Types for Side Panel State and Communication
 * Day 4: Side Panel UI
 */

export type ComplexityLevel = '5yo' | 'normal' | 'advanced';

export interface SelectedText {
  text: string;
  url: string;
  domain: string;
  timestamp: number;
}

export interface ExplanationState {
  isLoading: boolean;
  isStreaming: boolean;
  response: string;
  error: string | null;
  completed: boolean;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  clicked: boolean;
}

export interface SidePanelState {
  // Selected text
  selectedText: SelectedText | null;
  
  // Complexity
  complexity: ComplexityLevel;
  
  // Explanation
  explanation: ExplanationState;
  
  // Follow-ups
  followUpQuestions: FollowUpQuestion[];
  
  // History
  history: ExplanationHistory[];
  
  // UI State
  isCollapsed: boolean;
}

export interface ExplanationHistory {
  id: string;
  question: string;
  complexity: ComplexityLevel;
  response: string;
  followUps: string[];
  timestamp: number;
  url: string;
}

// Message types for communication
export interface OpenSidePanelMessage {
  type: 'OPEN_SIDE_PANEL';
  payload: {
    text: string;
    url: string;
  };
}

export interface ExplanationStreamMessage {
  type: 'EXPLANATION_STREAM';
  payload: {
    chunk: string;
    done: boolean;
  };
}

export interface ExplanationErrorMessage {
  type: 'EXPLANATION_ERROR';
  payload: {
    error: string;
  };
}

export type SidePanelMessage =
  | OpenSidePanelMessage
  | ExplanationStreamMessage
  | ExplanationErrorMessage;