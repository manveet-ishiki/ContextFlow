import { memo } from 'react';
import { X, Check } from 'lucide-react';
import type { TabRecord } from '../../types';
import { activateTab, closeTab } from '../../api/tab-operations';
import { cn } from '../../lib/utils';

interface TabItemProps {
  tab: TabRecord;
  onClose: (tabId: number) => void;
  isSelected?: boolean;
  onToggleSelect?: (tabId: number) => void;
  showCheckbox?: boolean;
}

/**
 * Individual tab item with optimistic UI updates
 * Uses React.memo to prevent unnecessary re-renders
 */
export const TabItem = memo(
  ({ tab, onClose, isSelected = false, onToggleSelect, showCheckbox = false }: TabItemProps) => {
    const handleClose = async (e: React.MouseEvent) => {
      e.stopPropagation();

      // Optimistic update - remove from UI immediately
      onClose(tab.id);

      // Then actually close the tab
      try {
        await closeTab(tab.id);
      } catch (error) {
        console.error('Failed to close tab:', error);
      }
    };

    const handleClick = async () => {
      // If checkbox mode is active, toggle selection instead of activating
      if (showCheckbox && onToggleSelect) {
        onToggleSelect(tab.id);
        return;
      }

      try {
        await activateTab(tab.id);
      } catch (error) {
        console.error('Failed to activate tab:', error);
      }
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleSelect) {
        onToggleSelect(tab.id);
      }
    };

    // Get favicon or use placeholder
    const favicon =
      tab.favIconUrl ||
      `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;

    return (
      <div
        className={cn(
          'flex items-center gap-2.5 pl-0 pr-3 py-2.5 hover:bg-surface-hover/50 rounded-md cursor-pointer group transition-all',
          isSelected && 'bg-primary/10'
        )}
        onClick={handleClick}
      >
        {/* Always reserve space for checkbox to prevent layout shift */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {showCheckbox && (
            <div
              onClick={handleCheckboxClick}
              className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200',
                isSelected
                  ? 'bg-primary border-primary scale-100'
                  : 'border-border-muted bg-transparent hover:border-text-muted hover:bg-surface/50'
              )}
            >
              {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
          )}
        </div>

        <img
          src={favicon}
          alt=""
          className="w-4 h-4 flex-shrink-0"
          onError={e => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23475569"/></svg>';
          }}
        />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{tab.title}</div>
          <div className="text-xs text-text-tertiary truncate">{new URL(tab.url).hostname}</div>
        </div>

        {!showCheckbox && (
          <button
            onClick={handleClose}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-border-muted rounded transition-all"
            title="Close tab"
          >
            <X size={14} className="text-text-secondary" />
          </button>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if tab data actually changed
    return (
      prevProps.tab.id === nextProps.tab.id &&
      prevProps.tab.title === nextProps.tab.title &&
      prevProps.tab.url === nextProps.tab.url &&
      prevProps.tab.favIconUrl === nextProps.tab.favIconUrl &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.showCheckbox === nextProps.showCheckbox
    );
  }
);

TabItem.displayName = 'TabItem';
