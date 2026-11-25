import { describe, expect, it } from 'vitest';
import { handle, placeName, readUpload, sameKey, type Env, type Row } from './handle';

const SITE = 'https://jingyifan.love';
const KEY = 'k'.repeat(32);
const ID = 'a'.repeat(32);

/** An in-memory stand-in for D1 that understands exactly the statements handle.ts sends. */
function fakeEnv(reply: unknown = { response: '{"zh":"海边的日落","en":"Sunset","tags":["beach","海边"]}' }) {
  const rows = new Map<string, Row>();
  const objects = new Map<string, ArrayBuffer>();
  const ai: unknown[] = [];
  const env: Env = {
    PHOTOS_KEY: KEY,
    VISION_MODEL: 'test-model',
    AI: { run: async (_m, input) => { ai.push(input); if (reply instanceof Error) throw reply; return reply; } },
    BUCKET: {
      get: async (k) => { const b = objects.get(k); return b ? { body: new Blob([b]).stream(), httpEtag: '"e"', size: b.byteLength, arrayBuffer: async () => b } : null; },
      head: async (k) => (objects.has(k) ? {} : null),
      put: async (k, v) => { objects.set(k, v); return {}; },
      delete: async (ks) => { for (const k of [ks].flat()) objects.delete(k); },
    },
    DB: {
      prepare(sql: string) {
        let args: unknown[] = [];
        const stmt = {
          bind: (...v: unknown[]) => { args = v; return stmt; },
          first: async <T>() => (rows.get(String(args[0])) ?? null) as T | null,
          all: async <T>() => ({ results: [...rows.values()].sort((a, b) => (a.taken_at < b.taken_at ? 1 : -1)) as T[] }),
          run: async () => {
            if (sql.startsWith('INSERT')) {
              const [id, taken_at, date_source, lat, lng, place, caption_zh, caption_en, tags, who, name, w, h, uploaded_at] = args as never[];
              rows.set(id, { id, taken_at, date_source, lat, lng, place, caption_zh, caption_en, tags, who, name, w, h, uploaded_at });
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
    },
  };
  return { env, rows, objects, ai };
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
  it('an unset or short secret opens nothing', async () => {
    expect(sameKey('', '')).toBe(false);
    expect(sameKey('abc', 'abc')).toBe(false);
    expect(sameKey(KEY, KEY)).toBe(true);
    expect(sameKey(KEY.slice(1), KEY)).toBe(false);
  });
  it('answers CORS only for the site', async () => {
    const { env } = fakeEnv();
    expect((await handle(req(), env, geo)).headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    expect((await handle(req({ origin: 'https://evil.example' }), env, geo)).headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('upload', () => {
  it('stores both pictures, reads the photo, looks up the place and lists it', async () => {
    const { env, objects, ai } = fakeEnv();
    const res = await handle(req({ method: 'POST', body: uploadForm() }), env, geo, new Date('2027-02-06T00:00:00Z'));
    const body = await res.json() as { ok: boolean; photo: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.photo).toMatchObject({ id: ID, captionZh: '海边的日落', captionEn: 'Sunset', tags: ['beach', '海边'], place: '纽约', who: 'jingyi', lat: 40.7128 });
    expect([...objects.keys()].sort()).toEqual([`full/${ID}.jpg`, `thumb/${ID}.jpg`]);
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
    expect((await handle(req({ method: 'POST', body: uploadForm(meta(), 7 * 1024 * 1024) }), env, geo)).status).toBe(413);
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
    const { env, rows, objects } = await withOne();
    expect((await handle(req({ method: 'DELETE', path: `/photos/${ID}` }), env, geo)).status).toBe(200);
    expect(rows.size).toBe(0);
    expect(objects.size).toBe(0);
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
