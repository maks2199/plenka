import { S, emit, toast } from './store';
import { buildShow } from './show';
import { gameEvents } from './events';
import { blobToDataURL, closeDrawable, decode, resize } from './image';
import { playerMain } from '../player/runtime.js';
import playerSource from '../player/runtime.js?raw';

let player: { destroy(): void } | null = null;

/** Показ во весь экран поверх приложения. onlyKey — проиграть одно событие (вопрос, титул, сторис). */
export function startShow(onlyKey?: string): void {
  if (!gameEvents().length) { toast('Нет событий для показа. Загрузите фото на первой вкладке.'); return; }
  const { D, used } = buildShow();
  if (onlyKey) {
    const gi = gameEvents().findIndex(x => x.key === onlyKey);
    if (gi < 0) { toast('Это событие не в игре. Нажмите «Не в игре», чтобы включить его.'); return; }
    D.slides = D.slides.filter(s => 'ev' in s && s.ev === gi && (s.kind === 'guess' || s.kind === 'title' || s.kind === 'story'));
  }
  D.img = used.map(p => p.fullUrl);
  if (S.music) D.music = S.music.url;
  const root = document.getElementById('player-root')!;
  root.hidden = false;
  document.body.style.overflow = 'hidden';
  S.playing = true;
  emit();
  player = playerMain(D, root, {
    onExit: () => { root.hidden = true; document.body.style.overflow = ''; player = null; S.playing = false; emit(); }
  });
}

let exporting = false;
/** Один HTML-файл: плеер + данные + кадры (1280 px) как data URI. Открывается без приложения. */
export async function buildExportHTML(onProgress?: (i: number, n: number) => void): Promise<Blob> {
  const { D, used } = buildShow();
  const imgs: string[] = [];
  for (let i = 0; i < used.length; i++) {
    onProgress?.(i + 1, used.length);
    const bmp = await decode(used[i].full, 'x.jpg');
    const r = await resize(bmp, 1280, 0.8);
    closeDrawable(bmp);
    imgs.push(await blobToDataURL(r.blob));
  }
  D.img = imgs;
  if (S.music && S.music.blob.size < 25e6) D.music = await blobToDataURL(S.music.blob);
  const json = JSON.stringify(D).replace(/</g, '\\u003c');
  const title = (S.cfg.game.title || 'Показ').replace(/[<>&"]/g, '');
  const code = playerSource.replace(/^\s*export\s+function\s+playerMain/m, 'function playerMain');
  const html = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">' +
    '<style>html,body{margin:0;height:100%;background:#0d0c0b}</style></head><body><div id="root"></div><scr' + 'ipt>' + code +
    '\nvar D=' + json + ';playerMain(D,document.getElementById("root"));</scr' + 'ipt></body></html>';
  return new Blob([html], { type: 'text/html' });
}

export async function exportShow(): Promise<void> {
  if (exporting) return;
  if (!gameEvents().length) { toast('Нет событий для показа. Загрузите фото на первой вкладке.'); return; }
  exporting = true;
  try {
    const blob = await buildExportHTML((i, n) => toast(`Собираю файл: ${i} из ${n} кадров`, 0));
    const mb = (blob.size / 1048576).toFixed(1);
    const fname = (S.cfg.game.title || 'pokaz').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.html';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    toast(`Готово: ${fname}, ${mb} МБ`, 4000);
  } catch (e) {
    console.error(e);
    toast('Не получилось собрать файл: ' + ((e as Error)?.message || e), 6000);
  } finally {
    exporting = false;
  }
}
