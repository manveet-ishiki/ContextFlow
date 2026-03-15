import { BookMarked, Layers } from "lucide-react";
import type { TabRecord } from '../../types';
import { cn } from '../../lib/utils';

interface ToggleHeaderProps {
  tabs: TabRecord[];
  activeView: 'tabs' | 'contexts';
  onViewChange: (view: 'tabs' | 'contexts') => void;
}

function ToggleHeader({ tabs, activeView, onViewChange }: ToggleHeaderProps) {

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => onViewChange("tabs")}
        className={cn(
          "flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors",
          activeView === "tabs"
            ? "bg-primary text-text-primary"
            : "bg-surface text-text-tertiary hover:bg-surface-hover hover:text-text-secondary"
        )}
      >
        <div className="flex items-center justify-center gap-1.5">
          <Layers size={12} />
          Tabs ({tabs.filter((t) => t.windowId !== -1).length})
        </div>
      </button>

      <button
        onClick={() => onViewChange("contexts")}
        className={cn(
          "flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors",
          activeView === "contexts"
            ? "bg-primary text-text-primary"
            : "bg-surface text-text-tertiary hover:bg-surface-hover hover:text-text-secondary"
        )}
      >
        <div className="flex items-center justify-center gap-1.5">
          <BookMarked size={12} />
          Saved
        </div>
      </button>
    </div>
  );
}

export default ToggleHeader;