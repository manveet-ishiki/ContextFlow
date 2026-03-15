import { useState, useEffect, memo } from 'react';
import { FolderOpen, Trash2, Archive } from 'lucide-react';
import {
  getProjects,
  restoreContext,
  deleteProject,
  getProjectTabCount,
} from '../../api/context-operations';
import type { Project } from '../../types';
import { Card } from './ui';

interface ContextListProps {
  onRestore: () => void;
}

interface ProjectWithCount extends Project {
  tabCount: number;
}

/**
 * List of saved contexts/projects
 */
export const ContextList = memo(
  ({ onRestore }: ContextListProps) => {
    const [projects, setProjects] = useState<ProjectWithCount[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProjects = async () => {
      try {
        const allProjects = await getProjects(false);

        // Get tab counts
        const projectsWithCounts = await Promise.all(
          allProjects.map(async project => ({
            ...project,
            tabCount: await getProjectTabCount(project.id),
          }))
        );

        // Sort by lastOpened (most recent first)
        projectsWithCounts.sort((a, b) => b.lastOpened - a.lastOpened);

        setProjects(projectsWithCounts);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load projects:', error);
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
      } catch (error) {
        console.error('Failed to restore context:', error);
      }
    };

    const handleDelete = async (projectId: string) => {
      if (!confirm('Delete this context and all its tabs?')) {
        return;
      }

      try {
        await deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    };

    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center py-6 text-text-tertiary">
          <p className="text-sm">Loading contexts...</p>
        </div>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-text-tertiary">
          <Archive size={32} className="mb-2 opacity-50" />
          <p className="text-sm">No saved contexts</p>
          <p className="text-xs mt-1">Save your current window to get started</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {projects.map(project => (
          <Card key={project.id} variant="interactive" padding="md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <h3 className="text-sm font-medium text-white truncate">{project.name}</h3>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                  <span>{project.tabCount} tabs</span>
                  <span>•</span>
                  <span>{formatDate(project.lastOpened)}</span>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => handleRestore(project.id)}
                  className="p-1.5 hover:bg-surface-hover rounded transition-colors"
                  title="Restore context"
                >
                  <FolderOpen size={14} className="text-primary-muted" />
                </button>

                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-1.5 hover:bg-surface-hover rounded transition-colors"
                  title="Delete context"
                >
                  <Trash2 size={14} className="text-danger" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.onRestore === nextProps.onRestore;
  }
);

ContextList.displayName = 'ContextList';
