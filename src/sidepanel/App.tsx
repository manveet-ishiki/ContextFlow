import { useState, useEffect, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import ToggleHeader from './components/ToggleHeader';
import { TabList } from './components/TabList';
import { ContextList } from './components/ContextList';
import { useLiveTabs } from './hooks/useLiveTabs';
import { mergeAllWindows, deduplicateTabs } from '../api/tab-operations';
import { saveTabsAsContext } from '../api/context-operations';
import { runStartupRecovery } from '../api/startup-recovery';
import type { TabRecord } from '../types';

function App() {
  const { tabs, loading, reload } = useLiveTabs();
  const [searchResults, setSearchResults] = useState<TabRecord[]>([]);
  const [activeView, setActiveView] = useState<'tabs' | 'contexts'>('tabs');
  const [isWorking, setIsWorking] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);

  /* ── Tab handlers ─────────────────────────────────────────── */
  const handleTabClose = useCallback(
    (tabId: number) => {
      if (searchResults.length > 0) {
        setSearchResults(prev => prev.filter(t => t.id !== tabId));
      }
    },
    [searchResults.length],
  );

  const handleSearchResults = (results: TabRecord[]) => setSearchResults(results);
  const handleActionComplete = useCallback(() => reload(), [reload]);

  /* ── Startup recovery ────────────────────────────────────── */
  useEffect(() => {
    runStartupRecovery()
      .then(report => {
        if (!report.indexedDBAvailable && report.recovered) {
          setRecoveryStatus(`Data recovered from ${report.source}`);
          setTimeout(() => setRecoveryStatus(null), 5000);
        } else if (!report.indexedDBAvailable && !report.recovered) {
          setRecoveryStatus('Warning: Data recovery failed');
        }
      })
      .catch(err => console.error('Recovery failed:', err));
  }, []);

  /* ── Power actions ───────────────────────────────────────── */
  const handleMergeWindows = useCallback(async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await mergeAllWindows();
      reload();
    } catch (e) {
      console.error('Merge failed:', e);
    } finally {
      setIsWorking(false);
    }
  }, [isWorking, reload]);

  const handleDeduplicate = useCallback(async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await deduplicateTabs();
      reload();
    } catch (e) {
      console.error('Dedup failed:', e);
    } finally {
      setIsWorking(false);
    }
  }, [isWorking, reload]);

  const handleSaveTabsAsContext = useCallback(
    async (tabIds: number[], name: string) => {
      if (isWorking) return;
      setIsWorking(true);
      try {
        const chromeTabs = await chrome.tabs.query({});
        const idSet = new Set(tabIds);
        const tabsToSave = chromeTabs
          .filter(t => t.id && idSet.has(t.id))
          .map(t => ({ url: t.url || '', title: t.title || '', favIconUrl: t.favIconUrl }));
        await saveTabsAsContext(name, tabsToSave);
        reload();
      } catch (e) {
        console.error('Save context failed:', e);
      } finally {
        setIsWorking(false);
      }
    },
    [isWorking, reload],
  );

  const displayTabs = searchResults.length > 0 ? searchResults : tabs;
  const activeTabCount = tabs.filter(t => t.windowId !== -1).length;

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      {/* Recovery Banner */}
      {recoveryStatus && (
        <div className="px-4 py-2 bg-warning-surface/50 border-b border-warning-border text-center">
          <p className="text-xs text-warning">{recoveryStatus}</p>
        </div>
      )}

      {/* ── Sticky Header ────────────────────────────────────── */}
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 space-y-2">
        <SearchBar onResultsChange={handleSearchResults} />
        <ToggleHeader tabs={tabs} activeView={activeView} onViewChange={setActiveView} />
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {activeView === 'tabs' ? (
          <>
            {searchResults.length > 0 && (
              <div className="px-3 py-1.5 bg-surface/60 rounded-lg text-center">
                <p className="text-xs text-text-tertiary">{searchResults.length} results</p>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-text-tertiary">Loading tabs…</p>
              </div>
            ) : (
              <TabList
                tabs={displayTabs}
                onTabClose={handleTabClose}
                onMergeWindows={handleMergeWindows}
                onDeduplicateTabs={handleDeduplicate}
                onSaveTabsAsContext={handleSaveTabsAsContext}
              />
            )}
          </>
        ) : (
          <ContextList onRestore={handleActionComplete} />
        )}
      </main>

      {/* ── Status Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border bg-background px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-center gap-3 text-[10px] text-text-muted">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0" y="0" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
              <rect x="6" y="0" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
              <rect x="0" y="6" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
              <rect x="6" y="6" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
            </svg>
            <span>{activeTabCount} tabs</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Indexed</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <span>Local-First</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
