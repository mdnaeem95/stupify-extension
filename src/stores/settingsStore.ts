// Settings Store - Manages user preferences

import { create } from 'zustand';
import type { ExtensionSettings, ComplexityLevel } from '../shared/types';
import { settingsStorage } from '../lib/storage';
import { DEFAULT_SETTINGS } from '../shared/constants';

interface SettingsState extends ExtensionSettings {
  isLoading: boolean;
  
  // Actions
  setDefaultComplexity: (complexity: ComplexityLevel) => Promise<void>;
  setAutoOpenPanel: (enabled: boolean) => Promise<void>;
  setShowBadgeCounter: (enabled: boolean) => Promise<void>;
  setKeyboardShortcut: (shortcut: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<ExtensionSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoading: true,

  setDefaultComplexity: async (complexity) => {
    const settings = { ...get(), defaultComplexity: complexity };
    await settingsStorage.set(settings);
    set({ defaultComplexity: complexity });
  },

  setAutoOpenPanel: async (enabled) => {
    const settings = { ...get(), autoOpenPanel: enabled };
    await settingsStorage.set(settings);
    set({ autoOpenPanel: enabled });
  },

  setShowBadgeCounter: async (enabled) => {
    const settings = { ...get(), showBadgeCounter: enabled };
    await settingsStorage.set(settings);
    set({ showBadgeCounter: enabled });
  },

  setKeyboardShortcut: async (shortcut) => {
    const settings = { ...get(), keyboardShortcut: shortcut };
    await settingsStorage.set(settings);
    set({ keyboardShortcut: shortcut });
  },

  loadSettings: async () => {
    set({ isLoading: true });
    
    try {
      const saved = await settingsStorage.get();
      
      if (saved) {
        set({ 
          ...saved,
          isLoading: false,
        });
      } else {
        // First time - save defaults
        await settingsStorage.set(DEFAULT_SETTINGS);
        set({ 
          ...DEFAULT_SETTINGS,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      set({ 
        ...DEFAULT_SETTINGS,
        isLoading: false,
      });
    }
  },

  saveSettings: async (newSettings) => {
    const current = get();
    const updated = {
      defaultComplexity: newSettings.defaultComplexity ?? current.defaultComplexity,
      autoOpenPanel: newSettings.autoOpenPanel ?? current.autoOpenPanel,
      showBadgeCounter: newSettings.showBadgeCounter ?? current.showBadgeCounter,
      keyboardShortcut: newSettings.keyboardShortcut ?? current.keyboardShortcut,
    };
    
    await settingsStorage.set(updated);
    set(updated);
  },

  resetSettings: async () => {
    await settingsStorage.set(DEFAULT_SETTINGS);
    set({ ...DEFAULT_SETTINGS });
  },
}));

// Initialize settings on load
if (typeof window !== 'undefined') {
  useSettingsStore.getState().loadSettings();
}