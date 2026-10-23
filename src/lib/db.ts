import { openDB, type IDBPDatabase } from 'idb';
import type { PhotoRecord } from './types';

/* Хранилище в браузере: кадры (уже пережатые) и состояние проекта.
   Стор 'photos' — по записи на кадр, 'kv' — конфиг, чат, треки, источники, музыка. */
const DB_NAME = 'plenka';
let dbp: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbp) dbp = openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore('photos', { keyPath: 'key' });
      d.createObjectStore('kv');
    }
  });
  return dbp;
}

export async function putPhoto(rec: PhotoRecord): Promise<void> { await (await db()).put('photos', rec); }
export async function getAllPhotos(): Promise<PhotoRecord[]> { return (await db()).getAll('photos'); }
export async function countPhotos(): Promise<number> { return (await db()).count('photos'); }
export async function getKV<T>(key: string): Promise<T | undefined> { return (await db()).get('kv', key); }
export async function putKV(key: string, value: unknown): Promise<void> { await (await db()).put('kv', value, key); }
export async function delKV(key: string): Promise<void> { await (await db()).delete('kv', key); }
export async function clearDB(): Promise<void> {
  const d = await db();
  await Promise.all([d.clear('photos'), d.clear('kv')]);
}

export interface StorageInfo { usage: number; quota: number; persisted: boolean }
export async function storageInfo(): Promise<StorageInfo | null> {
  if (!navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
  return { usage: e.usage || 0, quota: e.quota || 0, persisted };
}
/** Просим браузер не вычищать данные при нехватке места. */
export async function requestPersist(): Promise<boolean> {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
}
