import { logger } from "/src/shared/utils.ts.js";
import { SelectionHandler } from "/src/content/SelectionHandler.ts.js";
const MIN_SELECTION_LENGTH = 10;
const MAX_SELECTION_LENGTH = 5e3;
const KEYBOARD_SHORTCUT = { key: "s", ctrlKey: true, shiftKey: true };
let selectionHandler = null;
function init() {
  try {
    logger.info("Content script initializing...");
    selectionHandler = new SelectionHandler({
      minLength: MIN_SELECTION_LENGTH,
      maxLength: MAX_SELECTION_LENGTH,
      onSelectionChange: handleSelectionChange
    });
    setupKeyboardShortcut();
    setupMessageListener();
    setupVisibilityListener();
    logger.info("Content script initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize content script:", error);
  }
}
function handleSelectionChange(selectedText) {
  if (selectedText.length < MIN_SELECTION_LENGTH) {
    logger.debug("Selection too short, ignoring");
    return;
  }
  if (selectedText.length > MAX_SELECTION_LENGTH) {
    logger.debug("Selection too long, truncating");
    selectedText = selectedText.substring(0, MAX_SELECTION_LENGTH);
  }
  chrome.storage.local.set({
    currentSelection: {
      text: selectedText,
      url: window.location.href,
      domain: window.location.hostname,
      timestamp: Date.now()
    }
  });
  logger.debug("Selection stored:", {
    length: selectedText.length,
    domain: window.location.hostname
  });
}
function setupKeyboardShortcut() {
  document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const modifierKey = isMac ? event.metaKey : event.ctrlKey;
    if (event.key.toLowerCase() === KEYBOARD_SHORTCUT.key && modifierKey && event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      handleShortcutTrigger();
    }
  });
  logger.info("Keyboard shortcut registered");
}
async function handleShortcutTrigger() {
  try {
    const selectedText = selectionHandler?.getSelectedText();
    if (!selectedText || selectedText.length < MIN_SELECTION_LENGTH) {
      showNotification("Please select at least 10 characters", "warning");
      return;
    }
    chrome.runtime.sendMessage({
      type: "OPEN_SIDE_PANEL",
      payload: {
        text: selectedText,
        trigger: "keyboard_shortcut"
      }
    });
    chrome.runtime.sendMessage({
      type: "TRACK_EVENT",
      payload: {
        event: "keyboard_shortcut_used",
        properties: {
          text_length: selectedText.length,
          domain: window.location.hostname
        }
      }
    });
    logger.info("Keyboard shortcut triggered");
  } catch (error) {
    logger.error("Failed to handle keyboard shortcut:", error);
    showNotification("Something went wrong. Please try again.", "error");
  }
}
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CONTEXT_MENU_CLICKED") {
      handleContextMenuClick();
      sendResponse({ success: true });
    }
    if (message.type === "GET_CURRENT_SELECTION") {
      const selectedText = selectionHandler?.getSelectedText() || "";
      sendResponse({ text: selectedText });
    }
    return true;
  });
  logger.info("Message listener registered");
}
async function handleContextMenuClick() {
  try {
    const result = await chrome.storage.local.get("currentSelection");
    const selection = result.currentSelection;
    if (!selection || !selection.text) {
      showNotification("No text selected", "warning");
      return;
    }
    chrome.runtime.sendMessage({
      type: "OPEN_SIDE_PANEL",
      payload: {
        text: selection.text,
        trigger: "context_menu"
      }
    });
    chrome.runtime.sendMessage({
      type: "TRACK_EVENT",
      payload: {
        event: "context_menu_clicked",
        properties: {
          text_length: selection.text.length,
          domain: window.location.hostname
        }
      }
    });
    logger.info("Context menu click handled");
  } catch (error) {
    logger.error("Failed to handle context menu click:", error);
    showNotification("Something went wrong. Please try again.", "error");
  }
}
function setupVisibilityListener() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      selectionHandler?.pause();
      logger.debug("Selection tracking paused (tab hidden)");
    } else {
      selectionHandler?.resume();
      logger.debug("Selection tracking resumed (tab visible)");
    }
  });
}
function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.className = "stupify-notification";
  notification.setAttribute("data-type", type);
  notification.textContent = message;
  if (!document.getElementById("stupify-notification-styles")) {
    const style = document.createElement("style");
    style.id = "stupify-notification-styles";
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
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "stupify-slide-out 0.3s ease-in";
    setTimeout(() => notification.remove(), 300);
  }, 3e3);
}
function cleanup() {
  selectionHandler?.destroy();
  logger.info("Content script cleaned up");
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
window.addEventListener("beforeunload", cleanup);
export { init, cleanup, handleSelectionChange, handleContextMenuClick };
