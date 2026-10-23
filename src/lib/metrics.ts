import { S } from './store';
import type { Metric, RecordLine, Ev } from './types';
import { fmtN, plural } from './format';
import { gameEvents, kmOf, livePhotos, pplOf, titleOf } from './events';

const reEscape = (s: string) => s.replace(/[.*+?^${}()[\]\\]/g, '\\$&');
export function phraseRegex(pattern: string): RegExp | null {
  const parts = pattern.split('|').map(s => s.trim()).filter(Boolean).map(reEscape);
  return parts.length ? new RegExp(parts.join('|'), 'i') : null;
}

/** Итоги «по смыслу» — всё, что можно посчитать из событий, геометок и переписки. */
export function metrics(): Metric[] {
  const evs = gameEvents();
  const out: Metric[] = [];
  out.push({ id: 'events', num: evs.length, unit: '', label: plural(evs.length, ['событие', 'события', 'событий']), src: 'события' });
  out.push({ id: 'days', num: evs.reduce((s, e) => s + e.days, 0), unit: 'дн', label: 'вместе', src: 'события · дни с кадрами' });
  const kms = evs.map(kmOf).filter(k => k.v != null);
  out.push({ id: 'km', num: Math.round(kms.reduce((s, k) => s + (k.v || 0), 0) * 10) / 10, unit: 'км', label: 'пройдено', src: 'GPX → геометки → вручную', note: kms.length < evs.length ? `км есть у ${kms.length} из ${evs.length}` : '' });
  const ph = evs.reduce((s, e) => s + livePhotos(e).length, 0);
  out.push({ id: 'photos', num: ph, unit: '', label: plural(ph, ['кадр', 'кадра', 'кадров']), src: 'фото в событиях' });
  const cells = new Set<string>();
  evs.forEach(e => e.photos.forEach(p => { if (p.lat != null && p.lon != null) cells.add(Math.round(p.lat * 20) + ':' + Math.round(p.lon * 20)); }));
  if (cells.size) out.push({ id: 'places', num: cells.size, unit: '', label: 'точек на карте', src: 'геометки · сетка ~5 км' });
  const nights = evs.reduce((s, e) => s + Math.max(0, e.days - 1), 0);
  if (nights) out.push({ id: 'nights', num: nights, unit: '', label: plural(nights, ['ночь вне дома', 'ночи вне дома', 'ночей вне дома']), src: 'многодневные события' });
  const late = evs.reduce((s, e) => s + livePhotos(e).filter(p => new Date(p.t!).getHours() < 5).length, 0);
  if (late) out.push({ id: 'late', num: late, unit: '', label: 'кадров после полуночи', src: 'время съёмки' });
  if (S.chat.length) {
    out.push({ id: 'msgs', num: S.chat.length, unit: '', label: 'сообщений в чате', src: 'переписка' });
    const cnt = new Map<string, number>();
    S.chat.forEach(m => cnt.set(m.a, (cnt.get(m.a) || 0) + 1));
    const top = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) out.push({ id: 'topa', num: top[0], unit: '', label: 'главный голос чата', note: `${fmtN(top[1])} ${plural(top[1], ['сообщение', 'сообщения', 'сообщений'])}`, src: 'переписка · топ автор' });
  }
  S.cfg.phrases.forEach((p, i) => {
    if (!S.chat.length) return;
    const re = phraseRegex(p.pattern);
    if (!re) return;
    const hits = S.chat.filter(m => re.test(m.x));
    const c = new Map<string, number>();
    hits.forEach(m => c.set(m.a, (c.get(m.a) || 0) + 1));
    const top = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push({ id: 'ph:' + i, num: hits.length, unit: '', label: p.label || p.pattern, note: top ? `чаще всех — ${top[0]}, ${top[1]}` : '', src: `чат · поиск «${p.pattern}»`, del: { kind: 'phrases', i } });
  });
  S.cfg.manual.forEach((m, i) => out.push({ id: 'man:' + i, num: m.value, unit: m.unit || '', label: m.label, src: 'вручную', del: { kind: 'manual', i } }));
  return out;
}

export function records(): RecordLine[] {
  const evs = gameEvents();
  if (evs.length < 2) return [];
  const best = (f: (e: Ev) => number | null) => evs.reduce<Ev | null>((b, e) => { const v = f(e); return v != null && (b == null || v > (f(b) ?? -Infinity)) ? e : b; }, null);
  const out: RecordLine[] = [];
  const L = best(e => (e.days > 1 ? e.days : null));
  if (L) out.push({ k: 'самое долгое', t: titleOf(L), v: `${L.days} ${plural(L.days, ['день', 'дня', 'дней'])}` });
  const P = best(e => e.photos.length);
  if (P) out.push({ k: 'больше всего кадров', t: titleOf(P), v: fmtN(P.photos.length) });
  const K = best(e => kmOf(e).v);
  if (K) out.push({ k: 'больше всего км', t: titleOf(K), v: `${fmtN(kmOf(K).v!)} км` });
  const H = best(e => pplOf(e));
  if (H) out.push({ k: 'самое людное', t: titleOf(H), v: `${fmtN(pplOf(H)!)} чел` });
  return out.slice(0, 3);
}
