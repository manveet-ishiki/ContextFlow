import { useState, useEffect, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { TabList } from './components/TabList';
import { ContextList } from './components/ContextList';
import { useLiveTabs } from './hooks/useLiveTabs';
import { mergeAllWindows, deduplicateTabs } from '../api/tab-operations';
import { saveWindowAsContext } from '../api/context-operations';
import { runStartupRecovery } from '../api/startup-recovery';
import type { TabRecord } from '../types';
import ToggleHeader from './components/ToggleHeader';

function App() {
  const { tabs, loading, reload } = useLiveTabs();
  const [searchResults, setSearchResults] = useState<TabRecord[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'tabs' | 'contexts'>('tabs');

  // Handle tab close with optimistic update
  const handleTabClose = useCallback((tabId: number) => {
    // Optimistically remove from current view
    if (searchResults.length > 0) {
      setSearchResults(prev => prev.filter(t => t.id !== tabId));
    }
    // The useLiveTabs hook will handle the actual update via listeners
  }, [searchResults.length]);

  const handleSearchResults = (results: TabRecord[]) => {
    setSearchResults(results);
  };

  const handleActionComplete = useCallback(() => {
    reload();
  }, [reload]);

  // Run recovery check on startup
  useEffect(() => {
    runStartupRecovery().then(report => {
      if (!report.indexedDBAvailable && report.recovered) {
        setRecoveryStatus(`Data recovered from ${report.source}`);
        setTimeout(() => setRecoveryStatus(null), 5000);
      } else if (!report.indexedDBAvailable && !report.recovered) {
        setRecoveryStatus('Warning: Data recovery failed');
      }
    }).catch(err => {
      console.error('Recovery failed:', err);
    });
  }, []);

  const handleMergeWindows = useCallback(async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await mergeAllWindows();
      reload();
    } catch (error) {
      console.error('Merge failed:', error);
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
    } catch (error) {
      console.error('Deduplication failed:', error);
    } finally {
      setIsWorking(false);
    }
  }, [isWorking, reload]);

  const handleSaveContext = useCallback(async (name: string) => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await saveWindowAsContext(name);
      reload();
    } catch (error) {
      console.error('Save context failed:', error);
    } finally {
      setIsWorking(false);
    }
  }, [isWorking, reload]);

  const displayTabs = searchResults.length > 0 ? searchResults : tabs;

  return (
    <div className="p-4 min-h-screen bg-background text-text-primary flex flex-col">
      {/* Recovery Status Banner */}
      {recoveryStatus && (
        <div className="px-3 py-2 bg-warning-surface/50 border-b border-warning-border text-center">
          <p className="text-xs text-warning">{recoveryStatus}</p>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2 sticky top-0 bg-background border-b border-border z-10">
        <div className="space-y-2">
          <SearchBar onResultsChange={handleSearchResults} />
          <ToggleHeader tabs={tabs} activeView={activeView} onViewChange={setActiveView} />
          
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {activeView === 'tabs' ? (
            <>
              {/* Search Results Info */}
              {searchResults.length > 0 && (
                <div className="px-3 py-1.5 bg-surface/50 rounded-md text-center">
                  <p className="text-xs text-text-tertiary">
                    {searchResults.length} results
                  </p>
                </div>
              )}

              {/* Tab List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-text-tertiary text-sm">Loading tabs...</div>
                </div>
              ) : (
                <TabList
                  tabs={displayTabs}
                  onTabClose={handleTabClose}
                  onMergeWindows={handleMergeWindows}
                  onDeduplicateTabs={handleDeduplicate}
                  onSaveContext={handleSaveContext}
                />
              )}
            </>
          ) : (
            <>
              {/* Contexts View */}
              <div className="space-y-3">
                <ContextList onRestore={handleActionComplete} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-surface bg-background px-3 py-2">
        <div className="text-[10px] text-border-muted text-center">
          ContextFlow · Local-First
        </div>
      </div>
    </div>
  );
}

export default App;
