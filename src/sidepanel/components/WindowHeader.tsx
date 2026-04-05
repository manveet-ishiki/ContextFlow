import { useState, memo } from 'react';
import { LayoutGrid, Combine, Copy, Save } from 'lucide-react';
import { Button } from './ui';

interface WindowHeaderProps {
  windowId: number;
  tabCount: number;
  isCurrentWindow?: boolean;
  onMergeWindows: () => void;
  onDeduplicateTabs: () => void;
  onSaveContext: (name: string) => void;
}

/**
 * Per-window header with collapse chevron, LayoutGrid icon, and inline action buttons.
 * The collapse control is rendered by the parent (TabList); this component handles
 * the label + contextual action buttons.
 */
export const WindowHeader = memo(
  ({ tabCount, isCurrentWindow = false, onMergeWindows, onDeduplicateTabs, onSaveContext }: WindowHeaderProps) => {
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [contextName, setContextName] = useState('');

    const handleSave = () => {
      if (contextName.trim()) {
        onSaveContext(contextName.trim());
        setShowSaveDialog(false);
        setContextName('');
      }
    };

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between py-1">
          {/* Window label + Current badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            <LayoutGrid size={13} className="text-text-muted flex-shrink-0" aria-hidden="true" />
            <h3 className="text-xs font-medium text-text-muted">
              Window
              <span className="mx-1 opacity-40">·</span>
              {tabCount} {tabCount === 1 ? 'tab' : 'tabs'}
            </h3>
            {isCurrentWindow && (
              <span
                className="text-[9px] font-semibold text-primary bg-primary/10
                  px-1.5 py-0.5 rounded-full border border-primary/20 flex-shrink-0"
                title="This is the current Chrome window"
              >
                Current
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMergeWindows}
              className="p-1.5 hover:bg-surface-hover rounded-md transition-colors"
              title="Merge all windows"
              aria-label="Merge all windows"
            >
              <Combine size={12} className="text-text-muted hover:text-text-secondary" />
            </button>

            <button
              onClick={onDeduplicateTabs}
              className="p-1.5 hover:bg-surface-hover rounded-md transition-colors"
              title="Remove duplicate tabs"
              aria-label="Remove duplicate tabs"
            >
              <Copy size={12} className="text-text-muted hover:text-text-secondary" />
            </button>

            <button
              onClick={() => setShowSaveDialog(true)}
              className="p-1.5 hover:bg-surface-hover rounded-md transition-colors"
              title="Save window as context"
              aria-label="Save window as context"
            >
              <Save size={12} className="text-primary-muted hover:text-primary" />
            </button>
          </div>
        </div>

        {/* Inline save dialog */}
        {showSaveDialog && (
          <div className="bg-surface/80 rounded-lg p-2.5 border border-border space-y-2">
            <input
              type="text"
              value={contextName}
              onChange={e => setContextName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setShowSaveDialog(false);
                  setContextName('');
                }
              }}
              placeholder="Context name…"
              aria-label="Context name"
              autoFocus
              className="w-full px-3 py-1.5 bg-background border border-border-muted rounded-lg
                text-sm text-text-primary placeholder-text-muted
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            <div className="flex gap-1.5">
              <Button
                onClick={handleSave}
                disabled={!contextName.trim()}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                Save
              </Button>
              <Button
                onClick={() => {
                  setShowSaveDialog(false);
                  setContextName('');
                }}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.windowId === next.windowId &&
    prev.tabCount === next.tabCount &&
    prev.isCurrentWindow === next.isCurrentWindow &&
    prev.onMergeWindows === next.onMergeWindows &&
    prev.onDeduplicateTabs === next.onDeduplicateTabs &&
    prev.onSaveContext === next.onSaveContext,
);

WindowHeader.displayName = 'WindowHeader';
