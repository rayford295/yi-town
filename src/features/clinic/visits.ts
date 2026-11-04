// What the infirmary remembers, on this device only: how many times each of us has checked in,
// and the chart, the private lines a patient writes and never sends. Pure functions over a
// store, so they can be tested; the page hands in localStorage.
import { safeStorage, type StoreLike } from '../../core/storage';
import type { PlayerId } from '../../core/quest';

export interface ChartEntry { at: string; text: string }

const visitsKey = (p: PlayerId) => `yi.clinic.visits.${p}`;
const chartKey = (p: PlayerId) => `yi.clinic.chart.${p}`;
/** The chart keeps this many lines; the oldest goes when a new one comes in. */
export const CHART_LIMIT = 30;

export function visits(p: PlayerId, store: StoreLike = safeStorage()): number {
  const n = Number(store.getItem(visitsKey(p)));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** One more visit for `p`; returns the new count. */
export function checkIn(p: PlayerId, store: StoreLike = safeStorage()): number {
  const n = visits(p, store) + 1;
  try { store.setItem(visitsKey(p), String(n)); } catch { /* storage full or blocked: not counted */ }
  return n;
}

export function chart(p: PlayerId, store: StoreLike = safeStorage()): ChartEntry[] {
  try {
    const raw = JSON.parse(store.getItem(chartKey(p)) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((e): e is ChartEntry => !!e && typeof e === 'object' && typeof (e as ChartEntry).at === 'string' && typeof (e as ChartEntry).text === 'string');
  } catch { return []; }
}

const save = (p: PlayerId, entries: ChartEntry[], store: StoreLike) => { try { store.setItem(chartKey(p), JSON.stringify(entries)); } catch { /* ignore */ } };

/** Add a line to `p`'s chart (newest first); blank lines are ignored. Returns the chart. */
export function writeChart(p: PlayerId, text: string, store: StoreLike = safeStorage(), now = new Date()): ChartEntry[] {
  const t = text.trim();
  const have = chart(p, store);
  if (!t) return have;
  const next = [{ at: now.toISOString(), text: t }, ...have].slice(0, CHART_LIMIT);
  save(p, next, store);
  return next;
}

/** Tear the line written at `at` out of `p`'s chart. Returns the chart. */
export function eraseChart(p: PlayerId, at: string, store: StoreLike = safeStorage()): ChartEntry[] {
  const next = chart(p, store).filter((e) => e.at !== at);
  save(p, next, store);
  return next;
}
