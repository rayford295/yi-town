// Getting one photo ready to send, all in the browser: read when and where it was taken from its
// EXIF (before anything else, since redrawing on a canvas drops the EXIF), name it by a hash of the
// original file, and draw the two sizes the album keeps.
import exifr from 'exifr';
import { FULL_EDGE, THUMB_EDGE, stampFromExif, stampOf, validLatLng, type Upload } from './core';

export type Prepared = { meta: Omit<Upload, 'who'>; full: Blob; thumb: Blob };

async function hashId(file: File): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(buf).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** When and where, from the EXIF; the file's own date when the camera left none. */
export async function readExif(file: File): Promise<Pick<Upload, 'takenAt' | 'dateSource' | 'lat' | 'lng'>> {
  let tags: Record<string, unknown> | undefined;
  try { tags = await exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: false, icc: false, iptc: false }); } catch { /* none */ }
  const exifStamp = stampFromExif(tags?.DateTimeOriginal) ?? stampFromExif(tags?.CreateDate) ?? stampFromExif(tags?.ModifyDate);
  const lat = tags?.latitude, lng = tags?.longitude;
  const located = validLatLng(lat, lng);
  return {
    takenAt: exifStamp ?? stampOf(new Date(file.lastModified || Date.now())),
    dateSource: exifStamp ? 'exif' : 'file',
    lat: located ? (lat as number) : null,
    lng: located ? (lng as number) : null,
  };
}

function draw(bitmap: ImageBitmap, edge: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((done) => canvas.toBlob(done, 'image/jpeg', quality));
}

/** null when the browser cannot open the picture (a HEIC on a desktop Chrome, say). */
export async function prepare(file: File): Promise<Prepared | null> {
  const [id, when] = await Promise.all([hashId(file), readExif(file)]);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { return null; }
  try {
    const [full, thumb] = await Promise.all([draw(bitmap, FULL_EDGE, 0.86), draw(bitmap, THUMB_EDGE, 0.8)]);
    if (!full || !thumb) return null;
    return { meta: { id, ...when, name: file.name, w: bitmap.width, h: bitmap.height }, full, thumb };
  } finally { bitmap.close(); }
}
