import { useState } from 'react';
import { Combine, Copy, Moon, Save } from 'lucide-react';
import { mergeAllWindows, deduplicateTabs, hibernateInactiveTabs } from '../../api/tab-operations';
import { saveWindowAsContext } from '../../api/context-operations';

interface PowerActionsProps {
  onActionComplete: () => void;
}

/**
 * Quick action toolbar for power features
 */
export function PowerActions({ onActionComplete }: PowerActionsProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [contextName, setContextName] = useState('');

  const handleMergeWindows = async () => {
    if (isWorking) return;

    setIsWorking(true);
    try {
      const result = await mergeAllWindows();
      console.log('Merge complete:', result);
      onActionComplete();
    } catch (error) {
      console.error('Merge failed:', error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeduplicate = async () => {
    if (isWorking) return;

    setIsWorking(true);
    try {
      const result = await deduplicateTabs();
      console.log('Deduplication complete:', result);
      onActionComplete();
    } catch (error) {
      console.error('Deduplication failed:', error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleHibernate = async () => {
    if (isWorking) return;

    setIsWorking(true);
    try {
      const result = await hibernateInactiveTabs();
      console.log('Hibernation complete:', result);
      onActionComplete();
    } catch (error) {
      console.error('Hibernation failed:', error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveContext = async () => {
    if (!contextName.trim()) return;

    setIsWorking(true);
    try {
      const projectId = await saveWindowAsContext(contextName.trim());
      console.log('Context saved:', projectId);
      setShowSaveDialog(false);
      setContextName('');
      onActionComplete();
    } catch (error) {
      console.error('Save context failed:', error);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleMergeWindows}
          disabled={isWorking}
          className="btn btn-secondary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          title="Merge all windows into one"
        >
          <Combine size={14} />
          Merge Windows
        </button>

        <button
          onClick={handleDeduplicate}
          disabled={isWorking}
          className="btn btn-secondary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          title="Close duplicate tabs"
        >
          <Copy size={14} />
          Kill Duplicates
        </button>

        <button
          onClick={handleHibernate}
          disabled={isWorking}
          className="btn btn-secondary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          title="Hibernate inactive tabs"
        >
          <Moon size={14} />
          Hibernate
        </button>

        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={isWorking}
          className="btn btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          title="Save current window as context"
        >
          <Save size={14} />
          Save Context
        </button>
      </div>

      {showSaveDialog && (
        <div className="card p-3 space-y-2">
          <input
            type="text"
            value={contextName}
            onChange={(e) => setContextName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveContext();
              } else if (e.key === 'Escape') {
                setShowSaveDialog(false);
                setContextName('');
              }
            }}
            placeholder="Context name..."
            className="input text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveContext}
              disabled={!contextName.trim() || isWorking}
              className="btn btn-primary text-sm flex-1 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setContextName('');
              }}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
