import type { Photo } from '../src/lib/types';
let n = 0;
export function ph(date: string, extra: Partial<Photo> = {}): Photo {
  const b = new Blob(['x']);
  n++;
  return { key: `p${n}|1`, name: `IMG_${n}.jpg`, dir: '', t: new Date(date).getTime(), tsrc: 'exif', lat: null, lon: null, w: 1, h: 1, full: b, thumb: b, fullUrl: '', thumbUrl: '', ...extra };
}
