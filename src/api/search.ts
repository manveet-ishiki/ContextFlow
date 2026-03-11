import { db } from '../db';
import type { TabRecord } from '../types';

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
