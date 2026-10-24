/** Minimal promise wrapper around IndexedDB: a `kv` store for the workspace and an `images` store for screenshot bytes. */
const DB_NAME = 'snaptask';
const DB_VERSION = 1;
type StoreName = 'kv' | 'images';

export interface StoredImage { type: string; data: ArrayBuffer }

let dbPromise: Promise<IDBDatabase> | null = null;

export const dbAvailable = (): boolean => typeof indexedDB !== 'undefined';

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv');
      req.result.createObjectStore('images');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error ?? new Error('IndexedDB could not be opened')); };
    req.onblocked = () => { dbPromise = null; reject(new Error('IndexedDB is blocked by another tab')); };
  });
  return dbPromise;
}

async function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error ?? req.error ?? new Error('IndexedDB error'));
    t.onabort = () => reject(t.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export const kvGet = (key: string): Promise<unknown> => run<unknown>('kv', 'readonly', (s) => s.get(key));
export const kvKeys = async (): Promise<string[]> =>
  (await run<IDBValidKey[]>('kv', 'readonly', (s) => s.getAllKeys())).filter((k): k is string => typeof k === 'string');
export const kvSet = (key: string, value: unknown): Promise<IDBValidKey> => run('kv', 'readwrite', (s) => s.put(value, key));
export const imagePut = (id: string, img: StoredImage): Promise<IDBValidKey> => run('images', 'readwrite', (s) => s.put(img, id));
export const imageGet = (id: string): Promise<StoredImage | undefined> => run<StoredImage | undefined>('images', 'readonly', (s) => s.get(id));
export const imageDelete = (id: string): Promise<undefined> => run<undefined>('images', 'readwrite', (s) => s.delete(id));
export const imageKeys = async (): Promise<string[]> =>
  (await run<IDBValidKey[]>('images', 'readonly', (s) => s.getAllKeys())).filter((k): k is string => typeof k === 'string');
