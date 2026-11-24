import { describe, expect, it } from 'vitest';
import {
  HISTORY_CAP, MAX_BYTES, buildForm, check, humanSize, loadHistory, saveHistory, send,
  type Entry, type Meta,
} from './core';

const f = (size: number) => ({ size });
const meta: Meta = { player: 'jingyi', lang: 'zh' };
const file = (name: string, body = 'x') => new File([body], name, { type: 'text/plain' });
const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
};
const entry = (id: string): Entry => ({ id, at: '2026-11-23T10:00:00.000Z', text: id, files: [], state: 'sent' });
const reply = (status: number, body: string) => (async () => new Response(body, { status })) as unknown as typeof fetch;

describe('check', () => {
  it('empty text and no files is empty', () => expect(check('  \n', [])).toBe('empty'));
  it('files alone are enough', () => expect(check('', [f(1)])).toBeNull());
  it('exactly 18 MB passes, one byte more is too-big', () => {
    expect(check('a', [f(MAX_BYTES)])).toBeNull();
    expect(check('a', [f(MAX_BYTES), f(1)])).toBe('too-big');
  });
  it('11 files is too-many', () => expect(check('a', Array(11).fill(f(1)))).toBe('too-many'));
});

describe('humanSize', () => {
  it('reads as B, KB and MB', () => {
    expect(humanSize(512)).toBe('512 B');
    expect(humanSize(3482)).toBe('3.4 KB');
    expect(humanSize(12 * 1024 * 1024)).toBe('12.0 MB');
  });
});

describe('history', () => {
  it('junk in the store reads as empty', () => {
    expect(loadHistory({ getItem: () => '{not json', setItem: () => {} })).toEqual([]);
  });
  it('a value that is not a list reads as empty', () => {
    expect(loadHistory({ getItem: () => '{"a":1}', setItem: () => {} })).toEqual([]);
  });
  it('a store that throws on write does not throw', () => {
    expect(() => saveHistory({ getItem: () => null, setItem: () => { throw new Error('full'); } }, [])).not.toThrow();
  });
  it('round-trips what was saved', () => {
    const store = memory();
    saveHistory(store, [entry('a'), entry('b')]);
    expect(loadHistory(store).map((e) => e.id)).toEqual(['a', 'b']);
  });
  it('keeps the newest 50', () => {
    const store = memory();
    saveHistory(store, Array.from({ length: 60 }, (_, i) => entry(`e${i}`)));
    const got = loadHistory(store);
    expect(got).toHaveLength(HISTORY_CAP);
    expect(got[0].id).toBe('e10');
    expect(got.at(-1)!.id).toBe('e59');
  });
});

describe('buildForm', () => {
  it('carries text, player, lang and every file', () => {
    const form = buildForm('帮我看看', [file('a.txt'), file('b.txt')], meta);
    expect(form.get('text')).toBe('帮我看看');
    expect(form.get('player')).toBe('jingyi');
    expect(form.get('lang')).toBe('zh');
    expect((form.getAll('files') as File[]).map((x) => x.name)).toEqual(['a.txt', 'b.txt']);
  });
  it('leaves player out when nobody is picked', () => {
    expect(buildForm('hi', [], { player: null, lang: 'en' }).has('player')).toBe(false);
  });
});

describe('send', () => {
  it('200 {ok:true} resolves ok', async () => {
    expect(await send('hi', [], meta, reply(200, '{"ok":true}'), 'https://x/send')).toEqual({ ok: true });
  });
  it('posts the form to the given address', async () => {
    let seen: { url: string; method?: string; body?: unknown } | undefined;
    const spy = (async (url: string, init?: RequestInit) => { seen = { url, method: init?.method, body: init?.body }; return new Response('{"ok":true}'); }) as unknown as typeof fetch;
    await send('hi', [file('a.txt')], meta, spy, 'https://x/send');
    expect(seen!.url).toBe('https://x/send');
    expect(seen!.method).toBe('POST');
    expect((seen!.body as FormData).get('text')).toBe('hi');
  });
  it('413 {ok:false,reason:"too-big"} resolves that reason', async () => {
    expect(await send('hi', [], meta, reply(413, '{"ok":false,"reason":"too-big"}'), 'https://x/send')).toEqual({ ok: false, reason: 'too-big' });
  });
  it('a rejected fetch resolves network', async () => {
    const down = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    expect(await send('hi', [], meta, down, 'https://x/send')).toEqual({ ok: false, reason: 'network' });
  });
  it('a 500 with an HTML body resolves server', async () => {
    expect(await send('hi', [], meta, reply(500, '<html>oops</html>'), 'https://x/send')).toEqual({ ok: false, reason: 'server' });
  });
  it('a 200 that does not say ok resolves server', async () => {
    expect(await send('hi', [], meta, reply(200, '<html>a captive portal</html>'), 'https://x/send')).toEqual({ ok: false, reason: 'server' });
  });
  it('an unknown reason resolves server', async () => {
    expect(await send('hi', [], meta, reply(400, '{"ok":false,"reason":"gremlins"}'), 'https://x/send')).toEqual({ ok: false, reason: 'server' });
  });
  it('a draft that fails check never calls fetch', async () => {
    let called = false;
    const spy = (async () => { called = true; return new Response('{"ok":true}'); }) as unknown as typeof fetch;
    expect(await send('  ', [], meta, spy, 'https://x/send')).toEqual({ ok: false, reason: 'empty' });
    expect(called).toBe(false);
  });
});
