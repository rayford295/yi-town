// Our Album, talking to the Worker (worker/src/photos/). Every call carries the album key, which
// lives on this device after one pairing link (/photos#key=…). Pictures are fetched with the key
// and shown as blob: URLs, so no photo ever has a public address.
import { safeStorage } from '../../core/storage';
import type { Photo, Upload } from './core';

export const API = (import.meta.env?.VITE_PHOTOS_URL as string | undefined) ?? 'https://photos.jingyifan.love';
const KEY = 'yi.photos.key';
const store = safeStorage();

export const getKey = (): string => store.getItem(KEY) ?? '';
export const setKey = (k: string): void => { store.setItem(KEY, k.trim()); };
export const forgetKey = (): void => { store.setItem(KEY, ''); };

/** A key in the address (#key=…) is taken onto the device and wiped from the address bar. */
export function takeKeyFromHash(): boolean {
  const m = location.hash.match(/[#&]key=([A-Za-z0-9_-]{16,})/);
  if (!m) return false;
  setKey(m[1]);
  history.replaceState(null, '', location.pathname + location.search);
  return true;
}

export type Fail = 'key' | 'network' | 'too-big' | 'bad' | 'ai' | 'server' | 'missing';
export type Result<T> = ({ ok: true } & T) | { ok: false; reason: Fail };
const FAILS: readonly Fail[] = ['key', 'network', 'too-big', 'bad', 'ai', 'server', 'missing'];

async function call<T>(path: string, init: RequestInit = {}, timeout = 60_000): Promise<Result<T>> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), timeout);
  try {
    let res: Response;
    try {
      res = await fetch(`${API}${path}`, { ...init, signal: stop.signal, headers: { ...init.headers, Authorization: `Bearer ${getKey()}` } });
    } catch { return { ok: false, reason: 'network' }; }
    try {
      const body = (await res.json()) as { ok?: boolean; reason?: string } & T;
      if (res.ok && body.ok) return body as { ok: true } & T;
      return { ok: false, reason: FAILS.find((f) => f === body.reason) ?? 'server' };
    } catch { return { ok: false, reason: 'server' }; }
  } finally { clearTimeout(timer); }
}

export const listPhotos = () => call<{ photos: Photo[] }>('/photos');
export const describeAgain = (id: string) => call<{ photo: Photo }>(`/photos/${id}/describe`, { method: 'POST' });
export const deletePhoto = (id: string) => call<object>(`/photos/${id}`, { method: 'DELETE' });
export const patchPhoto = (id: string, body: Partial<Pick<Photo, 'takenAt' | 'captionZh' | 'captionEn' | 'tags'>>) =>
  call<{ photo: Photo }>(`/photos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export function uploadPhoto(meta: Upload, full: Blob, thumb: Blob) {
  const form = new FormData();
  form.set('meta', JSON.stringify(meta));
  form.set('full', full, `${meta.id}.jpg`);
  form.set('thumb', thumb, `${meta.id}-t.jpg`);
  // Reading the picture takes the model a few seconds; a slow phone link adds more.
  return call<{ photo: Photo; duplicate?: boolean }>('/photos', { method: 'POST', body: form }, 3 * 60_000);
}

// Pictures, kept as blob: URLs for as long as the tab is open, so the grid, the map and the
// viewer share one download each. At most a few at once, so the grid fills top first.
const urls = new Map<string, Promise<string | null>>();
let running = 0;
const queue: (() => void)[] = [];
const slot = () => new Promise<void>((go) => { if (running < 6) { running++; go(); } else queue.push(() => { running++; go(); }); });
const free = () => { running--; queue.shift()?.(); };

export function imageUrl(id: string, size: 'thumb' | 'full'): Promise<string | null> {
  const k = `${size}/${id}`;
  let p = urls.get(k);
  if (!p) {
    p = (async () => {
      await slot();
      try {
        const res = await fetch(`${API}/photos/${id}/${size}`, { headers: { Authorization: `Bearer ${getKey()}` } });
        return res.ok ? URL.createObjectURL(await res.blob()) : null;
      } catch { return null; }
      finally { free(); }
    })();
    p.then((u) => { if (!u) urls.delete(k); });   // a failed picture is tried again next time
    urls.set(k, p);
  }
  return p;
}
/** Forget a deleted photo's pictures. */
export function dropImages(id: string): void {
  for (const size of ['thumb', 'full']) {
    const k = `${size}/${id}`;
    void urls.get(k)?.then((u) => { if (u) URL.revokeObjectURL(u); });
    urls.delete(k);
  }
}
