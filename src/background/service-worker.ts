/**
 * Background Service Worker
 * 
 * Handles:
 * - Context menu creation
 * - Message passing between content scripts and UI
 * - Side panel management
 * - Auth state synchronization
 * - Analytics event tracking
 * 
 * Service workers are event-driven and don't persist.
 * All state must be stored in chrome.storage.
 */

import { ChromeMessage } from "@/shared/types";
import { logger } from "@/shared/utils";



// Context menu ID
const CONTEXT_MENU_ID = 'stupify-simplify-text';

/**
 * Initialize service worker
 */
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('Extension installed:', details.reason);

  if (details.reason === 'install') {
    // First install
    handleFirstInstall();
  } else if (details.reason === 'update') {
    // Extension updated
    handleUpdate(details.previousVersion);
  }

  // Create context menu
  createContextMenu();
});

/**
 * Handle first install
 */
async function handleFirstInstall(): Promise<void> {
  try {
    // Set default settings
    await chrome.storage.local.set({
      settings: {
        defaultComplexity: 'normal',
        autoOpenSidePanel: true,
        keyboardShortcutEnabled: true,
        theme: 'light', // For future use
      },
      stats: {
        installDate: Date.now(),
        totalExplanations: 0,
        lastUsed: null,
      },
      onboarding: {
        completed: false,
        currentStep: 0,
      },
    });

    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding.html'),
    });

    // Track install event
    trackEvent('extension_installed', {
      version: chrome.runtime.getManifest().version,
    });

    logger.info('First install setup complete');
  } catch (error) {
    logger.error('Failed to handle first install:', error);
  }
}

/**
 * Handle extension update
 */
async function handleUpdate(previousVersion?: string): Promise<void> {
  try {
    const currentVersion = chrome.runtime.getManifest().version;

    logger.info('Extension updated:', {
      from: previousVersion,
      to: currentVersion,
    });

    // Track update event
    trackEvent('extension_updated', {
      from_version: previousVersion,
      to_version: currentVersion,
    });

    // Run migrations if needed
    if (previousVersion) {
      await runMigrations(previousVersion, currentVersion);
    }
  } catch (error) {
    logger.error('Failed to handle update:', error);
  }
}

/**
 * Run data migrations between versions
 */
async function runMigrations(fromVersion: string, toVersion: string): Promise<void> {
  // Add migration logic here when needed
  logger.info('Running migrations:', { fromVersion, toVersion });
}

/**
 * Create context menu item
 */
function createContextMenu(): void {
  try {
    // Remove existing menu (in case of reload)
    chrome.contextMenus.remove(CONTEXT_MENU_ID, () => {
      // Ignore error if doesn't exist
      chrome.runtime.lastError;
    });

    // Create new menu
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Simplify with Stupify',
      contexts: ['selection'], // Only show when text is selected
      documentUrlPatterns: ['http://*/*', 'https://*/*'], // All HTTP(S) pages
    });

    logger.info('Context menu created');
  } catch (error) {
    logger.error('Failed to create context menu:', error);
  }
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;

  try {
    if (!tab?.id) {
      throw new Error('No active tab');
    }

    const selectedText = info.selectionText;

    if (!selectedText || selectedText.trim().length < 10) {
      logger.warn('Selection too short or empty');
      return;
    }

    // Store selection
    await chrome.storage.local.set({
      currentSelection: {
        text: selectedText.trim(),
        url: tab.url || '',
        domain: new URL(tab.url || '').hostname,
        timestamp: Date.now(),
      },
    });

    // Send message to content script
    await chrome.tabs.sendMessage(tab.id, {
      type: 'CONTEXT_MENU_CLICKED',
      payload: {
        text: selectedText.trim(),
      },
    });

    // Open side panel
    await openSidePanel(tab.id, selectedText.trim());

    // Track event
    trackEvent('context_menu_clicked', {
      text_length: selectedText.length,
      domain: new URL(tab.url || '').hostname,
    });

    logger.info('Context menu handled');
  } catch (error) {
    logger.error('Failed to handle context menu click:', error);
  }
});

/**
 * Handle keyboard command (from manifest commands)
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'simplify-selection') {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id) {
        throw new Error('No active tab');
      }

      // Get current selection from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_CURRENT_SELECTION',
      });

      const selectedText = response?.text;

      if (!selectedText || selectedText.length < 10) {
        logger.warn('No valid selection for keyboard shortcut');
        return;
      }

      // Open side panel with selection
      await openSidePanel(tab.id, selectedText);

      // Track event
      trackEvent('keyboard_shortcut_used', {
        text_length: selectedText.length,
      });

      logger.info('Keyboard shortcut handled');
    } catch (error) {
      logger.error('Failed to handle keyboard command:', error);
    }
  }
});

/**
 * Open side panel with selected text
 */
