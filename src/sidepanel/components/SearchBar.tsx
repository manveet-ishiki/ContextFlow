import { useState } from 'react';
import { Search } from 'lucide-react';
import { liveTabSearch } from '../../api/search';
import type { TabRecord } from '../../types';

interface SearchBarProps {
  onResultsChange: (tabs: TabRecord[]) => void;
}

export function SearchBar({ onResultsChange }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim()) {
      onResultsChange([]);
      return;
    }

    const results = await liveTabSearch(value);
    onResultsChange(results);
  };

  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        aria-hidden="true"
      />
      <input
        id="tab-search"
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search tabs..."
        aria-label="Search tabs"
        className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-full text-sm
          text-text-primary placeholder-text-muted
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
          transition-colors"
      />
    </div>
  );
}
