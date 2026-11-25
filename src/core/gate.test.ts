import { describe, expect, it } from 'vitest';
import { sha256Hex } from './sha256';
import { normalise, tryGate, hash, gatePassed, ANSWERS } from './gate';
import { dict } from './i18n';

describe('gate', () => {
  it('sha256 matches the reference vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('normalises to digits', () => {
    expect(normalise('1 月 2 日')).toBe('12');
    expect(normalise('2001-02-03')).toBe('20010203');
    expect(normalise('九月二十')).toBe('');
  });
  it('there is one password, and it is eight digits long', () => {
    expect(ANSWERS).toHaveLength(1);
    expect(ANSWERS[0]).toMatch(/^[0-9a-f]{64}$/);
  });
  it('a password opens the door, with or without separators, and is remembered', async () => {
    const mine = [await hash('20010203')];
    expect(await tryGate('2001-02-03', mine)).toBe(true);
    expect(await tryGate('20010203', mine)).toBe(true);
    expect(gatePassed()).toBe(true);
  });
  it('anything else stays outside, the short spellings the old question took included', async () => {
    for (const a of ['920', '0920', '9.20', '260920', '26-09-20', '9 月 20 日', '0925', '1031', '', 'love', '20260921']) {
      expect(await tryGate(a)).toBe(false);
    }
  });
  it('neither the page nor its hint gives the password away', async () => {
    for (const lang of ['zh', 'en'] as const) {
      for (const k of ['gate.placeholder', 'gate.question', 'gate.title', 'gate.wrong'] as const) {
        expect(await tryGate(normalise(dict[lang][k]))).toBe(false);
      }
    }
  });
});
