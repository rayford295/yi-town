import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { config } from '../../core/config';
import { ymdInZone } from '../../core/dates';
import { ITINERARY } from './itinerary';

const existsExact = (p: string) => { try { return readdirSync(dirname(p)).includes(basename(p)); } catch { return false; } };
const publicPath = (src: string) => join(process.cwd(), 'public', src);
const nextDay = (ymd: string) => new Date(Date.parse(ymd + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10);

describe('the itinerary', () => {
  it('runs one entry a day from her landing in New York to her landing back in Hong Kong', () => {
    const { out, back } = config.trip;
    expect(ITINERARY[0].ymd).toBe(ymdInZone(new Date(out.arrives), out.to.zone));
    expect(ITINERARY.at(-1)!.ymd).toBe(ymdInZone(new Date(back.arrives), back.to.zone));
    for (let i = 1; i < ITINERARY.length; i++) expect(ITINERARY[i].ymd, `after ${ITINERARY[i - 1].ymd}`).toBe(nextDay(ITINERARY[i - 1].ymd));
  });
  it.each(ITINERARY.map((d) => [d.ymd, d] as const))('%s is written in both languages or not at all, with photos that exist', (_y, d) => {
    for (const v of [d.title, d.note].filter((x): x is NonNullable<typeof x> => !!x)) {
      expect(v.zh.trim()).not.toBe('');
      expect(v.en.trim()).not.toBe('');
    }
    for (const m of d.media) expect(existsExact(publicPath(m.src)), m.src).toBe(true);
  });
  it('marks the conference days and Valentine’s Day', () => {
    const titled = ITINERARY.filter((d) => d.title).map((d) => d.ymd);
    expect(titled).toContain('2027-02-04');
    expect(titled).toContain('2027-02-08');
    expect(titled).toContain('2027-02-14');
  });
});
