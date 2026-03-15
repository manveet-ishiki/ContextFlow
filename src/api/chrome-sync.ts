import type { Project } from '../types';

/**
 * Chrome Sync Storage has a 100KB total limit and 8KB per item
 * We'll store critical project metadata only
 */

interface SyncedProjectMetadata {
  id: string;
  name: string;
  color: string;
  lastOpened: number;
  isArchived: boolean;
  tabCount: number;
}

interface ChromeSyncData {
  projects: SyncedProjectMetadata[];
  lastSynced: number;
  version: string;
}

const SYNC_KEY = 'contextflow_metadata';
const MAX_PROJECTS_IN_SYNC = 50; // Conservative limit to stay under quota

/**
 * Syncs project metadata to Chrome Sync Storage
 * Only stores critical metadata, not tab content
 */
export async function syncProjectsToChrome(
  projects: Project[],
  tabCounts: Map<string, number>
): Promise<void> {
  try {
    // Convert to lightweight metadata
    const metadata: SyncedProjectMetadata[] = projects.slice(0, MAX_PROJECTS_IN_SYNC).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      lastOpened: p.lastOpened,
      isArchived: p.isArchived,
      tabCount: tabCounts.get(p.id) || 0,
    }));

    const syncData: ChromeSyncData = {
      projects: metadata,
      lastSynced: Date.now(),
      version: '1.0.0',
    };

    await chrome.storage.sync.set({ [SYNC_KEY]: syncData });
    console.log('[ChromeSync] Synced', metadata.length, 'projects to Chrome Sync');
  } catch (error) {
    if ((error as Error).message.includes('QUOTA_BYTES')) {
      console.error('[ChromeSync] Quota exceeded, reducing project count');
      // Retry with fewer projects
      const reducedProjects = projects.slice(0, 25);
      await syncProjectsToChrome(reducedProjects, tabCounts);
    } else {
      console.error('[ChromeSync] Sync failed:', error);
      throw error;
    }
  }
}

/**
 * Retrieves project metadata from Chrome Sync Storage
 */
export async function getProjectsFromChrome(): Promise<ChromeSyncData | null> {
  try {
    const result = await chrome.storage.sync.get(SYNC_KEY);
    const data = result[SYNC_KEY];
    return data && typeof data === 'object' && 'projects' in data ? (data as ChromeSyncData) : null;
  } catch (error) {
    console.error('[ChromeSync] Failed to retrieve sync data:', error);
    return null;
  }
}

/**
 * Clears Chrome Sync Storage
 */
export async function clearChromeSync(): Promise<void> {
  try {
    await chrome.storage.sync.remove(SYNC_KEY);
    console.log('[ChromeSync] Cleared sync storage');
  } catch (error) {
    console.error('[ChromeSync] Failed to clear sync:', error);
  }
}
