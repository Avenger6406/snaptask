import { create } from 'zustand';
import type { Viewport } from '@xyflow/react';
import { DEFAULT_VIEWPORT, type Workspace } from '../lib/persistence';
import {
  addEdge, applyEdgeChanges, applyNodeChanges, reconnectEdge,
  type Connection, type Edge, type EdgeChange, type NodeChange, type XYPosition,
} from '@xyflow/react';
import type { AppNode, NewNodeKind, NoteData, ScreenshotData, TaskData, Theme, ViewId } from '../types';

const NODE_GAP_X = 380;
const NODE_GAP_Y = 170;
const HISTORY_LIMIT = 100;
/** Rapid edits to the same field collapse into one undo step. */
const COALESCE_MS = 1000;
const TEXT_FIELDS: ReadonlySet<string> = new Set(['title', 'description', 'text', 'tags', 'deadline', 'reminder']);

const newId = (): string => crypto.randomUUID();

export interface Snapshot { nodes: AppNode[]; edges: Edge[]; label: string }
export type ConnectClickResult = 'picked' | 'cancelled' | 'connected' | 'duplicate';

function makeNode(kind: NewNodeKind, position: XYPosition): AppNode {
  if (kind === 'note') {
    return { id: newId(), type: 'note', position, selected: true, data: { title: 'Note', text: '' } };
  }
  return {
    id: newId(), type: 'task', position, selected: true,
    data: { title: 'New task', description: '', status: 'todo', priority: 'medium', deadline: null, reminder: null, tags: [] },
  };
}

const deselect = (nodes: AppNode[]): AppNode[] => nodes.map((n) => (n.selected ? { ...n, selected: false } : n));

