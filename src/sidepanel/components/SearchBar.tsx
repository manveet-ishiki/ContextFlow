import { useState } from 'react';
import { Search, Sparkles, Calendar } from 'lucide-react';
import { liveTabSearch, semanticSearch, naturalLanguageSearch } from '../../api/search';
import type { TabRecord } from '../../types';

interface SearchBarProps {
  onResultsChange: (tabs: TabRecord[], semantic: boolean) => void;
}

/**
 * Smart search bar with multiple modes:
 * - Live filter for instant keyword matching
 * - Natural language date search (e.g., "last week", "yesterday")
 * - Semantic AI search
 */
export function SearchBar({ onResultsChange }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim()) {
      // Clear search results
      onResultsChange([], false);
      return;
    }

    // Check if query contains date-related terms
    const hasDateTerms = /yesterday|today|last\s+week|week\s+ago|last\s+month|month\s+ago|\d+\s*days?\s*ago/i.test(value);

    if (hasDateTerms) {
      // Use natural language date search
      try {
        const results = await naturalLanguageSearch(value);
        onResultsChange(results, false);
      } catch (error) {
        console.error('Date search failed:', error);
      }
    } else {
      // Perform live filter search on active tabs
      const results = await liveTabSearch(value);
      onResultsChange(results, false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);

    try {
      const results = await semanticSearch(query, 10);

      // Convert SearchResult to TabRecord for display
      const tabs: TabRecord[] = results.map((result, index) => ({
        id: -1 - index, // Negative IDs for search results
        url: result.url,
        title: result.snippet,
        windowId: -1,
        lastAccessed: Date.now()
      }));

      onResultsChange(tabs, true);
    } catch (error) {
      console.error('Semantic search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSemanticSearch();
    }
  };

  // Detect if query has date terms
  const hasDateTerms = /yesterday|today|last\s+week|week\s+ago|last\s+month|month\s+ago|\d+\s*days?\s*ago/i.test(query);

  return (
    <div className="space-y-1">
      <div className="relative">
        {hasDateTerms ? (
          <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-green-500" />
        ) : (
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        )}
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search or type 'last week'..."
          className="w-full pl-8 pr-9 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        {query && !hasDateTerms && (
          <button
            onClick={handleSemanticSearch}
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
            title="AI Search (⌘↵)"
          >
            <Sparkles size={14} className={`text-indigo-400 ${isSearching ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </div>

      {hasDateTerms && query && (
        <div className="text-[10px] text-green-500 px-1">
          🗓️ Searching saved tabs by date
        </div>
      )}
    </div>
  );
}
