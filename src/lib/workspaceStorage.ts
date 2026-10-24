import { create } from 'zustand';
import { dbAvailable, kvGet, kvSet } from './db';
import { pruneImages } from './imageStore';
import { parseWorkspace, serializeWorkspace, type Workspace } from './persistence';
import { useAppStore } from '../store/useAppStore';
import { toast } from '../store/useToastStore';

const WORKSPACE_KEY = 'workspace';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unavailable';
export const useSaveStatus = create<{ status: SaveStatus }>(() => ({ status: 'idle' }));
const setStatus = (status: SaveStatus): void => useSaveStatus.setState({ status });

export type LoadResult =
  | { kind: 'unavailable' }
  | { kind: 'empty' }
  | { kind: 'corrupt' }
  | { kind: 'loaded'; workspace: Workspace; dropped: number };

export async function loadWorkspace(): Promise<LoadResult> {
  if (!dbAvailable()) return { kind: 'unavailable' };
  let raw: unknown;
  try {
    raw = await kvGet(WORKSPACE_KEY);
  } catch {
    return { kind: 'unavailable' }; // unreadable store: never autosave over what we couldn't read
  }
  if (raw === undefined) return { kind: 'empty' };
  const parsed = parseWorkspace(raw);
  if (parsed) return { kind: 'loaded', ...parsed };
  try {
    await kvSet(`workspace-backup-${Date.now()}`, raw); // keep the unreadable data instead of overwriting it
  } catch {
    /* nothing more we can do */
  }
  return { kind: 'corrupt' };
}

export const saveWorkspace = (ws: Workspace): Promise<IDBValidKey> => kvSet(WORKSPACE_KEY, ws);

const SAVE_DELAY_MS = 500;
const RETRY_DELAY_MS = 5000;
let started = false;

type AppSnapshot = ReturnType<typeof useAppStore.getState>;

/** Ignores selection/measurement churn: only content changes count. */
function graphChanged(a: AppSnapshot, b: AppSnapshot): boolean {
  if (a.nodes !== b.nodes) {
    if (a.nodes.length !== b.nodes.length) return true;
    if (a.nodes.some((n, i) => n.id !== b.nodes[i].id || n.data !== b.nodes[i].data || n.position !== b.nodes[i].position)) return true;
  }
  if (a.edges !== b.edges) {
    if (a.edges.length !== b.edges.length) return true;
    if (a.edges.some((e, i) => {
      const o = b.edges[i];
      return e.id !== o.id || e.source !== o.source || e.target !== o.target || e.sourceHandle !== o.sourceHandle || e.targetHandle !== o.targetHandle;
    })) return true;
  }
  return a.theme !== b.theme || a.viewport !== b.viewport || a.firedReminders !== b.firedReminders;
}

export function startAutosave(): void {
  if (started) return;
  started = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let errorShown = false;

  const flush = async (): Promise<void> => {
    if (timer) { clearTimeout(timer); timer = undefined; }
    if (!dirty) return;
    dirty = false;
    try {
      await saveWorkspace(serializeWorkspace(useAppStore.getState()));
      errorShown = false;
      if (!dirty) setStatus('saved');
    } catch {
      dirty = true;
      setStatus('error');
      if (!errorShown) {
        errorShown = true;
        toast.error('Couldn’t save your workspace. Your changes are still here — keep this tab open and check browser storage space.');
      }
      timer = setTimeout(() => void flush(), RETRY_DELAY_MS);
    }
  };

  useAppStore.subscribe((s, prev) => {
    if (!graphChanged(prev, s)) return;
    dirty = true;
    setStatus('saving');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), SAVE_DELAY_MS);
  });
  window.addEventListener('pagehide', () => void flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });
}

let booted: Promise<void> | null = null;

/** Loads the saved workspace into the store and starts autosave. Safe to call more than once. */
export function bootWorkspace(): Promise<void> {
  booted ??= (async () => {
    const result = await loadWorkspace();
    if (result.kind === 'unavailable') {
      setStatus('unavailable');
      toast.error('Browser storage isn’t available, so this workspace won’t be saved. Keep this tab open.');
      return;
    }
    if (result.kind === 'loaded') {
      useAppStore.getState().hydrate(result.workspace);
      const ids = new Set<string>();
      for (const n of result.workspace.nodes) if (n.type === 'screenshot' && n.data.imageId) ids.add(n.data.imageId);
      void pruneImages(ids);
      if (result.dropped > 0) toast.info(`Restored your workspace. ${result.dropped} damaged item${result.dropped === 1 ? ' was' : 's were'} skipped.`);
    } else if (result.kind === 'corrupt') {
      toast.error('Your saved workspace couldn’t be read, so SnapTask started empty. The old data was kept in browser storage.');
    }
    setStatus('saved');
    startAutosave();
  })();
  return booted;
}
