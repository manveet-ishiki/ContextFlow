import { useState, useEffect, memo } from 'react';
import { Trash2, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
import { db } from '../../db';
import {
  getProjects,
  restoreContext,
  deleteProject,
} from '../../api/context-operations';
import type { Project, TabRecord } from '../../types';
import { cn } from '../../lib/utils';

interface ContextListProps {
  onRestore: () => void;
  query?: string;
}

interface ProjectWithTabs extends Project {
  tabs: TabRecord[];
}

/** Single saved tab row — open button and remove button on hover. */
const SavedTabItem = memo(({
  tab,
  onRemove,
}: {
  tab: TabRecord;
  onRemove: (tabId: number) => void;
}) => {
  const favicon = tab.favIconUrl || '';

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    chrome.tabs.create({ url: tab.url, active: true }).catch(() => {});
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(tab.id);
  };

  let hostname = tab.url;
  try { hostname = new URL(tab.url).hostname; } catch { /* keep raw url */ }

  return (
    <div
      role="listitem"
      className="group flex items-center gap-2 py-2 pl-5 pr-2 rounded-lg
        hover:bg-surface-hover/60 transition-colors"
    >
      {/* Favicon */}
      <div className="relative w-4 h-4 flex-shrink-0">
        {favicon ? (
          <img
            src={favicon}
            alt=""
            className="w-4 h-4 rounded-sm"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-4 h-4 rounded-sm bg-primary/20 text-primary
            text-[8px] font-bold uppercase flex items-center justify-center">
            {tab.title.charAt(0)}
          </div>
        )}
      </div>

      {/* Title + hostname */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-text-primary truncate leading-tight">
          {tab.title}
        </div>
        <div className="text-[10px] text-text-tertiary truncate leading-tight">
          {hostname}
        </div>
      </div>

      {/* Open + Remove buttons — appear on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={handleOpen}
          className="p-1 rounded-md hover:bg-surface-hover transition-colors"
          title="Open tab"
          aria-label={`Open ${tab.title}`}
        >
          <ExternalLink size={11} className="text-primary" />
        </button>
        <button
          onClick={handleRemove}
          className="p-1 rounded-md hover:bg-surface-hover transition-colors"
          title="Remove tab"
          aria-label={`Remove ${tab.title}`}
        >
          <Trash2 size={11} className="text-danger" />
        </button>
      </div>
    </div>
  );
});
SavedTabItem.displayName = 'SavedTabItem';

/**
 * Saved contexts — always expanded, displayed like windows with tab lists.
 * Empty state uses no_data.svg illustration.
 */
export const ContextList = memo(
  ({ onRestore, query = '' }: ContextListProps) => {
    const [projects, setProjects] = useState<ProjectWithTabs[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    const q = query.trim().toLowerCase();

    const toggleCollapse = (id: string) =>
      setCollapsed(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });

    const loadProjects = async () => {
      try {
        const all = await getProjects(false);
        const withTabs = await Promise.all(
          all.map(async p => ({
            ...p,
            tabs: await db.tabs.where('projectId').equals(p.id).toArray(),
          })),
        );
        withTabs.sort((a, b) => b.lastOpened - a.lastOpened);
        setProjects(withTabs);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => { loadProjects(); }, []);

    const handleRestore = async (projectId: string) => {
      try {
        await restoreContext(projectId);
        onRestore();
      } catch (err) {
        console.error('Failed to restore context:', err);
      }
    };

    const handleDeleteProject = async (projectId: string) => {
      setConfirmDeleteId(null);
      try {
        await deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    };

    const handleRemoveTab = async (projectId: string, tabId: number) => {
      // Optimistic update — remove from UI immediately before awaiting DB
      setProjects(prev => prev.map(p =>
        p.id === projectId
          ? { ...p, tabs: p.tabs.filter(t => t.id !== tabId) }
          : p,
      ));
      try {
        await db.tabs.delete(tabId);
      } catch (err) {
        console.error('Failed to remove tab:', err);
      }
    };

    if (loading) {
      return <p className="text-xs text-text-tertiary text-center py-4">Loading…</p>;
    }

    // Filter projects and their tabs by query
    const visibleProjects = q
      ? projects
          .map(p => ({
            ...p,
            tabs: p.tabs.filter(
              t => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q),
            ),
          }))
          .filter(p => p.name.toLowerCase().includes(q) || p.tabs.length > 0)
      : projects;

    if (visibleProjects.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 py-6">
          <img src="/no_data.svg" alt="" className="w-48 opacity-90" aria-hidden="true" />
          <p className="text-xs text-text-secondary font-medium">
            {q ? 'No matching saved contexts' : 'No saved contexts'}
          </p>
          <p className="text-[10px] text-text-muted text-center">
            {q ? 'Try a different search term' : 'Save your current window to get started'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {visibleProjects.map(project => (
          <div key={project.id} role="region" aria-label={`Context: ${project.name}`}>

            {/* ── Project header row (mirrors window header style) ── */}
            <div className="group/ctx flex items-center gap-1">

              {/* Collapse chevron */}
              <button
                onClick={() => toggleCollapse(project.id)}
                className="p-0.5 hover:bg-surface-hover/60 rounded transition-colors flex-shrink-0"
                aria-expanded={!collapsed.has(project.id)}
                aria-label={collapsed.has(project.id) ? 'Expand' : 'Collapse'}
              >
                {collapsed.has(project.id)
                  ? <ChevronRight size={13} className="text-text-muted" />
                  : <ChevronDown size={13} className="text-text-muted" />}
              </button>

              {/* Color dot */}
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
                aria-hidden="true"
              />

              {/* Name + count */}
              <h3 className={cn(
                'flex-1 min-w-0 text-xs font-medium text-text-muted',
                'flex items-center gap-1.5 py-1 truncate',
              )}>
                {project.name}
                <span className="opacity-40">·</span>
                {project.tabs.length} {project.tabs.length === 1 ? 'tab' : 'tabs'}
              </h3>

              {/* Actions — appear on hover */}
              {confirmDeleteId === project.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="text-[10px] font-medium text-danger hover:text-danger/80 transition-colors px-1"
                    aria-label={`Confirm delete ${project.name}`}
                  >
                    Delete?
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-[10px] text-text-muted hover:text-text-secondary transition-colors px-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className={cn(
                  'flex items-center gap-1 transition-opacity',
                  'opacity-0 group-hover/ctx:opacity-100',
                )}>
                  {/* Open all tabs in a new window */}
                  <button
                    onClick={() => handleRestore(project.id)}
                    className="p-1 rounded-md hover:bg-surface-hover transition-colors"
                    title={`Open "${project.name}" in new window`}
                    aria-label={`Open context: ${project.name}`}
                  >
                    <ExternalLink size={13} className="text-primary" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(project.id)}
                    className="p-1 rounded-md hover:bg-surface-hover transition-colors"
                    title={`Delete "${project.name}"`}
                    aria-label={`Delete context: ${project.name}`}
                  >
                    <Trash2 size={11} className="text-danger" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Tab list ── */}
            {!collapsed.has(project.id) && (
              <div role="list">
                {project.tabs.map(tab => (
                  <SavedTabItem
                    key={tab.id}
                    tab={tab}
                    onRemove={tabId => handleRemoveTab(project.id, tabId)}
                  />
                ))}
              </div>
            )}

          </div>
        ))}
      </div>
    );
  },
);

ContextList.displayName = 'ContextList';
