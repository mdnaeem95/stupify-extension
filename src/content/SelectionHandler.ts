/**
 * SelectionHandler - Manages text selection detection
 * 
 * Features:
 * - Debounced selection tracking
 * - Selection validation (min/max length)
 * - Selection caching
 * - Pause/resume functionality
 * - Cross-browser compatibility
 */

import { logger } from "@/shared/utils";


export interface SelectionHandlerOptions {
  minLength: number;
  maxLength: number;
  debounceMs?: number;
  onSelectionChange?: (text: string) => void;
}

export class SelectionHandler {
  private minLength: number;
  private maxLength: number;
  private debounceMs: number;
  private onSelectionChange?: (text: string) => void;
  
  private debounceTimer: number | null = null;
  private lastSelection: string = '';
  private isPaused: boolean = false;
  private isDestroyed: boolean = false;

  constructor(options: SelectionHandlerOptions) {
    this.minLength = options.minLength;
    this.maxLength = options.maxLength;
    this.debounceMs = options.debounceMs || 300;
    this.onSelectionChange = options.onSelectionChange;

    this.init();
  }

  /**
   * Initialize selection tracking
   */
  private init(): void {
    // Listen for mouseup events (text selection)
    document.addEventListener('mouseup', this.handleMouseUp);
    
    // Listen for selection change (keyboard selection)
    document.addEventListener('selectionchange', this.handleSelectionChange);

    // Listen for keyup (keyboard selection)
    document.addEventListener('keyup', this.handleKeyUp);

    logger.debug('SelectionHandler initialized');
  }

  /**
   * Handle mouse up event
   */
  private handleMouseUp = (): void => {
    if (this.isPaused || this.isDestroyed) return;

    // Debounce to avoid too many calls
    this.debounceSelectionCheck();
  };

  /**
   * Handle selection change event
   */
  private handleSelectionChange = (): void => {
    if (this.isPaused || this.isDestroyed) return;

    // Only trigger on user-initiated selection changes
    // (not programmatic changes)
    this.debounceSelectionCheck();
  };

  /**
   * Handle key up event (for keyboard selection)
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    if (this.isPaused || this.isDestroyed) return;

    // Only check on Shift key release (used for text selection)
    if (event.key === 'Shift') {
      this.debounceSelectionCheck();
    }
  };

  /**
   * Debounced selection check
   */
  private debounceSelectionCheck = (): void => {
    // Clear existing timer
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = window.setTimeout(() => {
      this.checkSelection();
      this.debounceTimer = null;
    }, this.debounceMs);
  };

  /**
   * Check current selection
   */
  private checkSelection(): void {
    try {
      const selectedText = this.getSelectedText();

      // Only trigger callback if selection changed and is valid
      if (
        selectedText &&
        selectedText !== this.lastSelection &&
        selectedText.length >= this.minLength
      ) {
        this.lastSelection = selectedText;
        
        if (this.onSelectionChange) {
          this.onSelectionChange(selectedText);
        }

        logger.debug('Selection changed:', {
          length: selectedText.length,
          preview: selectedText.substring(0, 50) + '...',
        });
      }
    } catch (error) {
      logger.error('Failed to check selection:', error);
    }
  }

  /**
   * Get currently selected text
   */
  public getSelectedText(): string {
    try {
      const selection = window.getSelection();
      if (!selection) return '';

      let text = selection.toString().trim();

      // Truncate if too long
      if (text.length > this.maxLength) {
        text = text.substring(0, this.maxLength);
      }

      return text;
    } catch (error) {
      logger.error('Failed to get selected text:', error);
      return '';
    }
  }

  /**
   * Get selection details (text + position)
   */
  public getSelectionDetails(): {
    text: string;
    boundingRect: DOMRect | null;
    range: Range | null;
  } {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return { text: '', boundingRect: null, range: null };
      }

      const text = this.getSelectedText();
      const range = selection.getRangeAt(0);
      const boundingRect = range.getBoundingClientRect();

      return { text, boundingRect, range };
    } catch (error) {
      logger.error('Failed to get selection details:', error);
      return { text: '', boundingRect: null, range: null };
    }
  }

  /**
   * Check if text is currently selected
   */
  public hasSelection(): boolean {
    const text = this.getSelectedText();
    return text.length >= this.minLength;
  }

  /**
   * Clear current selection
   */
  public clearSelection(): void {
    try {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
      this.lastSelection = '';
      logger.debug('Selection cleared');
    } catch (error) {
      logger.error('Failed to clear selection:', error);
    }
  }

  /**
   * Pause selection tracking
   */
  public pause(): void {
    this.isPaused = true;
    logger.debug('Selection tracking paused');
  }

  /**
   * Resume selection tracking
   */
  public resume(): void {
    this.isPaused = false;
    logger.debug('Selection tracking resumed');
  }

  /**
   * Check if currently paused
   */
  public isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Destroy and clean up
   */
  public destroy(): void {
    // Clear debounce timer
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Remove event listeners
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    document.removeEventListener('keyup', this.handleKeyUp);

    // Clear state
    this.lastSelection = '';
    this.isDestroyed = true;

    logger.debug('SelectionHandler destroyed');
  }
}

/**
 * Utility: Check if element is likely editable
 * (to avoid interfering with user input)
 */
export function isEditableElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isContentEditable = element.getAttribute('contenteditable') === 'true';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable
  );
}

/**
 * Utility: Get text from selection with smart cleanup
 */
export function cleanSelectedText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
    .substring(0, 5000); // Enforce max length
}