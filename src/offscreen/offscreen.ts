import { pipeline, env } from '@xenova/transformers';
import { db } from '../db';
import { MessageType, type Message, type GenerateEmbeddingPayload, type EmbeddingGeneratedPayload } from '../messages';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Singleton class for managing the embedding model
 * Ensures the 30MB model is only loaded once
 */
class EmbeddingEngine {
  private static instance: EmbeddingEngine;
  private extractor: any = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    console.log('[OffscreenAI] EmbeddingEngine instance created');
  }

  static getInstance(): EmbeddingEngine {
    if (!EmbeddingEngine.instance) {
      EmbeddingEngine.instance = new EmbeddingEngine();
    }
    return EmbeddingEngine.instance;
  }

  async initialize(): Promise<void> {
    // Return existing extractor if already initialized
    if (this.extractor) {
      console.log('[OffscreenAI] Model already initialized');
      return;
    }

    // If initialization is in progress, wait for it
    if (this.isInitializing && this.initPromise) {
      console.log('[OffscreenAI] Waiting for ongoing initialization');
      return this.initPromise;
    }

    // Start initialization
    this.isInitializing = true;
    console.log('[OffscreenAI] Initializing Xenova/all-MiniLM-L6-v2 model...');

    this.initPromise = (async () => {
      try {
        const startTime = Date.now();
        this.extractor = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2'
        );
        const duration = Date.now() - startTime;
        console.log(`[OffscreenAI] Model initialized successfully in ${duration}ms`);
      } catch (error) {
        console.error('[OffscreenAI] Failed to initialize model:', error);
        throw error;
      } finally {
        this.isInitializing = false;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  async generateEmbedding(text: string): Promise<Float32Array> {
    await this.initialize();

    if (!this.extractor) {
      throw new Error('Model not initialized');
    }

    try {
      const startTime = Date.now();
      const output = await this.extractor(text, {
        pooling: 'mean',
        normalize: true
      });
      const duration = Date.now() - startTime;
      console.log(`[OffscreenAI] Generated embedding in ${duration}ms for text length: ${text.length}`);

      return output.data as Float32Array;
    } catch (error) {
      console.error('[OffscreenAI] Failed to generate embedding:', error);
      throw error;
    }
  }

  async saveEmbedding(url: string, text: string): Promise<void> {
    try {
      const vector = await this.generateEmbedding(text);

      // Store in Dexie with efficient Float32Array
      await db.embeddings.put({
        url,
        vector,
        snippet: text.substring(0, 500), // Store snippet for search results
        timestamp: Date.now()
      });

      console.log(`[OffscreenAI] Saved embedding for: ${url}`);
    } catch (error) {
      console.error(`[OffscreenAI] Failed to save embedding for ${url}:`, error);
      throw error;
    }
  }
}

// Initialize the singleton instance
const engine = EmbeddingEngine.getInstance();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  console.log('[OffscreenAI] Received message:', message.type);

  if (message.type === MessageType.GENERATE_EMBEDDING) {
    const payload = message.payload as GenerateEmbeddingPayload;

    // Handle async operation
    (async () => {
      try {
        await engine.saveEmbedding(payload.url, payload.text);

        sendResponse({
          type: MessageType.EMBEDDING_GENERATED,
          payload: {
            url: payload.url,
            success: true
          } as EmbeddingGeneratedPayload & { success: boolean }
        });
      } catch (error) {
        console.error('[OffscreenAI] Error processing embedding request:', error);
        sendResponse({
          type: MessageType.OPERATION_ERROR,
          payload: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    })();

    // Return true to indicate async response
    return true;
  }

  return false;
});

console.log('[OffscreenAI] Offscreen document initialized and ready');
