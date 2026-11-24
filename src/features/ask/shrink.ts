// A phone photo is 3 to 8 MB and one email carries 18 MB of files, so large photos are scaled
// down before they are attached. Anything that cannot be shrunk (a document, a HEIC photo the
// browser cannot decode, a browser with no canvas) is attached exactly as it is.
const SHRINKABLE = ['image/jpeg', 'image/png', 'image/webp'];
const WORTH_IT = 1.5 * 1024 * 1024;

/** The same picture with its long edge at most `maxEdge`, as a JPEG, when that is smaller. */
export async function shrink(file: File, maxEdge = 2400): Promise<File> {
  if (!SHRINKABLE.includes(file.type) || file.size <= WORTH_IT) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';   // a transparent PNG becomes a JPEG on white, not on black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
  } catch { return file; }
}
