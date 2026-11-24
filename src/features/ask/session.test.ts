import { describe, expect, it } from 'vitest';
import { loadHistory, saveHistory, type Entry, type Outcome } from './core';
import { createSession, sendsOnKey, takesPaste } from './session';

const file = (name: string, body = 'x') => new File([body], name, { type: 'text/plain' });
const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
};
/** A promise the test settles by hand, to stand at the moment a send or a shrink is under way. */
function gate<T>() {
  let open!: (v: T) => void;
  const done = new Promise<T>((r) => { open = r; });
  return { done, open };
}
const failed = (id: string, files: Entry['files'] = []): Entry =>
  ({ id, at: '2026-11-23T10:00:00.000Z', text: `text of ${id}`, files, state: 'failed', reason: 'network' });

function setup(opts: { history?: Entry[] } = {}) {
  const store = memory();
  if (opts.history) saveHistory(store, opts.history);
  const sends: { text: string; files: File[]; answer: (o: Outcome) => void }[] = [];
  const shrinks: { file: File; answer: (f: File) => void }[] = [];
  let hold = false;
  const s = createSession({
    store,
    send: (text, files) => { const g = gate<Outcome>(); sends.push({ text, files, answer: g.open }); return g.done; },
    shrink: (f) => {
      if (!hold) return Promise.resolve(f);
      const g = gate<File>(); shrinks.push({ file: f, answer: g.open }); return g.done;
    },
  });
  return { s, store, sends, shrinks, holdShrink: () => { hold = true; } };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('a send that outlives the page that started it (I1)', () => {
  it('shows as pending to whoever draws the page, and tells a later subscriber when it settles', async () => {
    const { s, store, sends } = setup();
    s.setText('帮我看看');
    const going = s.submit();
    expect(s.pending).toEqual({ text: '帮我看看', files: [] });
    let calls = 0;
    s.subscribe(() => { calls++; });   // the page was redrawn while the request was out
    sends[0].answer({ ok: true });
    await going;
    expect(calls).toBeGreaterThan(0);
    expect(s.pending).toBeNull();
    expect(s.history.map((e) => e.state)).toEqual(['sent']);
    expect(loadHistory(store)).toHaveLength(1);
    expect(s.draft.text).toBe('');
  });
  it('a second submit while one is out sends nothing', async () => {
    const { s, sends } = setup();
    s.setText('a');
    void s.submit();
    void s.submit();
    expect(sends).toHaveLength(1);
  });
  it('an unsubscribed page is not called', async () => {
    const { s, sends } = setup();
    let calls = 0;
    const off = s.subscribe(() => { calls++; });
    off();
    s.setText('a');
    const going = s.submit();
    sends[0].answer({ ok: true });
    await going;
    expect(calls).toBe(0);
  });
  it('what she typed while it was on its way is still there after it lands', async () => {
    const { s, sends } = setup();
    s.setText('first');
    const going = s.submit();
    s.setText('second, typed meanwhile');
    sends[0].answer({ ok: true });
    await going;
    expect(s.draft.text).toBe('second, typed meanwhile');
  });
  it('two sends in the same millisecond get different ids', async () => {
    const { s, sends } = setup();
    s.setText('a');
    let going = s.submit(); sends[0].answer({ ok: true }); await going;
    s.setText('b');
    going = s.submit(); sends[1].answer({ ok: true }); await going;
    expect(new Set(s.history.map((e) => e.id)).size).toBe(2);
  });
});

describe('files still being shrunk (I2)', () => {
  it('counts them, refuses to send meanwhile, and attaches them when they are ready', async () => {
    const { s, sends, shrinks, holdShrink } = setup();
    holdShrink();
    s.setText('with a photo');
    const adding = s.addFiles([file('a.jpg'), file('b.jpg')]);
    expect(s.adding).toBe(2);
    expect(s.busy).toBe(true);
    void s.submit();
    expect(sends).toHaveLength(0);
    expect(s.draft.text).toBe('with a photo');
    shrinks[0].answer(file('a-small.jpg'));
    await tick();
    expect(s.adding).toBe(1);
    expect(s.draft.files.map((f) => f.name)).toEqual(['a-small.jpg']);
    shrinks[1].answer(shrinks[1].file);
    await adding;
    expect(s.adding).toBe(0);
    expect(s.draft.files.map((f) => f.name)).toEqual(['a-small.jpg', 'b.jpg']);
    void s.submit();
    expect(sends[0].files).toHaveLength(2);
  });
  it('a file added during a send stays in the draft after that send lands', async () => {
    const { s, sends } = setup();
    await s.addFiles([file('a.txt')]);
    const going = s.submit();
    await s.addFiles([file('late.txt')]);
    sends[0].answer({ ok: true });
    await going;
    expect(s.draft.files.map((f) => f.name)).toEqual(['late.txt']);
  });
  it('gives each pasted screenshot its own name', async () => {
    const { s } = setup();
    await s.addFiles([new File(['1'], 'image.png', { type: 'image/png' }), new File(['2'], 'image.png', { type: 'image/png' })], true);
    const names = s.draft.files.map((f) => f.name);
    expect(names.every((n) => /^截图-\d{6}-\d+\.png$/.test(n))).toBe(true);
    expect(new Set(names).size).toBe(2);
  });
});

describe('send again (I4)', () => {
  it('a failed send keeps the draft, and sending it again replaces the failed bubble', async () => {
    const { s, sends } = setup();
    await s.addFiles([file('a.txt')]);
    s.setText('hello');
    let going = s.submit();
    sends[0].answer({ ok: false, reason: 'network' });
    await going;
    expect(s.history.map((e) => e.state)).toEqual(['failed']);
    expect(s.draft.files).toHaveLength(1);
    expect(s.holds(s.history[0].id)).toBe(true);
    going = s.submit();   // the Send button, not "send again": the composer still holds that draft
    sends[1].answer({ ok: true });
    await going;
    expect(s.history.map((e) => e.state)).toEqual(['sent']);
  });
  it('a new send leaves other failed entries alone', async () => {
    const { s, sends } = setup({ history: [failed('old')] });
    s.setText('something new');
    const going = s.submit();
    sends[0].answer({ ok: true });
    await going;
    expect(s.history.map((e) => [e.id === 'old', e.state])).toEqual([[true, 'failed'], [false, 'sent']]);
  });
  it('after a reload, text alone goes at once', async () => {
    const { s, sends } = setup({ history: [failed('old')] });
    expect(s.retry('old')).toBe('sending');
    expect(sends[0].text).toBe('text of old');
    sends[0].answer({ ok: true });
    await tick();
    expect(s.history.map((e) => e.state)).toEqual(['sent']);
  });
  it('after a reload, an entry with files brings its text back, waits for the files, then sends', async () => {
    const { s, sends } = setup({ history: [failed('old', [{ name: 'a.pdf', size: 3 }])] });
    expect(s.holds('old')).toBe(false);
    expect(s.retry('old')).toBe('attach');
    expect(sends).toHaveLength(0);
    expect(s.draft.text).toBe('text of old');
    expect(s.holds('old')).toBe(true);
    await s.addFiles([file('a.pdf')]);
    expect(s.retry('old')).toBe('sending');
    expect(sends[0].files.map((f) => f.name)).toEqual(['a.pdf']);
    sends[0].answer({ ok: true });
    await tick();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].state).toBe('sent');
  });
  it('does not overwrite another draft she is writing', () => {
    const { s, sends } = setup({ history: [failed('old')] });
    s.setText('something else');
    expect(s.retry('old')).toBe('held');
    expect(s.draft.text).toBe('something else');
    expect(sends).toHaveLength(0);
  });
  it('emptying the composer lets go of the failed entry', async () => {
    const { s, sends } = setup();
    s.setText('hello');
    let going = s.submit();
    sends[0].answer({ ok: false, reason: 'server' });
    await going;
    s.setText('');
    s.setText('a different thing');
    going = s.submit();
    sends[1].answer({ ok: true });
    await going;
    expect(s.history.map((e) => e.state)).toEqual(['failed', 'sent']);
  });
  it('a failed entry is still in the store if the page closes during its retry', async () => {
    const { s, store } = setup({ history: [failed('old')] });
    s.retry('old');
    expect(loadHistory(store).map((e) => e.id)).toEqual(['old']);
  });
});

