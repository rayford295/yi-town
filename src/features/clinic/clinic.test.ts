import { describe, expect, it } from 'vitest';
import { CABINET, HURTS, PRESCRIPTIONS, cabinetFor, drawNote, fill, prescriptionFor, voiceSrc } from './prescriptions';
import { CHART_LIMIT, chart, checkIn, eraseChart, visits, writeChart } from './visits';
import type { StoreLike } from '../../core/storage';

const memory = (): StoreLike => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } }; };

describe('prescriptions', () => {
  it('has one letter for every hurt from each of us, in both languages, paragraph for paragraph', () => {
    for (const patient of ['jingyi', 'yifan'] as const) for (const h of HURTS) {
      const rx = prescriptionFor(patient, h);
      expect(rx, `${patient} ${h}`).toBeDefined();
      expect(rx!.from).not.toBe(patient);
      expect(rx!.paragraphs.zh.length).toBe(rx!.paragraphs.en.length);
      for (const lang of ['zh', 'en'] as const) for (const s of rx!.paragraphs[lang]) expect(s.trim().length, `${h} ${lang}`).toBeGreaterThan(0);
      expect(rx!.signature.zh.length).toBeGreaterThan(0);
      expect(rx!.signature.en.length).toBeGreaterThan(0);
    }
  });

  it('never prescribes a patient their own letters, and no hurt has two letters from one person', () => {
    for (const rx of PRESCRIPTIONS) expect(prescriptionFor(rx.from, rx.hurt)?.from).not.toBe(rx.from);
    const seen = new Set<string>();
    for (const rx of PRESCRIPTIONS) { const k = `${rx.from}:${rx.hurt}`; expect(seen.has(k), k).toBe(false); seen.add(k); }
    for (const rx of PRESCRIPTIONS) expect(HURTS).toContain(rx.hurt);
  });

  it('keeps every cabinet note in both languages and addressed to the other one', () => {
    for (const n of CABINET) { expect(n.zh.trim().length).toBeGreaterThan(0); expect(n.en.trim().length).toBeGreaterThan(0); }
    expect(cabinetFor('jingyi').every((n) => n.from === 'yifan')).toBe(true);
    expect(cabinetFor('yifan').every((n) => n.from === 'jingyi')).toBe(true);
    expect(cabinetFor('jingyi').length).toBeGreaterThanOrEqual(10);
    expect(cabinetFor('yifan').length).toBeGreaterThanOrEqual(10);
  });

  it('draws a different note than the last one, and nothing from an empty cabinet', () => {
    const notes = cabinetFor('jingyi');
    const first = drawNote(notes, null, 0)!;
    for (let r = 0; r < 1; r += 0.05) expect(drawNote(notes, first, r)).not.toBe(first);
    expect(drawNote(notes, null, 0.999)).toBe(notes[notes.length - 1]);
    expect(drawNote([], null)).toBeNull();
    const one = [notes[0]];
    expect(drawNote(one, notes[0])).toBe(notes[0]);
  });

  it('fills in the day count and names the voice file after the hurt and the reader', () => {
    expect(fill('day {d}', 46)).toBe('day 46');
    expect(voiceSrc('fight', 'yifan')).toBe('media/clinic/fight-yifan.m4a');
  });
});

describe('visits and the chart', () => {
  it('counts check-ins per player on this device', () => {
    const s = memory();
    expect(visits('jingyi', s)).toBe(0);
    expect(checkIn('jingyi', s)).toBe(1);
    expect(checkIn('jingyi', s)).toBe(2);
    expect(visits('jingyi', s)).toBe(2);
    expect(visits('yifan', s)).toBe(0);
  });

  it('ignores junk in the store', () => {
    const s = memory();
    s.setItem('yi.clinic.visits.jingyi', 'many');
    s.setItem('yi.clinic.chart.jingyi', '{not json');
    expect(visits('jingyi', s)).toBe(0);
    expect(chart('jingyi', s)).toEqual([]);
    s.setItem('yi.clinic.chart.jingyi', JSON.stringify([{ at: 'x', text: 'ok' }, { text: 'no date' }, 3]));
    expect(chart('jingyi', s)).toEqual([{ at: 'x', text: 'ok' }]);
  });

  it('writes lines newest first, trims them, drops blanks, and tears one out by its time', () => {
    const s = memory();
    const t1 = new Date('2026-11-04T10:00:00Z'), t2 = new Date('2026-11-04T11:00:00Z');
    expect(writeChart('jingyi', '   ', s, t1)).toEqual([]);
    writeChart('jingyi', '  first  ', s, t1);
    const two = writeChart('jingyi', 'second', s, t2);
    expect(two.map((e) => e.text)).toEqual(['second', 'first']);
    expect(two[1].at).toBe(t1.toISOString());
    expect(eraseChart('jingyi', t1.toISOString(), s).map((e) => e.text)).toEqual(['second']);
    expect(chart('yifan', s)).toEqual([]);
  });

  it('keeps only the newest lines once the chart is full', () => {
    const s = memory();
    for (let i = 0; i < CHART_LIMIT + 5; i++) writeChart('yifan', `line ${i}`, s, new Date(2026, 0, 1, 0, i));
    const all = chart('yifan', s);
    expect(all.length).toBe(CHART_LIMIT);
    expect(all[0].text).toBe(`line ${CHART_LIMIT + 4}`);
  });
});
