import { describe, expect, it } from 'vitest';
import { MAX_BYTES } from '../../src/features/ask/core';
import { cleanName, handle, subjectFor, type Env, type Mail } from './handle';

const SITE = 'https://jingyifan.love';
const NOW = new Date('2026-11-23T15:58:00Z');

function fakeEnv(fail = false): { env: Env; sent: Mail[] } {
  const sent: Mail[] = [];
  const env: Env = {
    ASK_TO: 'him@example.edu',
    ASK_FROM: 'ask@jingyifan.love',
    EMAIL: { send: async (m) => { if (fail) throw Object.assign(new Error('nope'), { code: 'E_DELIVERY_FAILED' }); sent.push(m); return { messageId: '1' }; } },
  };
  return { env, sent };
}

type Opts = { origin?: string | null; method?: string; path?: string; text?: string; player?: string; lang?: string; files?: File[] };
function request(o: Opts = {}): Request {
  const form = new FormData();
  if (o.text !== undefined) form.set('text', o.text);
  if (o.player) form.set('player', o.player);
  form.set('lang', o.lang ?? 'zh');
  for (const f of o.files ?? []) form.append('files', f, f.name);
  const headers = new Headers();
  if (o.origin !== null) headers.set('Origin', o.origin ?? SITE);
  const method = o.method ?? 'POST';
  return new Request(`https://ask.jingyifan.love${o.path ?? '/send'}`, { method, headers, body: method === 'POST' ? form : undefined });
}
const file = (name: string, bytes: number | string = 'x', type = 'text/plain') =>
  new File([typeof bytes === 'number' ? new Uint8Array(bytes) : bytes], name, { type });
const json = async (r: Response) => (await r.json()) as { ok: boolean; reason?: string };

describe('cleanName', () => {
  it('keeps Chinese and emoji, drops paths and control characters', () => {
    expect(cleanName('../a/合同🌱\r\n.pdf')).toBe('合同🌱.pdf');
    expect(cleanName('C:\\Users\\her\\税表.xlsx')).toBe('税表.xlsx');
    expect(cleanName('')).toBe('file');
  });
});

describe('subjectFor', () => {
  it('first 30 characters, one line', () => {
    expect(subjectFor('jingyi', '帮我看看这个\nBcc: x@y.z')).toBe('[仪见小镇] 静仪：帮我看看这个 Bcc: x@y.z');
    expect(subjectFor('jingyi', 'a'.repeat(40))).toBe(`[仪见小镇] 静仪：${'a'.repeat(30)}…`);
  });
  it('no text falls back to the first file name', () => {
    expect(subjectFor(null, '', '报税表.pdf')).toBe('[仪见小镇] 报税表.pdf');
  });
  it('an unknown player is not named', () => {
    expect(subjectFor('mallory', 'hi')).toBe('[仪见小镇] hi');
  });
});

describe('handle', () => {
  it('answers the preflight from the site with 204 and the CORS headers', async () => {
    const { env } = fakeEnv();
    const res = await handle(request({ method: 'OPTIONS' }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
  it('echoes the dev origin too', async () => {
    const { env } = fakeEnv();
    const res = await handle(request({ origin: 'http://localhost:5173', text: 'hi' }), env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });
  it('refuses another origin with 403 and no CORS header', async () => {
    const { env, sent } = fakeEnv();
    const res = await handle(request({ origin: 'https://evil.example', text: 'hi' }), env);
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(sent).toHaveLength(0);
  });
  it('refuses a request with no origin with 403', async () => {
    const { env, sent } = fakeEnv();
    expect((await handle(request({ origin: null, text: 'hi' }), env)).status).toBe(403);
    expect(sent).toHaveLength(0);
  });
  it('answers 404 for anything but POST /send', async () => {
    const { env } = fakeEnv();
    expect((await handle(request({ path: '/other', text: 'hi' }), env)).status).toBe(404);
    expect((await handle(request({ method: 'GET' }), env)).status).toBe(404);
  });
  it('no text and no files is 400 empty', async () => {
    const { env, sent } = fakeEnv();
    const res = await handle(request({ text: '  ' }), env);
    expect(res.status).toBe(400);
    expect(await json(res)).toEqual({ ok: false, reason: 'empty' });
    expect(sent).toHaveLength(0);
  });
  it('a body that is not a form is 400 empty', async () => {
    const { env } = fakeEnv();
    const req = new Request('https://ask.jingyifan.love/send', { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json' }, body: '{}' });
    expect((await handle(req, env)).status).toBe(400);
  });
  it('11 files is 413 too-many', async () => {
    const { env } = fakeEnv();
    const res = await handle(request({ text: 'a', files: Array.from({ length: 11 }, (_, i) => file(`${i}.txt`)) }), env);
    expect(res.status).toBe(413);
    expect(await json(res)).toEqual({ ok: false, reason: 'too-many' });
  });
  it('more than 18 MB is 413 too-big', async () => {
    const { env, sent } = fakeEnv();
    const res = await handle(request({ text: 'a', files: [file('big.bin', MAX_BYTES + 1)] }), env);
    expect(res.status).toBe(413);
    expect(await json(res)).toEqual({ ok: false, reason: 'too-big' });
    expect(sent).toHaveLength(0);
  });
  it('a failing mail service is 502 server, with the CORS header so the page can read it', async () => {
    const { env } = fakeEnv(true);
    const res = await handle(request({ text: 'hi' }), env);
    expect(res.status).toBe(502);
    expect(await json(res)).toEqual({ ok: false, reason: 'server' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
  });
  it('a good send passes the text, ASK_TO, ASK_FROM and both attachments to EMAIL.send', async () => {
    const { env, sent } = fakeEnv();
    const res = await handle(request({ text: '帮我改一下简历', player: 'jingyi', files: [file('简历.pdf', 'PDF!', 'application/pdf'), file('../x/shot.png', 3, '')] }), env, NOW);
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    const m = sent[0];
    expect(m.to).toBe('him@example.edu');
    expect(m.from).toEqual({ email: 'ask@jingyifan.love', name: '仪见小镇' });
    expect(m.subject).toBe('[仪见小镇] 静仪：帮我改一下简历');
    expect(m.text.startsWith('帮我改一下简历')).toBe(true);
    expect(m.attachments!.map((a) => [a.filename, a.type, a.disposition])).toEqual([
      ['简历.pdf', 'application/pdf', 'attachment'],
      ['shot.png', 'application/octet-stream', 'attachment'],
    ]);
    expect(new TextDecoder().decode(m.attachments![0].content)).toBe('PDF!');
  });
  it('the body lists the time in both cities, the language and each file with its size', async () => {
    const { env, sent } = fakeEnv();
    await handle(request({ text: 'hi', lang: 'en', files: [file('a.txt', 2048)] }), env, NOW);
    const { text } = sent[0];
    expect(text).toContain('2026-11-23 23:58');   // Shenzhen
    expect(text).toContain('2026-11-23 09:58');   // College Station
    expect(text).toContain('en');
    expect(text).toContain('a.txt (2.0 KB)');
  });
  it('text alone sends with no attachments field', async () => {
    const { env, sent } = fakeEnv();
    await handle(request({ text: 'hi' }), env, NOW);
    expect(sent[0].attachments).toBeUndefined();
  });
  it('files alone send, with the first file name as the subject', async () => {
    const { env, sent } = fakeEnv();
    const res = await handle(request({ files: [file('报税表.pdf')] }), env, NOW);
    expect(res.status).toBe(200);
    expect(sent[0].subject).toBe('[仪见小镇] 报税表.pdf');
  });
});
