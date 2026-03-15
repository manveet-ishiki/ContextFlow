import { useMemo, useState, useCallback, memo } from 'react';
import { TabItem } from './TabItem';
import { WindowHeader } from './WindowHeader';
import type { TabRecord } from '../../types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from './ui';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { moveTabToWindow } from '../../api/tab-operations';

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
    const [activeId, setActiveId] = useState<number | null>(null);

    const [optimisticTabs, setOptimisticTabs] = useState<TabRecord[]>([]);

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8, // 8px drag distance before activation
        },
      })
    );

    // Use optimistic tabs if available, otherwise use actual tabs
    const displayTabs = optimisticTabs.length > 0 ? optimisticTabs : tabs;

    // Group tabs by window (exclude saved tabs with windowId = -1)
    const tabsByWindow = useMemo(() => {
      const grouped = new Map<number, TabRecord[]>();

      for (const tab of displayTabs) {
        // Skip saved/archived tabs
        if (tab.windowId === -1) continue;

        if (!grouped.has(tab.windowId)) {
          grouped.set(tab.windowId, []);
        }
        grouped.get(tab.windowId)!.push(tab);
      }

      return grouped;
    }, [displayTabs]);

    const activeTabs = displayTabs.filter(t => t.windowId !== -1);

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

    // useCallback with functional setState prevents stale closures in memoized TabItems:
    // a TabItem that isn't re-rendered (because its own isSelected didn't change) would
    // otherwise call handleToggleSelect with the old selectedTabs closure value.
    const handleToggleSelect = useCallback((tabId: number) => {
      setSelectedTabs(prev => {
        const next = new Set(prev);
        if (next.has(tabId)) {
          next.delete(tabId);
        } else {
          next.add(tabId);
        }
        return next;
      });
    }, []);

    // Window-level selection handlers
    const handleSelectWindow = useCallback(
      (windowId: number) => {
        const windowTabIds = tabsByWindow.get(windowId)?.map(t => t.id) || [];
        setSelectedTabs(prev => new Set([...prev, ...windowTabIds]));
      },
      [tabsByWindow]
    );

    const handleDeselectWindow = useCallback(
      (windowId: number) => {
        const windowTabIds = new Set(tabsByWindow.get(windowId)?.map(t => t.id) || []);
        setSelectedTabs(prev => new Set([...prev].filter(id => !windowTabIds.has(id))));
      },
      [tabsByWindow]
    );

    const isWindowFullySelected = (windowId: number): boolean => {
      const windowTabs = tabsByWindow.get(windowId) || [];
      return windowTabs.length > 0 && windowTabs.every(t => selectedTabs.has(t.id));
    };

    const isWindowPartiallySelected = (windowId: number): boolean => {
      const windowTabs = tabsByWindow.get(windowId) || [];
      return windowTabs.some(t => selectedTabs.has(t.id)) && !isWindowFullySelected(windowId);
    };

    // Master checkbox handlers
    const isAllSelected = (): boolean => {
      return activeTabs.length > 0 && activeTabs.every(t => selectedTabs.has(t.id));
    };

    const isPartiallySelected = (): boolean => {
      return selectedTabs.size > 0 && !isAllSelected();
    };

    const handleMasterCheckboxToggle = () => {
      if (isAllSelected()) {
        // Deselect all
        setSelectedTabs(new Set());
      } else {
        // Select all active tabs
        const allTabIds = activeTabs.map(t => t.id);
        setSelectedTabs(new Set(allTabIds));
      }
    };

    // Drag and drop handlers
    const handleDragStart = (event: DragStartEvent) => {
      setActiveId(event.active.id as number);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const draggedTabId = active.id as number;
      const draggedTab = displayTabs.find(t => t.id === draggedTabId);
      const overTab = displayTabs.find(t => t.id === (over.id as number));

      if (!draggedTab || !overTab) return;

      const tabsToMove = selectedTabs.has(draggedTabId)
        ? (Array.from(selectedTabs)
            .map(id => displayTabs.find(t => t.id === id))
            .filter(Boolean) as TabRecord[])
        : [draggedTab];

      if (draggedTab.windowId !== overTab.windowId) {
        // Cross-window move — optimistic update BEFORE any await
        const newTabs = displayTabs.map(t =>
          tabsToMove.some(mt => mt.id === t.id) ? { ...t, windowId: overTab.windowId } : t
        );
        setOptimisticTabs(newTabs);

        try {
          for (const tab of tabsToMove) {
            await moveTabToWindow(tab.id, overTab.windowId);
          }
        } catch (error) {
          console.error('Failed to move tab:', error);
          setOptimisticTabs([]);
          return;
        }
        setTimeout(() => setOptimisticTabs([]), 300);
      } else {
        // Same-window reorder — compute new order synchronously with arrayMove,
        // update UI immediately (no await before setOptimisticTabs), then do Chrome API async
        const windowTabs = tabsByWindow.get(draggedTab.windowId) || [];
        const oldIndex = windowTabs.findIndex(t => t.id === draggedTabId);
        const newIndex = windowTabs.findIndex(t => t.id === (over.id as number));

        if (oldIndex === -1 || newIndex === -1) return;

        const reorderedWindowTabs = arrayMove(windowTabs, oldIndex, newIndex);

        // Rebuild flat tabs array: replace this window's section with reordered tabs
        const windowTabIdSet = new Set(windowTabs.map(t => t.id));
        const newTabs: TabRecord[] = [];
        let windowInserted = false;
        for (const t of displayTabs) {
          if (windowTabIdSet.has(t.id)) {
            if (!windowInserted) {
              newTabs.push(...reorderedWindowTabs);
              windowInserted = true;
            }
          } else {
            newTabs.push(t);
          }
        }
        setOptimisticTabs(newTabs); // instant UI update — no awaits above this line

        // Now do the Chrome API calls asynchronously
        try {
          const chromeTabs = await chrome.tabs.query({ windowId: draggedTab.windowId });
          const overIndex = chromeTabs.findIndex(t => t.id === (over.id as number));
          if (overIndex !== -1) {
            const tabsToMoveFiltered = tabsToMove.filter(t => t.windowId === draggedTab.windowId);
            for (const tab of tabsToMoveFiltered) {
              await chrome.tabs.move(tab.id, { index: overIndex });
            }
          }
        } catch (error) {
          console.error('Failed to reorder tab:', error);
        }
        setTimeout(() => setOptimisticTabs([]), 300);
      }
    };

    const handleDragCancel = () => {
      setActiveId(null);
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

    const activeTab = activeId ? displayTabs.find(t => t.id === activeId) : null;
    const draggedSelectedCount = activeId && selectedTabs.has(activeId) ? selectedTabs.size : 0;

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-4">
          {/* Header Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Master checkbox - visible when selection mode is active */}
                {selectionMode && (
                  <Checkbox
                    checked={isAllSelected()}
                    indeterminate={isPartiallySelected()}
                    onChange={handleMasterCheckboxToggle}
                    size="md"
                  />
                )}
                <h2 className="text-sm font-normal text-text-secondary">
                  {selectionMode ? `${selectedTabs.size} selected` : 'Current open windows'}
                </h2>
              </div>
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
                <div key={windowId}>
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
                      <div
                        className="flex items-center gap-1"
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
                        {/* Window checkbox - visible on hover or when selected */}
                        {isWindowCheckboxVisible(windowId) && (
                          <Checkbox
                            checked={isWindowFullySelected(windowId)}
                            indeterminate={isWindowPartiallySelected(windowId)}
                            onChange={() => {
                              if (isWindowFullySelected(windowId)) {
                                handleDeselectWindow(windowId);
                              } else {
                                handleSelectWindow(windowId);
                              }
                            }}
                            size="md"
                          />
                        )}
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
                      <SortableContext
                        items={windowTabs.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                        id={`window-${windowId}`}
                      >
                        <div className="space-y-0.5" data-window-id={windowId}>
                          {windowTabs.map(tab => (
                            <TabItem
                              key={tab.id}
                              tab={tab}
                              onClose={onTabClose}
                              isSelected={selectedTabs.has(tab.id)}
                              onToggleSelect={handleToggleSelect}
                              showCheckbox={selectionMode}
                              windowId={windowId}
                              isDraggingGroup={
                                activeId !== null &&
                                activeId !== tab.id &&
                                selectedTabs.has(tab.id) &&
                                selectedTabs.has(activeId)
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTab && (
            <div
              className="relative rounded-md shadow-2xl ring-1 ring-primary/30"
              style={{ transform: 'scale(1.03)', cursor: 'grabbing' }}
            >
              <TabItem tab={activeTab} onClose={() => {}} isSelected={false} showCheckbox={false} />
              {draggedSelectedCount > 1 && (
                <div className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                  {draggedSelectedCount}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
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
