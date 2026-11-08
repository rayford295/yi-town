import { describe, expect, it } from 'vitest';
import { config } from '../../core/config';
import { arrivesNextDay, legHours, tripState } from './plan';

const { out, back } = config.trip;
const at = (iso: string) => new Date(iso);

describe('the two legs', () => {
  it('knows how long each flight is', () => {
    expect(legHours(out)).toBe(15.5);
    expect(legHours(back)).toBe(16.25);
  });
  it('knows that only the flight home lands the next day', () => {
    expect(arrivesNextDay(out)).toBe(false);
    expect(arrivesNextDay(back)).toBe(true);
  });
});

describe('tripState', () => {
  it('counts down to boarding before she leaves', () => {
    const s = tripState(at('2026-11-08T12:00:00Z'));
    expect(s.phase).toBe('before');
    expect(s.until?.toISOString()).toBe(at(out.departs).toISOString());
  });
  it('is in the air between take-off and landing, counting down to landing', () => {
    const s = tripState(at('2027-02-04T05:00:00Z'));
    expect(s.phase).toBe('out');
    expect(s.until?.toISOString()).toBe(at(out.arrives).toISOString());
  });
  it('counts the days together by the New York calendar, landing day as day 1 of 11', () => {
    expect(tripState(at(out.arrives))).toMatchObject({ phase: 'together', day: 1, total: 11 });
    // 23:30 on 4 Feb in New York is already 5 Feb in UTC and in Hong Kong: still day 1.
    expect(tripState(at('2027-02-05T04:30:00Z')).day).toBe(1);
    expect(tripState(at('2027-02-10T12:00:00Z')).day).toBe(7);
    expect(tripState(at('2027-02-14T15:00:00Z'))).toMatchObject({ phase: 'together', day: 11 });
  });
  it('counts down to her landing at home on the way back', () => {
    const s = tripState(at('2027-02-14T20:00:00Z'));
    expect(s.phase).toBe('back');
    expect(s.until?.toISOString()).toBe(at(back.arrives).toISOString());
  });
  it('has nothing left to count after she is home', () => {
    expect(tripState(at('2027-02-16T00:00:00Z'))).toMatchObject({ phase: 'after', until: null });
  });
});

describe('tripStatus (the dashboard line)', () => {
  it('says how many days are left before she boards', async () => {
    const { setLang } = await import('../../core/i18n');
    const { tripStatus } = await import('./plan');
    setLang('zh');
    expect(tripStatus(at('2027-01-04T01:30:00Z'))).toBe('还有 31 天');
    setLang('en');
    expect(tripStatus(at('2027-02-03T01:30:00Z'))).toBe('1 day to go');
    expect(tripStatus(at('2027-02-10T12:00:00Z'))).toBe('Together · day 7 of 11');
    expect(tripStatus(at('2027-02-04T05:00:00Z'))).toBe('In the air');
  });
});
