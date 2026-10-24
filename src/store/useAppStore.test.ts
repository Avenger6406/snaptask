import { beforeEach, describe, expect, it } from 'vitest';
import type { Edge, NodeChange } from '@xyflow/react';
import { useAppStore } from './useAppStore';
import type { AppNode } from '../types';

const s = () => useAppStore.getState();
const ids = () => s().nodes.map((n) => n.id);

beforeEach(() => {
  useAppStore.setState({
    nodes: [], edges: [], past: [], future: [], lastKey: null, lastAt: 0, dragBase: null,
    connectMode: false, connectFrom: null,
  });
});

function move(id: string, x: number, y: number) {
  const change: NodeChange<AppNode> = { type: 'position', id, position: { x, y }, dragging: true };
  s().onNodesChange([change]);
}

describe('create & select', () => {
  it('creates selected nodes and deselects the previous one without moving it', () => {
    const a = s().addNode('note', { x: 10, y: 20 });
    const b = s().addNode('task', { x: 300, y: 40 });
    const [na, nb] = s().nodes;
    expect(na.id).toBe(a); expect(nb.id).toBe(b);
    expect(na.selected).toBe(false); expect(nb.selected).toBe(true);
    expect(na.position).toEqual({ x: 10, y: 20 });
  });

  it('addConnected links a new node to its source and leaves others in place', () => {
    const shot = s().addScreenshot('data:image/png;base64,AA', { x: 0, y: 0 });
    const before = s().nodes[0].position;
    s().addConnected(shot, 'note');
    s().addConnected(shot, 'task');
    expect(s().edges).toHaveLength(2);
    expect(s().nodes[0].position).toEqual(before);
    const [n1, n2] = s().nodes.slice(1);
    expect(n2.position.y).toBeGreaterThan(n1.position.y); // branches fan out, not overlap
  });
});

describe('connections', () => {
  it('rejects self-loops and duplicates (either direction)', () => {
    const a = s().addNode('note', { x: 0, y: 0 });
    const b = s().addNode('note', { x: 300, y: 0 });
    expect(s().onConnect({ source: a, target: a, sourceHandle: 'r', targetHandle: 'l' })).toBe(false);
    expect(s().onConnect({ source: a, target: b, sourceHandle: 'r', targetHandle: 'l' })).toBe(true);
    expect(s().onConnect({ source: b, target: a, sourceHandle: 'l', targetHandle: 'r' })).toBe(false);
    expect(s().edges).toHaveLength(1);
  });

  it('reconnect moves an edge end and can be undone', () => {
    const a = s().addNode('note', { x: 0, y: 0 });
    const b = s().addNode('note', { x: 300, y: 0 });
    const c = s().addNode('note', { x: 600, y: 0 });
    s().onConnect({ source: a, target: b, sourceHandle: 'r', targetHandle: 'l' });
    const edge: Edge = s().edges[0];
    s().onReconnect(edge, { source: a, target: c, sourceHandle: 'r', targetHandle: 'l' });
    expect(s().edges).toHaveLength(1);
    expect(s().edges[0].target).toBe(c);
    s().undo();
    expect(s().edges[0].target).toBe(b);
  });

  it('click-to-connect: pick, connect, duplicate, cancel', () => {
    const a = s().addNode('note', { x: 0, y: 0 });
    const b = s().addNode('note', { x: 300, y: 0 });
    s().setConnectMode(true);
    expect(s().handleConnectClick(a)).toBe('picked');
    expect(s().handleConnectClick(a)).toBe('cancelled');
    s().handleConnectClick(a);
    expect(s().handleConnectClick(b)).toBe('connected');
    expect(s().connectMode).toBe(false);
    s().setConnectMode(true);
    s().handleConnectClick(b);
    expect(s().handleConnectClick(a)).toBe('duplicate');
    expect(s().edges).toHaveLength(1);
  });
});

