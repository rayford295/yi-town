import { describe, expect, it } from 'vitest';
import { LOCK_AFTER, LOCK_MS, SHELF_CAP, handle as realHandle, isPassword, placeName, readUpload, type DB, type Env, type Geocode, type Row } from './handle';

const SITE = 'https://jingyifan.love';
// A stand-in password and its hash; the real one is never written in this public repository.
const KEY = '12345678';
const hex = async (text: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), (b) => b.toString(16).padStart(2, '0')).join('');
const ANSWERS = [await hex(KEY)];
const handle = (r: Request, env: Env, geocode: Geocode, now?: Date) => realHandle(r, env, geocode, now, ANSWERS);
const ID = 'a'.repeat(32);

type Pic = { id: string; size: string; bytes: number; data: number[] };
/** An in-memory stand-in for one D1 database, understanding exactly the statements handle.ts
 * sends. `preUsed` pretends the shelf already holds that many bytes. BLOBs come back as arrays
 * of numbers, as D1 returns them. */
function fakeDb(preUsed = 0) {
  const rows = new Map<string, Row>();
  const pics = new Map<string, Pic>();
  const attempts = new Map<string, { fails: number; last_at: string }>();
  const db: DB = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const stmt = {
        bind: (...v: unknown[]) => { args = v; return stmt; },
        first: async <T>() => {
          if (sql.includes('INTO attempts')) {   // the upsert ... RETURNING fails
            const [ip, at, stale] = args.map(String);
            const old = attempts.get(ip);
            const fails = old && old.last_at >= stale ? old.fails + 1 : 1;
            attempts.set(ip, { fails, last_at: at });
            return { fails } as T;
          }
          if (sql.includes('SUM(bytes)')) return { used: preUsed + [...pics.values()].reduce((n, p) => n + p.bytes, 0) } as T;
          if (sql.includes('FROM pictures')) { const p = pics.get(`${args[0]}/${args[1]}`); return (p ? { data: p.data } : null) as T | null; }
          return (rows.get(String(args[0])) ?? null) as T | null;
        },
        all: async <T>() => ({ results: [...rows.values()].sort((a, b) => (a.taken_at < b.taken_at ? 1 : -1)) as T[] }),
        run: async () => {
          if (sql.startsWith('DELETE FROM attempts')) {
            attempts.delete(String(args[0]));
          } else if (sql.includes('INTO pictures')) {
            const [id, size, bytes, data] = args as [string, string, number, ArrayBuffer];
            pics.set(`${id}/${size}`, { id, size, bytes, data: Array.from(new Uint8Array(data)) });
          } else if (sql.startsWith('DELETE FROM pictures')) {
            for (const k of [...pics.keys()]) if (k.startsWith(`${args[0]}/`)) pics.delete(k);
          } else if (sql.startsWith('INSERT')) {
            const [id, taken_at, date_source, lat, lng, place, caption_zh, caption_en, tags, who, name, w, h, uploaded_at, shelf] = args as never[];
            rows.set(id, { id, taken_at, date_source, lat, lng, place, caption_zh, caption_en, tags, who, name, w, h, uploaded_at, shelf });
          } else if (sql.startsWith('DELETE')) rows.delete(String(args[0]));
          else if (sql.startsWith('UPDATE')) {
            const id = String(args[args.length - 1]);
            const cols = [...sql.matchAll(/(\w+) = \?/g)].map((m) => m[1]).filter((c) => c !== 'id');
            const r = rows.get(id)!;
            cols.forEach((c, i) => { (r as Record<string, unknown>)[c] = args[i]; });
            if (sql.includes("date_source = 'manual'")) r.date_source = 'manual';
          }
          return {};
        },
      };
      return stmt;
    },
  };
  return { db, rows, pics, attempts };
}

function fakeEnv(reply: unknown = { response: '{"zh":"海边的日落","en":"Sunset","tags":["beach","海边"]}' }, mainUsed = 0, shelfUsed = 0) {
  const main = fakeDb(mainUsed), shelf1 = fakeDb(shelfUsed);
  const ai: unknown[] = [];
  const env: Env = {
    VISION_MODEL: 'test-model',
    AI: { run: async (_m, input) => { ai.push(input); if (reply instanceof Error) throw reply; return reply; } },
    DB: main.db,
    SHELF1: shelf1.db,
  };
  return { env, rows: main.rows, pics: main.pics, attempts: main.attempts, shelf1, ai };
}

