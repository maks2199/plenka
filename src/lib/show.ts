import { S } from './store';
import type { ChatMsg, Photo, ShowData, Slide } from './types';
import { DAY, HOUR, fmtDT, fmtN, fmtRange, fmtShort, monYear, mulberry, plural } from './format';
import { aOf, collageOf, coverOf, gameEvents, kmOf, livePhotos, nearestPhoto, pplOf, qOf, storyOf, titleOf } from './events';
import { metrics, records } from './metrics';

/** Пул цитат для «Кто это написал?»: активные авторы (5+ сообщений) и короткие однострочные реплики без ссылок. */
export function whoPool(): { msgs: ChatMsg[]; authors: string[] } {
  if (!S.chat.length) return { msgs: [], authors: [] };
  const cnt = new Map<string, number>();
  S.chat.forEach(m => cnt.set(m.a, (cnt.get(m.a) || 0) + 1));
  const authors = [...cnt.entries()].filter(x => x[1] >= 5).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  if (authors.length < 2) return { msgs: [], authors: [] };
  const msgs = S.chat.filter(m => authors.includes(m.a) && m.x.length >= 18 && m.x.length <= 150 && !/https?:\/\//.test(m.x) && !/\n/.test(m.x));
  return { msgs, authors };
}

/** Собирает сценарий показа. `used` — кадры в порядке индексов, на которые ссылаются слайды. */
export function buildShow(): { D: ShowData; used: Photo[] } {
  const g = S.cfg.game;
  const evs = gameEvents();
  const used: Photo[] = [];
  const idx = new Map<string, number>();
  const ix = (p: Photo) => { if (!idx.has(p.key)) { idx.set(p.key, used.length); used.push(p); } return idx.get(p.key)!; };
  const rnd = mulberry(g.seed);
  const slides: Slide[] = [{ kind: 'intro' }];
  const pool = whoPool();
  const usedMsg = new Set<ChatMsg>();
  evs.forEach((e, i) => {
    const title = titleOf(e), date = fmtRange(e.start, e.end);
    const m = S.cfg.meta[e.key] || {};
    if (g.guess) slides.push({ kind: 'guess', ev: i, collage: collageOf(e).map(ix), q: qOf(e), aT: title, aX: aOf(e) });
    slides.push({ kind: 'title', ev: i, bg: ix(coverOf(e)), title, date, blurb: m.blurb || '' });
    const st = storyOf(e);
    st.forEach((p, k) => slides.push({ kind: 'story', ev: i, im: ix(p), si: k, sn: st.length, cap: g.caption ? `${title} · ${fmtDT(p.t!)}` : '' }));
    const n = i + 1;
    if (n < evs.length && g.beforeEvery > 0 && n % g.beforeEvery === 0 && evs.length >= 2) {
      const a = Math.floor(rnd() * evs.length);
      let b = Math.floor(rnd() * evs.length);
      if (a === b) b = (a + 1 + Math.floor(rnd() * (evs.length - 1))) % evs.length;
      const pa = storyOf(evs[a]), pb = storyOf(evs[b]);
      if (pa.length && pb.length) {
        const A = pa[Math.floor(rnd() * pa.length)], B = pb[Math.floor(rnd() * pb.length)];
        const diff = Math.round(Math.abs(A.t! - B.t!) / DAY);
        const earlier = A.t! < B.t!;
        slides.push({
          kind: 'before',
          a: { im: ix(A), t: A.t!, d: fmtDT(A.t!) },
          b: { im: ix(B), t: B.t!, d: fmtDT(B.t!) },
          note: `${earlier ? 'A' : 'B'} — раньше на ${fmtN(diff)} ${plural(diff, ['день', 'дня', 'дней'])}: «${titleOf(evs[earlier ? a : b])}»`
        });
      }
    }
    if (n < evs.length && g.whoEvery > 0 && n % g.whoEvery === 0 && pool.msgs.length) {
      const cand = pool.msgs.filter(x => !usedMsg.has(x));
      if (cand.length) {
        const msg = cand[Math.floor(rnd() * cand.length)];
        usedMsg.add(msg);
        const others = pool.authors.filter(a => a !== msg.a).sort(() => rnd() - 0.5).slice(0, 3);
        const opts = others.concat([msg.a]).sort(() => rnd() - 0.5);
        const near = nearestPhoto(msg.t, 3 * HOUR);
        slides.push({ kind: 'who', text: msg.x, author: msg.a, opts, when: fmtDT(msg.t), bg: near ? ix(near) : null });
      }
    }
  });
  if (g.reflect && g.reflectText.trim()) slides.push({ kind: 'reflect', text: g.reflectText });
  slides.push({ kind: 'stats' }, { kind: 'summary' }, { kind: 'outro' });

  const ms = metrics().filter(m => !S.cfg.statsOff[m.id]).slice(0, 6);
  const first = evs[0], last = evs[evs.length - 1];
  const y0 = first ? new Date(first.start).getFullYear() : 0, y1 = last ? new Date(last.end).getFullYear() : 0;
  const period = first ? (y0 === y1 ? String(y0) : `${y0}–${y1}`) : '';
  const nEv = `${evs.length} ${plural(evs.length, ['событие', 'события', 'событий'])}`;
  const D: ShowData = {
    intro: { eyebrow: g.eyebrow, title: g.title, sub: first ? `${nEv} · ${monYear(first.start)} → ${monYear(last.end)}` : '' },
    outro: { title: g.outro, sub: g.outroSub || (first ? `${nEv} · ${fmtN(evs.reduce((s, e) => s + e.photos.length, 0))} кадров` : '') },
    statsTitle: g.statsTitle || `${period} в цифрах`,
    storySec: +g.storySec || 4,
    titleSec: +g.titleSec || 2.4,
    events: evs.map(e => ({ title: titleOf(e), date: fmtShort(e.start) })),
    stats: ms.map(m => ({ num: typeof m.num === 'number' ? fmtN(m.num) : m.num, unit: m.unit, label: m.label, note: m.note || '' })),
    records: records(),
    summary: evs.map(e => {
      const k = kmOf(e).v, p = pplOf(e);
      return { date: fmtShort(e.start), title: titleOf(e), type: (S.cfg.meta[e.key] || {}).type || '', days: e.days, km: k != null ? fmtN(k) : null, ppl: p != null ? fmtN(p) : null, n: livePhotos(e).length };
    }),
    slides
  };
  return { D, used };
}

export interface FlowItem { c: '' | 't' | 'ins' | 'end'; k?: string; t: string; x: string }
/** Сценарий для боковой панели: сторис схлопнуты в одну строку на событие. */
export function flowItems(): { out: FlowItem[]; D: ShowData } {
  const { D } = buildShow();
  const out: FlowItem[] = [];
  let storyN = 0;
  const pad = (n: number) => String(n + 1).padStart(2, '0');
  const flush = () => { if (storyN) { out.push({ c: '', t: `сторис ×${storyN}`, x: `${D.storySec} с/кадр` }); storyN = 0; } };
  for (const s of D.slides) {
    if (s.kind === 'story') { storyN++; continue; }
    flush();
    if (s.kind === 'intro') out.push({ c: 't', t: `Интро · «${D.intro.title}»`, x: 'Space' });
    else if (s.kind === 'guess') out.push({ c: '', k: pad(s.ev), t: `Угадай событие: ${s.q}`, x: 'коллаж' });
    else if (s.kind === 'title') out.push({ c: 't', k: pad(s.ev), t: `Титул · ${s.title}`, x: `${D.titleSec} с` });
    else if (s.kind === 'before') out.push({ c: 'ins', t: 'Вставка · Что было раньше?', x: 'A/B' });
    else if (s.kind === 'who') out.push({ c: 'ins', t: `Вставка · Кто это написал? (${s.author})`, x: 'чат' });
    else if (s.kind === 'reflect') out.push({ c: 'ins', t: `Рефлексия · ${s.text}`, x: '' });
    else if (s.kind === 'stats') out.push({ c: 'end', t: D.statsTitle, x: `${D.stats.length} цифр` });
    else if (s.kind === 'summary') out.push({ c: 'end', t: 'Все события · таблица', x: '' });
    else if (s.kind === 'outro') out.push({ c: 't', t: `Финал · «${D.outro.title}»`, x: '' });
  }
  flush();
  return { out, D };
}
