import { useSyncExternalStore } from 'react';
import type { Cfg, ChatMsg, Ev, GameCfg, GpxTrack, Photo, Source } from './types';
import { putKV } from './db';
import type { StorageInfo } from './db';

export type Tab = 'load' | 'events' | 'game' | 'stats';

export const defaultGame = (): GameCfg => ({
  eyebrow: 'Наша компания', title: 'Год в кадрах', outro: 'Спасибо, что были рядом', outroSub: '', statsTitle: '',
  storyMax: 18, storySec: 4, titleSec: 2.4, guess: true, caption: true, beforeEvery: 3, whoEvery: 4,
  reflect: true, reflectText: 'Что вам запомнилось больше всего?', seed: 7
});
export const defaultCfg = (): Cfg => ({
  gapDays: 1, minPhotos: 4, useFileDates: true, meta: {}, game: defaultGame(), statsOff: {},
  phrases: [{ label: 'раз «а кто взял…?»', pattern: 'кто взял' }], manual: []
});

/* Одно изменяемое состояние + счётчик версий. Компоненты подписываются через useStore()
   и перерисовываются целиком — для сотен событий и тысяч миниатюр этого хватает. */
export const S = {
  ready: false,
  photos: [] as Photo[],
  byKey: new Map<string, Photo>(),
  chat: [] as ChatMsg[],
  gpx: [] as GpxTrack[],
  sources: [] as Source[],
  events: [] as Ev[],
  demo: false,
  tab: 'load' as Tab,
  ev: 0,
  ph: 0,
  busy: 0,
  cfg: defaultCfg(),
  cuts: new Set<string>(),
  joins: new Set<string>(),
  excluded: new Set<string>(),
  music: null as null | { name: string; blob: Blob; url: string },
  storage: null as StorageInfo | null,
  toast: null as null | string,
  playing: false
};

let version = 0;
const subs = new Set<() => void>();
export function emit(): void { version++; subs.forEach(f => f()); }
export function useStore(): number {
  return useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => version);
}

let saveT: ReturnType<typeof setTimeout> | undefined;
/** Сохраняет конфиг и ручные правки (разрезы, склейки, убранные кадры). Не трогает демо. */
export function saveCfg(): void {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    if (S.demo) return;
    putKV('cfg', { ...S.cfg, cuts: [...S.cuts], joins: [...S.joins], excluded: [...S.excluded] }).catch(e => console.warn('save cfg', e));
  }, 300);
}
export function loadCfgInto(raw: (Partial<Cfg> & { cuts?: string[]; joins?: string[]; excluded?: string[] }) | undefined): void {
  if (!raw) return;
  const g = { ...defaultGame(), ...(raw.game || {}) };
  const { cuts, joins, excluded, ...rest } = raw;
  S.cfg = { ...defaultCfg(), ...rest, game: g };
  S.cuts = new Set(cuts || []);
  S.joins = new Set(joins || []);
  S.excluded = new Set(excluded || []);
}

let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string, ms = 2600): void {
  S.toast = msg; emit();
  clearTimeout(toastT);
  if (ms) toastT = setTimeout(() => { S.toast = null; emit(); }, ms);
}
