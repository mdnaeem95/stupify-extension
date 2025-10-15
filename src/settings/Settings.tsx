/**
 * Settings Page
 * 
 * Full preferences interface for the extension:
 * - Default complexity level
 * - Keyboard shortcuts
 * - Theme selection (light/dark)
 * - Auto-open panel toggle
 * - Sound effects toggle
 * - Animation speed control
 */

import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Keyboard, 
  Palette, 
  Zap, 
  Gauge,
  Save,
  RotateCcw,
  ChevronRight,
  Check
} from 'lucide-react';
import { logger } from '../shared/utils';

type ComplexityLevel = '5yo' | 'normal' | 'advanced';
type Theme = 'light' | 'dark' | 'system';
type AnimationSpeed = 'slow' | 'normal' | 'fast';

interface SettingsState {
  defaultComplexity: ComplexityLevel;
  keyboardShortcut: string;
  theme: Theme;
  autoOpenPanel: boolean;
  soundEffects: boolean;
  animationSpeed: AnimationSpeed;
}

const DEFAULT_SETTINGS: SettingsState = {
  defaultComplexity: 'normal',
  keyboardShortcut: 'Ctrl+Shift+S',
  theme: 'system',
  autoOpenPanel: true,
  soundEffects: true,
  animationSpeed: 'normal',
};

export function Settings() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get('settings');
      if (result.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
      }
    } catch (error) {
      logger.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await chrome.storage.local.set({ settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      logger.info('Settings saved');
      
      // Track analytics
      chrome.runtime.sendMessage({
        type: 'TRACK_EVENT',
        payload: {
          event: 'settings_saved',
          properties: { settings }
        }
      }).catch(() => {});
    } catch (error) {
      logger.error('Failed to save settings:', error);
    }
  };

  const resetSettings = async () => {
    if (confirm('Reset all settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS);
      await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  };

  const handleShortcutRecord = () => {
    setIsRecordingShortcut(true);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const keys: string[] = [];
      
      if (e.ctrlKey || e.metaKey) keys.push(e.ctrlKey ? 'Ctrl' : 'Cmd');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      
      if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
        keys.push(e.key.toUpperCase());
      }
      
      if (keys.length >= 2) {
        setSettings(prev => ({ ...prev, keyboardShortcut: keys.join('+') }));
        setIsRecordingShortcut(false);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Cancel after 5 seconds
    setTimeout(() => {
      setIsRecordingShortcut(false);
      document.removeEventListener('keydown', handleKeyDown);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500">Customize your Stupify experience</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={resetSettings}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            
            <button
              onClick={saveSettings}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 font-medium"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        
        {/* Default Complexity */}
        <SettingsSection
          icon={<Zap className="w-5 h-5" />}
          title="Default Complexity"
          description="Choose your preferred explanation level"
        >
          <div className="grid grid-cols-3 gap-3">
            {(['5yo', 'normal', 'advanced'] as ComplexityLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setSettings(prev => ({ ...prev, defaultComplexity: level }))}
                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${settings.defaultComplexity === level
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 bg-white'
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">
                    {level === '5yo' && '🎈'}
                    {level === 'normal' && '💡'}
                    {level === 'advanced' && '🎓'}
                  </div>
                  <div className="font-semibold text-gray-900 capitalize">
                    {level === '5yo' ? '5-Year-Old' : level}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {level === '5yo' && 'Super simple'}
                    {level === 'normal' && 'Clear & balanced'}
                    {level === 'advanced' && 'Technical detail'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SettingsSection>

        {/* Keyboard Shortcut */}
        <SettingsSection
          icon={<Keyboard className="w-5 h-5" />}
          title="Keyboard Shortcut"
          description="Quick access to explain selected text"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <button
                onClick={handleShortcutRecord}
                className={`
                  w-full px-4 py-3 rounded-lg border-2 font-mono text-center transition-all
                  ${isRecordingShortcut
                    ? 'border-purple-500 bg-purple-50 animate-pulse'
                    : 'border-gray-300 bg-white hover:border-purple-400'
                  }
                `}
              >
                {isRecordingShortcut ? 'Press keys...' : settings.keyboardShortcut}
              </button>
            </div>
            <button
              onClick={handleShortcutRecord}
              className="px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
            >
              Record
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Click "Record" and press your desired key combination
          </p>
        </SettingsSection>

        {/* Theme */}
        <SettingsSection
          icon={<Palette className="w-5 h-5" />}
          title="Theme"
          description="Choose your interface appearance"
        >
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as Theme[]).map((theme) => (
              <button
                key={theme}
                onClick={() => setSettings(prev => ({ ...prev, theme }))}
                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${settings.theme === theme
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 bg-white'
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">
                    {theme === 'light' && '☀️'}
                    {theme === 'dark' && '🌙'}
                    {theme === 'system' && '⚙️'}
                  </div>
                  <div className="font-semibold text-gray-900 capitalize">
                    {theme}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SettingsSection>

        {/* Toggles */}
        <SettingsSection
          icon={<Gauge className="w-5 h-5" />}
          title="Behavior"
          description="Customize how Stupify works"
        >
          <div className="space-y-4">
            <ToggleOption
              label="Auto-open side panel"
              description="Open the side panel automatically when you select text"
              checked={settings.autoOpenPanel}
              onChange={(checked) => setSettings(prev => ({ ...prev, autoOpenPanel: checked }))}
            />
            
            <ToggleOption
              label="Sound effects"
              description="Play sounds for actions and achievements"
              checked={settings.soundEffects}
              onChange={(checked) => setSettings(prev => ({ ...prev, soundEffects: checked }))}
            />
          </div>
        </SettingsSection>

        {/* Animation Speed */}
        <SettingsSection
          icon={<Gauge className="w-5 h-5" />}
          title="Animation Speed"
          description="Control how fast animations play"
        >
          <div className="grid grid-cols-3 gap-3">
            {(['slow', 'normal', 'fast'] as AnimationSpeed[]).map((speed) => (
              <button
                key={speed}
                onClick={() => setSettings(prev => ({ ...prev, animationSpeed: speed }))}
                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${settings.animationSpeed === speed
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 bg-white'
                  }
                `}
              >
                <div className="text-center">
                  <div className="font-semibold text-gray-900 capitalize">
                    {speed}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {speed === 'slow' && '0.5x'}
                    {speed === 'normal' && '1x'}
                    {speed === 'fast' && '1.5x'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SettingsSection>

        {/* About */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">About Stupify</h3>
          <p className="text-sm text-gray-600 mb-4">
            Version {chrome.runtime.getManifest().version}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://stupify.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Visit Website
              <ChevronRight className="w-4 h-4" />
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="https://stupify.ai/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Privacy Policy
              <ChevronRight className="w-4 h-4" />
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="mailto:support@stupify.ai"
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Support
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper Components

function SettingsSection({ 
  icon, 
  title, 
  description, 
  children 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500 mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${checked ? 'bg-purple-600' : 'bg-gray-300'}
        `}
      >
        <div
          className={`
            absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  );
}