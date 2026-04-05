import { useState, useEffect, memo } from 'react';
import { FolderOpen, Trash2, ChevronDown, ChevronRight, Archive } from 'lucide-react';
import {
  getProjects,
  restoreContext,
  deleteProject,
  getProjectTabCount,
} from '../../api/context-operations';
import type { Project } from '../../types';
import { cn } from '../../lib/utils';

interface ContextListProps {
  onRestore: () => void;
}

interface ProjectWithCount extends Project {
  tabCount: number;
}

/**
 * Saved contexts — collapsible section (collapsed by default).
 * On expand shows a horizontal scrollable grid of cards.
 */
export const ContextList = memo(
  ({ onRestore }: ContextListProps) => {
    const [projects, setProjects] = useState<ProjectWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    const loadProjects = async () => {
      try {
        const all = await getProjects(false);
        const withCounts = await Promise.all(
          all.map(async p => ({ ...p, tabCount: await getProjectTabCount(p.id) })),
        );
        withCounts.sort((a, b) => b.lastOpened - a.lastOpened);
        setProjects(withCounts);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadProjects();
    }, []);

    const handleRestore = async (projectId: string) => {
      try {
        await restoreContext(projectId);
        onRestore();
      } catch (err) {
        console.error('Failed to restore context:', err);
      }
    };

    const handleDelete = async (projectId: string) => {
      if (!confirm('Delete this context and all its tabs?')) return;
      try {
        await deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    };

    const formatDate = (ts: number) => {
      const diff = Date.now() - ts;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return new Date(ts).toLocaleDateString();
    };

    return (
      <div className="space-y-2">
        {/* Section header — always visible */}
        <button
          onClick={() => setIsExpanded(p => !p)}
          className="w-full flex items-center justify-between py-2 group"
          aria-expanded={isExpanded}
          aria-controls="saved-contexts-panel"
        >
          <div className="flex items-center gap-2">
            <Archive size={13} className="text-text-muted" aria-hidden="true" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Saved Contexts
            </span>
            {!loading && projects.length > 0 && (
              <span className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded-full border border-border">
                {projects.length}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown size={13} className="text-text-muted transition-transform" />
          ) : (
            <ChevronRight size={13} className="text-text-muted transition-transform" />
          )}
        </button>

        {/* Collapsible panel */}
        {isExpanded && (
          <div id="saved-contexts-panel" role="region" aria-label="Saved contexts">
            {loading ? (
              <p className="text-xs text-text-tertiary text-center py-4">Loading…</p>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-6 text-text-tertiary">
                <Archive size={28} className="opacity-40" aria-hidden="true" />
                <p className="text-xs">No saved contexts</p>
                <p className="text-[10px] text-text-muted">
                  Save your current window to get started
                </p>
              </div>
            ) : (
              /* Horizontal scrollable card row */
              <div
                className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin"
                role="list"
                aria-label="Saved context list"
              >
                {projects.map(project => (
                  <div
                    key={project.id}
                    role="listitem"
                    className={cn(
                      'flex-shrink-0 w-36 bg-surface rounded-xl border border-border p-3',
                      'hover:border-border-muted hover:shadow-sm transition-all',
                    )}
                    style={{
                      borderLeftColor: project.color,
                      borderLeftWidth: '3px',
                    }}
                  >
                    {/* Name */}
                    <p
                      className="text-xs font-semibold text-text-primary truncate leading-tight"
                      title={project.name}
                    >
                      {project.name}
                    </p>

                    {/* Meta */}
                    <p className="text-[10px] text-text-tertiary mt-1">
                      {project.tabCount} {project.tabCount === 1 ? 'tab' : 'tabs'}
                    </p>
                    <p className="text-[10px] text-text-muted">{formatDate(project.lastOpened)}</p>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border">
                      <button
                        onClick={() => handleRestore(project.id)}
                        className="p-1 hover:bg-surface-hover rounded-md transition-colors"
                        title="Restore context"
                        aria-label={`Restore context: ${project.name}`}
                      >
                        <FolderOpen size={12} className="text-primary-muted" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-1 hover:bg-surface-hover rounded-md transition-colors"
                        title="Delete context"
                        aria-label={`Delete context: ${project.name}`}
                      >
                        <Trash2 size={12} className="text-danger" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => prev.onRestore === next.onRestore,
);

ContextList.displayName = 'ContextList';
