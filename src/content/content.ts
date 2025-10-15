/**
 * Content Script - Main Entry Point
 * 
 * This script runs on every webpage and:
 * - Detects text selection
 * - Handles keyboard shortcuts (Cmd+Shift+S)
 * - Manages context menu integration
 * - Communicates with background service worker
 * 
 * Injected at document_idle for optimal performance
 */

import { logger } from '@/shared/utils';
import { SelectionHandler } from './SelectionHandler';
import { ChromeMessage } from '@/shared/types';
import "./styles.css";

// Constants
const MIN_SELECTION_LENGTH = 10;
const MAX_SELECTION_LENGTH = 5000;
const KEYBOARD_SHORTCUT = { key: 's', ctrlKey: true, shiftKey: true };

// Initialize selection handler
let selectionHandler: SelectionHandler | null = null;

/**
 * Check if chrome.storage is available
 */
function isChromeStorageAvailable(): boolean {
  return typeof chrome !== 'undefined' && 
         chrome.storage !== undefined && 
         chrome.storage.local !== undefined;
}

/**
 * Initialize the content script
 */
function init(): void {
  try {
    logger.info('Content script initializing...');

    // Verify chrome.storage is available
    if (!isChromeStorageAvailable()) {
      logger.error('chrome.storage is not available. Extension may not work correctly.');
      // Continue initialization but with limited functionality
    }

    // Create selection handler
    selectionHandler = new SelectionHandler({
      minLength: MIN_SELECTION_LENGTH,
      maxLength: MAX_SELECTION_LENGTH,
      onSelectionChange: handleSelectionChange,
    });

    // Set up keyboard shortcut listener
    setupKeyboardShortcut();

    // Set up context menu message listener
    setupMessageListener();

    // Set up page visibility listener (pause when tab hidden)
    setupVisibilityListener();

    logger.info('Content script initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize content script:', error);
  }
}

/**
 * Handle text selection changes
 */
function handleSelectionChange(selectedText: string): void {
  try {
    // Validate selection length
    if (selectedText.length < MIN_SELECTION_LENGTH) {
      logger.debug('Selection too short, ignoring');
      return;
    }

    if (selectedText.length > MAX_SELECTION_LENGTH) {
      logger.debug('Selection too long, truncating');
      selectedText = selectedText.substring(0, MAX_SELECTION_LENGTH);
    }

    // Store current selection for context menu
    // Check if chrome.storage is available before using it
    if (isChromeStorageAvailable()) {
      chrome.storage.local.set({
        currentSelection: {
          text: selectedText,
          url: window.location.href,
          domain: window.location.hostname,
          timestamp: Date.now(),
        },
      }).catch((error) => {
        logger.error('Failed to store selection:', error);
      });

      logger.debug('Selection stored:', {
        length: selectedText.length,
        domain: window.location.hostname,
      });
    } else {
      logger.warn('chrome.storage not available, selection not stored');
    }
  } catch (error) {
    logger.error('Failed to handle selection change:', error);
  }
}

/**
 * Set up keyboard shortcut (Cmd+Shift+S / Ctrl+Shift+S)
 */
function setupKeyboardShortcut(): void {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    // Check if shortcut matches
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? event.metaKey : event.ctrlKey;

    if (
      event.key.toLowerCase() === KEYBOARD_SHORTCUT.key &&
      modifierKey &&
      event.shiftKey
    ) {
      event.preventDefault();
      event.stopPropagation();

      handleShortcutTrigger();
    }
  });

  logger.info('Keyboard shortcut registered');
}

/**
 * Handle keyboard shortcut trigger
 */
async function handleShortcutTrigger(): Promise<void> {
  try {
    const selectedText = selectionHandler?.getSelectedText();

    if (!selectedText || selectedText.length < MIN_SELECTION_LENGTH) {
      // Show notification that selection is too short
      showNotification('Please select at least 10 characters', 'warning');
      return;
    }

    // Send message to background to open side panel
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'OPEN_SIDE_PANEL',
        payload: {
          text: selectedText,
          trigger: 'keyboard_shortcut',
        },
      }).catch((error) => {
        logger.error('Failed to send message to background:', error);
        showNotification('Failed to open side panel. Please try again.', 'error');
      });

      // Track analytics
      chrome.runtime.sendMessage({
        type: 'TRACK_EVENT',
        payload: {
          event: 'keyboard_shortcut_used',
          properties: {
            text_length: selectedText.length,
            domain: window.location.hostname,
          },
        },
      }).catch((error) => {
        logger.debug('Failed to track event:', error);
      });

      logger.info('Keyboard shortcut triggered');
    } else {
      logger.error('chrome.runtime not available');
      showNotification('Extension not available', 'error');
    }
  } catch (error) {
    logger.error('Failed to handle keyboard shortcut:', error);
    showNotification('Something went wrong. Please try again.', 'error');
  }
}

