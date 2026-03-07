import { memo } from 'react';
import { X } from 'lucide-react';
import type { TabRecord } from '../../types';
import { activateTab, closeTab } from '../../api/tab-operations';

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
export const TabItem = memo(({
  tab,
  onClose,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false
}: TabItemProps) => {
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(tab.id);
    }
  };

  // Get favicon or use placeholder
  const favicon = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-md cursor-pointer group transition-colors ${
        isSelected ? 'bg-slate-700/50 border border-indigo-500/30' : ''
      }`}
      onClick={handleClick}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
        />
      )}

      <img
        src={favicon}
        alt=""
        className="w-4 h-4 flex-shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23475569"/></svg>';
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {tab.title}
        </div>
        <div className="text-xs text-slate-400 truncate">
          {new URL(tab.url).hostname}
        </div>
      </div>

      <button
        onClick={handleClose}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600 rounded transition-opacity"
        title="Close tab"
      >
        <X size={14} className="text-slate-300" />
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if tab data actually changed
  return (
    prevProps.tab.id === nextProps.tab.id &&
    prevProps.tab.title === nextProps.tab.title &&
    prevProps.tab.url === nextProps.tab.url &&
    prevProps.tab.favIconUrl === nextProps.tab.favIconUrl &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.showCheckbox === nextProps.showCheckbox
  );
});

TabItem.displayName = 'TabItem';
