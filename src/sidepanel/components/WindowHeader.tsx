import { useState } from 'react';
import { Combine, Copy, Moon, Save } from 'lucide-react';

interface WindowHeaderProps {
  windowId: number;
  tabCount: number;
  onMergeWindows: () => void;
  onDeduplicateTabs: () => void;
  onHibernate: () => void;
  onSaveContext: (name: string) => void;
}

/**
 * Minimal window header with inline action buttons
 */
export function WindowHeader({
  windowId,
  tabCount,
  onMergeWindows,
  onDeduplicateTabs,
  onHibernate,
  onSaveContext
}: WindowHeaderProps) {
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
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-medium text-slate-400">
          Window {windowId} · {tabCount} tabs
        </h3>

        <div className="flex items-center gap-1">
          <button
            onClick={onMergeWindows}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Merge all windows"
          >
            <Combine size={14} className="text-slate-400" />
          </button>

          <button
            onClick={onDeduplicateTabs}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Remove duplicates"
          >
            <Copy size={14} className="text-slate-400" />
          </button>

          <button
            onClick={onHibernate}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Hibernate inactive"
          >
            <Moon size={14} className="text-slate-400" />
          </button>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Save as context"
          >
            <Save size={14} className="text-indigo-400" />
          </button>
        </div>
      </div>

      {showSaveDialog && (
        <div className="px-3 pb-2">
          <div className="bg-slate-800 rounded-md p-2 space-y-2 border border-slate-700">
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
              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!contextName.trim()}
                className="flex-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-xs font-medium transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setContextName('');
                }}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
