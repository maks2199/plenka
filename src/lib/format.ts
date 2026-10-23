export const HOUR = 3600e3;
export const DAY = 86400e3;
export const MON_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MON_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const MON_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
export const MON_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function plural(n: number, f: [string, string, string]): string {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2];
}
export function fmtN(n: number | string): string {
  return typeof n === 'number' ? n.toLocaleString('ru-RU', { maximumFractionDigits: 1 }).replace(/ /g, ' ') : String(n);
}
export const pad2 = (n: number) => String(n).padStart(2, '0');
export function extOf(n: string): string { const m = /\.([a-z0-9]+)$/i.exec(n || ''); return m ? m[1].toLowerCase() : ''; }
export function dayKey(t: number): number { const d = new Date(t); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); }
/** Разница в календарных днях: 0 — тот же день, 1 — соседние. */
export function dayDiff(a: number, b: number): number {
  const A = new Date(a), B = new Date(b);
  A.setHours(12, 0, 0, 0); B.setHours(12, 0, 0, 0);
  return Math.round((B.getTime() - A.getTime()) / DAY);
}
export function fmtRange(a: number, b: number): string {
  const A = new Date(a), B = new Date(b);
  if (dayKey(a) === dayKey(b)) return `${A.getDate()} ${MON_GEN[A.getMonth()]} ${A.getFullYear()}`;
  if (A.getFullYear() === B.getFullYear() && A.getMonth() === B.getMonth()) return `${A.getDate()}–${B.getDate()} ${MON_GEN[A.getMonth()]} ${A.getFullYear()}`;
  if (A.getFullYear() === B.getFullYear()) return `${A.getDate()} ${MON_GEN[A.getMonth()]} – ${B.getDate()} ${MON_GEN[B.getMonth()]} ${A.getFullYear()}`;
  return `${A.getDate()} ${MON_GEN[A.getMonth()]} ${A.getFullYear()} – ${B.getDate()} ${MON_GEN[B.getMonth()]} ${B.getFullYear()}`;
}
export function fmtShort(t: number): string { const d = new Date(t); return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`; }
export function fmtDT(t: number): string { const d = new Date(t); return `${d.getDate()} ${MON_GEN[d.getMonth()]} ${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
export function fmtTime(t: number): string { const d = new Date(t); return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
export function monYear(t: number): string { const d = new Date(t); return `${MON_SHORT[d.getMonth()]} ${d.getFullYear()}`; }
export function fmtBytes(b: number): string { return b > 1e9 ? `${fmtN(Math.round(b / 1e8) / 10)} ГБ` : `${fmtN(Math.round(b / 1e6))} МБ`; }
/** Расстояние по большому кругу, км. */
export function hav(a: number, b: number, c: number, d: number): number {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export function mulberry(seed: number): () => number {
  let a = seed;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function sampleEvenly<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr.slice();
  const st = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * st)]);
}
export function parseNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.').replace(/\s/g, ''));
  return isFinite(n) ? n : null;
}
const FN_DATE = /(?:^|[^0-9])(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?:[-_ T.]?([01]\d|2[0-3])[-_.:]?([0-5]\d)[-_.:]?([0-5]\d))?/;
/** Дата из имени вроде IMG_20250720_180211.jpg, PXL_20250720…, IMG-20250720-WA0003.jpg */
export function dateFromName(n: string): number | null {
  const m = FN_DATE.exec(n);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0);
  return isNaN(d.getTime()) ? null : d.getTime();
}