/**
 * Set up message listener for context menu clicks
 */
function setupMessageListener(): void {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      try {
        if (message.type === 'CONTEXT_MENU_CLICKED') {
          handleContextMenuClick();
          sendResponse({ success: true });
        }

        if (message.type === 'GET_CURRENT_SELECTION') {
          const selectedText = selectionHandler?.getSelectedText() || '';
          sendResponse({ text: selectedText });
        }

        // Return true to indicate async response
        return true;
      } catch (error) {
        logger.error('Error in message listener:', error, sender);
        sendResponse({ success: false, error: String(error) });
        return false;
      }
    });

    logger.info('Message listener registered');
  } else {
    logger.error('chrome.runtime not available, message listener not registered');
  }
}

/**
 * Handle context menu click
 */
async function handleContextMenuClick(): Promise<void> {
  try {
    // Get current selection from storage (set by context menu)
    if (!isChromeStorageAvailable()) {
      logger.error('chrome.storage not available');
      showNotification('Extension storage not available', 'error');
      return;
    }

    const result = await chrome.storage.local.get('currentSelection');
    const selection = result.currentSelection;

    if (!selection || !selection.text) {
      showNotification('No text selected', 'warning');
      return;
    }

    // Send message to background to open side panel
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'OPEN_SIDE_PANEL',
        payload: {
          text: selection.text,
          trigger: 'context_menu',
        },
      }).catch((error) => {
        logger.error('Failed to send message to background:', error);
        showNotification('Failed to open side panel. Please try again.', 'error');
      });

      // Track analytics
      chrome.runtime.sendMessage({
        type: 'TRACK_EVENT',
        payload: {
          event: 'context_menu_clicked',
          properties: {
            text_length: selection.text.length,
            domain: window.location.hostname,
          },
        },
      }).catch((error) => {
        logger.debug('Failed to track event:', error);
      });

      logger.info('Context menu click handled');
    } else {
      logger.error('chrome.runtime not available');
      showNotification('Extension not available', 'error');
    }
  } catch (error) {
    logger.error('Failed to handle context menu click:', error);
    showNotification('Something went wrong. Please try again.', 'error');
  }
}

/**
 * Set up page visibility listener
 */
function setupVisibilityListener(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Pause selection tracking when tab is hidden
      selectionHandler?.pause();
      logger.debug('Selection tracking paused (tab hidden)');
    } else {
      // Resume when tab becomes visible
      selectionHandler?.resume();
      logger.debug('Selection tracking resumed (tab visible)');
    }
  });
}

/**
 * Show in-page notification
 */
function showNotification(message: string, type: 'success' | 'warning' | 'error'): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'stupify-notification';
  notification.setAttribute('data-type', type);
  notification.textContent = message;

  // Inject styles if not already present
  if (!document.getElementById('stupify-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'stupify-notification-styles';
    style.textContent = `
      .stupify-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
        animation: stupify-slide-in 0.3s ease-out;
      }

      .stupify-notification[data-type="success"] {
        background: #10b981;
        color: white;
      }

      .stupify-notification[data-type="warning"] {
        background: #f59e0b;
        color: white;
      }

      .stupify-notification[data-type="error"] {
        background: #ef4444;
        color: white;
      }

      @keyframes stupify-slide-in {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes stupify-slide-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Add to page
  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'stupify-slide-out 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Clean up on page unload
 */
function cleanup(): void {
  selectionHandler?.destroy();
  logger.info('Content script cleaned up');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Clean up on page unload
window.addEventListener('beforeunload', cleanup);

// Export for testing
export { init, cleanup, handleSelectionChange, handleContextMenuClick };