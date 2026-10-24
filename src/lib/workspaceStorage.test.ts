import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { imageGet, kvGet, kvKeys, kvSet } from './db';
import { saveImage } from './imageStore';
import { parseWorkspace, serializeWorkspace } from './persistence';
import { loadWorkspace, saveWorkspace } from './workspaceStorage';
import { useAppStore } from '../store/useAppStore';

const s = () => useAppStore.getState();

beforeEach(() => {
  useAppStore.setState({ nodes: [], edges: [], past: [], future: [], firedReminders: {}, theme: 'dark', viewport: { x: 0, y: 0, zoom: 1 } });
});

describe('create → save → restore', () => {
  it('round-trips nodes, edges, task fields, theme, viewport and image bytes', async () => {
    const bytes = new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: 'image/png' });
    const { id: imageId, persisted } = await saveImage(bytes);
    expect(persisted).toBe(true);

    const shot = s().addScreenshot(imageId, { x: 100, y: 100 }, 'Checkout bug');
    s().addConnected(shot, 'task');
    const task = s().nodes[1];
    s().updateTask(task.id, { title: 'Fix totals', priority: 'high', deadline: '2030-01-02T09:00', reminder: '2030-01-02T08:30', tags: ['bug'] });
    s().setViewport({ x: -40, y: 25, zoom: 1.5 });
    s().toggleTheme();
    s().markReminders([[task.id, '2030-01-02T08:30']]);

    await saveWorkspace(serializeWorkspace(s()));

    // "Refresh": wipe in-memory state, then load from IndexedDB only.
    useAppStore.setState({ nodes: [], edges: [], firedReminders: {}, theme: 'dark', viewport: { x: 0, y: 0, zoom: 1 } });
    const result = await loadWorkspace();
    expect(result.kind).toBe('loaded');
    if (result.kind !== 'loaded') return;
    expect(result.dropped).toBe(0);
    s().hydrate(result.workspace);

    expect(s().nodes).toHaveLength(2);
    expect(s().edges).toHaveLength(1);
    expect(s().edges[0]).toMatchObject({ source: shot, sourceHandle: 'r', targetHandle: 'l' });
    const [n0, n1] = s().nodes;
    expect(n0.type === 'screenshot' && n0.data).toEqual({ title: 'Checkout bug', imageId });
    expect(n1.type === 'task' && n1.data).toMatchObject({ title: 'Fix totals', priority: 'high', deadline: '2030-01-02T09:00', reminder: '2030-01-02T08:30', tags: ['bug'] });
    expect(s().theme).toBe('light');
    expect(s().viewport).toEqual({ x: -40, y: 25, zoom: 1.5 });
    expect(s().firedReminders).toEqual({ [task.id]: '2030-01-02T08:30' });
    expect(s().past).toHaveLength(0); // hydrate starts with clean history

    const stored = await imageGet(imageId);
    expect(stored?.type).toBe('image/png');
    expect(Array.from(new Uint8Array(stored?.data ?? new ArrayBuffer(0)))).toEqual([137, 80, 78, 71, 1, 2, 3]);
  });

  it('never stores image bytes inside the workspace record', async () => {
    const { id } = await saveImage(new Blob([new Uint8Array(50_000)], { type: 'image/png' }));
    s().addScreenshot(id, { x: 0, y: 0 });
    await saveWorkspace(serializeWorkspace(s()));
    expect(JSON.stringify(await kvGet('workspace')).length).toBeLessThan(2000);
  });
});

describe('damaged data', () => {
  it('keeps a backup and reports corrupt data instead of overwriting it', async () => {
    await kvSet('workspace', { version: 99, nodes: 'nope' });
    const result = await loadWorkspace();
    expect(result.kind).toBe('corrupt');
    const backupKey = (await kvKeys()).find((k) => k.startsWith('workspace-backup-'));
    expect(backupKey).toBeDefined();
    expect(await kvGet(backupKey ?? '')).toEqual({ version: 99, nodes: 'nope' });
    expect(await kvGet('workspace')).toEqual({ version: 99, nodes: 'nope' }); // original untouched by load
  });

  it('drops only the bad items and repairs field values', () => {
    const parsed = parseWorkspace({
      version: 1, theme: 'weird', viewport: { x: 'a', y: 1, zoom: 0 },
      nodes: [
        { id: 'a', type: 'note', position: { x: 1, y: 2 }, data: { title: 5, text: 'hi' } },
        { id: 'a', type: 'note', position: { x: 1, y: 2 }, data: {} },
        { id: 'b', type: 'task', position: { x: 3, y: 4 }, data: { status: 'bogus', priority: 'high', deadline: 'not-a-date', tags: ['x', 7] } },
        { id: 'c', type: 'alien', position: { x: 0, y: 0 }, data: {} },
        { id: 'd', type: 'note', position: { x: NaN, y: 0 }, data: {} },
        null,
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'a', target: 'ghost' },
        { id: 'e3', source: 'a', target: 'a' },
      ],
    });
    expect(parsed).not.toBeNull();
    const { workspace, dropped } = parsed!;
    expect(workspace.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(workspace.edges.map((e) => e.id)).toEqual(['e1']);
    expect(dropped).toBe(6);
    expect(workspace.theme).toBe('dark');
    expect(workspace.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    const b = workspace.nodes[1];
    expect(b.type === 'task' && b.data).toMatchObject({ status: 'todo', priority: 'high', deadline: null, tags: ['x'] });
    expect(parseWorkspace('garbage')).toBeNull();
  });
});
