import { Bell, CalendarClock, Check } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { formatWhen, isOverdue } from '../lib/dates';
import { useAppStore } from '../store/useAppStore';
import { PRIORITY_LABEL, STATUS_LABEL, type TaskNodeType } from '../types';
import { NodeHandles } from './NodeHandles';

export function TaskNode({ id, data, selected }: NodeProps<TaskNodeType>) {
  const updateTask = useAppStore((s) => s.updateTask);
  const pending = useAppStore((s) => s.connectFrom === id);
  const fired = useAppStore((s) => s.firedReminders[id] === data.reminder);
  const done = data.status === 'done';
  const overdue = isOverdue(data.deadline, data.status);

  return (
    <div className={`node node-task status-${data.status} ${selected ? 'is-selected' : ''} ${pending ? 'is-pending' : ''}`}>
      <NodeHandles />
      <div className="task-head">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? 'Mark as not done' : 'Mark as done'}
          className={`check nodrag ${done ? 'is-on' : ''}`}
          onClick={() => updateTask(id, { status: done ? 'todo' : 'done' })}
        >
          {done && <Check size={12} strokeWidth={3} aria-hidden />}
        </button>
        <input
          className={`field-bare task-title nodrag ${done ? 'is-done' : ''}`}
          value={data.title}
          aria-label="Task title"
          onChange={(e) => updateTask(id, { title: e.target.value })}
        />
      </div>
      {data.description && <p className="task-desc">{data.description}</p>}
      <div className="task-meta">
        <span className={`pill pill-status-${data.status}`}>{STATUS_LABEL[data.status]}</span>
        <span className={`pill pill-prio-${data.priority}`}>{PRIORITY_LABEL[data.priority]}</span>
        {data.deadline && (
          <span className={`pill ${overdue ? 'pill-overdue' : ''}`}>
            <CalendarClock size={12} aria-hidden />
            {overdue ? 'Overdue · ' : ''}{formatWhen(data.deadline)}
          </span>
        )}
        {data.reminder && !done && (
          <span className={`pill ${fired ? '' : 'pill-reminder'}`} title={fired ? 'Reminder already shown' : 'Reminder'}>
            <Bell size={12} aria-hidden />{formatWhen(data.reminder)}
          </span>
        )}
        {data.tags.map((t) => <span key={t} className="pill pill-tag">#{t}</span>)}
      </div>
    </div>
  );
}
