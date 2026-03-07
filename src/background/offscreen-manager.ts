import type { Message } from '../messages';

/**
 * Manages the lifecycle of the offscreen document
 * Ensures it's created when needed and handles race conditions
 */
export class OffscreenManager {
  private static isCreating = false;

  /**
   * Ensures the offscreen document exists
   * Creates it if it doesn't exist yet
   */
  static async ensureOffscreenDocument(): Promise<void> {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType]
    });

    if (existingContexts.length > 0) {
      console.log('[Background] Offscreen document already exists');
      return;
    }

    // If creation is in progress, wait for it
    if (OffscreenManager.isCreating) {
      console.log('[Background] Waiting for offscreen document creation...');
      while (OffscreenManager.isCreating) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    // Create offscreen document
    OffscreenManager.isCreating = true;
    console.log('[Background] Creating offscreen document...');

    try {
      await chrome.offscreen.createDocument({
        url: 'src/offscreen/offscreen.html',
        reasons: ['WORKERS' as chrome.offscreen.Reason],
        justification: 'Running AI model (Transformers.js) for semantic search and tab embeddings'
      });
      console.log('[Background] Offscreen document created successfully');
    } catch (error) {
      console.error('[Background] Failed to create offscreen document:', error);
      throw error;
    } finally {
      OffscreenManager.isCreating = false;
    }
  }

  /**
   * Sends a message to the offscreen document
   * Ensures the document exists before sending
   */
  static async sendMessage<T = any>(message: Message): Promise<T> {
    await OffscreenManager.ensureOffscreenDocument();

    try {
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.error('[Background] Failed to send message to offscreen document:', error);
      throw error;
    }
  }

  /**
   * Closes the offscreen document if it exists
   * Useful for cleanup or when the document is no longer needed
   */
  static async closeOffscreenDocument(): Promise<void> {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType]
    });

    if (existingContexts.length === 0) {
      return;
    }

    try {
      await chrome.offscreen.closeDocument();
      console.log('[Background] Offscreen document closed');
    } catch (error) {
      console.error('[Background] Failed to close offscreen document:', error);
    }
  }
}
