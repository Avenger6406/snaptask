import type { Priority, TaskNodeType } from '../types';

export interface TaskFilter { query: string; priority: Priority | 'all' }

export function filterTasks(tasks: readonly TaskNodeType[], f: TaskFilter): TaskNodeType[] {
  const q = f.query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (f.priority !== 'all' && t.data.priority !== f.priority) return false;
    if (!q) return true;
    return [t.data.title, t.data.description, ...t.data.tags].some((s) => s.toLowerCase().includes(q));
  });
}
