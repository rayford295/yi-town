// The front door: one password, known to the two of us. It is stored as a SHA-256 hash, so the
// bundle does not spell it out; a pass is remembered on the device.
// Owner: to change the password, regenerate ANSWERS with `npm run gate -- "<the new password>"`
// and change KEY's number, so that every device is asked again.
// This keeps a passer-by out. It is not access control: the site is static and its files are public.
import { sha256Hex } from './sha256';
import { safeStorage } from './storage';

// "yi.gate" (no number) was the question the site asked until 1.23; a pass of that one no longer counts.
const KEY = 'yi.gate.2';
const store = safeStorage();

/** Digits only, so separators typed out of habit ("-", ".", spaces) do not matter. */
export const normalise = (s: string): string => s.replace(/\D+/g, '');

// sha256 of the password's eight digits; exactly one.
export const ANSWERS: readonly string[] = [
  '48c2aea4aa532ace53a7d3cce44c843cccf31ff29f3d952a51634b551f3b293e',
];

export async function hash(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
    } catch { /* fall through */ }
  }
  return sha256Hex(text);
}

export const gatePassed = (): boolean => store.getItem(KEY) === '1';

/** True (and remembered) when `answer` is one of ours. */
export async function tryGate(answer: string, answers: readonly string[] = ANSWERS): Promise<boolean> {
  const n = normalise(answer);
  if (!n) return false;
  const h = await hash(n);
  if (!answers.includes(h)) return false;
  store.setItem(KEY, '1');
  return true;
}
