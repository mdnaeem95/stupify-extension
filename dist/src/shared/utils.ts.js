import { MIN_SELECTION_LENGTH, MAX_SELECTION_LENGTH } from "/src/shared/constants.ts.js";
export const logger = {
  /**
   * Log informational messages (purple in console)
   */
  info: (...args) => {
    if (isDevelopment() || shouldLog("info")) {
      console.log(
        "%c[Stupify]%c",
        "color: #8b5cf6; font-weight: bold;",
        "color: inherit;",
        ...args
      );
    }
  },
  /**
   * Log debug messages (gray in console, only in dev mode)
   */
  debug: (...args) => {
    if (isDevelopment() || shouldLog("debug")) {
      console.debug(
        "%c[Stupify Debug]%c",
        "color: #6b7280; font-weight: bold;",
        "color: inherit;",
        ...args
      );
    }
  },
  /**
   * Log warnings (orange in console)
   */
  warn: (...args) => {
    if (shouldLog("warn")) {
      console.warn(
        "%c[Stupify Warning]%c",
        "color: #f59e0b; font-weight: bold;",
        "color: inherit;",
        ...args
      );
    }
  },
  /**
   * Log errors (red in console)
   */
  error: (...args) => {
    if (shouldLog("error")) {
      console.error(
        "%c[Stupify Error]%c",
        "color: #ef4444; font-weight: bold;",
        "color: inherit;",
        ...args
      );
    }
  },
  /**
   * Log success messages (green in console)
   */
  success: (...args) => {
    if (isDevelopment() || shouldLog("info")) {
      console.log(
        "%c[Stupify Success]%c",
        "color: #10b981; font-weight: bold;",
        "color: inherit;",
        ...args
      );
    }
  },
  /**
   * Group related logs together
   */
  group: (label, collapsed = false) => {
    if (isDevelopment() || shouldLog("info")) {
      if (collapsed) {
        console.groupCollapsed(`%c[Stupify] ${label}`, "color: #8b5cf6; font-weight: bold;");
      } else {
        console.group(`%c[Stupify] ${label}`, "color: #8b5cf6; font-weight: bold;");
      }
    }
  },
  /**
   * End a log group
   */
  groupEnd: () => {
    if (isDevelopment() || shouldLog("info")) {
      console.groupEnd();
    }
  },
  /**
   * Log a table (useful for arrays of objects)
   */
  table: (data) => {
    if (isDevelopment() || shouldLog("info")) {
      console.log("%c[Stupify Table]", "color: #8b5cf6; font-weight: bold;");
      console.table(data);
    }
  },
  /**
   * Start a timer
   */
  time: (label) => {
    if (isDevelopment()) {
      console.time(`[Stupify] ${label}`);
    }
  },
  /**
   * End a timer and log the duration
   */
  timeEnd: (label) => {
    if (isDevelopment()) {
      console.timeEnd(`[Stupify] ${label}`);
    }
  }
};
function shouldLog(level) {
  if (level === "warn" || level === "error") return true;
  if (isDevelopment()) return true;
  return level !== "debug";
}
export function isValidSelection(text) {
  const trimmed = text.trim();
  return trimmed.length >= MIN_SELECTION_LENGTH && trimmed.length <= MAX_SELECTION_LENGTH;
}
export function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
export function formatRelativeTime(date) {
  const now = /* @__PURE__ */ new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1e3);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return past.toLocaleDateString();
}
export function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return "";
  }
}
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export function debounce(func, waitMs) {
  let timeoutId = null;
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), waitMs);
  };
}
export function throttle(func, limitMs) {
  let inThrottle = false;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limitMs);
    }
  };
}
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}
export function isDevelopment() {
  return !("update_url" in chrome.runtime.getManifest());
}
export function getCurrentDate() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
}
export function formatNumber(num) {
  return num.toLocaleString();
}
export function calculatePercentage(part, total) {
  if (total === 0) return 0;
  return Math.round(part / total * 100);
}
export function sanitizeHtml(html) {
  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
export function getSelectionPosition() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY
  };
}
export function clearSelection() {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
}
export function isDarkMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
export function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}
export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function checkBrowserSupport() {
  const missing = [];
  if (!chrome?.storage) missing.push("chrome.storage");
  if (!chrome?.contextMenus) missing.push("chrome.contextMenus");
  if (!chrome?.runtime) missing.push("chrome.runtime");
  return {
    supported: missing.length === 0,
    missing
  };
}