describe('delete', () => {
  it('removes selected nodes with their edges; undo/redo restore and reapply', () => {
    const a = s().addNode('note', { x: 0, y: 0 });
    const b = s().addNode('task', { x: 300, y: 0 });
    s().onConnect({ source: a, target: b, sourceHandle: 'r', targetHandle: 'l' });
    s().selectOnly(b);
    expect(s().deleteSelected()).toEqual({ nodes: 1, edges: 0 });
    expect(ids()).toEqual([a]); expect(s().edges).toHaveLength(0);
    expect(s().undo()).toBe('Delete node');
    expect(ids()).toEqual([a, b]); expect(s().edges).toHaveLength(1);
    expect(s().redo()).toBe('Delete node');
    expect(ids()).toEqual([a]); expect(s().edges).toHaveLength(0);
  });

  it('deletes a selected edge on its own', () => {
    const a = s().addNode('note', { x: 0, y: 0 });
    const b = s().addNode('note', { x: 300, y: 0 });
    s().onConnect({ source: a, target: b, sourceHandle: 'r', targetHandle: 'l' });
    s().onEdgesChange([{ id: s().edges[0].id, type: 'select', selected: true }]);
    s().selectOnly(null);
    expect(s().deleteSelected()).toEqual({ nodes: 0, edges: 1 });
    expect(ids()).toEqual([a, b]);
    s().undo();
    expect(s().edges).toHaveLength(1);
  });

  it('does nothing and records nothing when nothing is selected', () => {
    s().addNode('note', { x: 0, y: 0 });
    s().selectOnly(null);
    const depth = s().past.length;
    expect(s().deleteSelected()).toEqual({ nodes: 0, edges: 0 });
    expect(s().past.length).toBe(depth);
  });
});

describe('move', () => {
  it('records one undo step per drag, and none when nothing moved', () => {
    const a = s().addNode('note', { x: 0, y: 0 });
    const depth = s().past.length;
    s().beginDrag(); s().endDrag();
    expect(s().past.length).toBe(depth);

    s().beginDrag();
    move(a, 50, 50); move(a, 120, 90); move(a, 200, 150);
    s().endDrag();
    expect(s().past.length).toBe(depth + 1);
    expect(s().nodes[0].position).toEqual({ x: 200, y: 150 });
    expect(s().undo()).toBe('Move');
    expect(s().nodes[0].position).toEqual({ x: 0, y: 0 });
    s().redo();
    expect(s().nodes[0].position).toEqual({ x: 200, y: 150 });
  });
});

describe('reminders & hydrate', () => {
  it('markReminders does not create undo steps', () => {
    const t = s().addNode('task', { x: 0, y: 0 });
    const depth = s().past.length;
    s().markReminders([[t, '2030-01-01T00:00']]);
    expect(s().past.length).toBe(depth);
    expect(s().firedReminders[t]).toBe('2030-01-01T00:00');
    s().undo();
    expect(s().firedReminders[t]).toBe('2030-01-01T00:00'); // undo can't re-trigger an announced reminder
  });
});

describe('history rules', () => {
  it('coalesces rapid typing into one step; discrete changes stay separate', () => {
    const n = s().addNode('note', { x: 0, y: 0 });
    const t = s().addNode('task', { x: 300, y: 0 });
    const depth = s().past.length;
    for (const text of ['h', 'he', 'hel', 'hell', 'hello']) s().updateNote(n, { text });
    expect(s().past.length).toBe(depth + 1);
    s().updateTask(t, { status: 'in_progress' });
    s().updateTask(t, { status: 'done' });
    expect(s().past.length).toBe(depth + 3);
    s().undo(); s().undo(); s().undo();
    const note = s().nodes.find((x) => x.id === n);
    expect(note?.type === 'note' && note.data.text).toBe('');
  });

  it('a new action clears redo; undo/redo on empty stacks return null', () => {
    expect(s().undo()).toBeNull(); expect(s().redo()).toBeNull();
    s().addNode('note', { x: 0, y: 0 });
    s().undo();
    expect(s().future).toHaveLength(1);
    s().addNode('task', { x: 0, y: 0 });
    expect(s().future).toHaveLength(0);
  });

  it('undo clears selection and drops a stale connect source', () => {
    const a = s().addNode('note', { x: 0, y: 0 });
    s().setConnectMode(true); s().handleConnectClick(a);
    s().undo();
    expect(s().connectFrom).toBeNull();
    s().redo();
    expect(s().nodes.every((n) => !n.selected)).toBe(true);
  });
});
