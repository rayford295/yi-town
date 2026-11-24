import { afterEach, describe, expect, it, vi } from 'vitest';
import { shrink } from './shrink';

const file = (name: string, type: string, bytes: number) => new File([new Uint8Array(bytes)], name, { type });

// No canvas in the test environment, which is the point: whatever cannot be shrunk goes as it is.
describe('shrink', () => {
  it('leaves a document alone', async () => {
    const f = file('a.txt', 'text/plain', 10);
    expect(await shrink(f)).toBe(f);
  });
  it('leaves a HEIC photo alone, however large', async () => {
    const f = file('IMG_1.HEIC', 'image/heic', 3 * 1024 * 1024);
    expect(await shrink(f)).toBe(f);
  });
  it('leaves a small PNG alone', async () => {
    const f = file('shot.png', 'image/png', 1024 * 1024);
    expect(await shrink(f)).toBe(f);
  });
  it('gives back the original when a large JPEG cannot be decoded', async () => {
    const f = file('big.jpg', 'image/jpeg', 2 * 1024 * 1024);
    expect(await shrink(f)).toBe(f);
  });
  it('asks for the photo the way it was held, not the way the sensor lay (M6)', async () => {
    const seen: unknown[] = [];
    vi.stubGlobal('createImageBitmap', async (...args: unknown[]) => { seen.push(args[1]); throw new Error('stop here'); });
    await shrink(file('big.jpg', 'image/jpeg', 2 * 1024 * 1024));
    expect(seen).toEqual([{ imageOrientation: 'from-image' }]);
  });
});
afterEach(() => { vi.unstubAllGlobals(); });
