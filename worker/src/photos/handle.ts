// Our Album, the server half (photos.jingyifan.love). One row per photo in D1, the pictures in D1
// as well, and a vision model on Workers AI writes each photo's caption and tags when it arrives.
//
// Why D1 for pictures (Yifan, 2026-11-25: no card on the account, so no R2): a free D1 database
// holds 500 MB and a row at most 2 MB. The pictures are spread over "shelves": the main database
// (DB) and SHELF1, SHELF2, … Each upload goes to the first shelf with room; the photo's row
// remembers which. Adding a shelf is one database and one binding in photos.toml.
//
// Unlike the Ask Worker this one stores private photos, so every request carries a key, checked
// here: the site's own password, compared by its SHA-256 against the gate's ANSWERS, so changing
// the gate's password changes the album's too. Yifan's decision (2026-11-25), knowing that the
// gate's hash sits in a public bundle and eight digits can be found from it offline. What this
// Worker adds is a lock: ten wrong tries from one address shut it out for fifteen minutes.
import { ANSWERS, normalise } from '../../../src/core/gate';
import {
  MAX_FULL, MAX_THUMB, WHO, isId, isStamp, parseReading, validLatLng,
  type Photo, type Reading, type Upload,
} from '../../../src/features/photos/core';

// The few binding shapes this Worker uses, so it needs no @cloudflare/workers-types.
export type Stmt = {
  bind(...values: unknown[]): Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};
