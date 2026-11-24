// Ask Yifan, the part with no DOM: what one send may carry, the history kept on this device, and
// the request to the Worker (worker/). The Worker imports the caps from here, so the page and
// the server can never disagree about them.
import { config } from '../../core/config';
import type { StoreLike } from '../../core/storage';

/** One email carries 25 MiB after encoding; 18 MB of files leaves room for the base64 growth. */
export const MAX_BYTES = 18 * 1024 * 1024;
export const MAX_FILES = 10;
export const HISTORY_CAP = 50;

export type Reason = 'empty' | 'too-big' | 'too-many' | 'network' | 'server';
const REASONS: readonly Reason[] = ['empty', 'too-big', 'too-many', 'network', 'server'];

/** One thing she sent, as this device remembers it. File contents are never kept. */
export type Entry = {
  id: string; at: string; text: string;
  files: { name: string; size: number }[];
  state: 'sent' | 'failed'; reason?: Reason;
};
export type Meta = { player: string | null; lang: 'zh' | 'en' };
export type Outcome = { ok: true } | { ok: false; reason: Reason };

export const totalBytes = (files: { size: number }[]): number => files.reduce((n, f) => n + f.size, 0);

/** Why this draft cannot go, or null when it can. */
export function check(text: string, files: { size: number }[]): Reason | null {
  if (!text.trim() && !files.length) return 'empty';
  if (files.length > MAX_FILES) return 'too-many';
  if (totalBytes(files) > MAX_BYTES) return 'too-big';
  return null;
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const KEY = 'yi.ask.history';

export function loadHistory(store: StoreLike): Entry[] {
  try {
    const list: unknown = JSON.parse(store.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? (list as Entry[]) : [];
  } catch { return []; }
}

/** Newest last; only the newest HISTORY_CAP are kept. */
export function saveHistory(store: StoreLike, list: Entry[]): void {
  try { store.setItem(KEY, JSON.stringify(list.slice(-HISTORY_CAP))); }
  catch { /* full or blocked: the history lasts for this visit */ }
}

export function buildForm(text: string, files: File[], meta: Meta): FormData {
  const form = new FormData();
  form.set('text', text);
  form.set('lang', meta.lang);
  if (meta.player) form.set('player', meta.player);
  for (const f of files) form.append('files', f, f.name);
  return form;
}

/** Send one request. Never throws: every failure comes back as a reason the page can word. */
export async function send(
  text: string, files: File[], meta: Meta,
  fetchFn: typeof fetch = fetch, url: string = config.ask.url,
): Promise<Outcome> {
  const bad = check(text, files);
  if (bad) return { ok: false, reason: bad };
  let res: Response;
  try { res = await fetchFn(url, { method: 'POST', body: buildForm(text, files, meta) }); }
  catch { return { ok: false, reason: 'network' }; }
  try {
    const body = (await res.json()) as { ok?: boolean; reason?: string };
    if (res.ok && body.ok === true) return { ok: true };
    const reason = REASONS.find((r) => r === body.reason);
    return { ok: false, reason: reason ?? 'server' };
  } catch { return { ok: false, reason: 'server' }; }
}
