export type TimeSource = 'exif' | 'name' | 'file' | 'none';

/** Кадр после импорта. full/thumb — уже пережатые JPEG, оригиналы не храним. */
export interface Photo {
  key: string;
  name: string;
  dir: string;
  t: number | null;
  tsrc: TimeSource;
  lat: number | null;
  lon: number | null;
  w: number;
  h: number;
  full: Blob;
  thumb: Blob;
  fullUrl: string;
  thumbUrl: string;
  demo?: boolean;
}
/** То, что лежит в IndexedDB (без object URL). */
export type PhotoRecord = Omit<Photo, 'fullUrl' | 'thumbUrl'>;

export interface ChatMsg { t: number; a: string; x: string }
export interface GpxPoint { lat: number; lon: number; t: number }
export interface GpxTrack { name: string; pts: GpxPoint[]; km: number }

export type SourceKind = 'zip' | 'files' | 'folder' | 'chat' | 'gpx' | 'demo';
export interface Source { id: string; name: string; kind: SourceKind; total: number; done: number; note: string; err?: boolean }

export interface EventMeta {
  title?: string;
  blurb?: string;
  type?: string;
  km?: string;
  ppl?: string;
  q?: string;
  qv?: number;
  a?: string;
  skip?: boolean;
  cover?: string | null;
  collage?: string[] | null;
  story?: string[] | null;
}

export interface GameCfg {
  eyebrow: string;
  title: string;
  outro: string;
  outroSub: string;
  statsTitle: string;
  storyMax: number;
  storySec: number;
  titleSec: number;
  guess: boolean;
  caption: boolean;
  beforeEvery: number;
  whoEvery: number;
  reflect: boolean;
  reflectText: string;
  seed: number;
}

export interface Phrase { label: string; pattern: string }
export interface ManualMetric { value: number | string; unit: string; label: string }

export interface Cfg {
  gapDays: number;
  minPhotos: number;
  useFileDates: boolean;
  meta: Record<string, EventMeta>;
  game: GameCfg;
  statsOff: Record<string, boolean>;
  phrases: Phrase[];
  manual: ManualMetric[];
}

/** Событие — непрерывный отрезок кадров; ключ = ключ первого кадра. */
export interface Ev {
  key: string;
  photos: Photo[];
  start: number;
  end: number;
  days: number;
  idx: number;
  small: boolean;
}

export interface Metric { id: string; num: number | string; unit: string; label: string; src: string; note?: string; del?: { kind: 'phrases' | 'manual'; i: number } }
export interface RecordLine { k: string; t: string; v: string }

/* --- данные для плеера --- */
export type Slide =
  | { kind: 'intro' } | { kind: 'outro' } | { kind: 'stats' } | { kind: 'summary' }
  | { kind: 'guess'; ev: number; collage: number[]; q: string; aT: string; aX: string }
  | { kind: 'title'; ev: number; bg: number; title: string; date: string; blurb: string }
  | { kind: 'story'; ev: number; im: number; si: number; sn: number; cap: string }
  | { kind: 'before'; a: { im: number; t: number; d: string }; b: { im: number; t: number; d: string }; note: string }
  | { kind: 'who'; text: string; author: string; opts: string[]; when: string; bg: number | null }
  | { kind: 'reflect'; text: string };

export interface ShowData {
  intro: { eyebrow: string; title: string; sub: string };
  outro: { title: string; sub: string };
  statsTitle: string;
  storySec: number;
  titleSec: number;
  events: { title: string; date: string }[];
  stats: { num: string; unit: string; label: string; note: string }[];
  records: RecordLine[];
  summary: { date: string; title: string; type: string; days: number; km: string | null; ppl: string | null; n: number }[];
  slides: Slide[];
  img?: string[];
  music?: string;
}
