import { extOf } from './format';

type Drawable = ImageBitmap | HTMLImageElement;

/** Декодирует фото; HEIC/HEIF, которые браузер не умеет (Chrome, Firefox), конвертируем через heic2any — грузится лениво. */
export async function decode(blob: Blob, name: string): Promise<Drawable> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    const ext = extOf(name);
    if (ext === 'heic' || ext === 'heif') {
      const { default: heic2any } = await import('heic2any');
      let out = await heic2any({ blob, toType: 'image/jpeg', quality: 0.9 });
      if (Array.isArray(out)) out = out[0];
      return await createImageBitmap(out as Blob);
    }
    const url = URL.createObjectURL(blob);
    try {
      const im = new Image();
      im.src = url;
      await im.decode();
      return im;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

export function closeDrawable(d: Drawable): void { if ('close' in d) d.close(); }

/** Уменьшает до max по длинной стороне и кодирует в JPEG. */
export function resize(img: Drawable, max: number, q: number): Promise<{ blob: Blob; w: number; h: number }> {
  const W = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const H = 'naturalHeight' in img ? img.naturalHeight : img.height;
  const k = Math.min(1, max / Math.max(W, H));
  const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, w, h);
  return new Promise((res, rej) => c.toBlob(b => (b ? res({ blob: b, w, h }) : rej(new Error('toBlob failed'))), 'image/jpeg', q));
}

export function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b); });
}
