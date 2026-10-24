import { CalendarClock, ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';
import { filterTasks } from '../lib/filterTasks';
import { formatWhen, isOverdue } from '../lib/dates';
import { useAppStore } from '../store/useAppStore';
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type TaskNodeType, type ViewId } from '../types';

const TITLES: Record<Exclude<ViewId, 'canvas'>, string> = {
  tasks: 'Tasks', upcoming: 'Upcoming', completed: 'Completed',
};
const EMPTY: Record<Exclude<ViewId, 'canvas'>, string> = {
  tasks: 'No open tasks. Add one from the canvas toolbar or from a screenshot.',
  upcoming: 'Nothing scheduled. Give a task a deadline and it will show up here.',
  completed: 'Finished tasks will collect here.',
};

export function TaskList({ view }: { view: Exclude<ViewId, 'canvas'> }) {
  const nodes = useAppStore((s) => s.nodes);
  const selectOnly = useAppStore((s) => s.selectOnly);
  const setView = useAppStore((s) => s.setView);

  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<Priority | 'all'>('all');

  const base = useMemo(() => {
    const all = nodes.filter((n): n is TaskNodeType => n.type === 'task');
    if (view === 'completed') return all.filter((t) => t.data.status === 'done');
    const open = all.filter((t) => t.data.status !== 'done');
    if (view === 'upcoming') {
      return open.filter((t) => t.data.deadline).sort((a, b) => (a.data.deadline ?? '').localeCompare(b.data.deadline ?? ''));
    }
    return open;
  }, [nodes, view]);
  const tasks = useMemo(() => filterTasks(base, { query, priority }), [base, query, priority]);
  const filtering = query.trim() !== '' || priority !== 'all';

  const open = (id: string) => { selectOnly(id); setView('canvas'); };

  return (
    <section className="list-view">
      <h1>{TITLES[view]}</h1>
      {base.length > 0 && (
        <div className="filters">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, description or tag" aria-label="Search tasks" />
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority | 'all')} aria-label="Filter by priority">
            <option value="all">Any priority</option>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </div>
      )}
      {tasks.length === 0 ? (
        <div className="list-empty">
          <ListChecks size={20} aria-hidden />
          <p>{filtering && base.length > 0 ? 'No tasks match your search.' : EMPTY[view]}</p>
          {filtering && <button type="button" className="btn" onClick={() => { setQuery(''); setPriority('all'); }}>Clear filters</button>}
        </div>
      ) : (
        <ul className="rows">
          {tasks.map((t) => (
            <li key={t.id}>
              <button type="button" className="row" onClick={() => open(t.id)}>
                <span className={`dot prio-${t.data.priority}`} aria-label={`${PRIORITY_LABEL[t.data.priority]} priority`} />
                <span className="row-title">{t.data.title || 'Untitled task'}</span>
                <span className={`pill pill-status-${t.data.status}`}>{STATUS_LABEL[t.data.status]}</span>
                {t.data.deadline && (
                  <span className={`pill ${isOverdue(t.data.deadline, t.data.status) ? 'pill-overdue' : ''}`}>
                    <CalendarClock size={12} aria-hidden />{formatWhen(t.data.deadline)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
