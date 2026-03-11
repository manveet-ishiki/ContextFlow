import { useMemo, useState } from 'react';
import { TabItem } from './TabItem';
import { WindowHeader } from './WindowHeader';
import { closeTab } from '../../api/tab-operations';
import type { TabRecord } from '../../types';
import { CheckSquare, Square, X } from 'lucide-react';

interface TabListProps {
  tabs: TabRecord[];
  onTabClose: (tabId: number) => void;
  onMergeWindows: () => void;
  onDeduplicateTabs: () => void;
  onHibernate: () => void;
  onSaveContext: (name: string) => void;
}

/**
 * List of active tabs grouped by window with multi-select support
 */
export function TabList({
  tabs,
  onTabClose,
  onMergeWindows,
  onDeduplicateTabs,
  onHibernate,
  onSaveContext
}: TabListProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());

  // Group tabs by window (exclude saved tabs with windowId = -1)
  const tabsByWindow = useMemo(() => {
    const grouped = new Map<number, TabRecord[]>();

    for (const tab of tabs) {
      // Skip saved/archived tabs
      if (tab.windowId === -1) continue;

      if (!grouped.has(tab.windowId)) {
        grouped.set(tab.windowId, []);
      }
      grouped.get(tab.windowId)!.push(tab);
    }

    return grouped;
  }, [tabs]);

  const activeTabs = tabs.filter(t => t.windowId !== -1);

  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedTabs(new Set());
  };

  const handleToggleSelect = (tabId: number) => {
    const newSelected = new Set(selectedTabs);
    if (newSelected.has(tabId)) {
      newSelected.delete(tabId);
    } else {
      newSelected.add(tabId);
    }
    setSelectedTabs(newSelected);
  };

  const handleSelectAll = () => {
    const allTabIds = activeTabs.map(t => t.id);
    setSelectedTabs(new Set(allTabIds));
  };

  const handleDeselectAll = () => {
    setSelectedTabs(new Set());
  };

  const handleCloseSelected = async () => {
    if (selectedTabs.size === 0) return;

    // Optimistically remove from UI
    selectedTabs.forEach(tabId => onTabClose(tabId));

    // Close all selected tabs
    try {
      await Promise.all(
        Array.from(selectedTabs).map(tabId => closeTab(tabId))
      );
      setSelectedTabs(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Failed to close selected tabs:', error);
    }
  };

  if (activeTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <p className="text-sm">No tabs open</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selection Mode Controls */}
      <div className="flex items-center justify-between px-3 min-h-[28px]">
        <button
          onClick={handleToggleSelectionMode}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          {selectionMode ? (
            <>
              <CheckSquare size={13} />
              <span>Exit</span>
            </>
          ) : (
            <>
              <Square size={13} />
              <span>Select</span>
            </>
          )}
        </button>

        {selectionMode && (
          <div className="flex items-center gap-3">
            {selectedTabs.size > 0 ? (
              <>
                <span className="text-[11px] text-slate-500 font-medium">
                  {selectedTabs.size} selected
                </span>
                <button
                  onClick={handleDeselectAll}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleCloseSelected}
                  className="flex items-center gap-1 px-2 py-0.5 bg-red-600/90 hover:bg-red-600 rounded text-[11px] font-medium text-white transition-colors"
                >
                  <X size={11} />
                  Close
                </button>
              </>
            ) : (
              <button
                onClick={handleSelectAll}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                Select All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab List */}
      <div className="space-y-4">
        {Array.from(tabsByWindow.entries()).map(([windowId, windowTabs]) => (
          <div key={windowId} className="space-y-1">
            {!selectionMode && (
              <WindowHeader
                windowId={windowId}
                tabCount={windowTabs.length}
                onMergeWindows={onMergeWindows}
                onDeduplicateTabs={onDeduplicateTabs}
                onHibernate={onHibernate}
                onSaveContext={onSaveContext}
              />
            )}

            {selectionMode && (
              <div className="px-3 py-1.5">
                <h3 className="text-xs font-medium text-slate-500">
                  Window {windowId} · {windowTabs.length} tabs
                </h3>
              </div>
            )}

            <div className="space-y-1">
              {windowTabs.map(tab => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  onClose={onTabClose}
                  isSelected={selectedTabs.has(tab.id)}
                  onToggleSelect={handleToggleSelect}
                  showCheckbox={selectionMode}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
