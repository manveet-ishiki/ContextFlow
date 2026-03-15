import { useState, memo } from 'react';
import { Combine, Copy, Save } from 'lucide-react';
import { Button } from './ui';

interface WindowHeaderProps {
  windowId: number;
  tabCount: number;
  onMergeWindows: () => void;
  onDeduplicateTabs: () => void;
  onSaveContext: (name: string) => void;
}

/**
 * Minimal window header with inline action buttons
 */
export const WindowHeader = memo(({
  windowId,
  tabCount,
  onMergeWindows,
  onDeduplicateTabs,
  onSaveContext
}: WindowHeaderProps) => {
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
    <div className="space-y-2">
      <div className="flex items-center justify-between py-1.5">
        <h3 className="text-xs font-medium text-text-muted">
          Window {windowId} · {tabCount} tabs
        </h3>

        <div className="flex items-center gap-0.5">
          <button
            onClick={onMergeWindows}
            className="p-1.5 hover:bg-surface-hover/50 rounded transition-colors"
            title="Merge all windows"
          >
            <Combine size={13} className="text-text-muted hover:text-text-secondary" />
          </button>

          <button
            onClick={onDeduplicateTabs}
            className="p-1.5 hover:bg-surface-hover/50 rounded transition-colors"
            title="Remove duplicates"
          >
            <Copy size={13} className="text-text-muted hover:text-text-secondary" />
          </button>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="p-1.5 hover:bg-surface-hover/50 rounded transition-colors"
            title="Save as context"
          >
            <Save size={13} className="text-primary-muted hover:text-primary-muted" />
          </button>
        </div>
      </div>

      {showSaveDialog && (
        <div className="pb-2">
          <div className="bg-surface/50 rounded-lg p-3 space-y-2.5 border border-border/50">
            <input
              type="text"
              value={contextName}
              onChange={(e) => setContextName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setShowSaveDialog(false);
                  setContextName('');
                }
              }}
              placeholder="Context name..."
              className="w-full px-3 py-2 bg-background border border-border-muted rounded-md text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex gap-2">
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
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.windowId === nextProps.windowId &&
    prevProps.tabCount === nextProps.tabCount &&
    prevProps.onMergeWindows === nextProps.onMergeWindows &&
    prevProps.onDeduplicateTabs === nextProps.onDeduplicateTabs &&
    prevProps.onSaveContext === nextProps.onSaveContext
  );
});

WindowHeader.displayName = 'WindowHeader';