export type DB = { prepare(sql: string): Stmt };
type Shelf = `SHELF${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;
export type Env = {
  /** The photos table, and shelf 0 for pictures. */
  DB: DB;
  AI: { run(model: string, input: unknown): Promise<unknown> };
  /** Var: the Workers AI model that reads the photos. */
  VISION_MODEL: string;
} & Partial<Record<Shelf, DB>>;

/** What one shelf may hold: under the free plan's 500 MB, with room for its index. */
export const SHELF_CAP = 480_000_000;
/** The shelves in order: the main database first, then SHELF1, SHELF2, … as bound. */
export const shelves = (env: Env): DB[] =>
  [env.DB, ...([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((i) => env[`SHELF${i}`]).filter((d): d is DB => !!d)];

/** D1 hands a BLOB back as an array of numbers. */
const bytesOf = (v: unknown): Uint8Array<ArrayBuffer> =>
  v instanceof ArrayBuffer ? new Uint8Array(v)
    : Uint8Array.from(ArrayBuffer.isView(v) ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : (v as number[]));

async function readPicture(env: Env, row: Row, size: 'full' | 'thumb'): Promise<Uint8Array<ArrayBuffer> | null> {
  const db = shelves(env)[row.shelf];
  if (!db) return null;
  const hit = await db.prepare('SELECT data FROM pictures WHERE id = ? AND size = ?').bind(row.id, size).first<{ data: unknown }>();
  return hit ? bytesOf(hit.data) : null;
}
/** Turns a place's coordinates into a short name; swapped out in tests. */
export type Geocode = (lat: number, lng: number) => Promise<string | null>;

const ORIGINS = ['https://jingyifan.love', 'http://localhost:5173', 'http://localhost:4173'];

export type Row = {
  id: string; taken_at: string; date_source: string; lat: number | null; lng: number | null; place: string | null;
  caption_zh: string | null; caption_en: string | null; tags: string; who: string; name: string; w: number; h: number; uploaded_at: string;
  shelf: number;
};
export const toPhoto = (r: Row): Photo => ({
  id: r.id, takenAt: r.taken_at, dateSource: r.date_source as Photo['dateSource'], lat: r.lat, lng: r.lng, place: r.place,
  captionZh: r.caption_zh, captionEn: r.caption_en, tags: safeTags(r.tags), who: r.who, name: r.name, w: r.w, h: r.h, uploadedAt: r.uploaded_at,
});
function safeTags(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((t) => typeof t === 'string') : []; } catch { return []; }
}

/** Equal strings of the same length, compared without stopping at the first difference. */
const sameHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
/** True when `given` is the site's password (digits only, separators ignored, as at the gate). */
export async function isPassword(given: string, answers: readonly string[] = ANSWERS): Promise<boolean> {
  const n = normalise(given);
  if (!n) return false;
  const h = await sha256(n);
  return answers.some((a) => sameHex(h, a));
}

/** Ten wrong keys from one address within fifteen minutes lock it out until fifteen minutes
 * after the last one. A right key clears the count. */
export const LOCK_AFTER = 10;
export const LOCK_MS = 15 * 60 * 1000;
type Attempt = { fails: number; last_at: string };

/** Checks what the page sent about a photo; null when anything is off. */
export function readUpload(raw: unknown): Upload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!isId(o.id) || !isStamp(o.takenAt)) return null;
  if (o.dateSource !== 'exif' && o.dateSource !== 'file' && o.dateSource !== 'manual') return null;
  if (typeof o.who !== 'string' || !(WHO as readonly string[]).includes(o.who)) return null;
  const w = Number(o.w), h = Number(o.h);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 20000 || h > 20000) return null;
  const located = validLatLng(o.lat, o.lng);
  const name = typeof o.name === 'string' ? o.name.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120) : '';
  return {
    id: o.id, takenAt: o.takenAt, dateSource: o.dateSource, who: o.who, name, w, h,
    lat: located ? Math.round((o.lat as number) * 1e6) / 1e6 : null,
    lng: located ? Math.round((o.lng as number) * 1e6) / 1e6 : null,
  };
}

export const PROMPT = `You are labelling a private photo album kept by a couple, Jingyi and Yifan.
Look at the photo and answer with JSON only, no other text:
{"zh": "一句简短自然的中文描述，不超过 30 个字", "en": "one short English sentence", "tags": ["..."]}
For tags give 6 to 10 short lowercase words a person might search for: what is in it (food, cat,
beach, skyline, snow), the kind of place, the mood or occasion. Give each tag in English and also in
Chinese (for example "beach", "海边"). Do not guess who the people are or name them.`;

function base64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Ask the vision model about one picture. Never throws: a photo is kept even if this fails. */
export async function describe(env: Env, jpeg: ArrayBuffer | Uint8Array): Promise<Reading> {
  try {
    const out = await env.AI.run(env.VISION_MODEL, {
      messages: [{ role: 'user', content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64(jpeg)}` } },
      ] }],
      max_tokens: 400,
      temperature: 0.2,
    }) as { response?: unknown } | null;
    return parseReading(out?.response ?? out);
  } catch (err) {
    console.error('photos: describe failed', (err as Error).message);
    return { zh: null, en: null, tags: [] };
  }
}

/** The short name of a place from a Nominatim address: the first of its variants ("纽约;紐約"),
 * without a trailing 市 ("深圳市" → "深圳"). */
export function placeName(a: Record<string, string>): string | null {
  const raw = a.city ?? a.town ?? a.village ?? a.county ?? a.state ?? a.country;
  if (!raw) return null;
  const first = raw.split(';')[0].trim();
  return first.length > 2 ? first.replace(/市$/, '') : first;
}

/** OpenStreetMap's Nominatim, asked at upload: the city. Zoom 10 names US cities well; in China it
 * names the district (福田区), so a district is asked once more at zoom 8 for its city. */
