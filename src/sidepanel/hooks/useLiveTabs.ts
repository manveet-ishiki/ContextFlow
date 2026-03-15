import { useState, useEffect } from 'react';
import type { TabRecord } from '../../types';

/**
 * Hook for real-time tab synchronization
 * Keeps UI in sync with browser tabs across all windows
 */
export function useLiveTabs() {
  const [tabs, setTabs] = useState<TabRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Load tabs from Chrome API
  const loadTabs = async () => {
    try {
      const chromeTabs = await chrome.tabs.query({});

      const tabRecords: TabRecord[] = chromeTabs
        .filter(tab => tab.id && tab.url)
        .map(tab => ({
          id: tab.id!,
          url: tab.url!,
          title: tab.title || 'Untitled',
          favIconUrl: tab.favIconUrl,
          windowId: tab.windowId,
          lastAccessed: Date.now(),
        }));

      setTabs(tabRecords);
      setLoading(false);
    } catch (error) {
      console.error('[useLiveTabs] Failed to load tabs:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    loadTabs();

    // Listen for tab changes
    const handleTabUpdate = () => {
      loadTabs();
    };

    chrome.tabs.onCreated.addListener(handleTabUpdate);
    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onRemoved.addListener(handleTabUpdate);
    chrome.tabs.onMoved.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabUpdate);

    return () => {
      chrome.tabs.onCreated.removeListener(handleTabUpdate);
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onRemoved.removeListener(handleTabUpdate);
      chrome.tabs.onMoved.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabUpdate);
    };
  }, []);

  return { tabs, loading, reload: loadTabs };
}