function areLinked(edges: Edge[], a: string, b: string): boolean {
  return edges.some((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
}

/** Free-text style edits to one node field coalesce; discrete changes (status, priority) do not. */
function editKey(id: string, patch: object): string | undefined {
  const keys = Object.keys(patch);
  return keys.length > 0 && keys.every((k) => TEXT_FIELDS.has(k)) ? `${id}:${keys.join(',')}` : undefined;
}

interface HistoryState {
  past: Snapshot[];
  future: Snapshot[];
  lastKey: string | null;
  lastAt: number;
  dragBase: Snapshot | null;
}

interface AppState extends HistoryState {
  nodes: AppNode[];
  edges: Edge[];
  theme: Theme;
  view: ViewId;
  connectMode: boolean;
  connectFrom: string | null;
  viewport: Viewport;
  /** task id -> reminder value already announced (kept outside nodes so undo can't re-trigger it) */
  firedReminders: Record<string, string>;
  previewNodeId: string | null;

  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  /** Returns false when the connection was rejected (self-loop or duplicate). */
  onConnect: (c: Connection) => boolean;
  onReconnect: (oldEdge: Edge, c: Connection) => void;
  isValidConnection: (c: Connection | Edge) => boolean;

  addNode: (kind: NewNodeKind, position: XYPosition) => string;
  addScreenshot: (imageId: string, center: XYPosition, title?: string) => string;
  addConnected: (sourceId: string, kind: NewNodeKind) => void;
  updateScreenshot: (id: string, patch: Partial<ScreenshotData>) => void;
  updateNote: (id: string, patch: Partial<NoteData>) => void;
  updateTask: (id: string, patch: Partial<TaskData>) => void;
  /** Deletes selected nodes and edges. Returns what was removed. */
  deleteSelected: () => { nodes: number; edges: number };
  deleteNode: (id: string) => void;
  selectOnly: (id: string | null) => void;

  beginDrag: () => void;
  endDrag: () => void;
  /** Return the label of the step that was undone/redone, or null when there is nothing to do. */
  undo: () => string | null;
  redo: () => string | null;

  hydrate: (ws: Workspace) => void;
  setViewport: (v: Viewport) => void;
  markReminders: (pairs: ReadonlyArray<readonly [string, string]>) => void;
  setPreview: (nodeId: string | null) => void;
  setView: (v: ViewId) => void;
  toggleTheme: () => void;
  setConnectMode: (on: boolean) => void;
  handleConnectClick: (nodeId: string) => ConnectClickResult;
}

/** Patch that records the current graph as an undo step and clears redo. */
function withHistory(s: AppState, label: string, key?: string): Partial<HistoryState> {
  const now = Date.now();
  if (key && s.lastKey === key && now - s.lastAt < COALESCE_MS && s.past.length > 0) {
    return { lastAt: now, future: [] };
  }
  const snap: Snapshot = { nodes: s.nodes, edges: s.edges, label };
  return { past: [...s.past, snap].slice(-HISTORY_LIMIT), future: [], lastKey: key ?? null, lastAt: now };
}

const restore = (snap: Snapshot, connectFrom: string | null) => ({
  nodes: snap.nodes.map((n) => ({ ...n, selected: false, dragging: false })),
  edges: snap.edges.map((e) => ({ ...e, selected: false })),
  connectFrom: connectFrom && snap.nodes.some((n) => n.id === connectFrom) ? connectFrom : null,
  lastKey: null,
});

export const useAppStore = create<AppState>((set, get) => ({
  nodes: [],
  edges: [],
  theme: 'dark',
  view: 'canvas',
  connectMode: false,
  connectFrom: null,
  viewport: DEFAULT_VIEWPORT,
  firedReminders: {},
  previewNodeId: null,
  past: [],
  future: [],
  lastKey: null,
  lastAt: 0,
  dragBase: null,

  onNodesChange: (changes) =>
    set((s) => ({
      ...(changes.some((c) => c.type === 'remove') ? withHistory(s, 'Delete') : {}),
      nodes: applyNodeChanges(changes, s.nodes),
    })),
  onEdgesChange: (changes) =>
    set((s) => ({
      ...(changes.some((c) => c.type === 'remove') ? withHistory(s, 'Delete connection') : {}),
      edges: applyEdgeChanges(changes, s.edges),
    })),

  isValidConnection: (c) => c.source !== c.target && !!c.source && !!c.target,

  onConnect: (c) => {
    const s = get();
    if (!s.isValidConnection(c) || areLinked(s.edges, c.source, c.target)) return false;
    set((st) => ({ ...withHistory(st, 'Connect'), edges: addEdge(c, st.edges) }));
    return true;
  },
  onReconnect: (oldEdge, c) => {
    if (!get().isValidConnection(c)) return;
    set((s) => ({ ...withHistory(s, 'Reconnect'), edges: reconnectEdge(oldEdge, c, s.edges) }));
  },

  addNode: (kind, position) => {
    const node = makeNode(kind, position);
    set((s) => ({ ...withHistory(s, kind === 'note' ? 'Add note' : 'Add task'), nodes: [...deselect(s.nodes), node] }));
    return node.id;
  },

  addScreenshot: (imageId, center, title = 'Screenshot') => {
    const node: AppNode = {
      id: newId(), type: 'screenshot', selected: true,
      position: { x: center.x - 170, y: center.y - 130 },
      data: { title, imageId },
    };
    set((s) => ({ ...withHistory(s, 'Add screenshot'), nodes: [...deselect(s.nodes), node] }));
    return node.id;
  },

  addConnected: (sourceId, kind) => {
    const { nodes, edges } = get();
    const source = nodes.find((n) => n.id === sourceId);
    if (!source) return;
    const branches = edges.filter((e) => e.source === sourceId).length;
    const node = makeNode(kind, {
      x: source.position.x + NODE_GAP_X,
      y: source.position.y + branches * NODE_GAP_Y,
    });
    const edge: Edge = { id: `e-${sourceId}-${node.id}`, source: sourceId, target: node.id, sourceHandle: 'r', targetHandle: 'l' };
    set((s) => ({
      ...withHistory(s, kind === 'note' ? 'Add connected note' : 'Add connected task'),
      nodes: [...deselect(s.nodes), node],
      edges: [...s.edges, edge],
    }));
  },

  updateScreenshot: (id, patch) =>
    set((s) => ({
      ...withHistory(s, 'Edit screenshot', editKey(id, patch)),
      nodes: s.nodes.map((n) => (n.id === id && n.type === 'screenshot' ? { ...n, data: { ...n.data, ...patch } } : n)),
    })),
  updateNote: (id, patch) =>
    set((s) => ({
      ...withHistory(s, 'Edit note', editKey(id, patch)),
      nodes: s.nodes.map((n) => (n.id === id && n.type === 'note' ? { ...n, data: { ...n.data, ...patch } } : n)),
    })),
  updateTask: (id, patch) =>
    set((s) => ({
      ...withHistory(s, 'Edit task', editKey(id, patch)),
      nodes: s.nodes.map((n) => (n.id === id && n.type === 'task' ? { ...n, data: { ...n.data, ...patch } } : n)),
    })),

  deleteSelected: () => {
    const s = get();
    const gone = new Set(s.nodes.filter((n) => n.selected).map((n) => n.id));
    const edgeGone = (e: Edge) => !!e.selected || gone.has(e.source) || gone.has(e.target);
    const edgeCount = s.edges.filter((e) => edgeGone(e) && !gone.has(e.source) && !gone.has(e.target)).length;
    if (gone.size === 0 && edgeCount === 0) return { nodes: 0, edges: 0 };
    set((st) => ({
      ...withHistory(st, gone.size > 0 ? (gone.size > 1 ? 'Delete nodes' : 'Delete node') : 'Delete connection'),
      nodes: st.nodes.filter((n) => !gone.has(n.id)),
      edges: st.edges.filter((e) => !edgeGone(e)),
      connectFrom: st.connectFrom && gone.has(st.connectFrom) ? null : st.connectFrom,
    }));
    return { nodes: gone.size, edges: edgeCount };
  },

  deleteNode: (id) =>
    set((s) => ({
      ...withHistory(s, 'Delete node'),
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      connectFrom: s.connectFrom === id ? null : s.connectFrom,
    })),

  selectOnly: (id) => set((s) => ({ nodes: s.nodes.map((n) => ({ ...n, selected: n.id === id })) })),

  // One undo step per drag gesture, and none at all if nothing actually moved.
  beginDrag: () => set((s) => ({ dragBase: { nodes: s.nodes, edges: s.edges, label: 'Move' } })),
  endDrag: () => {
    const { dragBase, nodes } = get();
    if (!dragBase) return;
    const before = new Map(dragBase.nodes.map((n) => [n.id, n.position]));
    const moved = nodes.some((n) => {
      const p = before.get(n.id);
      return !!p && (p.x !== n.position.x || p.y !== n.position.y);
    });
    set((s) => ({
      dragBase: null,
      ...(moved ? { past: [...s.past, dragBase].slice(-HISTORY_LIMIT), future: [], lastKey: null } : {}),
    }));
  },

  undo: () => {
    const s = get();
    const prev = s.past[s.past.length - 1];
    if (!prev) return null;
    set({
      past: s.past.slice(0, -1),
      future: [...s.future, { nodes: s.nodes, edges: s.edges, label: prev.label }],
      ...restore(prev, s.connectFrom),
    });
    return prev.label;
  },
  redo: () => {
    const s = get();
    const next = s.future[s.future.length - 1];
    if (!next) return null;
    set({
      future: s.future.slice(0, -1),
      past: [...s.past, { nodes: s.nodes, edges: s.edges, label: next.label }],
      ...restore(next, s.connectFrom),
    });
    return next.label;
  },

  hydrate: (ws) =>
    set({
      nodes: ws.nodes, edges: ws.edges, theme: ws.theme, viewport: ws.viewport, firedReminders: ws.firedReminders,
      past: [], future: [], lastKey: null, dragBase: null, connectFrom: null, connectMode: false, previewNodeId: null,
    }),
  setViewport: (viewport) => set({ viewport }),
  markReminders: (pairs) => set((s) => ({ firedReminders: { ...s.firedReminders, ...Object.fromEntries(pairs) } })),
  setPreview: (previewNodeId) => set({ previewNodeId }),
  setView: (view) => set({ view }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setConnectMode: (on) => set({ connectMode: on, connectFrom: null }),

  handleConnectClick: (nodeId) => {
    const s = get();
    if (!s.connectFrom) {
      set({ connectFrom: nodeId });
      return 'picked';
    }
    if (s.connectFrom === nodeId) {
      set({ connectFrom: null });
      return 'cancelled';
    }
    const duplicate = areLinked(s.edges, s.connectFrom, nodeId);
    const from = s.connectFrom;
    const edge: Edge = { id: `e-${from}-${nodeId}`, source: from, target: nodeId, sourceHandle: 'r', targetHandle: 'l' };
    set((st) => ({
      ...(duplicate ? {} : withHistory(st, 'Connect')),
      edges: duplicate ? st.edges : [...st.edges, edge],
      connectFrom: null,
      connectMode: false,
    }));
    return duplicate ? 'duplicate' : 'connected';
  },
}));
