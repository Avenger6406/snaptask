import { useEffect } from 'react';
import { dueReminders } from '../lib/reminders';
import { formatWhen } from '../lib/dates';
import { showSystemNotification } from '../lib/notify';
import { useAppStore } from '../store/useAppStore';
import { toast } from '../store/useToastStore';

const CHECK_MS = 10_000;
const LATE_MS = 2 * 60_000;

/** In-app reminders (plus system notifications when permitted). Only runs while the app is open. */
export function useReminders(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const { nodes, firedReminders, markReminders, selectOnly, setView } = useAppStore.getState();
      const due = dueReminders(nodes, firedReminders, Date.now());
      if (due.length === 0) return;
      markReminders(due.map((d) => [d.id, d.reminder])); // mark first so a reminder can never repeat
      const active = due.filter((d) => !d.done);
      if (active.length === 0) return;

      const open = (id: string) => { selectOnly(id); setView('canvas'); };
      for (const d of active) {
        const late = d.lateMs > LATE_MS ? ` (was due ${formatWhen(d.reminder)})` : '';
        if (document.visibilityState === 'hidden') showSystemNotification('SnapTask reminder', `${d.title}${late}`, () => open(d.id));
      }
      if (active.length === 1) {
        const d = active[0];
        const late = d.lateMs > LATE_MS ? ` (was due ${formatWhen(d.reminder)})` : '';
        toast.sticky(`Reminder: ${d.title}${late}`, { label: 'Open', run: () => open(d.id) });
      } else {
        toast.sticky(`${active.length} task reminders are due`, { label: 'Show tasks', run: () => setView('tasks') });
      }
    };
    check();
    const timer = setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, [enabled]);
}
