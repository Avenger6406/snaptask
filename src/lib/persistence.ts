import type { Edge, Viewport } from '@xyflow/react';
import type { AppNode, Priority, TaskStatus, Theme } from '../types';

export const SCHEMA_VERSION = 1;
export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export interface Workspace {
  version: typeof SCHEMA_VERSION;
  nodes: AppNode[];
  edges: Edge[];
  theme: Theme;
  viewport: Viewport;
  /** task id -> the reminder value that has already been announced */
  firedReminders: Record<string, string>;
}

type Persistable = Pick<Workspace, 'nodes' | 'edges' | 'theme' | 'viewport' | 'firedReminders'>;

/** Strips runtime-only fields (selection, measurements, drag flags). */
export function serializeWorkspace(s: Persistable): Workspace {
  return {
    version: SCHEMA_VERSION,
    nodes: s.nodes.map((n) => ({ id: n.id, type: n.type, position: { x: n.position.x, y: n.position.y }, data: n.data }) as AppNode),
    edges: s.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null })),
    theme: s.theme,
    viewport: s.viewport,
    firedReminders: s.firedReminders,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const dateStr = (v: unknown): string | null => (typeof v === 'string' && v !== '' && !Number.isNaN(Date.parse(v)) ? v : null);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.find((a) => a === v) ?? fallback;

function parseNode(raw: unknown): AppNode | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id === '' || !isRecord(raw.position) || !isRecord(raw.data)) return null;
  const x = num(raw.position.x);
  const y = num(raw.position.y);
  if (x === null || y === null) return null;
  const base = { id: raw.id, position: { x, y } };
  const d = raw.data;
  switch (raw.type) {
    case 'screenshot':
      return { ...base, type: 'screenshot', data: { title: str(d.title, 'Screenshot'), imageId: typeof d.imageId === 'string' ? d.imageId : null } };
    case 'note':
      return { ...base, type: 'note', data: { title: str(d.title, 'Note'), text: str(d.text) } };
    case 'task':
      return {
        ...base, type: 'task',
        data: {
          title: str(d.title, 'Task'),
          description: str(d.description),
          status: oneOf<TaskStatus>(d.status, ['todo', 'in_progress', 'done'], 'todo'),
          priority: oneOf<Priority>(d.priority, ['low', 'medium', 'high'], 'medium'),
          deadline: dateStr(d.deadline),
          reminder: dateStr(d.reminder),
          tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === 'string') : [],
        },
      };
    default:
      return null;
  }
}

/** Validates untrusted stored data. Returns null when it is unusable as a whole; drops individual bad items. */
export function parseWorkspace(raw: unknown): { workspace: Workspace; dropped: number } | null {
  if (!isRecord(raw) || raw.version !== SCHEMA_VERSION || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return null;

  const seen = new Set<string>();
  const nodes: AppNode[] = [];
  let dropped = 0;
  for (const r of raw.nodes) {
    const n = parseNode(r);
    if (n && !seen.has(n.id)) { seen.add(n.id); nodes.push(n); } else dropped++;
  }

  const edgeIds = new Set<string>();
  const edges: Edge[] = [];
  for (const r of raw.edges) {
    if (
      isRecord(r) && typeof r.id === 'string' && typeof r.source === 'string' && typeof r.target === 'string' &&
      r.source !== r.target && seen.has(r.source) && seen.has(r.target) && !edgeIds.has(r.id)
    ) {
      edgeIds.add(r.id);
      edges.push({
        id: r.id, source: r.source, target: r.target,
        sourceHandle: typeof r.sourceHandle === 'string' ? r.sourceHandle : null,
        targetHandle: typeof r.targetHandle === 'string' ? r.targetHandle : null,
      });
    } else dropped++;
  }

  const vp = isRecord(raw.viewport) ? raw.viewport : {};
  const zoom = num(vp.zoom);
  const viewport: Viewport = zoom && zoom > 0 ? { x: num(vp.x) ?? 0, y: num(vp.y) ?? 0, zoom } : DEFAULT_VIEWPORT;

  const firedReminders: Record<string, string> = {};
  if (isRecord(raw.firedReminders)) {
    for (const [k, v] of Object.entries(raw.firedReminders)) if (typeof v === 'string') firedReminders[k] = v;
  }

  return { workspace: { version: SCHEMA_VERSION, nodes, edges, theme: raw.theme === 'light' ? 'light' : 'dark', viewport, firedReminders }, dropped };
}
