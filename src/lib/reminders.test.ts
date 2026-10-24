import { describe, expect, it } from 'vitest';
import { dueReminders } from './reminders';
import { filterTasks } from './filterTasks';
import type { AppNode, TaskData, TaskNodeType } from '../types';

const task = (id: string, patch: Partial<TaskData>): TaskNodeType => ({
  id, type: 'task', position: { x: 0, y: 0 },
  data: { title: id, description: '', status: 'todo', priority: 'medium', deadline: null, reminder: null, tags: [], ...patch },
});
const NOW = Date.parse('2030-05-01T12:00:00');

describe('dueReminders', () => {
  it('returns only past, unannounced reminders', () => {
    const nodes: AppNode[] = [
      task('past', { reminder: '2030-05-01T11:00' }),
      task('future', { reminder: '2030-05-01T13:00' }),
      task('none', {}),
      task('announced', { reminder: '2030-05-01T10:00' }),
    ];
    const due = dueReminders(nodes, { announced: '2030-05-01T10:00' }, NOW);
    expect(due.map((d) => d.id)).toEqual(['past']);
    expect(due[0].lateMs).toBe(3_600_000);
  });

  it('re-fires when the reminder time is changed, and flags completed tasks', () => {
    const nodes: AppNode[] = [task('t', { reminder: '2030-05-01T11:30' }), task('d', { reminder: '2030-05-01T09:00', status: 'done' })];
    const due = dueReminders(nodes, { t: '2030-05-01T11:00' }, NOW);
    expect(due.map((d) => [d.id, d.done])).toEqual([['t', false], ['d', true]]);
  });

  it('never fires twice once marked', () => {
    const nodes: AppNode[] = [task('t', { reminder: '2030-05-01T11:00' })];
    const first = dueReminders(nodes, {}, NOW);
    const second = dueReminders(nodes, { t: first[0].reminder }, NOW + 60_000);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });
});

describe('filterTasks', () => {
  const tasks = [
    task('a', { title: 'Fix login', priority: 'high', tags: ['auth'] }),
    task('b', { title: 'Write docs', description: 'login page copy', priority: 'low' }),
  ];
  it('matches title, description and tags, case-insensitively', () => {
    expect(filterTasks(tasks, { query: 'LOGIN', priority: 'all' }).map((t) => t.id)).toEqual(['a', 'b']);
    expect(filterTasks(tasks, { query: 'auth', priority: 'all' }).map((t) => t.id)).toEqual(['a']);
  });
  it('combines query and priority', () => {
    expect(filterTasks(tasks, { query: 'login', priority: 'low' }).map((t) => t.id)).toEqual(['b']);
    expect(filterTasks(tasks, { query: '', priority: 'all' })).toHaveLength(2);
  });
});
