import Dexie, { Table } from 'dexie';
import type { TabRecord, Project, Embedding, Snapshot } from './types';

class ContextFlowDB extends Dexie {
  tabs!: Table<TabRecord, number>;
  projects!: Table<Project, string>;
  embeddings!: Table<Embedding, string>;
  snapshots!: Table<Snapshot, string>;

  constructor() {
    super('ContextFlowDB');

    this.version(1).stores({
      tabs: 'id, url, projectId, windowId, lastAccessed',
      projects: 'id, lastOpened, isArchived',
      embeddings: 'url, timestamp',
      snapshots: 'id, timestamp'
    });
  }
}

// Export singleton instance
export const db = new ContextFlowDB();
