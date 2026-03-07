// Core data types for ContextFlow

export interface TabRecord {
  id: number;
  url: string;
  title: string;
  favIconUrl?: string;
  projectId?: string;
  windowId: number;
  lastAccessed: number;
  visitedAt?: number; // When user last visited this URL (for date-based search)
}

export interface Project {
  id: string;
  name: string;
  color: string;
  lastOpened: number;
  isArchived: boolean;
}

export interface Embedding {
  url: string; // Primary key
  vector: Float32Array;
  snippet: string;
  timestamp: number;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  data: string; // JSON stringified browser state
}

// Search result type
export interface SearchResult {
  url: string;
  snippet: string;
  similarity: number;
  tab?: TabRecord;
}