export const nominatim: Geocode = async (lat, lng) => {
  const ask = async (zoom: number): Promise<Record<string, string> | null> => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=${zoom}&lat=${lat}&lon=${lng}&accept-language=zh-CN,en`;
    const res = await fetch(url, { headers: { 'User-Agent': 'yi-town-album/1.0' }, signal: AbortSignal.timeout(5000) });
    return res.ok ? (((await res.json()) as { address?: Record<string, string> }).address ?? null) : null;
  };
  try {
    const a = await ask(10);
    if (!a) return null;
    const name = placeName(a);
    if (name && /(区|區|District)$/.test(name)) { const up = await ask(8); return (up && placeName(up)) ?? name; }
    return name;
  } catch { return null; }
};

const COLS = 'id, taken_at, date_source, lat, lng, place, caption_zh, caption_en, tags, who, name, w, h, uploaded_at, shelf';
const getRow = (env: Env, id: string) => env.DB.prepare(`SELECT ${COLS} FROM photos WHERE id = ?`).bind(id).first<Row>();

export async function handle(
  req: Request, env: Env, geocode: Geocode = nominatim, now: Date = new Date(), answers: readonly string[] = ANSWERS,
): Promise<Response> {
  const origin = req.headers.get('Origin');
  const cors: Record<string, string> = origin && ORIGINS.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
    : { Vary: 'Origin' };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
  const no = (status: number, reason: string) => json({ ok: false, reason }, status);

  if (req.method === 'OPTIONS') return new Response(null, { status: origin && ORIGINS.includes(origin) ? 204 : 403, headers: cors });
  const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
  const tries = await env.DB.prepare('SELECT fails, last_at FROM attempts WHERE ip = ?').bind(ip).first<Attempt>();
  const recent = !!tries && now.getTime() - Date.parse(tries.last_at) < LOCK_MS;
  if (recent && tries!.fails >= LOCK_AFTER) return no(429, 'locked');
  const auth = req.headers.get('Authorization') ?? '';
  if (!(await isPassword(auth.replace(/^Bearer\s+/i, ''), answers))) {
    await env.DB.prepare('INSERT OR REPLACE INTO attempts (ip, fails, last_at) VALUES (?, ?, ?)')
      .bind(ip, (recent ? tries!.fails : 0) + 1, now.toISOString()).run();
    return no(401, 'key');
  }
  if (tries) await env.DB.prepare('DELETE FROM attempts WHERE ip = ?').bind(ip).run();

  const parts = new URL(req.url).pathname.split('/').filter(Boolean);   // photos[, id[, full|thumb|describe]]
  if (parts[0] !== 'photos') return no(404, 'missing');
  const id = parts[1];
  if (id !== undefined && !isId(id)) return no(404, 'missing');

  // GET /photos: everything, newest first. A few thousand rows is a few hundred kB; the page filters.
  if (req.method === 'GET' && !id) {
    const { results } = await env.DB.prepare(`SELECT ${COLS} FROM photos ORDER BY taken_at DESC`).all<Row>();
    return json({ ok: true, photos: results.map(toPhoto) });
  }

  // GET /photos/:id/full|thumb: the picture. Ids never change content, so it can be cached for good.
  if (req.method === 'GET' && id && (parts[2] === 'full' || parts[2] === 'thumb') && parts.length === 3) {
    const row = await getRow(env, id);
    const bytes = row && await readPicture(env, row, parts[2]);
    if (!bytes) return no(404, 'missing');
    return new Response(bytes, { headers: { ...cors, 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable', ETag: `"${id}-${parts[2]}"` } });
  }

  // POST /photos: one photo (meta, full, thumb). Its id is a hash of the original file, so the same
  // photo sent twice is noticed and kept once.
  if (req.method === 'POST' && !id) {
    let form: FormData;
    try { form = await req.formData(); } catch { return no(400, 'bad'); }
    let meta: Upload | null = null;
    try { meta = readUpload(JSON.parse(String(form.get('meta') ?? ''))); } catch { /* stays null */ }
    const full = form.get('full'), thumb = form.get('thumb');
    if (!meta || typeof full === 'string' || typeof thumb === 'string' || !full || !thumb) return no(400, 'bad');
    if (full.size > MAX_FULL || thumb.size > MAX_THUMB) return no(413, 'too-big');
    const existing = await getRow(env, meta.id);
    if (existing) return json({ ok: true, photo: toPhoto(existing), duplicate: true });
    const [fullBuf, thumbBuf] = await Promise.all([full.arrayBuffer(), thumb.arrayBuffer()]);
    // The first shelf with room for both pictures.
    const all = shelves(env);
    let shelf = -1;
    for (let i = 0; i < all.length && shelf < 0; i++) {
      const used = await all[i].prepare('SELECT COALESCE(SUM(bytes), 0) AS used FROM pictures').first<{ used: number }>();
      if ((used?.used ?? 0) + fullBuf.byteLength + thumbBuf.byteLength <= SHELF_CAP) shelf = i;
    }
    if (shelf < 0) return no(507, 'full');
    const put = 'INSERT OR REPLACE INTO pictures (id, size, bytes, data) VALUES (?, ?, ?, ?)';
    await all[shelf].prepare(put).bind(meta.id, 'full', fullBuf.byteLength, fullBuf).run();
    await all[shelf].prepare(put).bind(meta.id, 'thumb', thumbBuf.byteLength, thumbBuf).run();
    const [reading, place] = await Promise.all([
      describe(env, thumbBuf),
      meta.lat !== null && meta.lng !== null ? geocode(meta.lat, meta.lng) : Promise.resolve(null),
    ]);
    await env.DB.prepare(`INSERT INTO photos (${COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      meta.id, meta.takenAt, meta.dateSource, meta.lat, meta.lng, place, reading.zh, reading.en, JSON.stringify(reading.tags),
      meta.who, meta.name, meta.w, meta.h, now.toISOString(), shelf,
    ).run();
    const row = await getRow(env, meta.id);
    return row ? json({ ok: true, photo: toPhoto(row) }) : no(500, 'server');
  }

  if (!id || parts.length > 3) return no(404, 'missing');
  const row = await getRow(env, id);
  if (!row) return no(404, 'missing');

  // POST /photos/:id/describe: read the picture again (after a failed or poor first reading).
  if (req.method === 'POST' && parts[2] === 'describe') {
    const thumbBytes = await readPicture(env, row, 'thumb');
    if (!thumbBytes) return no(404, 'missing');
    const r = await describe(env, thumbBytes);
    if (!r.zh && !r.en) return no(502, 'ai');
    await env.DB.prepare('UPDATE photos SET caption_zh = ?, caption_en = ?, tags = ? WHERE id = ?').bind(r.zh, r.en, JSON.stringify(r.tags), id).run();
    return json({ ok: true, photo: toPhoto((await getRow(env, id))!) });
  }

  // PATCH /photos/:id: correct the date or the words by hand.
  if (req.method === 'PATCH' && parts.length === 2) {
    let body: Record<string, unknown>;
    try { body = (await req.json()) as Record<string, unknown>; } catch { return no(400, 'bad'); }
    const sets: string[] = [], vals: unknown[] = [];
    if (body.takenAt !== undefined) {
      if (!isStamp(body.takenAt)) return no(400, 'bad');
      sets.push('taken_at = ?', "date_source = 'manual'"); vals.push(body.takenAt);
    }
    for (const [k, col] of [['captionZh', 'caption_zh'], ['captionEn', 'caption_en']] as const) {
      if (body[k] === undefined) continue;
      if (body[k] !== null && typeof body[k] !== 'string') return no(400, 'bad');
      sets.push(`${col} = ?`); vals.push(body[k] === null ? null : String(body[k]).trim().slice(0, 200) || null);
    }
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) return no(400, 'bad');
      sets.push('tags = ?'); vals.push(JSON.stringify(parseReading({ tags: body.tags }).tags));
    }
    if (!sets.length) return no(400, 'bad');
    await env.DB.prepare(`UPDATE photos SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id).run();
    return json({ ok: true, photo: toPhoto((await getRow(env, id))!) });
  }

  // DELETE /photos/:id: the row and both pictures.
  if (req.method === 'DELETE' && parts.length === 2) {
    await shelves(env)[row.shelf]?.prepare('DELETE FROM pictures WHERE id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }
  return no(405, 'missing');
}
