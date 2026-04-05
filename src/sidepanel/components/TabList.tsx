import React, { useMemo, useState, useCallback, useEffect, useRef, memo } from 'react';
import { TabItem } from './TabItem';
import type { TabRecord } from '../../types';
import {
  ChevronDown, ChevronRight, X, LayoutGrid, Combine, Copy,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { moveTabToWindow } from '../../api/tab-operations';
import { cn } from '../../lib/utils';

// ─── WindowDropZone ───────────────────────────────────────────────────────────
function WindowDropZone({
  windowId, children,
}: {
  windowId: number;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: `window-${windowId}` });

  return (
    <div ref={setNodeRef} data-window-id={windowId} className="space-y-0.5">
      {children}
    </div>
  );
}

// ─── DropPlaceholder ──────────────────────────────────────────────────────────
function DropPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="py-2 pl-5 pr-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5"
    >
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 flex-shrink-0 rounded-sm bg-primary/15" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="h-3 w-3/5 rounded bg-primary/10" />
          <div className="h-2.5 w-2/5 rounded bg-primary/10" />
        </div>
      </div>
    </div>
  );
}

// ─── Collision ────────────────────────────────────────────────────────────────
const customCollision: CollisionDetection = args => {
  const pw = pointerWithin(args);
  if (pw.length > 0) return pw;
  const ri = rectIntersection(args);
  if (ri.length > 0) return ri;
  return closestCenter(args);
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface TabListProps {
  tabs: TabRecord[];
  onTabClose: (tabId: number) => void;
  onMergeWindows: () => void;
  onDeduplicateTabs: () => void;
  /** Handles both window-level and global saves; pass the desired tabIds */
  onSaveTabsAsContext: (tabIds: number[], name: string) => void;
}


// ─── Inline save dialog ───────────────────────────────────────────────────────
function SaveContextDialog({
  title, onSave, onCancel,
}: {
  title: string; onSave: (name: string) => void; onCancel: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <div className="mt-1 bg-surface rounded-lg p-2.5 border border-border/60 space-y-2 shadow-lg">
      <p className="text-[10px] font-medium text-text-tertiary">{title}</p>
      <input
        type="text" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && name.trim()) onSave(name.trim());
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Context name…" autoFocus
        className="w-full px-2.5 py-1.5 bg-background border border-border-muted rounded-lg
          text-xs text-text-primary placeholder-text-muted
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25"
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim()}
          className="flex-1 py-1 rounded-md text-[11px] font-medium bg-primary hover:bg-primary/90
            text-white transition-colors disabled:opacity-40"
        >Save</button>
        <button
          onClick={onCancel}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-border
            text-text-secondary hover:bg-surface-hover transition-colors"
        >Cancel</button>
      </div>
    </div>
  );
}

// ─── Outlined action button (Merge / Dedupe) ──────────────────────────────────
function OutlinedBtn({
  icon: Icon, label, onClick, className,
}: {
  icon: React.ElementType; label: string; onClick: () => void; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label} aria-label={label}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border',
        'text-[10px] font-medium text-text-secondary',
        'hover:bg-surface-hover hover:text-text-primary hover:border-border-muted',
        'transition-colors flex-shrink-0',
        className,
      )}
    >
      <Icon size={10} />
      {label}
    </button>
  );
}

