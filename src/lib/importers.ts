import exifr from 'exifr';
import JSZip from 'jszip';
import { S, emit, toast } from './store';
import type { Photo, PhotoRecord, Source, SourceKind } from './types';
import { dateFromName, extOf, fmtN, hav, plural } from './format';
import { parseChatFile } from './chat';
import { closeDrawable, decode, resize } from './image';
import { putKV, putPhoto, requestPersist } from './db';
import { rebuild } from './events';
import { clearProject, refreshStorage } from './persist';

export const IMG_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'avif', 'jfif']);
export interface Entry { file: File | { name: string; size: number; lastModified: number }; path: string; zf?: JSZip.JSZipObject }

function addSource(name: string, kind: SourceKind): Source {
  const s: Source = { id: Math.random().toString(36).slice(2), name, kind, total: 0, done: 0, note: '' };
  S.sources.push(s);
  return s;
}
export function saveSide(): void {
  if (S.demo) return;
  Promise.all([putKV('chat', S.chat), putKV('gpx', S.gpx), putKV('sources', S.sources)]).catch(e => console.warn('save', e));
}

/** Точка входа для любых файлов: фото, zip, чаты, GPX вперемешку. */
export async function ingest(entries: Entry[], label: string, kind: SourceKind): Promise<void> {
  if (S.demo) await clearProject();
  requestPersist();
  const src = addSource(label, kind);
  const imgs: Entry[] = [];
  let other = 0;
  for (const e of entries) {
    const ext = extOf(e.file.name);
    if (ext === 'zip' && e.file instanceof File) { await ingestZip(e.file); continue; }
    if (IMG_EXT.has(ext)) imgs.push(e);
    else if ((ext === 'json' || ext === 'txt' || ext === 'html') && e.file instanceof File) { if (!(await ingestChat(e.file))) other++; }
    else if (ext === 'gpx' && e.file instanceof File) await ingestGpx(e.file);
    else other++;
  }
  if (!imgs.length && !other) { S.sources.splice(S.sources.indexOf(src), 1); saveSide(); rebuild(); emit(); return; }
  src.total = imgs.length;
  if (other) src.note = `пропущено файлов другого типа: ${other}`;
  await processImages(imgs, src);
}

async function ingestZip(file: File): Promise<void> {
  const src = addSource(file.name, 'zip');
  src.note = 'распаковка…';
  emit();
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(file); } catch { src.note = 'не получилось открыть архив'; src.err = true; emit(); return; }
  const imgs: Entry[] = [];
  let chats = 0, other = 0;
  const files = Object.values(zip.files).filter(f => !f.dir && !/(^|\/)(__MACOSX|\.)/.test(f.name));
  const base = file.name.replace(/\.zip$/i, '');
  for (const f of files) {
    const name = f.name.split('/').pop() || f.name;
    const ext = extOf(name);
    if (IMG_EXT.has(ext)) imgs.push({ zf: f, path: `${base}/${f.name}`, file: { name, size: 0, lastModified: f.date ? f.date.getTime() : 0 } });
    else if (ext === 'json' || ext === 'txt' || ext === 'html') { const b = await f.async('blob'); if (await ingestChat(new File([b], name))) chats++; else other++; }
    else if (ext === 'gpx') { const b = await f.async('blob'); await ingestGpx(new File([b], name)); }
    else other++;
  }
  src.total = imgs.length;
  src.note = [chats ? `переписка: ${chats}` : '', other ? `пропущено: ${other}` : ''].filter(Boolean).join(' · ');
  await processImages(imgs, src);
}

async function processImages(entries: Entry[], src: Source): Promise<void> {
  S.busy++;
  emit();
  let i = 0, dup = 0, bad = 0, lastEmit = 0;
  const work = async () => {
    while (i < entries.length) {
      const e = entries[i++];
      try { if ((await addImage(e)) === 'dup') dup++; }
      catch (err) { bad++; console.warn('photo failed', e.path, err); }
      src.done++;
      const now = performance.now();
      if (now - lastEmit > 500) { lastEmit = now; emit(); }
    }
  };
  await Promise.all([work(), work(), work()]);
  src.note = [src.note, dup ? `дубли: ${dup}` : '', bad ? `не прочитано: ${bad}` : ''].filter(Boolean).join(' · ');
  S.busy--;
  rebuild();
  saveSide();
  refreshStorage();
  emit();
}