describe('the draft', () => {
  it('a draft that cannot go sets the note and sends nothing; typing clears it', () => {
    const { s, sends } = setup();
    void s.submit();
    expect(s.note).toBe('empty');
    expect(sends).toHaveLength(0);
    s.setText('a');
    expect(s.note).toBeNull();
  });
  it('removes one file', async () => {
    const { s } = setup();
    await s.addFiles([file('a.txt'), file('b.txt')]);
    s.removeFile(0);
    expect(s.draft.files.map((f) => f.name)).toEqual(['b.txt']);
  });
});

describe('sendsOnKey (I5)', () => {
  const key = (o: Partial<{ key: string; shiftKey: boolean; isComposing: boolean; keyCode: number }> = {}) =>
    ({ key: 'Enter', shiftKey: false, isComposing: false, keyCode: 13, ...o });
  it('Enter sends on a keyboard', () => expect(sendsOnKey(key(), false)).toBe(true));
  it('Shift+Enter, another key, or a phone do not', () => {
    expect(sendsOnKey(key({ shiftKey: true }), false)).toBe(false);
    expect(sendsOnKey(key({ key: 'a', keyCode: 65 }), false)).toBe(false);
    expect(sendsOnKey(key(), true)).toBe(false);
  });
  it('Enter that confirms a pinyin candidate does not', () => {
    expect(sendsOnKey(key({ isComposing: true }), false)).toBe(false);
  });
  it('nor does Safari\'s, which arrives after composition ended with keyCode 229', () => {
    expect(sendsOnKey(key({ keyCode: 229 }), false)).toBe(false);
  });
});

describe('takesPaste (M4)', () => {
  it('takes a pasted screenshot', () => expect(takesPaste(['Files'], 1)).toBe(true));
  it('leaves text alone', () => expect(takesPaste(['text/plain'], 0)).toBe(false));
  it('leaves a paste from Word or Excel alone: text that also carries a picture of itself', () => {
    expect(takesPaste(['text/plain', 'text/html', 'Files'], 1)).toBe(false);
  });
});
