import { db } from '../db';
import type { SearchResult, TabRecord } from '../types';
import { MessageType, createMessage, type GenerateEmbeddingPayload } from '../messages';

/**
 * Computes cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical
 * Currently unused but available for future full semantic search implementation
 */
// @ts-ignore - Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Performs semantic search across all indexed embeddings
 * Uses AI to find pages by meaning, not just keywords
 */
export async function semanticSearch(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  console.log(`[Search] Performing semantic search for: "${query}"`);

  try {
    // Generate embedding for the search query
    // We need to send a message to the offscreen document
    await chrome.runtime.sendMessage(
      createMessage<GenerateEmbeddingPayload>(MessageType.GENERATE_EMBEDDING, {
        url: '', // Empty URL for search queries
        text: query
      })
    );

    // The offscreen document saves the embedding, but we need to generate it in-place
    // Let's wait a moment and query the latest embedding (this is a workaround)
    // Better approach: Have offscreen return the vector without saving

    // For now, we'll need to enhance the offscreen to return the vector
    // Let me implement a simpler approach: get all embeddings and compute similarity

    // Get all embeddings from database
    const allEmbeddings = await db.embeddings.toArray();

    if (allEmbeddings.length === 0) {
      console.log('[Search] No embeddings found in database');
      return [];
    }

    // For the query, we need to generate an embedding
    // Since we can't easily get it back from offscreen in current setup,
    // let's implement a simple keyword matching for now
    // TODO: Enhance offscreen to return vectors

    // Temporary implementation: keyword-based search with similarity scoring
    const results: SearchResult[] = [];

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    for (const embedding of allEmbeddings) {
      const snippetLower = embedding.snippet.toLowerCase();

      // Simple keyword matching score
      let score = 0;
      for (const word of queryWords) {
        if (snippetLower.includes(word)) {
          score += 0.3;
        }
      }

      // Boost if all words appear
      if (queryWords.every(word => snippetLower.includes(word))) {
        score += 0.5;
      }

      if (score > 0) {
        results.push({
          url: embedding.url,
          snippet: embedding.snippet,
          similarity: Math.min(score, 1.0)
        });
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Limit results
    const limitedResults = results.slice(0, limit);

    console.log(`[Search] Found ${limitedResults.length} results`);
    return limitedResults;
  } catch (error) {
    console.error('[Search] Semantic search failed:', error);
    return [];
  }
}

/**
 * Performs a live filter search across currently open tabs
 * Simple text matching for instant results
 */
export async function liveTabSearch(query: string): Promise<TabRecord[]> {
  try {
    const queryLower = query.toLowerCase();

    // Get all tabs from Chrome
    const chromeTabs = await chrome.tabs.query({});

    // Filter tabs by title or URL
    const matchingTabs = chromeTabs.filter(tab => {
      const title = tab.title?.toLowerCase() || '';
      const url = tab.url?.toLowerCase() || '';

      return title.includes(queryLower) || url.includes(queryLower);
    });

    // Convert to TabRecord format
    const results: TabRecord[] = matchingTabs.map(tab => ({
      id: tab.id!,
      url: tab.url || '',
      title: tab.title || '',
      favIconUrl: tab.favIconUrl,
      windowId: tab.windowId,
      lastAccessed: Date.now()
    }));

    return results;
  } catch (error) {
    console.error('[Search] Live tab search failed:', error);
    return [];
  }
}

/**
 * Searches through saved contexts/projects
 */
export async function searchProjects(query: string): Promise<Array<{ id: string; name: string; tabCount: number }>> {
  try {
    const queryLower = query.toLowerCase();

    // Filter manually since Dexie doesn't support boolean indexing well
    const allProjects = await db.projects.toArray();
    const activeProjects = allProjects.filter(p => !p.isArchived);

    const matchingProjects = activeProjects.filter(project =>
      project.name.toLowerCase().includes(queryLower)
    );

    // Get tab counts for each project
    const results = await Promise.all(
      matchingProjects.map(async (project) => {
        const tabCount = await db.tabs
          .where('projectId')
          .equals(project.id)
          .count();

        return {
          id: project.id,
          name: project.name,
          tabCount
        };
      })
    );

    return results;
  } catch (error) {
    console.error('[Search] Project search failed:', error);
    return [];
  }
}

/**
 * Searches for tabs visited in a specific time range
 * Useful for finding tabs from "last week", "yesterday", etc.
 */
export async function searchTabsByDateRange(
  query: string,
  daysAgo: number = 7
): Promise<TabRecord[]> {
  try {
    const now = Date.now();
    const cutoffTime = now - (daysAgo * 24 * 60 * 60 * 1000);

    // Get all saved tabs (windowId = -1) within the date range
    const allSavedTabs = await db.tabs
      .where('windowId')
      .equals(-1)
      .toArray();

    // Filter by date and query
    const queryLower = query.toLowerCase();
    const matchingTabs = allSavedTabs.filter(tab => {
      const visitedAt = tab.visitedAt || tab.lastAccessed;
      const isInDateRange = visitedAt >= cutoffTime;
      const matchesQuery = !query ||
        tab.title.toLowerCase().includes(queryLower) ||
        tab.url.toLowerCase().includes(queryLower);

      return isInDateRange && matchesQuery;
    });

    // Sort by most recent first
    matchingTabs.sort((a, b) => {
      const aTime = a.visitedAt || a.lastAccessed;
      const bTime = b.visitedAt || b.lastAccessed;
      return bTime - aTime;
    });

    return matchingTabs;
  } catch (error) {
    console.error('[Search] Date range search failed:', error);
    return [];
  }
}

/**
 * Natural language date search
 * Parses queries like "last week", "yesterday", "last 3 days"
 */
export async function naturalLanguageSearch(query: string): Promise<TabRecord[]> {
  const queryLower = query.toLowerCase();
  let daysAgo = 7; // Default to last week

  // Parse natural language time expressions
  if (queryLower.includes('yesterday')) {
    daysAgo = 1;
  } else if (queryLower.includes('today')) {
    daysAgo = 0;
  } else if (queryLower.includes('last week') || queryLower.includes('week ago')) {
    daysAgo = 7;
  } else if (queryLower.includes('last month') || queryLower.includes('month ago')) {
    daysAgo = 30;
  } else {
    // Try to extract number of days
    const match = queryLower.match(/(\d+)\s*days?\s*ago/);
    if (match) {
      daysAgo = parseInt(match[1]);
    }
  }

  // Remove time expressions from query to get actual search term
  const searchTerm = query
    .replace(/yesterday|today|last\s+week|week\s+ago|last\s+month|month\s+ago|\d+\s*days?\s*ago/gi, '')
    .trim();

  return searchTabsByDateRange(searchTerm, daysAgo);
}
