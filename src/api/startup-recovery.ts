import { db } from '../db';
import { importFromLocalSync, isSyncConfigured } from './sync';
import { getProjectsFromChrome } from './chrome-sync';

export interface RecoveryReport {
  chromeStorageAvailable: boolean;
  localExportAvailable: boolean;
  indexedDBAvailable: boolean;
  recovered: boolean;
  source?: 'chrome-sync' | 'local-export' | 'indexeddb';
  errors: string[];
}

/**
 * Checks IndexedDB health
 */
async function checkIndexedDBHealth(): Promise<boolean> {
  try {
    // Try to count projects
    const count = await db.projects.count();
    console.log('[Recovery] IndexedDB healthy, found', count, 'projects');
    return true;
  } catch (error) {
    console.error('[Recovery] IndexedDB appears corrupted:', error);
    return false;
  }
}

/**
 * Attempts to recover from Chrome Sync Storage
 */
async function recoverFromChromeSync(): Promise<boolean> {
  try {
    const syncData = await getProjectsFromChrome();

    if (!syncData || !syncData.projects || syncData.projects.length === 0) {
      console.log('[Recovery] No Chrome Sync data available');
      return false;
    }

    console.log('[Recovery] Found', syncData.projects.length, 'projects in Chrome Sync');

    // Note: Chrome Sync only has metadata, not full tab data
    // This is primarily for reference/verification
    return true;
  } catch (error) {
    console.error('[Recovery] Chrome Sync recovery failed:', error);
    return false;
  }
}

/**
 * Attempts to recover from local export
 */
async function recoverFromLocalExport(): Promise<boolean> {
  try {
    const configured = await isSyncConfigured();

    if (!configured) {
      console.log('[Recovery] No local sync folder configured');
      return false;
    }

    // Prompt user to import backup
    console.log('[Recovery] Local sync configured, prompting user for import');
    await importFromLocalSync();
    return true;
  } catch (error) {
    console.error('[Recovery] Local export recovery failed:', error);
    return false;
  }
}

/**
 * Runs startup recovery checks
 * Detects corruption and attempts recovery
 */
export async function runStartupRecovery(): Promise<RecoveryReport> {
  const report: RecoveryReport = {
    chromeStorageAvailable: false,
    localExportAvailable: false,
    indexedDBAvailable: false,
    recovered: false,
    errors: [],
  };

  console.log('[Recovery] Starting startup recovery check...');

  // Check IndexedDB health
  report.indexedDBAvailable = await checkIndexedDBHealth();

  if (report.indexedDBAvailable) {
    console.log('[Recovery] IndexedDB healthy, no recovery needed');
    report.recovered = true;
    report.source = 'indexeddb';
    return report;
  }

  console.warn('[Recovery] IndexedDB corrupted or empty, attempting recovery...');

  // Try Chrome Sync first (fastest)
  report.chromeStorageAvailable = await recoverFromChromeSync();

  // Try local export
  report.localExportAvailable = await recoverFromLocalExport();

  if (report.localExportAvailable) {
    report.recovered = true;
    report.source = 'local-export';
  } else if (report.chromeStorageAvailable) {
    report.recovered = true;
    report.source = 'chrome-sync';
    report.errors.push('Only metadata available from Chrome Sync, tab data not recovered');
  } else {
    report.errors.push('No recovery sources available');
  }

  return report;
}
