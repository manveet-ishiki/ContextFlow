import { db } from '../db';
import { OffscreenManager } from './offscreen-manager';
import {
  MessageType,
  createMessage,
  type Message,
  type PageContentPayload,
  type GenerateEmbeddingPayload
} from '../messages';

console.log('[Background] ContextFlow background service worker started');

/**
 * Initialize side panel on extension install
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');

  // Enable side panel for all tabs
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.error('[Background] Failed to set panel behavior:', error);
  });
});

/**
 * Handle tab creation - add to database
 */
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  console.log(`[Background] Tab created: ${tab.id} - ${tab.title}`);

  try {
    await db.tabs.put({
      id: tab.id,
      url: tab.url,
      title: tab.title || '',
      favIconUrl: tab.favIconUrl,
      windowId: tab.windowId,
      lastAccessed: Date.now(),
      visitedAt: Date.now()
    });
  } catch (error) {
    console.error('[Background] Failed to save new tab to database:', error);
  }
});

/**
 * Handle tab updates - update database and trigger content extraction
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when the tab has finished loading
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  console.log(`[Background] Tab updated: ${tabId} - ${tab.title}`);

  // Update tab in database
  try {
    await db.tabs.put({
      id: tabId,
      url: tab.url,
      title: tab.title || '',
      favIconUrl: tab.favIconUrl,
      windowId: tab.windowId,
      lastAccessed: Date.now(),
      visitedAt: Date.now() // Track when user visited this URL
    });
  } catch (error) {
    console.error('[Background] Failed to update tab in database:', error);
  }

  // Skip chrome:// and other special URLs
  if (tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('edge://')) {
    return;
  }

  // Content script should auto-inject via manifest
  // No need to manually inject here
});

/**
 * Handle tab activation - update lastAccessed timestamp
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const existingTab = await db.tabs.get(activeInfo.tabId);
    if (existingTab) {
      await db.tabs.update(activeInfo.tabId, {
        lastAccessed: Date.now(),
        visitedAt: Date.now() // Update visit timestamp when tab is activated
      });
    }
  } catch (error) {
    console.error('[Background] Failed to update tab lastAccessed:', error);
  }
});

/**
 * Handle tab removal - remove from database
 */
chrome.tabs.onRemoved.addListener(async (tabId) => {
  console.log(`[Background] Tab removed: ${tabId}`);

  try {
    await db.tabs.delete(tabId);
  } catch (error) {
    console.error('[Background] Failed to delete tab from database:', error);
  }
});

/**
 * Handle messages from content scripts and side panel
 */
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type, 'from:', sender.tab?.id || 'extension');

  // Handle page content extraction from content script
  if (message.type === MessageType.PAGE_CONTENT_EXTRACTED) {
    const payload = message.payload as PageContentPayload;

    (async () => {
      try {
        // Send to offscreen document for embedding generation
        const embeddingPayload: GenerateEmbeddingPayload = {
          url: payload.url,
          text: payload.snippet || payload.metaDescription || payload.h1 || payload.title
        };

        await OffscreenManager.sendMessage(
          createMessage(MessageType.GENERATE_EMBEDDING, embeddingPayload)
        );

        sendResponse({ success: true });
      } catch (error) {
        console.error('[Background] Failed to process content extraction:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })();

    return true; // Keep channel open for async response
  }

  // Handle power feature requests from side panel
  // These will be handled by the API layer, but background worker can coordinate
  if ([
    MessageType.MERGE_ALL_WINDOWS,
    MessageType.DEDUPLICATE_TABS,
    MessageType.SAVE_WINDOW_AS_CONTEXT,
    MessageType.RESTORE_CONTEXT,
    MessageType.HIBERNATE_INACTIVE_TABS
  ].includes(message.type)) {
    console.log(`[Background] Forwarding operation request: ${message.type}`);
    sendResponse({ acknowledged: true });
    return false;
  }

  return false;
});

/**
 * Keep service worker alive if needed
 * MV3 service workers can be terminated after 30s of inactivity
 */
let keepAliveInterval: number | null = null;

function startKeepAlive() {
  if (keepAliveInterval) return;

  keepAliveInterval = setInterval(() => {
    // Ping to keep alive
    chrome.runtime.getPlatformInfo(() => {
      // Do nothing, just keeping alive
    });
  }, 20000) as unknown as number; // Every 20 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Start keep alive (keep function for future use)
startKeepAlive();

// @ts-ignore - Keep for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _stopKeepAlive = stopKeepAlive;

console.log('[Background] All event listeners registered');