// ─── TabList ─────────────────────────────────────────────────────────────────
export const TabList = memo(
  ({ tabs, onTabClose, onMergeWindows, onDeduplicateTabs, onSaveTabsAsContext }: TabListProps) => {
    const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
    const [collapsedWindows, setCollapsedWindows] = useState<Set<number>>(new Set());
    const [activeId, setActiveId] = useState<number | null>(null);
    const [optimisticTabs, setOptimisticTabs] = useState<TabRecord[]>([]);
    // Cross-window drag indicator: which tab to insert before (null = append to end)
    const [dragInsert, setDragInsert] = useState<{ windowId: number; beforeTabId: number | null } | null>(null);
    const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
    // save dialog: null=closed, windowId=window-level, -1=global
    const [saveDialogId, setSaveDialogId] = useState<number | null>(null);
    const [saveDialogMode, setSaveDialogMode] = useState<'selected' | 'all'>('all');
    const expandWindowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingExpandWindowId = useRef<number | null>(null);

    // ── Focus tracking ─────────────────────────────────────────
    useEffect(() => {
      const refresh = () => {
        try { chrome.windows.getCurrent(w => {
          if (!chrome.runtime.lastError) setCurrentWindowId(w.id ?? null);
        }); } catch { /* noop */ }
      };
      refresh();
      const fn = (wid: number) => { if (wid !== chrome.windows.WINDOW_ID_NONE) setCurrentWindowId(wid); };
      try { chrome.windows.onFocusChanged.addListener(fn); } catch { /* noop */ }
      return () => { try { chrome.windows.onFocusChanged.removeListener(fn); } catch { /* noop */ } };
    }, []);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const displayTabs = optimisticTabs.length > 0 ? optimisticTabs : tabs;

    useEffect(() => {
      if (optimisticTabs.length > 0) {
        const t = setTimeout(() => setOptimisticTabs([]), 150);
        return () => clearTimeout(t);
      }
    }, [tabs]); // eslint-disable-line react-hooks/exhaustive-deps

    const tabsByWindow = useMemo(() => {
      const map = new Map<number, TabRecord[]>();
      for (const tab of displayTabs) {
        if (tab.windowId === -1) continue;
        if (!map.has(tab.windowId)) map.set(tab.windowId, []);
        map.get(tab.windowId)!.push(tab);
      }
      return map;
    }, [displayTabs]);

    const windowOrder = useMemo(() => {
      const seen = new Set<number>(); const order: number[] = [];
      for (const tab of tabs) {
        if (tab.windowId !== -1 && !seen.has(tab.windowId)) { seen.add(tab.windowId); order.push(tab.windowId); }
      }
      if (currentWindowId !== null) {
        const idx = order.indexOf(currentWindowId);
        if (idx > 0) { order.splice(idx, 1); order.unshift(currentWindowId); }
      }
      return order;
    }, [tabs, currentWindowId]);

    const activeTabs = displayTabs.filter(t => t.windowId !== -1);

    // ── Selection ──────────────────────────────────────────────
    const handleToggleSelect = useCallback((tabId: number) => {
      setSelectedTabs(prev => { const next = new Set(prev); next.has(tabId) ? next.delete(tabId) : next.add(tabId); return next; });
    }, []);

    const handleSelectWindow = useCallback((wid: number) => {
      setSelectedTabs(prev => new Set([...prev, ...(tabsByWindow.get(wid)?.map(t => t.id) ?? [])]));
    }, [tabsByWindow]);

    const handleDeselectWindow = useCallback((wid: number) => {
      const ids = new Set(tabsByWindow.get(wid)?.map(t => t.id) ?? []);
      setSelectedTabs(prev => new Set([...prev].filter(id => !ids.has(id))));
    }, [tabsByWindow]);

    const isWinFull = (wid: number) => { const wt = tabsByWindow.get(wid) ?? []; return wt.length > 0 && wt.every(t => selectedTabs.has(t.id)); };
    const isWinPartial = (wid: number) => { const wt = tabsByWindow.get(wid) ?? []; return wt.some(t => selectedTabs.has(t.id)) && !isWinFull(wid); };
    const isAllSelected = () => activeTabs.length > 0 && activeTabs.every(t => selectedTabs.has(t.id));
    const isPartiallySelected = () => selectedTabs.size > 0 && !isAllSelected();

    const handleMasterToggle = () => {
      if (isAllSelected()) setSelectedTabs(new Set());
      else setSelectedTabs(new Set(activeTabs.map(t => t.id)));
    };

    // ── Close selected in window ───────────────────────────────
    const handleCloseSelected = useCallback((wid: number) => {
      const toClose = (tabsByWindow.get(wid) ?? []).filter(t => selectedTabs.has(t.id));
      toClose.forEach(t => { onTabClose(t.id); chrome.tabs.remove(t.id).catch(console.error); });
      setSelectedTabs(prev => { const next = new Set(prev); toClose.forEach(t => next.delete(t.id)); return next; });
    }, [tabsByWindow, selectedTabs, onTabClose]);

    // ── Merge window into current ──────────────────────────────
    const handleMergeWindowInto = useCallback(async (srcWid: number) => {
      if (currentWindowId === null || srcWid === currentWindowId) return;
      for (const tab of (tabsByWindow.get(srcWid) ?? [])) {
        await moveTabToWindow(tab.id, currentWindowId);
      }
    }, [currentWindowId, tabsByWindow]);

    // ── Collapse ───────────────────────────────────────────────
    const toggleCollapse = (wid: number) => {
      setCollapsedWindows(prev => { const next = new Set(prev); next.has(wid) ? next.delete(wid) : next.add(wid); return next; });
    };

    // ── Drag ──────────────────────────────────────────────────
    const handleDragStart = (e: DragStartEvent) => {
      setActiveId(e.active.id as number);
      setDragInsert(null);
    };

    const clearPendingExpand = useCallback(() => {
      if (expandWindowTimer.current) {
        clearTimeout(expandWindowTimer.current);
        expandWindowTimer.current = null;
      }
      pendingExpandWindowId.current = null;
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
      const { active, over } = event;
      const activeTabId = active.id as number;
      const activeTab = tabs.find(t => t.id === activeTabId);

      if (!over || !activeTab) {
        setDragInsert(null);
        clearPendingExpand();
        return;
      }

      let targetWindowId: number | null = null;
      let overTabId: number | null = null;

      if (typeof over.id === 'string' && over.id.startsWith('window-')) {
        targetWindowId = parseInt(over.id.slice('window-'.length), 10);
      } else if (typeof over.id === 'number') {
        overTabId = over.id;
        targetWindowId = tabs.find(t => t.id === overTabId)?.windowId ?? null;
      }

      const isCrossWindow =
        targetWindowId !== null &&
        !Number.isNaN(targetWindowId) &&
        targetWindowId !== activeTab.windowId;

      if (isCrossWindow && targetWindowId !== null) {
        setDragInsert({ windowId: targetWindowId, beforeTabId: overTabId });
      } else {
        setDragInsert(null);
      }

      // Auto-expand collapsed windows on hover
      if (
        targetWindowId === null ||
        Number.isNaN(targetWindowId) ||
        targetWindowId === activeTab.windowId ||
        !collapsedWindows.has(targetWindowId)
      ) {
        clearPendingExpand();
        return;
      }

      if (pendingExpandWindowId.current === targetWindowId) return;

      clearPendingExpand();
      pendingExpandWindowId.current = targetWindowId;
      expandWindowTimer.current = setTimeout(() => {
        setCollapsedWindows(prev => {
          if (!prev.has(targetWindowId!)) return prev;
          const next = new Set(prev);
          next.delete(targetWindowId!);
          return next;
        });
        clearPendingExpand();
      }, 180);
    }, [clearPendingExpand, collapsedWindows, tabs]);

    const handleDragEnd = async (event: DragEndEvent) => {
      const { active, over } = event;
      clearPendingExpand();
      setActiveId(null);
      setDragInsert(null);
      if (!over || active.id === over.id) return;

      const draggedTabId = active.id as number;
      const draggedTab = displayTabs.find(t => t.id === draggedTabId);
      if (!draggedTab) return;

      let targetWindowId: number; let overTabId: number | null = null;
      if (typeof over.id === 'string') {
        targetWindowId = parseInt(over.id.slice('window-'.length), 10);
      } else {
        overTabId = over.id as number;
        const overTab = displayTabs.find(t => t.id === overTabId);
        if (!overTab) return;
        targetWindowId = overTab.windowId;
      }

      const tabsToMove = selectedTabs.has(draggedTabId) && selectedTabs.size > 1
        ? (Array.from(selectedTabs).map(id => displayTabs.find(t => t.id === id)).filter(Boolean) as TabRecord[])
        : [draggedTab];

      if (draggedTab.windowId !== targetWindowId) {
        const newTabs = displayTabs.map(t => tabsToMove.some(mt => mt.id === t.id) ? { ...t, windowId: targetWindowId } : t);
        setOptimisticTabs(newTabs);
        try { for (const tab of tabsToMove) await moveTabToWindow(tab.id, targetWindowId); }
        catch (err) { console.error('Move failed:', err); setOptimisticTabs([]); }
        return;
      }

      if (overTabId === null) return;
      const wTabs = tabsByWindow.get(draggedTab.windowId) ?? [];
      const oi = wTabs.findIndex(t => t.id === draggedTabId);
      const ni = wTabs.findIndex(t => t.id === overTabId);
      if (oi === -1 || ni === -1 || oi === ni) return;

      const reordered = arrayMove(wTabs, oi, ni);
      const wSet = new Set(wTabs.map(t => t.id));
      const newTabs: TabRecord[] = []; let ins = false;
      for (const t of displayTabs) {
        if (wSet.has(t.id)) { if (!ins) { newTabs.push(...reordered); ins = true; } }
        else { newTabs.push(t); }
      }
      setOptimisticTabs(newTabs);

      try {
        const cTabs = await chrome.tabs.query({ windowId: draggedTab.windowId });
        const ti = cTabs.findIndex(t => t.id === overTabId);
        if (ti !== -1) {
          for (const tab of tabsToMove.filter(t => t.windowId === draggedTab.windowId)) {
            await chrome.tabs.move(tab.id, { index: ti });
          }
        }
      } catch (err) { console.error('Reorder failed:', err); }
    };

    const handleDragCancel = useCallback(() => {
      clearPendingExpand();
      setActiveId(null);
      setDragInsert(null);
    }, [clearPendingExpand]);

    useEffect(() => () => clearPendingExpand(), [clearPendingExpand]);

    if (activeTabs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
          <p className="text-sm">No tabs open</p>
        </div>
      );
    }

    const activeTab = activeId ? displayTabs.find(t => t.id === activeId) : null;
    const draggedSelectedCount = activeId && selectedTabs.has(activeId) ? selectedTabs.size : 0;
    const anySelected = selectedTabs.size > 0;

    // Save helpers
    const openSave = (id: number, mode: 'selected' | 'all') => {
      if (saveDialogId === id && saveDialogMode === mode) {
        setSaveDialogId(null); // toggle off
      } else {
        setSaveDialogId(id);
        setSaveDialogMode(mode);
      }
    };

    const handleSaveConfirm = (name: string) => {
      let ids: number[];
      if (saveDialogId === -1) {
        // Global
        ids = saveDialogMode === 'selected' ? Array.from(selectedTabs) : activeTabs.map(t => t.id);
      } else {
        const wTabs = tabsByWindow.get(saveDialogId!) ?? [];
        ids = saveDialogMode === 'selected'
          ? wTabs.filter(t => selectedTabs.has(t.id)).map(t => t.id)
          : wTabs.map(t => t.id);
      }
      onSaveTabsAsContext(ids, name);
      setSaveDialogId(null);
    };

    // Text link style for save buttons
    const saveLinkCls = 'text-[10px] text-primary/70 hover:text-primary underline underline-offset-2 transition-colors whitespace-nowrap flex-shrink-0';

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={customCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-1" role="list" aria-label="Open windows">

          {/* ── Master header — single row ───────────────────────── */}
          <div className="flex items-center gap-1.5 pb-1 mb-1">
            {/* LayoutGrid / checkbox slot — always visible, acts as master select */}
            <div
              className="group/master-checkbox relative w-4 h-4 flex-shrink-0 cursor-pointer"
              role="checkbox"
              aria-checked={isAllSelected()}
              aria-label="Select all tabs"
              tabIndex={0}
              onClick={handleMasterToggle}
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleMasterToggle(); }
              }}
            >
              {/* LayoutGrid — previews the checkbox on hover and hides while selected */}
              <LayoutGrid size={13} className={cn(
                'absolute inset-0 text-text-muted pointer-events-none transition-opacity',
                anySelected ? 'opacity-0' : 'opacity-100 group-hover/master-checkbox:opacity-0',
              )} />
              {/* Checkbox — visible on hover and while selected */}
              <div className={cn(
                'absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity',
                anySelected ? 'opacity-100' : 'opacity-0 group-hover/master-checkbox:opacity-100',
              )}>
                <div className={cn(
                  'w-3.5 h-3.5 rounded flex items-center justify-center transition-all',
                  isAllSelected() || isPartiallySelected() ? 'bg-primary' : 'bg-primary/20',
                )}>
                  {isAllSelected() && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {!isAllSelected() && isPartiallySelected() && <div className="w-2 h-[2px] rounded bg-white" />}
                </div>
              </div>
            </div>

            {/* Label */}
            <h2 className="flex-1 text-xs font-medium text-text-tertiary min-w-0 truncate">
              {anySelected ? `${selectedTabs.size} selected` : 'Open windows'}
            </h2>

            {/* Clear — only when selected */}
            {anySelected && (
              <button
                onClick={() => setSelectedTabs(new Set())}
                className="text-[11px] text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
              >Clear</button>
            )}

            {/* Merge — icon only, tooltip on hover */}
            <button
              onClick={onMergeWindows}
              title="Merge all windows"
              aria-label="Merge all windows"
              className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors flex-shrink-0"
            >
              <Combine size={11} />
            </button>

            {/* Dedupe — icon only, tooltip on hover */}
            <button
              onClick={onDeduplicateTabs}
              title="Remove duplicate tabs"
              aria-label="Remove duplicate tabs"
              className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors flex-shrink-0"
            >
              <Copy size={11} />
            </button>

            {/* Save All — always visible, rightmost */}
            <button
              onClick={() => openSave(-1, anySelected && !isAllSelected() ? 'selected' : 'all')}
              className={saveLinkCls}
            >
              {anySelected && !isAllSelected() ? 'Save Selected' : 'Save All'}
            </button>
          </div>

          {/* Global save dialog — renders below the header */}
          {saveDialogId === -1 && (
            <SaveContextDialog
              title={saveDialogMode === 'selected'
                ? `Save ${selectedTabs.size} selected tab${selectedTabs.size !== 1 ? 's' : ''} as context`
                : `Save all ${activeTabs.length} tabs as context`}
              onSave={handleSaveConfirm}
              onCancel={() => setSaveDialogId(null)}
            />
          )}

          {/* ── Window groups ─────────────────────────────────── */}
          <div className="space-y-3">
            {windowOrder.map(windowId => {
              const windowTabs = tabsByWindow.get(windowId);
              if (!windowTabs) return null;
              const isCollapsed = collapsedWindows.has(windowId);
              const isCurrent = windowId === currentWindowId;
              const winFull = isWinFull(windowId);
              const winPartial = isWinPartial(windowId);
              const hasSelection = winFull || winPartial;
              const isNotCurrent = currentWindowId !== null && windowId !== currentWindowId;
              // Tabs in this window that are selected
              const selectedInWindow = windowTabs.filter(t => selectedTabs.has(t.id));

              return (
                <div key={windowId} role="region"
                  aria-label={`Window${isCurrent ? ' (current)' : ''}`}>

                  {/* ── Window header row ── */}
                  <div className="group/win flex items-center gap-1">

                    {/* Collapse chevron */}
                    <button
                      onClick={() => toggleCollapse(windowId)}
                      className="p-0.5 hover:bg-surface-hover/60 rounded transition-colors flex-shrink-0"
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {isCollapsed
                        ? <ChevronRight size={13} className="text-text-muted" />
                        : <ChevronDown size={13} className="text-text-muted" />}
                    </button>

                    {/* ── Icon / Checkbox slot ─────────────────────────────────
                        FIX: Container is always visible.
                        LayoutGrid shows by default → fades out on hover/selected.
                        Checkbox overlay fades in on hover/selected.
                    ──── */}
                    <div
                      className="group/window-checkbox relative w-4 h-4 flex-shrink-0 cursor-pointer"
                      role="checkbox"
                      aria-checked={winFull}
                      aria-label={hasSelection ? 'Deselect all in window' : 'Select all in window'}
                      tabIndex={0}
                      onClick={e => {
                        e.stopPropagation();
                        winFull ? handleDeselectWindow(windowId) : handleSelectWindow(windowId);
                      }}
                      onKeyDown={e => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault(); e.stopPropagation();
                          winFull ? handleDeselectWindow(windowId) : handleSelectWindow(windowId);
                        }
                      }}
                    >
                      {/* LayoutGrid — always visible unless hovering the slot or selected */}
                      <LayoutGrid size={13} className={cn(
                        'absolute inset-0 text-text-muted pointer-events-none transition-opacity',
                        hasSelection ? 'opacity-0' : 'opacity-100 group-hover/window-checkbox:opacity-0',
                      )} />
                      {/* Checkbox — fades in on slot hover or when selected */}
                      <div className={cn(
                        'absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity',
                        hasSelection ? 'opacity-100' : 'opacity-0 group-hover/window-checkbox:opacity-100',
                      )}>
                        <div className={cn(
                          'w-3.5 h-3.5 rounded flex items-center justify-center transition-all',
                          winFull || winPartial ? 'bg-primary' : 'bg-primary/20',
                        )}>
                          {winFull && (
                            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5"
                                strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          {!winFull && winPartial && <div className="w-2 h-[2px] rounded bg-white" />}
                        </div>
                      </div>
                    </div>

                    {/* Window label */}
                    <h3 className="flex-1 min-w-0 text-xs font-medium text-text-muted
                      flex items-center gap-1.5 py-1 truncate">
                      Window
                      <span className="opacity-40">·</span>
                      {windowTabs.length} {windowTabs.length === 1 ? 'tab' : 'tabs'}
                      {isCurrent && (
                        <span className="text-[9px] font-semibold text-primary bg-primary/10
                          px-1.5 py-0.5 rounded-full border border-primary/20 flex-shrink-0">
                          Current
                        </span>
                      )}
                    </h3>

                    {/* ── Window actions — appear on hover ──────────────────── */}
                    <div className={cn(
                      'flex items-center gap-1.5 transition-opacity',
                      hasSelection
                        ? 'opacity-100'
                        : 'opacity-0 group-hover/win:opacity-100',
                    )}>
                      {/* Single save: Save Selected if selection in window, Save All otherwise */}
                      <button
                        onClick={() => openSave(windowId, hasSelection ? 'selected' : 'all')}
                        className={saveLinkCls}
                      >
                        {hasSelection ? 'Save Selected' : 'Save All'}
                      </button>

                      {/* Merge into current — only for non-current windows */}
                      {isNotCurrent && (
                        <OutlinedBtn
                          icon={Combine}
                          label="Merge"
                          onClick={() => handleMergeWindowInto(windowId)}
                        />
                      )}
                    </div>

                    {/* Close selected — only when something is selected */}
                    {hasSelection && (
                      <button
                        onClick={() => handleCloseSelected(windowId)}
                        className="p-1 rounded-md text-danger hover:bg-surface-hover transition-colors flex-shrink-0"
                        title="Close selected tabs"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Window-level save dialog */}
                  {saveDialogId === windowId && (
                    <SaveContextDialog
                      title={saveDialogMode === 'selected'
                        ? `Save ${selectedInWindow.length} selected tab${selectedInWindow.length !== 1 ? 's' : ''} as context`
                        : `Save this window's ${windowTabs.length} tab${windowTabs.length !== 1 ? 's' : ''} as context`}
                      onSave={handleSaveConfirm}
                      onCancel={() => setSaveDialogId(null)}
                    />
                  )}

                  {/* Tab list */}
                  {!isCollapsed && (
                    <SortableContext
                      items={windowTabs.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                      id={`window-${windowId}`}
                    >
                      <WindowDropZone windowId={windowId}>
                        {windowTabs.map(tab => (
                          <React.Fragment key={tab.id}>
                            {dragInsert?.windowId === windowId && dragInsert.beforeTabId === tab.id && (
                              <DropPlaceholder />
                            )}
                            <TabItem
                              tab={tab}
                              onClose={onTabClose}
                              isSelected={selectedTabs.has(tab.id)}
                              onToggleSelect={handleToggleSelect}
                              windowId={windowId}
                              isDraggingGroup={
                                activeId !== null &&
                                activeId !== tab.id &&
                                selectedTabs.has(tab.id) &&
                                selectedTabs.has(activeId)
                              }
                            />
                          </React.Fragment>
                        ))}
                        {dragInsert?.windowId === windowId && dragInsert.beforeTabId === null && (
                          <DropPlaceholder />
                        )}
                      </WindowDropZone>
                    </SortableContext>
                  )}

                  {isCollapsed && (
                    <WindowDropZone windowId={windowId}>
                      <div className="h-2" />
                    </WindowDropZone>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Drag overlay ──────────────────────────────────── */}
        <DragOverlay dropAnimation={null}>
          {activeTab && (
            <div className="relative rounded-lg shadow-xl ring-1 ring-primary/20 opacity-95"
              style={{ transform: 'scale(1.02)', cursor: 'grabbing' }}>
              <TabItem tab={activeTab} onClose={() => {}} isSelected={false} />
              {draggedSelectedCount > 1 && (
                <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold
                  rounded-full w-5 h-5 flex items-center justify-center shadow">
                  {draggedSelectedCount}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  },
  (prev, next) =>
    prev.tabs === next.tabs &&
    prev.onTabClose === next.onTabClose &&
    prev.onMergeWindows === next.onMergeWindows &&
    prev.onDeduplicateTabs === next.onDeduplicateTabs &&
    prev.onSaveTabsAsContext === next.onSaveTabsAsContext,
);

TabList.displayName = 'TabList';
