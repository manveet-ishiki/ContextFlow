import { db } from '../db';
import type { Project } from '../types';
import { autoExport } from './sync';
import { syncProjectsToChrome } from './chrome-sync';

/**
 * Syncs all projects to Chrome Sync Storage
 */
async function syncProjectMetadata(): Promise<void> {
  try {
    const projects = await getProjects(false); // Active projects only
    const tabCounts = new Map<string, number>();

    for (const project of projects) {
      const count = await getProjectTabCount(project.id);
      tabCounts.set(project.id, count);
    }

    await syncProjectsToChrome(projects, tabCounts);
  } catch (error) {
    console.warn('[ContextOperations] Chrome sync failed:', error);
  }
}

/**
 * Saves the current window as a named context/project
 * Creates a new tab and closes all other tabs to persist the browser
 */
export async function saveWindowAsContext(
  name: string,
  color: string = '#6366f1'
): Promise<string> {
  console.log(`[ContextOperations] Saving window as context: ${name}`);

  try {
    const currentWindow = await chrome.windows.getCurrent({ populate: true });
    const tabs = currentWindow.tabs || [];

    if (tabs.length === 0) {
      throw new Error('No tabs to save in current window');
    }

    // Generate project ID
    const projectId = crypto.randomUUID();

    // Create project in database
    await db.projects.add({
      id: projectId,
      name,
      color,
      lastOpened: Date.now(),
      isArchived: false,
    });

    // Save snapshot of all tabs
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        // Save tab to database (create a persistent copy)
        await db.tabs.put({
          id: Date.now() + Math.random(), // Use timestamp + random for unique ID
          url: tab.url,
          title: tab.title || '',
          favIconUrl: tab.favIconUrl,
          projectId,
          windowId: -1, // -1 indicates this is a saved/archived tab
          lastAccessed: Date.now(),
          visitedAt: Date.now(),
        });
      }
    }

    console.log(`[ContextOperations] Saved ${tabs.length} tabs to context: ${name}`);

    // Create a new tab to keep browser alive
    const newTab = await chrome.tabs.create({
      url: 'chrome://newtab',
      active: true,
    });

    // Close all other tabs except the new one
    const tabIdsToClose = tabs
      .map(t => t.id)
      .filter((id): id is number => id !== undefined && id !== newTab.id);

    if (tabIdsToClose.length > 0) {
      await chrome.tabs.remove(tabIdsToClose);
    }

    // Trigger auto-export after saving context
    await autoExport().catch(err => console.warn('[ContextOperations] Auto-export failed:', err));

    // Sync to Chrome Sync Storage
    await syncProjectMetadata().catch(err =>
      console.warn('[ContextOperations] Chrome sync failed:', err)
    );

    return projectId;
  } catch (error) {
    console.error('[ContextOperations] Failed to save window as context:', error);
    throw error;
  }
}

/**
 * Restores a saved context/project by opening all its tabs in a new window
 */
export async function restoreContext(projectId: string): Promise<number> {
  console.log(`[ContextOperations] Restoring context: ${projectId}`);

  try {
    // Get project info
    const project = await db.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Get all tabs for this project
    const tabs = await db.tabs.where('projectId').equals(projectId).toArray();

    if (tabs.length === 0) {
      throw new Error(`No tabs found for project: ${project.name}`);
    }

    // Create new window
    const newWindow = await chrome.windows.create({
      focused: true,
      url: tabs[0].url, // First tab
    });

    if (!newWindow?.id) {
      throw new Error('Failed to create window');
    }

    const windowId = newWindow.id;

    // Open remaining tabs
    for (let i = 1; i < tabs.length; i++) {
      const tab = tabs[i];
      await chrome.tabs.create({
        windowId,
        url: tab.url,
        active: false,
      });
    }

    // Update project lastOpened timestamp
    await db.projects.update(projectId, {
      lastOpened: Date.now(),
    });

    console.log(`[ContextOperations] Restored ${tabs.length} tabs for context: ${project.name}`);

    // Trigger auto-export after restoring context
    await autoExport().catch(err => console.warn('[ContextOperations] Auto-export failed:', err));

    // Sync to Chrome Sync Storage
    await syncProjectMetadata().catch(err =>
      console.warn('[ContextOperations] Chrome sync failed:', err)
    );

    return windowId;
  } catch (error) {
    console.error('[ContextOperations] Failed to restore context:', error);
    throw error;
  }
}

/**
 * Archives a project (marks it as archived)
 */
export async function archiveProject(projectId: string): Promise<void> {
  try {
    await db.projects.update(projectId, {
      isArchived: true,
    });
    console.log(`[ContextOperations] Archived project: ${projectId}`);
  } catch (error) {
    console.error('[ContextOperations] Failed to archive project:', error);
    throw error;
  }
}

/**
 * Deletes a project and all its associated tabs
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    // Delete all tabs associated with this project
    const tabs = await db.tabs.where('projectId').equals(projectId).toArray();

    for (const tab of tabs) {
      await db.tabs.delete(tab.id);
    }

    // Delete the project
    await db.projects.delete(projectId);

    // Trigger auto-export after deleting project
    await autoExport().catch(err => console.warn('[ContextOperations] Auto-export failed:', err));

    // Sync to Chrome Sync Storage
    await syncProjectMetadata().catch(err =>
      console.warn('[ContextOperations] Chrome sync failed:', err)
    );

    console.log(
      `[ContextOperations] Deleted project ${projectId} and ${tabs.length} associated tabs`
    );
  } catch (error) {
    console.error('[ContextOperations] Failed to delete project:', error);
    throw error;
  }
}

/**
 * Gets all projects, optionally filtering by archived status
 */
export async function getProjects(includeArchived: boolean = false): Promise<Project[]> {
  try {
    if (includeArchived) {
      return await db.projects.toArray();
    } else {
      // Filter manually since Dexie doesn't support boolean indexing well
      const allProjects = await db.projects.toArray();
      return allProjects.filter(p => !p.isArchived);
    }
  } catch (error) {
    console.error('[ContextOperations] Failed to get projects:', error);
    throw error;
  }
}

/**
 * Gets tab count for a specific project
 */
export async function getProjectTabCount(projectId: string): Promise<number> {
  try {
    return await db.tabs.where('projectId').equals(projectId).count();
  } catch (error) {
    console.error('[ContextOperations] Failed to get project tab count:', error);
    return 0;
  }
}

/**
 * Saves a specific list of tabs as a named context (non-destructive — tabs remain open)
 */
export async function saveTabsAsContext(
  name: string,
  tabsToSave: { url: string; title: string; favIconUrl?: string }[],
  color: string = '#6366f1',
): Promise<string> {
  console.log(`[ContextOperations] Saving ${tabsToSave.length} tabs as context: ${name}`);

  try {
    const projectId = crypto.randomUUID();

    await db.projects.add({
      id: projectId,
      name,
      color,
      lastOpened: Date.now(),
      isArchived: false,
    });

    for (const tab of tabsToSave) {
      if (tab.url) {
        await db.tabs.put({
          id: Date.now() + Math.random(),
          url: tab.url,
          title: tab.title || '',
          favIconUrl: tab.favIconUrl,
          projectId,
          windowId: -1,
          lastAccessed: Date.now(),
          visitedAt: Date.now(),
        });
      }
    }

    await autoExport().catch(err => console.warn('[ContextOperations] Auto-export failed:', err));
    await syncProjectMetadata().catch(err =>
      console.warn('[ContextOperations] Chrome sync failed:', err),
    );

    return projectId;
  } catch (error) {
    console.error('[ContextOperations] Failed to save tabs as context:', error);
    throw error;
  }
}

