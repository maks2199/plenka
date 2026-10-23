import { S } from './store';
import type { Ev, EventMeta, Photo } from './types';
import { DAY, HOUR, MON_NOM, MON_PREP, dayDiff, dayKey, fmtN, fmtRange, hav, parseNum, plural, sampleEvenly } from './format';

export interface ClusterOpts { gapDays: number; minPhotos: number; useFileDates: boolean; cuts: Set<string>; joins: Set<string> }

/** Нарезка ленты на события: новое событие после `gapDays` календарных дней подряд без кадров.
 *  Ручные разрезы (cuts) и склейки (joins) по ключу кадра сильнее автоматики. */
export function clusterPhotos(photos: Photo[], o: ClusterOpts): Ev[] {
  const ps = photos.filter(p => p.t != null && (o.useFileDates || p.tsrc !== 'file')).sort((a, b) => a.t! - b.t!);
  const out: Ev[] = [];
  let cur: Photo[] | null = null;
  const N = Math.max(0, +o.gapDays || 0);
  ps.forEach((p, i) => {
    const prev = ps[i - 1];
    let cut = !prev || dayDiff(prev.t!, p.t!) >= N + 1;
    if (prev && o.cuts.has(p.key)) cut = true;
    if (prev && o.joins.has(p.key)) cut = false;
    if (cut || !cur) { cur = []; out.push({ key: '', photos: cur, start: 0, end: 0, days: 0, idx: 0, small: false }); }
    cur.push(p);
  });
  out.forEach((e, i) => {
    e.key = e.photos[0].key;
    e.start = e.photos[0].t!;
    e.end = e.photos[e.photos.length - 1].t!;
    e.days = new Set(e.photos.map(p => dayKey(p.t!))).size;
    e.idx = i;
    e.small = e.photos.length < o.minPhotos;
  });
  return out;
}

export function rebuild(): void {
  S.events = clusterPhotos(S.photos, { gapDays: S.cfg.gapDays, minPhotos: S.cfg.minPhotos, useFileDates: S.cfg.useFileDates, cuts: S.cuts, joins: S.joins });
  if (S.ev >= S.events.length) S.ev = Math.max(0, S.events.length - 1);
}

export function usable(p: Photo): boolean { return p.t != null && (S.cfg.useFileDates || p.tsrc !== 'file'); }
export function metaOf(e: Ev): EventMeta { return S.cfg.meta[e.key] || (S.cfg.meta[e.key] = {}); }
const peek = (e: Ev): EventMeta => S.cfg.meta[e.key] || {};
export function inGame(e: Ev): boolean { const m = S.cfg.meta[e.key]; if (m && m.skip != null) return !m.skip; return !e.small; }
export function gameEvents(): Ev[] { return S.events.filter(inGame); }
export function livePhotos(e: Ev): Photo[] { return e.photos.filter(p => !S.excluded.has(p.key)); }

