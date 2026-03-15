import { useMemo, useState, memo } from 'react';
import { TabItem } from './TabItem';
import { WindowHeader } from './WindowHeader';
import type { TabRecord } from '../../types';
import { Check, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TabListProps {
  tabs: TabRecord[];
  onTabClose: (tabId: number) => void;
  onMergeWindows: () => void;
  onDeduplicateTabs: () => void;
  onSaveContext: (name: string) => void;
}

/**
 * List of active tabs grouped by window with multi-select support
 */
export const TabList = memo(
  ({ tabs, onTabClose, onMergeWindows, onDeduplicateTabs, onSaveContext }: TabListProps) => {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
    const [hoveredWindow, setHoveredWindow] = useState<number | null>(null);
    const [collapsedWindows, setCollapsedWindows] = useState<Set<number>>(new Set());

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

    const toggleWindowCollapse = (windowId: number) => {
      const newCollapsed = new Set(collapsedWindows);
      if (newCollapsed.has(windowId)) {
        newCollapsed.delete(windowId);
      } else {
        newCollapsed.add(windowId);
      }
      setCollapsedWindows(newCollapsed);
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

    // Window-level selection handlers
    const handleSelectWindow = (windowId: number) => {
      const windowTabIds = tabsByWindow.get(windowId)?.map(t => t.id) || [];
      const newSelected = new Set([...selectedTabs, ...windowTabIds]);
      setSelectedTabs(newSelected);
    };

    const handleDeselectWindow = (windowId: number) => {
      const windowTabIds = new Set(tabsByWindow.get(windowId)?.map(t => t.id) || []);
      const newSelected = new Set([...selectedTabs].filter(id => !windowTabIds.has(id)));
      setSelectedTabs(newSelected);
    };

    const isWindowFullySelected = (windowId: number): boolean => {
      const windowTabs = tabsByWindow.get(windowId) || [];
      return windowTabs.length > 0 && windowTabs.every(t => selectedTabs.has(t.id));
    };

    const isWindowPartiallySelected = (windowId: number): boolean => {
      const windowTabs = tabsByWindow.get(windowId) || [];
      return windowTabs.some(t => selectedTabs.has(t.id)) && !isWindowFullySelected(windowId);
    };

    if (activeTabs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
          <p className="text-sm">No tabs open</p>
        </div>
      );
    }

    // Check if window checkbox should be visible
    const isWindowCheckboxVisible = (windowId: number): boolean => {
      return (
        hoveredWindow === windowId ||
        isWindowPartiallySelected(windowId) ||
        isWindowFullySelected(windowId)
      );
    };

    return (
      <div className="space-y-4">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-normal text-text-secondary">
              {selectionMode ? `${selectedTabs.size} selected` : 'Current open windows'}
            </h2>
            {!selectionMode ? (
              <button
                onClick={handleToggleSelectionMode}
                className="text-xs font-medium text-primary-muted hover:text-primary-muted transition-colors"
              >
                Select
              </button>
            ) : (
              <button
                onClick={handleToggleSelectionMode}
                className="text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Tab List */}
        <div className="space-y-5">
          {Array.from(tabsByWindow.entries()).map(([windowId, windowTabs]) => {
            const isCollapsed = collapsedWindows.has(windowId);

            return (
              <div key={windowId} className="relative">
                {/* Checkbox in left padding area */}
                {selectionMode && (
                  <div
                    className="absolute -left-[10px] top-2 w-[10px] flex items-center justify-center"
                    onMouseEnter={() => setHoveredWindow(windowId)}
                    onMouseLeave={() => {
                      if (
                        !isWindowPartiallySelected(windowId) &&
                        !isWindowFullySelected(windowId)
                      ) {
                        setHoveredWindow(null);
                      }
                    }}
                  >
                    {isWindowCheckboxVisible(windowId) && (
                      <div
                        onClick={e => {
                          e.stopPropagation();
                          if (isWindowFullySelected(windowId)) {
                            handleDeselectWindow(windowId);
                          } else {
                            handleSelectWindow(windowId);
                          }
                        }}
                        className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200',
                          isWindowFullySelected(windowId)
                            ? 'bg-primary border-primary'
                            : isWindowPartiallySelected(windowId)
                              ? 'bg-primary/50 border-primary'
                              : 'border-border-muted hover:border-text-muted hover:bg-surface/50'
                        )}
                      >
                        {isWindowFullySelected(windowId) && (
                          <Check size={12} className="text-white" strokeWidth={3} />
                        )}
                        {isWindowPartiallySelected(windowId) && (
                          <Minus size={12} className="text-white" strokeWidth={3} />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Window Header with Collapse/Expand */}
                <div className="space-y-2">
                  {!selectionMode ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleWindowCollapse(windowId)}
                        className="p-0.5 hover:bg-surface-hover/50 rounded transition-colors"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                      >
                        {isCollapsed ? (
                          <ChevronRight size={14} className="text-text-muted" />
                        ) : (
                          <ChevronDown size={14} className="text-text-muted" />
                        )}
                      </button>
                      <div className="flex-1">
                        <WindowHeader
                          windowId={windowId}
                          tabCount={windowTabs.length}
                          onMergeWindows={onMergeWindows}
                          onDeduplicateTabs={onDeduplicateTabs}
                          onSaveContext={onSaveContext}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleWindowCollapse(windowId)}
                        className="p-0.5 hover:bg-surface-hover/50 rounded transition-colors"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                      >
                        {isCollapsed ? (
                          <ChevronRight size={14} className="text-text-muted" />
                        ) : (
                          <ChevronDown size={14} className="text-text-muted" />
                        )}
                      </button>
                      <h3 className="text-xs font-medium text-text-muted py-1.5">
                        Window {windowId} · {windowTabs.length} tabs
                      </h3>
                    </div>
                  )}

                  {/* Tabs - only show when not collapsed */}
                  {!isCollapsed && (
                    <div className="space-y-0.5">
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.tabs === nextProps.tabs &&
      prevProps.onTabClose === nextProps.onTabClose &&
      prevProps.onMergeWindows === nextProps.onMergeWindows &&
      prevProps.onDeduplicateTabs === nextProps.onDeduplicateTabs &&
      prevProps.onSaveContext === nextProps.onSaveContext
    );
  }
);

TabList.displayName = 'TabList';
