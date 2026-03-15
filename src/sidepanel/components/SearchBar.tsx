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

    // Perform live filter search on active tabs
    const results = await liveTabSearch(value);
    onResultsChange(results);
  };

  return (
    <div className="relative">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search tabs..."
        className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}
