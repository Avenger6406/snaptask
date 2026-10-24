import type { AppNode } from '../types';

export interface DueReminder { id: string; title: string; reminder: string; done: boolean; lateMs: number }

/** Reminders that have passed and not yet been announced for their current value. */
export function dueReminders(nodes: readonly AppNode[], fired: Readonly<Record<string, string>>, now: number): DueReminder[] {
  const out: DueReminder[] = [];
  for (const n of nodes) {
    if (n.type !== 'task' || !n.data.reminder || fired[n.id] === n.data.reminder) continue;
    const at = Date.parse(n.data.reminder);
    if (Number.isNaN(at) || at > now) continue;
    out.push({ id: n.id, title: n.data.title || 'Untitled task', reminder: n.data.reminder, done: n.data.status === 'done', lateMs: now - at });
  }
  return out;
}
