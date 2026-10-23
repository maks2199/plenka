import { S, emit, loadCfgInto, defaultCfg } from './store';
import type { ChatMsg, GpxTrack, Source } from './types';
import { clearDB, delKV, getAllPhotos, getKV, putKV, storageInfo } from './db';
import { rebuild } from './events';
import { addPhoto } from './importers';
import { loadDemo } from './demo';

/** Поднимает проект из IndexedDB. Если там пусто — показывает демо. */
export async function boot(): Promise<void> {
  try {
    loadCfgInto(await getKV('cfg'));
    const recs = await getAllPhotos();
    if (recs.length) {
      recs.forEach(addPhoto);
      S.chat = (await getKV<ChatMsg[]>('chat')) || [];
      S.gpx = (await getKV<GpxTrack[]>('gpx')) || [];
      S.sources = ((await getKV<Source[]>('sources')) || []).map(s => ({ ...s, done: s.total }));
      const m = await getKV<{ name: string; blob: Blob }>('music');
      if (m) S.music = { ...m, url: URL.createObjectURL(m.blob) };
      rebuild();
      S.ready = true;
      emit();
      refreshStorage();
      return;
    }
  } catch (e) {
    console.warn('restore failed', e);
  }
  S.ready = true;
  await loadDemo();
}

export function refreshStorage(): void {
  storageInfo().then(i => { S.storage = i; emit(); }).catch(() => {});
}

function revokeAll(): void {
  S.photos.forEach(p => { URL.revokeObjectURL(p.fullUrl); URL.revokeObjectURL(p.thumbUrl); });
}

/** Сбрасывает загруженное. Ручные правки событий в конфиге остаются, если keepCfg. */
export async function clearProject(opts: { keepCfg?: boolean } = {}): Promise<void> {
  const wasDemo = S.demo;
  revokeAll();
  S.photos = []; S.byKey.clear(); S.chat = []; S.gpx = []; S.sources = []; S.events = [];
  S.demo = false; S.ev = 0; S.ph = 0;
  if (wasDemo) {
    // демо-правки не должны просочиться в проект пользователя
    loadCfgInto(await getKV('cfg'));
    if (!(await getKV('cfg'))) { S.cfg = defaultCfg(); S.cuts.clear(); S.joins.clear(); S.excluded.clear(); }
    return;
  }
  if (opts.keepCfg) {
    const cfg = await getKV('cfg');
    await clearDB();
    if (cfg) await putKV('cfg', cfg);
  } else {
    await clearDB();
    S.cfg = defaultCfg(); S.cuts.clear(); S.joins.clear(); S.excluded.clear();
  }
  if (S.music) { URL.revokeObjectURL(S.music.url); S.music = null; }
  rebuild();
  refreshStorage();
  emit();
}

export async function setMusic(file: File | null): Promise<void> {
  if (S.music) URL.revokeObjectURL(S.music.url);
  S.music = file ? { name: file.name, blob: file, url: URL.createObjectURL(file) } : null;
  if (!S.demo) { if (file) await putKV('music', { name: file.name, blob: file }); else await delKV('music'); }
  emit();
}
