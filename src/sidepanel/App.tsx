import { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { TabList } from './components/TabList';
import { ContextList } from './components/ContextList';
import { useLiveTabs } from './hooks/useLiveTabs';
import { mergeAllWindows, deduplicateTabs, hibernateInactiveTabs } from '../api/tab-operations';
import { saveWindowAsContext } from '../api/context-operations';
import type { TabRecord } from '../types';
import { Layers, BookMarked } from 'lucide-react';

function App() {
  const { tabs, loading, reload } = useLiveTabs();
  const [searchResults, setSearchResults] = useState<TabRecord[]>([]);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [activeView, setActiveView] = useState<'tabs' | 'contexts'>('tabs');
  const [isWorking, setIsWorking] = useState(false);

  // Handle tab close with optimistic update
  const handleTabClose = (tabId: number) => {
    // Optimistically remove from current view
    if (searchResults.length > 0) {
      setSearchResults(prev => prev.filter(t => t.id !== tabId));
    }
    // The useLiveTabs hook will handle the actual update via listeners
  };

  const handleSearchResults = (results: TabRecord[], semantic: boolean) => {
    setSearchResults(results);
    setIsSemanticSearch(semantic);
  };

  const handleActionComplete = () => {
    reload();
  };

  const handleMergeWindows = async () => {
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
  };

  const handleDeduplicate = async () => {
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
  };

  const handleHibernate = async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await hibernateInactiveTabs();
      reload();
    } catch (error) {
      console.error('Hibernation failed:', error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveContext = async (name: string) => {
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
  };

  const displayTabs = searchResults.length > 0 ? searchResults : tabs;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900 border-b border-slate-700 z-10">
        <div className="p-3 space-y-2">
          <SearchBar onResultsChange={handleSearchResults} />

          {/* View Toggle */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveView('tabs')}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                activeView === 'tabs'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Layers size={12} />
                Tabs ({tabs.filter(t => t.windowId !== -1).length})
              </div>
            </button>

            <button
              onClick={() => setActiveView('contexts')}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                activeView === 'contexts'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <BookMarked size={12} />
                Saved
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {activeView === 'tabs' ? (
            <>
              {/* Search Results Info */}
              {searchResults.length > 0 && (
                <div className="px-3 py-1.5 bg-slate-800/50 rounded-md text-center">
                  <p className="text-xs text-slate-400">
                    {isSemanticSearch ? 'AI Search' : 'Filter'}: {searchResults.length} results
                  </p>
                </div>
              )}

              {/* Tab List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-400 text-sm">Loading tabs...</div>
                </div>
              ) : (
                <TabList
                  tabs={displayTabs}
                  onTabClose={handleTabClose}
                  onMergeWindows={handleMergeWindows}
                  onDeduplicateTabs={handleDeduplicate}
                  onHibernate={handleHibernate}
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
      <div className="border-t border-slate-800 bg-slate-900 px-3 py-2">
        <div className="text-[10px] text-slate-600 text-center">
          ContextFlow · Local-First
        </div>
      </div>
    </div>
  );
}

export default App;