async function openSidePanel(tabId: number, selectedText: string): Promise<void> {
  try {
    // Check if user is authenticated
    const { auth } = await chrome.storage.local.get('auth');

    if (!auth?.accessToken) {
      // Not authenticated - open popup to sign in
      logger.info('User not authenticated, showing auth prompt');
      
      // For now, just open the web app
      await chrome.tabs.create({
        url: 'https://stupify.ai/login?ref=extension',
      });
      return;
    }

    // Store selected text for side panel
    await chrome.storage.local.set({
      pendingExplanation: {
        text: selectedText,
        timestamp: Date.now(),
      },
    });

    // Open side panel
    await chrome.sidePanel.open({ tabId });

    logger.info('Side panel opened');
  } catch (error) {
    logger.error('Failed to open side panel:', error);
  }
}

/**
 * Handle messages from content scripts and UI
 */
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  logger.debug('Message received:', message.type);

  switch (message.type) {
    case 'OPEN_SIDE_PANEL':
      handleOpenSidePanel(message.payload, sender.tab?.id)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          logger.error('Failed to open side panel:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Async response

    case 'TRACK_EVENT':
      trackEvent(message.payload.event, message.payload.properties);
      sendResponse({ success: true });
      return false;

    case 'GET_AUTH_STATE':
      getAuthState()
        .then((auth) => sendResponse({ auth }))
        .catch((error) => {
          logger.error('Failed to get auth state:', error);
          sendResponse({ auth: null });
        });
      return true; // Async response

    case 'SET_AUTH_STATE':
      setAuthState(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          logger.error('Failed to set auth state:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Async response

    case 'CLEAR_AUTH_STATE':
      clearAuthState()
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          logger.error('Failed to clear auth state:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Async response

    default:
      logger.warn('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
  }
});

/**
 * Handle open side panel request
 */
async function handleOpenSidePanel(payload: { text: string; trigger: string }, tabId?: number): Promise<void> {
  if (!tabId) {
    throw new Error('No tab ID provided');
  }

  await openSidePanel(tabId, payload.text);
}

/**
 * Get authentication state
 */
async function getAuthState(): Promise<any> {
  const { auth } = await chrome.storage.local.get('auth');
  return auth || null;
}

/**
 * Set authentication state
 */
async function setAuthState(auth: any): Promise<void> {
  await chrome.storage.local.set({ auth });
  logger.info('Auth state updated');
}

/**
 * Clear authentication state
 */
async function clearAuthState(): Promise<void> {
  await chrome.storage.local.remove('auth');
  logger.info('Auth state cleared');
}

/**
 * Track analytics event
 */
async function trackEvent(event: string, properties?: Record<string, any>): Promise<void> {
  try {
    // Get or create anonymous user ID
    let { analyticsId } = await chrome.storage.local.get('analyticsId');
    
    if (!analyticsId) {
      analyticsId = `ext_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await chrome.storage.local.set({ analyticsId });
    }

    // Add event to queue (will be sent to analytics API)
    const { eventQueue = [] } = await chrome.storage.local.get('eventQueue');
    
    eventQueue.push({
      event,
      properties: {
        ...properties,
        timestamp: Date.now(),
        user_id: analyticsId,
        extension_version: chrome.runtime.getManifest().version,
      },
    });

    // Keep queue size reasonable (max 100 events)
    if (eventQueue.length > 100) {
      eventQueue.shift();
    }

    await chrome.storage.local.set({ eventQueue });

    logger.debug('Event tracked:', event);

    // Try to flush queue (non-blocking)
    flushEventQueue().catch((error) => {
      logger.debug('Failed to flush event queue:', error);
    });
  } catch (error) {
    logger.error('Failed to track event:', error);
  }
}

/**
 * Flush event queue to analytics API
 */
async function flushEventQueue(): Promise<void> {
  try {
    const { eventQueue = [], auth } = await chrome.storage.local.get(['eventQueue', 'auth']);

    if (eventQueue.length === 0) return;

    // Send events to API
    const response = await fetch('https://stupify.ai/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth?.accessToken && { Authorization: `Bearer ${auth.accessToken}` }),
      },
      body: JSON.stringify({ events: eventQueue }),
    });

    if (response.ok) {
      // Clear queue on success
      await chrome.storage.local.set({ eventQueue: [] });
      logger.debug('Event queue flushed');
    }
  } catch (error) {
    // Silently fail - events will be retried later
    logger.debug('Failed to flush event queue:', error);
  }
}

/**
 * Periodic cleanup (every 5 minutes)
 */
setInterval(() => {
  flushEventQueue().catch(() => {});
}, 5 * 60 * 1000);

// Export for testing
export {
  createContextMenu,
  trackEvent,
  openSidePanel,
  getAuthState,
  setAuthState,
  clearAuthState,
};