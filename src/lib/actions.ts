import { S, emit, saveCfg, toast, type Tab } from './store';
import { dayKey } from './format';
import { metaOf, rebuild, storyOf } from './events';

export function setTab(t: Tab): void { S.tab = t; emit(); window.scrollTo(0, 0); }
export function openEvent(i: number): void { S.ev = i; S.ph = 0; setTab('events'); }
export function selectEvent(i: number): void { S.ev = Math.max(0, Math.min(S.events.length - 1, i)); S.ph = 0; emit(); }
export function selectPhoto(i: number): void { const e = S.events[S.ev]; if (!e) return; S.ph = Math.max(0, Math.min(e.photos.length - 1, i)); emit(); }

export type PhotoAct = 'story' | 'coll' | 'cover' | 'x' | 'cut' | 'auto';
export function photoAction(act: PhotoAct): void {
  const e = S.events[S.ev];
  if (!e) return;
  const p = e.photos[S.ph];
  if (!p) return;
  const m = metaOf(e);
  if (act === 'story') {
    const cur = storyOf(e).map(x => x.key);
    m.story = cur.includes(p.key) ? cur.filter(k => k !== p.key) : cur.concat(p.key);
    if (!m.story.length) m.story = null;
  } else if (act === 'coll') {
    const cur = (m.collage || []).slice();
    const i = cur.indexOf(p.key);
    if (i >= 0) cur.splice(i, 1); else { cur.push(p.key); if (cur.length > 4) cur.shift(); }
    m.collage = cur.length ? cur : null;
  } else if (act === 'cover') {
    m.cover = m.cover === p.key ? null : p.key;
  } else if (act === 'x') {
    if (S.excluded.has(p.key)) S.excluded.delete(p.key); else S.excluded.add(p.key);
  } else if (act === 'cut') {
    if (S.ph === 0) return;
    S.cuts.add(p.key); S.joins.delete(p.key);
    rebuild();
    S.ev = S.events.findIndex(x => x.key === p.key);
    S.ph = 0;
    toast('Разрезано: с этого кадра начинается новое событие');
  } else if (act === 'auto') {
    m.story = null; m.collage = null;
  }
  saveCfg();
  emit();
}
export function joinPrev(): void {
  const e = S.events[S.ev];
  if (!e || e.idx === 0) return;
  const prevLen = S.events[S.ev - 1].photos.length;
  S.joins.add(e.key); S.cuts.delete(e.key);
  rebuild();
  S.ev = Math.max(0, S.ev - 1); S.ph = prevLen;
  saveCfg(); emit();
  toast('Склеено с предыдущим событием');
}
export function splitDays(): void {
  const e = S.events[S.ev];
  if (!e) return;
  e.photos.forEach((p, i) => { if (i && dayKey(p.t!) !== dayKey(e.photos[i - 1].t!)) { S.cuts.add(p.key); S.joins.delete(p.key); } });
  rebuild(); saveCfg(); emit();
  toast('Разрезано по дням');
}
export function setCfg<K extends keyof typeof S.cfg>(k: K, v: (typeof S.cfg)[K], recluster = false): void {
  S.cfg[k] = v;
  if (recluster) rebuild();
  saveCfg(); emit();
}
