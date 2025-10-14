// Explanation Store - Manages current explanation state

import { create } from 'zustand';
import type { ComplexityLevel, SuggestedQuestion, SelectionData } from '../shared/types';

interface ExplanationState {
  // Current explanation
  selectedText: string;
  sourceUrl: string;
  sourceTitle: string;
  complexity: ComplexityLevel;
  answer: string;
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Follow-up questions
  suggestedQuestions: SuggestedQuestion[];
  
  // Selection data
  selectionData: SelectionData | null;
  
  // Side panel state
  isPanelOpen: boolean;
  
  // Actions
  setSelectedText: (text: string, url: string, title: string) => void;
  setComplexity: (complexity: ComplexityLevel) => void;
  setAnswer: (answer: string) => void;
  appendAnswer: (chunk: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSuggestedQuestions: (questions: SuggestedQuestion[]) => void;
  setSelectionData: (data: SelectionData | null) => void;
  setPanelOpen: (isOpen: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedText: '',
  sourceUrl: '',
  sourceTitle: '',
  complexity: 'normal' as ComplexityLevel,
  answer: '',
  isStreaming: false,
  isLoading: false,
  error: null,
  suggestedQuestions: [],
  selectionData: null,
  isPanelOpen: false,
};

export const useExplanationStore = create<ExplanationState>((set) => ({
  ...initialState,

  setSelectedText: (text, url, title) => {
    set({ 
      selectedText: text,
      sourceUrl: url,
      sourceTitle: title,
      answer: '',
      error: null,
    });
  },

  setComplexity: (complexity) => {
    set({ complexity });
  },

  setAnswer: (answer) => {
    set({ answer, isStreaming: false });
  },

  appendAnswer: (chunk) => {
    set((state) => ({ 
      answer: state.answer + chunk,
      isStreaming: true,
    }));
  },

  setStreaming: (isStreaming) => {
    set({ isStreaming });
  },

  setLoading: (isLoading) => {
    set({ isLoading, error: null });
  },

  setError: (error) => {
    set({ error, isLoading: false, isStreaming: false });
  },

  setSuggestedQuestions: (questions) => {
    set({ suggestedQuestions: questions });
  },

  setSelectionData: (data) => {
    set({ selectionData: data });
  },

  setPanelOpen: (isOpen) => {
    set({ isPanelOpen: isOpen });
  },

  reset: () => {
    set(initialState);
  },
}));