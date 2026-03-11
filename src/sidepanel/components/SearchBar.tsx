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
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search tabs..."
        className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
      />
    </div>
  );
}
