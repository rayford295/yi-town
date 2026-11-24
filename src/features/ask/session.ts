// Ask Yifan, the page's state with no DOM: the draft, the files still being prepared, the send on
// its way and the history. It lives outside the page on purpose. The language button redraws the
// whole page and she may walk away mid-send; the send still has to finish, be written down, and
// tell whichever page is on screen by then.
import { check, loadHistory, saveHistory, type Entry, type Outcome, type Reason } from './core';
import type { StoreLike } from '../../core/storage';

export type Pending = { text: string; files: { name: string; size: number }[] };
export type Deps = {
  store: StoreLike;
  send: (text: string, files: File[]) => Promise<Outcome>;
  shrink: (file: File) => Promise<File>;
};
/** What "send again" did: it is on its way; her files are needed first; or another draft is in the composer. */
export type Retry = 'sending' | 'attach' | 'held' | 'none';

export type Session = {
  readonly draft: { readonly text: string; readonly files: readonly File[] };
  readonly history: readonly Entry[];
  /** Files picked but not attached yet (large photos are being scaled down). */
  readonly adding: number;
  /** The send that is out, or null. */
  readonly pending: Pending | null;
  /** Why the draft cannot go, or null. */
  readonly note: Reason | null;
  /** True while nothing may be sent: files are being prepared or a send is out. */
  readonly busy: boolean;
  /** Whether the composer holds this failed entry's draft, so the next send is its retry. */
  holds(id: string): boolean;
  setText(text: string): void;
  addFiles(list: readonly File[], pasted?: boolean): Promise<void>;
  removeFile(index: number): void;
  submit(): Promise<void>;
  retry(id: string): Retry;
  /** Called after every change; returns the way to stop listening. */
  subscribe(fn: () => void): () => void;
};

const two = (n: number): string => String(n).padStart(2, '0');

export function createSession({ store, send, shrink }: Deps): Session {
  const draft: { text: string; files: File[] } = { text: '', files: [] };
  let history = loadHistory(store);
  let adding = 0;
  let pending: Pending | null = null;
  let note: Reason | null = null;
  let retrying: string | null = null;   // the failed entry whose draft the composer holds
  let serial = 0;
  const listeners = new Set<() => void>();
  const emit = () => { for (const fn of [...listeners]) fn(); };
  const letGoIfEmpty = () => { if (!draft.text.trim() && !draft.files.length) retrying = null; };

  async function submit(): Promise<void> {
    if (pending || adding) return;
    const text = draft.text.trim();
    const files = [...draft.files];
    note = check(text, files);
    if (note) { emit(); return; }
    const retryOf = retrying;
    pending = { text, files: files.map((f) => ({ name: f.name, size: f.size })) };
    // Only the entry this send retries gives way to it. The store keeps that entry until the
    // outcome is known, so closing the page now loses nothing.
    history = history.filter((e) => e.id !== retryOf);
    emit();
    const result = await send(text, files);
    const entry: Entry = {
      id: `${Date.now()}-${serial++}`, at: new Date().toISOString(), text, files: pending.files,
      state: result.ok ? 'sent' : 'failed', ...(result.ok ? {} : { reason: result.reason }),
    };
    history.push(entry);
    saveHistory(store, history);
    pending = null;
    if (result.ok) {
      retrying = null;
      // Clear what went, and only that: she may have typed or attached more in the meantime.
      if (draft.text.trim() === text) draft.text = '';
      draft.files = draft.files.filter((f) => !files.includes(f));
    } else retrying = entry.id;
    emit();
  }

  return {
    get draft() { return draft; },
    get history() { return history; },
    get adding() { return adding; },
    get pending() { return pending; },
    get note() { return note; },
    get busy() { return adding > 0 || pending !== null; },
    holds: (id) => retrying === id,
    setText(text) {
      draft.text = text;
      letGoIfEmpty();
      if (note) { note = null; emit(); }
    },
    async addFiles(list, pasted = false) {
      if (!list.length) return;
      adding += list.length;
      note = null;
      emit();
      const now = new Date();
      for (const raw of list) {
        // A pasted screenshot arrives as "image.png"; a name with the time tells them apart.
        const named = pasted && /^image\.\w+$/.test(raw.name)
          ? new File([raw], `截图-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}-${++serial}.png`, { type: raw.type })
          : raw;
        let ready = named;
        try { ready = await shrink(named); } catch { /* attached as it is */ }
        draft.files.push(ready);   // only once it is ready: a send never goes out with a file half prepared
        adding--;
        emit();
      }
    },
    removeFile(index) {
      draft.files.splice(index, 1);
      note = null;
      letGoIfEmpty();
      emit();
    },
    submit,
    retry(id) {
      const e = history.find((x) => x.id === id && x.state === 'failed');
      if (!e || pending || adding) return 'none';
      if (retrying !== id) {
        // After a reload the composer no longer holds this draft: its text comes back, its files cannot.
        if (draft.text.trim() && draft.text.trim() !== e.text) return 'held';
        draft.text = e.text;
        retrying = id;
        if (e.files.length && !draft.files.length) { emit(); return 'attach'; }
      }
      void submit();
      return 'sending';
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
  };
}

/** Whether this keydown in the composer sends. `coarse`: a phone, where Enter breaks the line. */
export function sendsOnKey(
  e: { key: string; shiftKey: boolean; isComposing: boolean; keyCode: number }, coarse: boolean,
): boolean {
  if (e.key !== 'Enter' || e.shiftKey || coarse) return false;
  // Enter that confirms a pinyin candidate is never a send. Safari on macOS fires that keydown
  // after the composition has ended, so isComposing is false there and keyCode 229 is the only sign.
  return !e.isComposing && e.keyCode !== 229;
}

/** Whether a paste is taken as files. A paste from Word or Excel carries its text and a picture
 *  of that text; she means the text, so the browser is left to paste it. */
export function takesPaste(types: readonly string[], fileCount: number): boolean {
  return fileCount > 0 && !types.includes('text/plain');
}
