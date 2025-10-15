/**
 * Zustand Store for Side Panel State
 * Day 4: Side Panel UI
 */

import { create } from 'zustand';
import type {
  SidePanelState,
  ComplexityLevel,
  SelectedText,
  FollowUpQuestion,
  ExplanationHistory,
} from '../shared/sidepanel';

interface SidePanelStore extends SidePanelState {
  // Actions
  setSelectedText: (text: SelectedText | null) => void;
  setComplexity: (complexity: ComplexityLevel) => void;
  startExplanation: () => void;
  streamResponse: (chunk: string) => void;
  completeExplanation: () => void;
  setError: (error: string) => void;
  clearExplanation: () => void;
  setFollowUpQuestions: (questions: FollowUpQuestion[]) => void;
  markFollowUpClicked: (id: string) => void;
  addToHistory: (item: ExplanationHistory) => void;
  clearHistory: () => void;
  toggleCollapse: () => void;
}

export const useSidePanelStore = create<SidePanelStore>((set, get) => ({
  // Initial state
  selectedText: null,
  complexity: 'normal',
  explanation: {
    isLoading: false,
    isStreaming: false,
    response: '',
    error: null,
    completed: false,
  },
  followUpQuestions: [],
  history: [],
  isCollapsed: false,

  // Actions
  setSelectedText: (text) => set({ selectedText: text }),

  setComplexity: (complexity) => set({ complexity }),

  startExplanation: () =>
    set({
      explanation: {
        isLoading: true,
        isStreaming: true,
        response: '',
        error: null,
        completed: false,
      },
      followUpQuestions: [],
    }),

  streamResponse: (chunk) => {
    const { explanation } = get();
    set({
      explanation: {
        ...explanation,
        isLoading: false,
        isStreaming: true,
        response: explanation.response + chunk,
      },
    });
  },

  completeExplanation: () => {
    const { explanation, selectedText, complexity } = get();
    
    set({
      explanation: {
        ...explanation,
        isStreaming: false,
        completed: true,
      },
    });

    // Add to history
    if (selectedText) {
      get().addToHistory({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        question: selectedText.text,
        complexity,
        response: explanation.response,
        followUps: [],
        timestamp: Date.now(),
        url: selectedText.url,
      });
    }
  },

  setError: (error) =>
    set({
      explanation: {
        isLoading: false,
        isStreaming: false,
        response: '',
        error,
        completed: false,
      },
    }),

  clearExplanation: () =>
    set({
      explanation: {
        isLoading: false,
        isStreaming: false,
        response: '',
        error: null,
        completed: false,
      },
      followUpQuestions: [],
    }),

  setFollowUpQuestions: (questions) => set({ followUpQuestions: questions }),

  markFollowUpClicked: (id) => {
    const { followUpQuestions } = get();
    set({
      followUpQuestions: followUpQuestions.map((q) =>
        q.id === id ? { ...q, clicked: true } : q
      ),
    });
  },

  addToHistory: (item) => {
    const { history } = get();
    const newHistory = [item, ...history].slice(0, 20); // Keep last 20
    set({ history: newHistory });
  },

  clearHistory: () => set({ history: [] }),

  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}));