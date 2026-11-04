import { describe, expect, it } from 'vitest';
import { doctorNowKey, minutesSince } from './now';
import { dict } from '../../core/i18n';

describe('the doctor right now', () => {
  it('has a line for every time of day, in both languages', () => {
    for (const h of [0, 3, 6.5, 9, 12, 16.9, 17, 18.5, 19, 23]) {
      const k = doctorNowKey(h);
      expect(dict.zh[k], `${h} zh`).toBeTruthy();
      expect(dict.en[k], `${h} en`).toBeTruthy();
      expect(dict.zh[k]).toContain('{time}');
    }
    expect(doctorNowKey(3)).toBe('clinic.rx.now.night');
    expect(doctorNowKey(10)).toBe('clinic.rx.now.day');
  });
  it('counts a visit in whole minutes and never says zero', () => {
    expect(minutesSince(1000, 1000 + 20_000)).toBe(1);
    expect(minutesSince(0, 12 * 60_000 + 20_000)).toBe(12);
  });
});
