import { Layers, BookMarked } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TabRecord } from '../../types';

interface ToggleHeaderProps {
  tabs: TabRecord[];
  activeView: 'tabs' | 'contexts';
  onViewChange: (view: 'tabs' | 'contexts') => void;
}

function ToggleHeader({ tabs, activeView, onViewChange }: ToggleHeaderProps) {
  const activeTabCount = tabs.filter(t => t.windowId !== -1).length;
  const savedTabCount = tabs.filter(t => t.windowId === -1).length;

  return (
    <div className="flex gap-1 p-0.5 bg-surface rounded-lg border border-border">
      <button
        onClick={() => onViewChange('tabs')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md',
          'text-xs font-medium transition-colors',
          activeView === 'tabs'
            ? 'bg-background text-text-primary shadow-sm border border-border/60'
            : 'text-text-secondary hover:text-text-primary',
        )}
      >
        <Layers size={13} />
        <span>Tabs</span>
        {activeTabCount > 0 && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
            activeView === 'tabs'
              ? 'bg-primary/15 text-primary'
              : 'bg-surface-hover text-text-muted',
          )}>
            {activeTabCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onViewChange('contexts')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md',
          'text-xs font-medium transition-colors',
          activeView === 'contexts'
            ? 'bg-background text-text-primary shadow-sm border border-border/60'
            : 'text-text-secondary hover:text-text-primary',
        )}
      >
        <BookMarked size={13} />
        <span>Saved</span>
        {savedTabCount > 0 && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
            activeView === 'contexts'
              ? 'bg-primary/15 text-primary'
              : 'bg-surface-hover text-text-muted',
          )}>
            {savedTabCount}
          </span>
        )}
      </button>
    </div>
  );
}

export default ToggleHeader;
