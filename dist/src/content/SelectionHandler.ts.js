import { logger } from "/src/shared/utils.ts.js";
export class SelectionHandler {
  minLength;
  maxLength;
  debounceMs;
  onSelectionChange;
  debounceTimer = null;
  lastSelection = "";
  isPaused = false;
  isDestroyed = false;
  constructor(options) {
    this.minLength = options.minLength;
    this.maxLength = options.maxLength;
    this.debounceMs = options.debounceMs || 300;
    this.onSelectionChange = options.onSelectionChange;
    this.init();
  }
  /**
   * Initialize selection tracking
   */
  init() {
    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("selectionchange", this.handleSelectionChange);
    document.addEventListener("keyup", this.handleKeyUp);
    logger.debug("SelectionHandler initialized");
  }
  /**
   * Handle mouse up event
   */
  handleMouseUp = (event) => {
    if (this.isPaused || this.isDestroyed) return;
    this.debounceSelectionCheck();
  };
  /**
   * Handle selection change event
   */
  handleSelectionChange = () => {
    if (this.isPaused || this.isDestroyed) return;
    this.debounceSelectionCheck();
  };
  /**
   * Handle key up event (for keyboard selection)
   */
  handleKeyUp = (event) => {
    if (this.isPaused || this.isDestroyed) return;
    if (event.key === "Shift") {
      this.debounceSelectionCheck();
    }
  };
  /**
   * Debounced selection check
   */
  debounceSelectionCheck = () => {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.checkSelection();
      this.debounceTimer = null;
    }, this.debounceMs);
  };
  /**
   * Check current selection
   */
  checkSelection() {
    try {
      const selectedText = this.getSelectedText();
      if (selectedText && selectedText !== this.lastSelection && selectedText.length >= this.minLength) {
        this.lastSelection = selectedText;
        if (this.onSelectionChange) {
          this.onSelectionChange(selectedText);
        }
        logger.debug("Selection changed:", {
          length: selectedText.length,
          preview: selectedText.substring(0, 50) + "..."
        });
      }
    } catch (error) {
      logger.error("Failed to check selection:", error);
    }
  }
  /**
   * Get currently selected text
   */
  getSelectedText() {
    try {
      const selection = window.getSelection();
      if (!selection) return "";
      let text = selection.toString().trim();
      if (text.length > this.maxLength) {
        text = text.substring(0, this.maxLength);
      }
      return text;
    } catch (error) {
      logger.error("Failed to get selected text:", error);
      return "";
    }
  }
  /**
   * Get selection details (text + position)
   */
  getSelectionDetails() {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return { text: "", boundingRect: null, range: null };
      }
      const text = this.getSelectedText();
      const range = selection.getRangeAt(0);
      const boundingRect = range.getBoundingClientRect();
      return { text, boundingRect, range };
    } catch (error) {
      logger.error("Failed to get selection details:", error);
      return { text: "", boundingRect: null, range: null };
    }
  }
  /**
   * Check if text is currently selected
   */
  hasSelection() {
    const text = this.getSelectedText();
    return text.length >= this.minLength;
  }
  /**
   * Clear current selection
   */
  clearSelection() {
    try {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
      this.lastSelection = "";
      logger.debug("Selection cleared");
    } catch (error) {
      logger.error("Failed to clear selection:", error);
    }
  }
  /**
   * Pause selection tracking
   */
  pause() {
    this.isPaused = true;
    logger.debug("Selection tracking paused");
  }
  /**
   * Resume selection tracking
   */
  resume() {
    this.isPaused = false;
    logger.debug("Selection tracking resumed");
  }
  /**
   * Check if currently paused
   */
  isPausedState() {
    return this.isPaused;
  }
  /**
   * Destroy and clean up
   */
  destroy() {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    document.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("selectionchange", this.handleSelectionChange);
    document.removeEventListener("keyup", this.handleKeyUp);
    this.lastSelection = "";
    this.isDestroyed = true;
    logger.debug("SelectionHandler destroyed");
  }
}
export function isEditableElement(element) {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  const isContentEditable = element.getAttribute("contenteditable") === "true";
  return tagName === "input" || tagName === "textarea" || tagName === "select" || isContentEditable;
}
export function cleanSelectedText(text) {
  return text.trim().replace(/\s+/g, " ").replace(/[\r\n]+/g, " ").substring(0, 5e3);
}
