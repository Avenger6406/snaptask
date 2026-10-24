import { dbAvailable, imageDelete, imageGet, imageKeys, imagePut } from './db';

/** Object URLs by image id. Bytes live in IndexedDB; node data only ever holds the id. */
const urls = new Map<string, string>();

export interface SavedImage { id: string; persisted: boolean }

export async function saveImage(file: Blob): Promise<SavedImage> {
  const id = crypto.randomUUID();
  urls.set(id, URL.createObjectURL(file)); // usable immediately, even if the write below fails
  if (!dbAvailable()) return { id, persisted: false };
  try {
    await imagePut(id, { type: file.type || 'image/png', data: await file.arrayBuffer() });
    return { id, persisted: true };
  } catch {
    return { id, persisted: false };
  }
}

/** Resolves to null when the image no longer exists in storage. */
export async function loadImageUrl(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return cached;
  try {
    const rec = await imageGet(id);
    if (!rec) return null;
    const url = URL.createObjectURL(new Blob([rec.data], { type: rec.type }));
    urls.set(id, url);
    return url;
  } catch {
    return null;
  }
}

/** Removes stored images no node references. Call only after a successful workspace load. */
export async function pruneImages(referenced: ReadonlySet<string>): Promise<void> {
  try {
    for (const key of await imageKeys()) {
      if (!referenced.has(key)) await imageDelete(key);
    }
  } catch {
    /* pruning is housekeeping; a failure must never affect the user's data */
  }
}
