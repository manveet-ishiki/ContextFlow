import { db } from '../db';
import type { TabRecord, Project, Snapshot } from '../types';

/**
 * Export data structure for sync files
 */
interface SyncData {
  tabs: TabRecord[];
  projects: Project[];
  embeddings: Array<{
    url: string;
    vector: number[]; // Convert Float32Array to regular array for JSON
    snippet: string;
    timestamp: number;
  }>;
  snapshots: Snapshot[];
  exportedAt: number;
  version: string;
}

let syncDirectoryHandle: FileSystemDirectoryHandle | null = null;

/**
 * Prompts user to select a folder for syncing
 * Stores the directory handle for future use
 */
export async function selectSyncFolder(): Promise<FileSystemDirectoryHandle> {
  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });

    syncDirectoryHandle = handle;

    // Store permission in chrome.storage
    await chrome.storage.local.set({
      syncFolderConfigured: true
    });

    console.log('[Sync] Sync folder selected');
    return handle;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('[Sync] User cancelled folder selection');
    } else {
      console.error('[Sync] Failed to select sync folder:', error);
    }
    throw error;
  }
}

/**
 * Exports all Dexie data to a JSON file in the sync folder
 */
export async function exportToLocalSync(): Promise<void> {
  try {
    // Ensure we have a directory handle
    if (!syncDirectoryHandle) {
      await selectSyncFolder();
    }

    if (!syncDirectoryHandle) {
      throw new Error('No sync folder selected');
    }

    console.log('[Sync] Starting export...');

    // Collect all data from Dexie
    const [tabs, projects, embeddings, snapshots] = await Promise.all([
      db.tabs.toArray(),
      db.projects.toArray(),
      db.embeddings.toArray(),
      db.snapshots.toArray()
    ]);

    // Convert embeddings to serializable format
    const serializableEmbeddings = embeddings.map(e => ({
      url: e.url,
      vector: Array.from(e.vector), // Convert Float32Array to regular array
      snippet: e.snippet,
      timestamp: e.timestamp
    }));

    const syncData: SyncData = {
      tabs,
      projects,
      embeddings: serializableEmbeddings,
      snapshots,
      exportedAt: Date.now(),
      version: '1.0.0'
    };

    // Create/overwrite the sync file
    const fileHandle = await syncDirectoryHandle.getFileHandle(
      'contextflow_sync.json',
      { create: true }
    );

    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(syncData, null, 2));
    await writable.close();

    console.log('[Sync] Export complete:', {
      tabs: tabs.length,
      projects: projects.length,
      embeddings: embeddings.length
    });
  } catch (error) {
    console.error('[Sync] Export failed:', error);
    throw error;
  }
}

/**
 * Imports data from a sync file
 * Merges with existing data
 */
export async function importFromLocalSync(): Promise<void> {
  try {
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [{
        description: 'ContextFlow Sync File',
        accept: { 'application/json': ['.json'] }
      }],
      startIn: 'documents'
    });

    const file = await fileHandle.getFile();
    const contents = await file.text();
    const syncData: SyncData = JSON.parse(contents);

    console.log('[Sync] Starting import...');

    // Convert embeddings back to Float32Array
    const embeddingsWithTypedArrays = syncData.embeddings.map(e => ({
      url: e.url,
      vector: new Float32Array(e.vector),
      snippet: e.snippet,
      timestamp: e.timestamp
    }));

    // Import data using bulkPut to merge/update
    await Promise.all([
      db.tabs.bulkPut(syncData.tabs),
      db.projects.bulkPut(syncData.projects),
      db.embeddings.bulkPut(embeddingsWithTypedArrays),
      db.snapshots.bulkPut(syncData.snapshots)
    ]);

    console.log('[Sync] Import complete:', {
      tabs: syncData.tabs.length,
      projects: syncData.projects.length,
      embeddings: syncData.embeddings.length
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('[Sync] User cancelled file selection');
    } else {
      console.error('[Sync] Import failed:', error);
    }
    throw error;
  }
}

/**
 * Checks if sync folder is configured
 */
export async function isSyncConfigured(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get('syncFolderConfigured');
    return result.syncFolderConfigured === true;
  } catch (error) {
    return false;
  }
}

/**
 * Automatically exports data when changes occur
 * Can be called after significant operations
 */
export async function autoExport(): Promise<void> {
  const configured = await isSyncConfigured();

  if (configured && syncDirectoryHandle) {
    try {
      await exportToLocalSync();
      console.log('[Sync] Auto-export complete');
    } catch (error) {
      console.error('[Sync] Auto-export failed:', error);
      // Don't throw - auto-export is best-effort
    }
  }
}