async function addImage(e: Entry): Promise<'ok' | 'dup'> {
  const name = e.file.name;
  const blob: Blob = e.zf ? await e.zf.async('blob') : (e.file as File);
  const key = name + '|' + blob.size;
  if (S.byKey.has(key)) return 'dup';
  let meta: any = null;
  try { meta = await exifr.parse(blob, { tiff: true, exif: true, gps: true, xmp: false, icc: false, iptc: false, jfif: false, ihdr: false }); } catch { /* нет EXIF */ }
  let t: number | null = null;
  let tsrc: Photo['tsrc'] = 'none';
  const ed = meta && (meta.DateTimeOriginal || meta.CreateDate || meta.DateTimeDigitized || meta.ModifyDate);
  if (ed instanceof Date && !isNaN(ed.getTime()) && ed.getFullYear() > 1990) { t = ed.getTime(); tsrc = 'exif'; }
  if (t == null) { const n = dateFromName(name); if (n) { t = n; tsrc = 'name'; } }
  if (t == null && e.file.lastModified) { t = e.file.lastModified; tsrc = 'file'; }
  const lat = meta && Number.isFinite(meta.latitude) ? meta.latitude : null;
  const lon = meta && Number.isFinite(meta.longitude) ? meta.longitude : null;
  const img = await decode(blob, name);
  const full = await resize(img, 1600, 0.84);
  const thumb = await resize(img, 360, 0.72);
  closeDrawable(img);
  const rec: PhotoRecord = { key, name, dir: (e.path || '').split('/').slice(0, -1).join('/'), t, tsrc, lat, lon, w: full.w, h: full.h, full: full.blob, thumb: thumb.blob };
  if (S.byKey.has(key)) return 'dup';
  addPhoto(rec);
  await putPhoto(rec);
  return 'ok';
}

export function addPhoto(rec: PhotoRecord): Photo {
  const p: Photo = { ...rec, fullUrl: URL.createObjectURL(rec.full), thumbUrl: URL.createObjectURL(rec.thumb) };
  S.photos.push(p);
  S.byKey.set(p.key, p);
  return p;
}

async function ingestChat(file: File): Promise<boolean> {
  let text: string;
  try { text = await file.text(); } catch { return false; }
  const msgs = parseChatFile(file.name, text);
  if (!msgs.length) return false;
  const k = (m: { t: number; a: string; x: string }) => m.t + '|' + m.a + '|' + m.x.slice(0, 40);
  const seen = new Set(S.chat.map(k));
  let added = 0;
  for (const m of msgs) { if (!seen.has(k(m))) { seen.add(k(m)); S.chat.push(m); added++; } }
  S.chat.sort((a, b) => a.t - b.t);
  const s = addSource(file.name, 'chat');
  s.total = s.done = added;
  const authors = new Set(msgs.map(m => m.a)).size;
  s.note = `${fmtN(added)} ${plural(added, ['сообщение', 'сообщения', 'сообщений'])} · ${authors} ${plural(authors, ['участник', 'участника', 'участников'])}`;
  saveSide();
  return true;
}

async function ingestGpx(file: File): Promise<void> {
  try {
    const doc = new DOMParser().parseFromString(await file.text(), 'application/xml');
    const pts: { lat: number; lon: number; t: number }[] = [];
    doc.querySelectorAll('trkpt, rtept').forEach(p => {
      const tm = p.querySelector('time');
      pts.push({ lat: +(p.getAttribute('lat') || 0), lon: +(p.getAttribute('lon') || 0), t: tm ? Date.parse(tm.textContent || '') : NaN });
    });
    if (!pts.length) return;
    let km = 0;
    for (let i = 1; i < pts.length; i++) km += hav(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
    S.gpx.push({ name: file.name, pts, km });
    const s = addSource(file.name, 'gpx');
    s.total = s.done = pts.length;
    s.note = `${fmtN(Math.round(km * 10) / 10)} км`;
    saveSide();
  } catch { toast(`Не получилось прочитать ${file.name}`); }
}

/** Перетаскивание: обходит вложенные папки через webkitGetAsEntry. */
export async function entriesFromDrop(dt: DataTransfer): Promise<Entry[]> {
  const out: Entry[] = [];
  const items = [...(dt.items || [])].map(i => i.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
  if (!items.length) { [...dt.files].forEach(f => out.push({ file: f, path: f.name })); return out; }
  async function walk(en: FileSystemEntry, path: string): Promise<void> {
    if (en.isFile) {
      const f = await new Promise<File>((res, rej) => (en as FileSystemFileEntry).file(res, rej));
      out.push({ file: f, path: path + f.name });
    } else if (en.isDirectory) {
      const rd = (en as FileSystemDirectoryEntry).createReader();
      let batch: FileSystemEntry[];
      do {
        batch = await new Promise<FileSystemEntry[]>((res, rej) => rd.readEntries(res, rej));
        for (const c of batch) await walk(c, path + en.name + '/');
      } while (batch.length);
    }
  }
  for (const en of items) await walk(en, '');
  return out;
}