const GENERIC_DIR = /^(dcim|camera|\d{3}[a-z_]*|img|images|photos?|pictures|фото|фотографии|download|downloads|screenshots?|whatsapp.*|telegram.*|media|private|var|mobile|recents|apple|icloud.*|google.*|takeout|out|export|new folder|новая папка|\d+)$/i;
/** Имя папки или архива, если в ней лежит больше половины кадров события. */
export function folderHint(e: Ev): string | null {
  const cnt = new Map<string, number>();
  e.photos.forEach(p => {
    const seg = (p.dir || '').split('/').filter(Boolean).reverse().find(s => !GENERIC_DIR.test(s));
    if (seg) cnt.set(seg, (cnt.get(seg) || 0) + 1);
  });
  let best: string | null = null, n = 0;
  cnt.forEach((v, k) => { if (v > n) { best = k; n = v; } });
  if (!best || n < e.photos.length * 0.5) return null;
  const s = (best as string).replace(/\.zip$/i, '').replace(/^\d{6,8}[_\- ]*/, '').replace(/[_\-]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : null;
}
export function holidayOf(e: Ev): string | null {
  const A = new Date(e.start);
  const m = A.getMonth() + 1, d = A.getDate();
  const has = (mm: number, dd: number) => e.photos.some(p => { const x = new Date(p.t!); return x.getMonth() + 1 === mm && x.getDate() === dd; });
  if (has(12, 31) || has(1, 1)) return 'Новый год';
  if (m === 1 && d <= 8) return 'Новогодние';
  if (m === 5 && d <= 11) return 'Майские';
  if (has(3, 8)) return '8 Марта';
  if (has(2, 23)) return '23 Февраля';
  if (m === 11 && d >= 1 && d <= 5) return 'Ноябрьские';
  return null;
}
export function autoTitle(e: Ev): { t: string; why: string } {
  const f = folderHint(e);
  if (f) return { t: f, why: 'по названию папки' };
  const y = new Date(e.start).getFullYear();
  const h = holidayOf(e);
  if (h) return { t: `${h} ${y}`, why: 'по дате' };
  const M = MON_NOM[new Date(e.start).getMonth()];
  return { t: M.charAt(0).toUpperCase() + M.slice(1) + ' ' + y + (e.days > 1 ? `, ${e.days} ${plural(e.days, ['день', 'дня', 'дней'])}` : ''), why: 'по дате' };
}
export function titleOf(e: Ev): string { const m = peek(e); return (m.title && m.title.trim()) || autoTitle(e).t; }

export function qDrafts(e: Ev): string[] {
  const A = new Date(e.start), y = A.getFullYear(), mp = MON_PREP[A.getMonth()];
  const h = holidayOf(e);
  const out: string[] = [];
  const evs = gameEvents();
  if (h === 'Новый год') out.push(`Где встречали Новый год ${new Date(e.end).getFullYear()}?`);
  else if (h) out.push(`Где мы были на ${h.toLowerCase()} ${y}?`);
  if (evs.length > 2 && e.days > 1 && evs.every(x => x === e || x.days <= e.days)) out.push('Самое долгое событие года?');
  if (evs.length > 2 && evs.every(x => x === e || x.photos.length <= e.photos.length)) out.push('Где мы снимали больше всего?');
  if (e.days >= 3) out.push(`Куда мы пропали на ${e.days} ${plural(e.days, ['день', 'дня', 'дней'])} в ${mp}?`);
  out.push(`Что это было в ${mp} ${y}?`);
  out.push('Что объединяет эти четыре кадра?');
  const late = e.photos.filter(p => { const x = new Date(p.t!).getHours(); return x >= 22 || x < 4; }).length;
  if (late > e.photos.length * 0.4) out.push('Самая поздняя ночь — где?');
  return [...new Set(out)];
}
export function qOf(e: Ev): string { const m = peek(e); if (m.q && m.q.trim()) return m.q; const d = qDrafts(e); return d[(m.qv || 0) % d.length]; }
export function defaultAnswer(e: Ev): string { return `${fmtRange(e.start, e.end)} · ${e.photos.length} ${plural(e.photos.length, ['кадр', 'кадра', 'кадров'])}`; }
export function aOf(e: Ev): string { const m = peek(e); return (m.a && m.a.trim()) || defaultAnswer(e); }

/** Км: вручную → GPX-трек в окне события → сумма шагов между геометками (прыжки > 25 км отбрасываем как транспорт). */
export function kmOf(e: Ev): { v: number | null; src: '' | 'вручную' | 'GPX' | 'геометки' } {
  const man = parseNum(peek(e).km);
  if (man != null) return { v: man, src: 'вручную' };
  const a = e.start - 2 * HOUR, b = e.end + 2 * HOUR;
  let g = 0, used = false;
  for (const tr of S.gpx) {
    const timed = tr.pts.some(p => isFinite(p.t));
    const pts = timed ? tr.pts.filter(p => p.t >= a && p.t <= b) : [];
    for (let i = 1; i < pts.length; i++) { g += hav(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon); used = true; }
  }
  if (used && g > 0.2) return { v: Math.round(g * 10) / 10, src: 'GPX' };
  const geo = e.photos.filter(p => p.lat != null && p.lon != null);
  if (geo.length >= 2) {
    let s = 0;
    for (let i = 1; i < geo.length; i++) { const d = hav(geo[i - 1].lat!, geo[i - 1].lon!, geo[i].lat!, geo[i].lon!); if (d < 25) s += d; }
    if (s > 0.5) return { v: Math.round(s * 10) / 10, src: 'геометки' };
  }
  return { v: null, src: '' };
}
export function chatIn(e: Ev) { if (!S.chat.length) return []; const a = e.start - 3 * HOUR, b = e.end + 3 * HOUR; return S.chat.filter(m => m.t >= a && m.t <= b); }
export function pplOf(e: Ev): number | null { return parseNum(peek(e).ppl); }

export function coverOf(e: Ev): Photo {
  const m = peek(e), lp = livePhotos(e);
  return (m.cover && lp.find(p => p.key === m.cover)) || lp[0] || e.photos[0];
}
export function collageOf(e: Ev): Photo[] {
  const m = peek(e), lp = livePhotos(e);
  let c = (m.collage || []).map(k => lp.find(p => p.key === k)).filter(Boolean) as Photo[];
  if (c.length < 4) c = c.concat(sampleEvenly(lp.filter(p => !c.includes(p)), 4 - c.length));
  return c.slice(0, 4);
}
export function storyOf(e: Ev): Photo[] {
  const m = peek(e), lp = livePhotos(e);
  if (m.story && m.story.length) return lp.filter(p => m.story!.includes(p.key));
  return sampleEvenly(lp, S.cfg.game.storyMax);
}
export function nearestPhoto(t: number, win: number): Photo | null {
  let best: Photo | null = null, d = win;
  for (const e of gameEvents()) for (const p of livePhotos(e)) { const x = Math.abs(p.t! - t); if (x < d) { d = x; best = p; } }
  return best;
}
export function spanLabel(): string {
  const ts = S.photos.filter(usable).map(p => p.t!);
  return ts.length ? fmtRange(Math.min(...ts), Math.max(...ts)) : '—';
}

