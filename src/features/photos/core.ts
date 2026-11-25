// Our Album, the part with no DOM: what a photo is, how the page filters and groups them, and how
// a run of photos becomes a trip on the map. The Worker (worker/src/photos/) imports the types
// and caps from here, so the page and the server can never disagree about them.

/** One photo as the Worker keeps it (a row in D1; the pictures themselves are in R2). */
export type Photo = {
  id: string;
  /** Local wall-clock time it was taken, 'YYYY-MM-DDTHH:mm:ss', with no zone: the time on the camera. */
  takenAt: string;
  /** Where takenAt came from: the camera's EXIF, the file's own date, or typed by hand. */
  dateSource: 'exif' | 'file' | 'manual';
  lat: number | null;
  lng: number | null;
  /** A short place name ("New York", "深圳") looked up from lat/lng, when there is one. */
  place: string | null;
  captionZh: string | null;
  captionEn: string | null;
  tags: string[];
  /** Who put it here: 'jingyi' or 'yifan'. */
  who: string;
  /** The file name it came from, for the two of us only. */
  name: string;
  w: number;
  h: number;
  uploadedAt: string;
};

/** What the page sends with a photo; everything else is filled in by the Worker. */
export type Upload = Pick<Photo, 'id' | 'takenAt' | 'dateSource' | 'lat' | 'lng' | 'who' | 'name' | 'w' | 'h'>;

/** The long edge of the picture that is kept, and of the one shown in the grid and on the map. */
export const FULL_EDGE = 2048;
export const THUMB_EDGE = 480;
/** What one upload may weigh, after the page has shrunk it. A D1 row holds at most 2,000,000
 * bytes, and the pictures are rows (worker/src/photos/handle.ts). */
export const MAX_FULL = 1_900_000;
export const MAX_THUMB = 400 * 1024;
export const WHO = ['jingyi', 'yifan'] as const;

const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
export const isStamp = (s: unknown): s is string => typeof s === 'string' && STAMP.test(s);
export const isId = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{16,64}$/.test(s);

const two = (n: number): string => String(n).padStart(2, '0');
/** A Date as its local wall-clock stamp (the device's own zone). */
export const stampOf = (d: Date): string =>
  `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;

/** EXIF's "2026:10:31 18:42:07" (what exifr gives back as a Date read in local time, or raw). */
export function stampFromExif(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return stampOf(v);
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m || m[1] === '0000') return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
}

/** A coordinate pair worth keeping: finite, on the globe, and not EXIF's 0,0 for "unknown". */
export function validLatLng(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

// ── Filtering ───────────────────────────────────────────────────────────────────────────────

export type Filter = {
  /** Words to look for in the captions, tags, place and file name; any case, any language. */
  text: string;
  /** 'YYYY-MM-DD', both ends included; empty means open. */
  from: string;
  to: string;
  /** Only one person's uploads, or everyone's. */
  who: string;
};
export const NO_FILTER: Filter = { text: '', from: '', to: '', who: '' };

const haystack = (p: Photo): string =>
  [p.captionZh, p.captionEn, p.place, p.name, ...p.tags].filter(Boolean).join(' ').toLowerCase();

/** The photos that match, newest first. Every word typed must appear somewhere. */
export function applyFilter(photos: readonly Photo[], f: Filter): Photo[] {
  const words = f.text.toLowerCase().split(/\s+/).filter(Boolean);
  return photos
    .filter((p) => {
      const day = p.takenAt.slice(0, 10);
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      if (f.who && p.who !== f.who) return false;
      if (!words.length) return true;
      const h = haystack(p);
      return words.every((w) => h.includes(w));
    })
    .sort(newestFirst);
}
export const newestFirst = (a: Photo, b: Photo): number => (a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0);
export const oldestFirst = (a: Photo, b: Photo): number => -newestFirst(a, b);

/** Photos in the order given, split into runs of one calendar month ('YYYY-MM'). */
export function byMonth(photos: readonly Photo[]): { month: string; photos: Photo[] }[] {
  const out: { month: string; photos: Photo[] }[] = [];
  for (const p of photos) {
    const m = p.takenAt.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.month === m) last.photos.push(p);
    else out.push({ month: m, photos: [p] });
  }
  return out;
}

/** The tags that come up most among these photos, for the quick chips above the grid. */
export function topTags(photos: readonly Photo[], n = 12): string[] {
  const count = new Map<string, number>();
  for (const p of photos) for (const t of new Set(p.tags)) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([t]) => t);
}

// ── Trips ───────────────────────────────────────────────────────────────────────────────────

export type Trip = { from: string; to: string; photos: Photo[]; places: string[] };

const hoursBetween = (a: string, b: string): number => (Date.parse(`${b}Z`) - Date.parse(`${a}Z`)) / 3.6e6;

/** A new trip starts when two located photos in a row are more than this far apart in time.
 * Distance alone never splits one: a long hop within a day is a flight, part of the same trip. */
export const TRIP_GAP_HOURS = 72;

/**
 * The photos that carry a place, oldest first, cut into trips. One trip is a run of photos with
 * no gap longer than TRIP_GAP_HOURS between neighbours. Its places are the distinct place names
 * in the order first seen.
 */
export function groupTrips(photos: readonly Photo[], gapHours = TRIP_GAP_HOURS): Trip[] {
  const located = photos.filter((p) => p.lat !== null && p.lng !== null).sort(oldestFirst);
  const trips: Trip[] = [];
  for (const p of located) {
    const cur = trips[trips.length - 1];
    const prev = cur?.photos[cur.photos.length - 1];
    if (cur && prev && hoursBetween(prev.takenAt, p.takenAt) <= gapHours) {
      cur.photos.push(p);
      cur.to = p.takenAt.slice(0, 10);
    } else {
      trips.push({ from: p.takenAt.slice(0, 10), to: p.takenAt.slice(0, 10), photos: [p], places: [] });
    }
  }
  for (const t of trips) t.places = [...new Set(t.photos.map((p) => p.place).filter((s): s is string => !!s))];
  return trips;
}

// ── What the vision model says ──────────────────────────────────────────────────────────────

export type Reading = { zh: string | null; en: string | null; tags: string[] };

/** The model is asked for JSON; it sometimes wraps it in a code fence or adds a sentence. Take
 * the first {...} that parses, and keep only what has the right shape. */
export function parseReading(raw: unknown): Reading {
  const empty: Reading = { zh: null, en: null, tags: [] };
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return empty;
    try { obj = JSON.parse(m[0]); } catch { return empty; }
  }
  if (!obj || typeof obj !== 'object') return empty;
  const o = obj as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null);
  const tags = Array.isArray(o.tags)
    ? [...new Set(o.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim().toLowerCase()).filter((t) => t && t.length <= 24))].slice(0, 10)
    : [];
  return { zh: str(o.zh), en: str(o.en), tags };
}
