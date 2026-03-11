import { db } from '../db';
import { autoExport } from './sync';

/**
 * Merges all browser windows into the current window
 * Consolidates all tabs from other windows and closes empty windows
 */
export async function mergeAllWindows(): Promise<{ tabsMoved: number; windowsClosed: number }> {
  console.log('[TabOperations] Starting window merge...');

  try {
    const windows = await chrome.windows.getAll({ populate: true });

    if (windows.length <= 1) {
      console.log('[TabOperations] Only one window open, nothing to merge');
      return { tabsMoved: 0, windowsClosed: 0 };
    }

    const currentWindow = await chrome.windows.getCurrent();
    const otherWindows = windows.filter(w => w.id !== currentWindow.id);

    let tabsMoved = 0;
    let windowsClosed = 0;

    for (const window of otherWindows) {
      const tabs = window.tabs || [];

      for (const tab of tabs) {
        if (tab.id && currentWindow.id) {
          try {
            await chrome.tabs.move(tab.id, {
              windowId: currentWindow.id,
              index: -1 // Append to end
            });
            tabsMoved++;
          } catch (error) {
            console.error(`[TabOperations] Failed to move tab ${tab.id}:`, error);
          }
        }
      }

      // Close the now-empty window
      if (window.id) {
        try {
          await chrome.windows.remove(window.id);
          windowsClosed++;
        } catch (error) {
          console.error(`[TabOperations] Failed to close window ${window.id}:`, error);
        }
      }
    }

    // Trigger auto-export after merge
    await autoExport().catch(err =>
      console.warn('[TabOperations] Auto-export failed:', err)
    );

    console.log(`[TabOperations] Merge complete: ${tabsMoved} tabs moved, ${windowsClosed} windows closed`);
    return { tabsMoved, windowsClosed };
  } catch (error) {
    console.error('[TabOperations] Failed to merge windows:', error);
    throw error;
  }
}

/**
 * Removes duplicate tabs across all windows
 * Keeps the first occurrence and closes duplicates
 */
export async function deduplicateTabs(): Promise<{ duplicatesRemoved: number }> {
  console.log('[TabOperations] Starting deduplication...');

  try {
    const tabs = await chrome.tabs.query({});
    const urlMap = new Map<string, number[]>();

    // Build map of URLs to tab IDs
    for (const tab of tabs) {
      if (!tab.url || !tab.id) continue;

      // Skip chrome:// and special URLs
      if (tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('about:')) {
        continue;
      }

      if (!urlMap.has(tab.url)) {
        urlMap.set(tab.url, []);
      }
      urlMap.get(tab.url)!.push(tab.id);
    }

    // Find and close duplicates
    const tabsToClose: number[] = [];

    for (const [url, tabIds] of urlMap) {
      if (tabIds.length > 1) {
        // Keep first, close the rest
        const duplicates = tabIds.slice(1);
        tabsToClose.push(...duplicates);
        console.log(`[TabOperations] Found ${duplicates.length} duplicates of: ${url}`);
      }
    }

    // Close all duplicate tabs
    if (tabsToClose.length > 0) {
      await chrome.tabs.remove(tabsToClose);
      console.log(`[TabOperations] Removed ${tabsToClose.length} duplicate tabs`);
    } else {
      console.log('[TabOperations] No duplicates found');
    }

    // Trigger auto-export after deduplication
    await autoExport().catch(err =>
      console.warn('[TabOperations] Auto-export failed:', err)
    );

    return { duplicatesRemoved: tabsToClose.length };
  } catch (error) {
    console.error('[TabOperations] Failed to deduplicate tabs:', error);
    throw error;
  }
}

/**
 * Hibernates (discards) inactive tabs to free memory
 * Tabs remain in the tab bar but are unloaded from memory
 */
export async function hibernateInactiveTabs(
  inactiveThresholdMs: number = 30 * 60 * 1000 // 30 minutes default
): Promise<{ tabsHibernated: number }> {
  console.log('[TabOperations] Starting tab hibernation...');

  try {
    const now = Date.now();
    const thresholdTime = now - inactiveThresholdMs;

    // Query Dexie for inactive tabs
    const inactiveTabs = await db.tabs
      .where('lastAccessed')
      .below(thresholdTime)
      .toArray();

    let tabsHibernated = 0;

    for (const tabRecord of inactiveTabs) {
      try {
        // Check if tab still exists in browser
        const chromeTab = await chrome.tabs.get(tabRecord.id);

        // Skip already discarded tabs and pinned tabs
        if (chromeTab.discarded || chromeTab.pinned) {
          continue;
        }

        // Skip active tabs
        if (chromeTab.active) {
          continue;
        }

        // Discard the tab
        await chrome.tabs.discard(tabRecord.id);
        tabsHibernated++;
      } catch (error) {
        // Tab might have been closed
        console.log(`[TabOperations] Tab ${tabRecord.id} no longer exists, removing from DB`);
        await db.tabs.delete(tabRecord.id);
      }
    }

    console.log(`[TabOperations] Hibernated ${tabsHibernated} inactive tabs`);
    return { tabsHibernated };
  } catch (error) {
    console.error('[TabOperations] Failed to hibernate tabs:', error);
    throw error;
  }
}

/**
 * Closes a specific tab
 * Updates database automatically via background listener
 */
export async function closeTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.error(`[TabOperations] Failed to close tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Activates (focuses) a specific tab
 */
export async function activateTab(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } catch (error) {
    console.error(`[TabOperations] Failed to activate tab ${tabId}:`, error);
    throw error;
  }
}
