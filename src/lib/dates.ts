import type { TaskStatus } from '../types';

export function isOverdue(deadline: string | null, status: TaskStatus): boolean {
  if (!deadline || status === 'done') return false;
  const t = new Date(deadline).getTime();
  return Number.isFinite(t) && t < Date.now();
}

export function formatWhen(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