type Opts = { method?: string; path?: string; key?: string | null; origin?: string | null; body?: BodyInit; headers?: Record<string, string> };
const req = (o: Opts = {}) => {
  const h = new Headers(o.headers);
  if (o.origin !== null) h.set('Origin', o.origin ?? SITE);
  if (o.key !== null) h.set('Authorization', `Bearer ${o.key ?? KEY}`);
  return new Request(`https://photos.jingyifan.love${o.path ?? '/photos'}`, { method: o.method ?? 'GET', headers: h, body: o.body });
};
const meta = (o: Record<string, unknown> = {}) => ({ id: ID, takenAt: '2027-02-05T10:00:00', dateSource: 'exif', lat: 40.7128, lng: -74.006, who: 'jingyi', name: 'IMG_1.jpg', w: 4032, h: 3024, ...o });
const uploadForm = (m: unknown = meta(), full = 1000, thumb = 100) => {
  const f = new FormData();
  f.set('meta', JSON.stringify(m));
  f.set('full', new Blob([new Uint8Array(full)], { type: 'image/jpeg' }), 'f.jpg');
  f.set('thumb', new Blob([new Uint8Array(thumb)], { type: 'image/jpeg' }), 't.jpg');
  return f;
};
const geo = async () => '纽约';

describe('the album key', () => {
  it('is required on every request but the preflight', async () => {
    const { env } = fakeEnv();
    expect((await handle(req({ key: null }), env, geo)).status).toBe(401);
    expect((await handle(req({ key: 'x'.repeat(32) }), env, geo)).status).toBe(401);
    expect((await handle(req({ method: 'OPTIONS', key: null }), env, geo)).status).toBe(204);
    expect((await handle(req(), env, geo)).status).toBe(200);
  });
  it('takes the password with any separators, as the gate does, and nothing else', async () => {
    expect(await isPassword('1234-5678', ANSWERS)).toBe(true);
    expect(await isPassword(' 1234 5678 ', ANSWERS)).toBe(true);
    expect(await isPassword('12345679', ANSWERS)).toBe(false);
    expect(await isPassword('', ANSWERS)).toBe(false);
    expect(await isPassword('abc', ANSWERS)).toBe(false);
  });
  it('locks an address out after ten wrong tries, for fifteen minutes after the last', async () => {
    const { env } = fakeEnv();
    const t0 = new Date('2027-02-05T10:00:00Z');
    const at = (ms: number) => new Date(t0.getTime() + ms);
    const from = (ip: string, key: string) => new Request('https://photos.jingyifan.love/photos', { headers: { Origin: SITE, Authorization: `Bearer ${key}`, 'CF-Connecting-IP': ip } });
    for (let i = 0; i < LOCK_AFTER; i++) expect((await handle(from('1.1.1.1', `0000000${i}`), env, geo, at(i * 1000))).status).toBe(401);
    expect((await handle(from('1.1.1.1', KEY), env, geo, at(20_000))).status).toBe(429);      // even the right key
    expect((await handle(from('2.2.2.2', KEY), env, geo, at(20_000))).status).toBe(200);      // another address is fine
    expect((await handle(from('1.1.1.1', KEY), env, geo, at(20_000 + LOCK_MS + 1))).status).toBe(200);   // lock over
    expect((await handle(from('1.1.1.1', '00000000'), env, geo, at(20_000 + LOCK_MS + 2))).status).toBe(401);   // count started again
  });
  it('a burst of wrong tries at the same moment still gets only ten checks', async () => {
    const { env } = fakeEnv();
    const now = new Date('2027-02-05T10:00:00Z');
    const burst = Array.from({ length: 30 }, (_, i) => handle(new Request('https://photos.jingyifan.love/photos', {
      headers: { Origin: SITE, Authorization: `Bearer 0000${String(i).padStart(4, '0')}`, 'CF-Connecting-IP': '3.3.3.3' } }), env, geo, now));
    const codes = (await Promise.all(burst)).map((r) => r.status);
    expect(codes.filter((c) => c === 401)).toHaveLength(LOCK_AFTER);
    expect(codes.filter((c) => c === 429)).toHaveLength(30 - LOCK_AFTER);
  });
  it('answers CORS only for the site', async () => {
    const { env } = fakeEnv();
    expect((await handle(req(), env, geo)).headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    expect((await handle(req({ origin: 'https://evil.example' }), env, geo)).headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('upload', () => {
  it('stores both pictures, reads the photo, looks up the place and lists it', async () => {
    const { env, pics, ai } = fakeEnv();
    const res = await handle(req({ method: 'POST', body: uploadForm() }), env, geo, new Date('2027-02-06T00:00:00Z'));
    const body = await res.json() as { ok: boolean; photo: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.photo).toMatchObject({ id: ID, captionZh: '海边的日落', captionEn: 'Sunset', tags: ['beach', '海边'], place: '纽约', who: 'jingyi', lat: 40.7128 });
    expect([...pics.keys()].sort()).toEqual([`${ID}/full`, `${ID}/thumb`]);
    expect(JSON.stringify(ai[0])).toContain('data:image/jpeg;base64,');
    const list = await (await handle(req(), env, geo)).json() as { photos: unknown[] };
    expect(list.photos).toHaveLength(1);
  });
  it('the same photo twice is kept once', async () => {
    const { env, ai } = fakeEnv();
    await handle(req({ method: 'POST', body: uploadForm() }), env, geo);
    const again = await (await handle(req({ method: 'POST', body: uploadForm() }), env, geo)).json() as { duplicate?: boolean };
    expect(again.duplicate).toBe(true);
    expect(ai).toHaveLength(1);
  });
  it('keeps the photo when the model fails, with no words yet', async () => {
    const { env } = fakeEnv(new Error('model down'));
    const body = await (await handle(req({ method: 'POST', body: uploadForm() }), env, geo)).json() as { photo: Record<string, unknown> };
    expect(body.photo).toMatchObject({ captionZh: null, tags: [] });
  });
  it('refuses bad meta and pictures that are too big', async () => {
    const { env } = fakeEnv();
    expect((await handle(req({ method: 'POST', body: uploadForm(meta({ who: 'stranger' })) }), env, geo)).status).toBe(400);
    expect((await handle(req({ method: 'POST', body: uploadForm(meta({ id: '../x' })) }), env, geo)).status).toBe(400);
    expect((await handle(req({ method: 'POST', body: uploadForm(meta(), 1_900_001) }), env, geo)).status).toBe(413);
  });
  it('goes to the next shelf when the first is full, and says so when all are', async () => {
    const { env, pics, shelf1 } = fakeEnv(undefined, SHELF_CAP - 500);
    const body = await (await handle(req({ method: 'POST', body: uploadForm() }), env, geo)).json() as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(pics.size).toBe(0);
    expect(shelf1.pics.size).toBe(2);
    expect((await handle(req({ path: `/photos/${ID}/full` }), env, geo)).status).toBe(200);
    const full = fakeEnv(undefined, SHELF_CAP, SHELF_CAP);
    expect((await handle(req({ method: 'POST', body: uploadForm() }), full.env, geo)).status).toBe(507);
  });
});

describe('one photo', () => {
  async function withOne() {
    const f = fakeEnv();
    await handle(req({ method: 'POST', body: uploadForm() }), f.env, geo);
    return f;
  }
  it('serves its pictures with a long private cache', async () => {
    const { env } = await withOne();
    const res = await handle(req({ path: `/photos/${ID}/thumb` }), env, geo);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Cache-Control')).toContain('private');
    expect((await res.arrayBuffer()).byteLength).toBe(100);
  });
  it('takes a corrected date and marks it as typed by hand', async () => {
    const { env } = await withOne();
    const body = await (await handle(req({ method: 'PATCH', path: `/photos/${ID}`, body: JSON.stringify({ takenAt: '2027-02-14T19:30:00' }) }), env, geo)).json() as { photo: Record<string, unknown> };
    expect(body.photo).toMatchObject({ takenAt: '2027-02-14T19:30:00', dateSource: 'manual' });
    expect((await handle(req({ method: 'PATCH', path: `/photos/${ID}`, body: JSON.stringify({ takenAt: 'soon' }) }), env, geo)).status).toBe(400);
  });
  it('deletes the row and both pictures', async () => {
    const { env, rows, pics } = await withOne();
    expect((await handle(req({ method: 'DELETE', path: `/photos/${ID}` }), env, geo)).status).toBe(200);
    expect(rows.size).toBe(0);
    expect(pics.size).toBe(0);
  });
  it('404s an unknown id', async () => {
    const { env } = await withOne();
    expect((await handle(req({ method: 'DELETE', path: `/photos/${'b'.repeat(32)}` }), env, geo)).status).toBe(404);
  });
});

describe('readUpload', () => {
  it('drops 0,0 as "no place" and rounds coordinates', () => {
    expect(readUpload(meta({ lat: 0, lng: 0 }))).toMatchObject({ lat: null, lng: null });
    expect(readUpload(meta({ lat: 40.712812345, lng: -74.0060129 }))).toMatchObject({ lat: 40.712812, lng: -74.006013 });
  });
  it('keeps only the last part of a file name', () => expect(readUpload(meta({ name: 'C:\\Users\\x\\IMG_2.jpg' }))?.name).toBe('IMG_2.jpg'));
});

describe('placeName', () => {
  it('keeps the first variant and drops a trailing 市', () => {
    expect(placeName({ city: '纽约;紐約', state: '纽约州' })).toBe('纽约');
    expect(placeName({ county: '福田区', city: '深圳市' })).toBe('深圳');
    expect(placeName({ city: 'College Station' })).toBe('College Station');
    expect(placeName({ county: 'Brazos County' })).toBe('Brazos County');
    expect(placeName({})).toBeNull();
  });
});
