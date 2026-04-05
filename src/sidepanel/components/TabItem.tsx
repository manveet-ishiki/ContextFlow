import { memo } from 'react';
import { X, GripVertical } from 'lucide-react';
import type { TabRecord } from '../../types';
import { activateTab, closeTab } from '../../api/tab-operations';
import { cn } from '../../lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TabItemProps {
  tab: TabRecord;
  onClose: (tabId: number) => void;
  isSelected?: boolean;
  onToggleSelect?: (tabId: number) => void;
  windowId?: number;
  isDraggingGroup?: boolean;
}

/**
 * Individual tab item.
 * - Hover over the row → favicon fades into a checkbox in-place (no layout shift)
 * - Click the checkbox area → toggle selection
 * - Click anywhere else on the row → activate the tab
 * - Ghost placeholder matches the real row height exactly
 */
export const TabItem = memo(
  ({
    tab,
    onClose,
    isSelected = false,
    onToggleSelect,
    windowId,
    isDraggingGroup = false,
  }: TabItemProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: tab.id,
      data: { windowId },
    });

    const style = { transform: CSS.Transform.toString(transform), transition };

    const handleClose = async (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose(tab.id);
      try {
        await closeTab(tab.id);
      } catch (err) {
        console.error('Failed to close tab:', err);
      }
    };

    const handleActivate = async () => {
      try {
        await activateTab(tab.id);
      } catch (err) {
        console.error('Failed to activate tab:', err);
      }
    };

    const handleCheckboxClick = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      onToggleSelect?.(tab.id);
    };

    // Favicon with Google fallback
    let favicon = tab.favIconUrl;
    if (!favicon) {
      try {
        favicon = `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;
      } catch {
        favicon = '';
      }
    }

    /* ── Ghost: same padding/structure as real row → identical height ─ */
    if (isDragging) {
      return (
        <div
          ref={setNodeRef}
          style={style}
          role="listitem"
          aria-hidden="true"
          className="py-2 pl-5 pr-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5"
        >
          {/* Content skeleton matches the real row's rendered height */}
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

    return (
      <div
        ref={setNodeRef}
        style={style}
        role="listitem"
        className={cn(
          'group relative flex items-center gap-2 py-2 pr-2 rounded-lg transition-colors',
          'pl-5',
          'hover:bg-surface-hover/60',
          isSelected && 'bg-primary/[0.09]',   // full-row highlight, no border
          isDraggingGroup && 'opacity-40',
        )}
      >
        {/* ── Drag handle (absolute overlay, zero layout space) ─── */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 p-0.5
            cursor-grab active:cursor-grabbing touch-none
            opacity-0 group-hover:opacity-50 transition-opacity"
          onClick={e => e.stopPropagation()}
          aria-label="Drag to reorder"
        >
          <GripVertical size={12} className="text-text-muted" aria-hidden="true" />
        </div>

        {/* ── Favicon / Checkbox toggle slot (16×16, no layout shift) ─ */}
        <div
          className="relative w-4 h-4 flex-shrink-0 cursor-pointer"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={isSelected ? `Deselect ${tab.title}` : `Select ${tab.title}`}
          tabIndex={0}
          onClick={handleCheckboxClick}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              handleCheckboxClick(e);
            }
          }}
        >
          {/* Favicon — fades out on group-hover or when selected */}
          {favicon ? (
            <img
              src={favicon}
              alt=""
              className={cn(
                'absolute inset-0 w-4 h-4 rounded-sm pointer-events-none transition-opacity',
                isSelected ? 'opacity-0' : 'opacity-100 group-hover:opacity-0',
              )}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={cn(
                'absolute inset-0 w-4 h-4 rounded-sm flex items-center justify-center',
                'bg-primary/20 text-primary text-[8px] font-bold uppercase pointer-events-none transition-opacity',
                isSelected ? 'opacity-0' : 'opacity-100 group-hover:opacity-0',
              )}
              aria-hidden="true"
            >
              {tab.title.charAt(0)}
            </div>
          )}

          {/* Checkbox — borderless sleek fill, fades in on hover/selected */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
            aria-hidden="true"
          >
            <div
              className={cn(
                'w-3.5 h-3.5 rounded transition-all flex items-center justify-center',
                isSelected ? 'bg-primary' : 'bg-primary/20',
              )}
            >
              {isSelected && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path
                    d="M1 3L3 5L7 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* ── Main content (clicking activates the tab) ─────────── */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={handleActivate}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleActivate();
            }
          }}
          aria-label={`Open ${tab.title}`}
        >
          <div className="text-xs font-medium text-text-primary truncate leading-tight">
            {tab.title}
          </div>
          <div className="text-[10px] text-text-tertiary truncate leading-tight">
            {(() => {
              try {
                return new URL(tab.url).hostname;
              } catch {
                return tab.url;
              }
            })()}
          </div>
        </div>

        {/* ── Close button ──────────────────────────────────────── */}
        <button
          onClick={handleClose}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md
            hover:bg-surface-hover transition-all flex-shrink-0"
          title="Close tab"
          aria-label={`Close ${tab.title}`}
        >
          <X size={12} className="text-text-muted hover:text-text-secondary" />
        </button>
      </div>
    );
  },
  (prev, next) =>
    prev.tab.id === next.tab.id &&
    prev.tab.title === next.tab.title &&
    prev.tab.url === next.tab.url &&
    prev.tab.favIconUrl === next.tab.favIconUrl &&
    prev.isSelected === next.isSelected &&
    prev.isDraggingGroup === next.isDraggingGroup,
);

TabItem.displayName = 'TabItem';
