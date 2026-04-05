import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { liveTabSearch } from '../../api/search';
import type { TabRecord } from '../../types';
import { cn } from '../../lib/utils';

interface FloatingSearchProps {
  onResultsChange: (tabs: TabRecord[]) => void;
}

export function FloatingSearch({ onResultsChange }: FloatingSearchProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [hasResults, setHasResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [expanded]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim()) {
      onResultsChange([]);
      setHasResults(false);
      return;
    }

    const results = await liveTabSearch(value);
    onResultsChange(results);
    setHasResults(results.length > 0);
  }, [onResultsChange]);

  const handleClear = () => {
    setQuery('');
    onResultsChange([]);
    setHasResults(false);
    inputRef.current?.focus();
  };

  const handleClose = () => {
    setExpanded(false);
    setQuery('');
    onResultsChange([]);
    setHasResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  return (
    <div
      className="fixed bottom-[52px] right-3 z-50 flex items-center justify-end gap-2"
      role="search"
      aria-label="Tab search"
    >
      {/* Input panel — slides in from the right */}
      <div
        className={cn(
          'flex items-center gap-2 bg-surface border border-border shadow-2xl rounded-full',
          'transition-all duration-200 overflow-hidden',
          expanded
            ? 'w-52 px-3 py-2 opacity-100 pointer-events-auto'
            : 'w-0 px-0 py-2 opacity-0 pointer-events-none',
        )}
      >
        <Search size={13} className="text-text-muted flex-shrink-0" aria-hidden />
        <input
          ref={inputRef}
          id="tab-search-floating"
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search tabs…"
          aria-label="Search tabs"
          className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted
            focus:outline-none min-w-0"
        />
        {query && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Floating circular button */}
      <button
        onClick={expanded ? handleClose : () => setExpanded(true)}
        aria-label={expanded ? 'Close search' : 'Search tabs'}
        className={cn(
          'relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
          'shadow-xl transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/40',
          expanded
            ? 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'
            : 'bg-primary text-white hover:bg-primary/90',
        )}
      >
        {/* Active indicator (dot) when results are showing */}
        {!expanded && hasResults && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400
            border-2 border-background" />
        )}
        {expanded ? <X size={14} /> : <Search size={14} />}
      </button>
    </div>
  );
}
