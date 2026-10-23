import { useState, type ChangeEvent } from 'react';
import { S, toast } from '../lib/store';
import { DAY, fmtBytes, fmtN, fmtShort, monYear, MON_GEN } from '../lib/format';
import { gameEvents, inGame, spanLabel, titleOf, usable } from '../lib/events';
import { ingest, type Entry } from '../lib/importers';
import { clearProject } from '../lib/persist';
import { openEvent, setCfg } from '../lib/actions';
import type { SourceKind } from '../lib/types';
import DemoBanner from './DemoBanner';

const KIND_LABEL: Record<SourceKind, string> = { zip: 'ZIP', chat: 'ЧАТ', gpx: 'GPX', folder: 'ПАПКА', files: 'ФАЙЛЫ', demo: 'ДЕМО' };

async function onFiles(e: ChangeEvent<HTMLInputElement>, kind: SourceKind) {
  const el = e.target;
  const files = [...(el.files || [])];
  el.value = '';
  if (!files.length) return;
  const label = kind === 'folder' ? (files[0].webkitRelativePath || '').split('/')[0] || 'Папка' : files.length === 1 ? files[0].name : `${files.length} файлов`;
  const entries: Entry[] = files.map(f => ({ file: f, path: f.webkitRelativePath || f.name }));
  await ingest(entries, label, kind);
}

export default function LoadView() {
  const bySrc = { exif: 0, name: 0, file: 0, none: 0 };
  S.photos.forEach(p => bySrc[p.tsrc]++);
  const evs = S.events, ge = gameEvents();
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <>
      <DemoBanner />
      <div className="split">
        <div className="main">
          <div>
            <h1 className="h1">Фото → события → игра</h1>
            <p className="lead">Загрузите фото за год или несколько лет, переписку и треки. Приложение прочитает дату и место каждого кадра, нарежет ленту на события и соберёт из них показ с викториной и итогами.</p>
          </div>
          <section aria-label="Сводка" className="tiles">
            <div><div className="tile-n">{fmtN(S.photos.length)}</div><div className="tile-l">фото{S.busy ? ' · загружаю…' : ''}</div></div>
            <div><div className="tile-n">{fmtN(ge.length)}<span className="muted" style={{ fontSize: '.5em' }}> / {fmtN(evs.length)}</span></div><div className="tile-l">событий в игре / найдено</div></div>
            <div><div className="tile-n">{fmtN(S.chat.length)}</div><div className="tile-l">сообщений в чате</div></div>
            <div><div className={'tile-n ' + (bySrc.file ? 'rose' : '')}>{fmtN(bySrc.file + bySrc.none)}</div><div className="tile-l">без даты в EXIF и в имени</div></div>
          </section>
          <section aria-labelledby="tl-h" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="rowhead"><h2 className="h2" id="tl-h">Таймлайн</h2><span className="tiny mono muted">{spanLabel()} · янтарным — недели с событиями в игре</span></div>
            <Timeline />
          </section>
          <section aria-labelledby="ev-h" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="rowhead"><h2 className="h2" id="ev-h">Найденные события</h2>{evs.length > 0 && <button className="btn sm ghost-amber" type="button" onClick={() => openEvent(S.ev)}>Открыть редактор событий →</button>}</div>
            {evs.length ? (
              <div className="chips">{evs.map(e => (
                <button key={e.key} type="button" className={'chip ' + (inGame(e) ? '' : 'off')} onClick={() => openEvent(e.idx)}>
                  <span>{titleOf(e)}</span><span className="d">{fmtShort(e.start)} · {e.photos.length} фото{inGame(e) ? '' : ' · не в игре'}</span>
                </button>))}
              </div>
            ) : <div className="empty">Событий пока нет. Добавьте фото справа.</div>}
          </section>
        </div>
        <aside className="side" aria-label="Загрузка">
          <div className="drop" id="drop">
            <div className="drop-title">Кидайте всё сразу</div>
            <div className="small muted">Фото, папки, .zip-архивы, экспорт чата из Telegram (result.json или messages.html) или WhatsApp (.txt), GPX-треки. Всё обрабатывается в браузере и хранится только на этом устройстве.</div>
            <div className="pick-row">
              <label className="pick">Файлы<input type="file" multiple accept="image/*,.heic,.heif,.zip,.json,.txt,.html,.gpx" onChange={e => onFiles(e, 'files')} /></label>
              <label className="pick">Папка<input type="file" multiple {...{ webkitdirectory: '' }} onChange={e => onFiles(e, 'folder')} /></label>
              <label className="pick">.zip<input type="file" multiple accept=".zip" onChange={e => onFiles(e, 'files')} /></label>
            </div>
            <label className="pick" style={{ borderColor: 'var(--line2)', color: 'var(--dim)' }}>+ Переписка или трек<input type="file" multiple accept=".json,.txt,.html,.gpx,.zip" onChange={e => onFiles(e, 'files')} /></label>
          </div>
          <section aria-labelledby="src-h">
            <h2 className="eyebrow" id="src-h">Источники</h2>
            {S.sources.length ? S.sources.map(s => {
              const working = s.kind !== 'chat' && s.kind !== 'gpx' && s.done < s.total;
              return (
                <div className="src" key={s.id}>
                  <span className={'badge ' + (s.kind === 'chat' ? 'chat' : '')}>{KIND_LABEL[s.kind]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflowWrap: 'anywhere' }}>{s.name}</div>
                    <div className="tiny muted">{s.kind === 'chat' || s.kind === 'gpx' ? '' : `${fmtN(s.done)} / ${fmtN(s.total)} фото${s.note ? ' · ' : ''}`}{s.note}</div>
                    {working && <div className="prog"><i style={{ width: `${Math.round(s.done / Math.max(1, s.total) * 100)}%` }} /></div>}
                  </div>
                </div>
              );
            }) : <div className="small muted">Пока ничего не загружено.</div>}
          </section>
          <section aria-labelledby="cut-h" className="panel">
            <h2 className="eyebrow" id="cut-h" style={{ margin: 0 }}>Нарезка на события</h2>
            <RangeField id="gap" label="Новое событие после стольких дней подряд без фото" hint="1 — фото в соседние дни остаются одним событием, один пустой день между ними разрезает. 0 — каждый день отдельно"
              min={0} max={30} value={S.cfg.gapDays} unit=" дн" onCommit={v => setCfg('gapDays', v, true)} />
            <RangeField id="minph" label="Меньше скольких кадров — не брать в игру" min={1} max={20} value={S.cfg.minPhotos} unit="" onCommit={v => setCfg('minPhotos', v, true)} />
            <label className="check"><input type="checkbox" checked={S.cfg.useFileDates} onChange={e => setCfg('useFileDates', e.target.checked, true)} /><span>Если даты нет ни в EXIF, ни в имени, брать дату файла <span className="muted small">({fmtN(bySrc.file)})</span></span></label>
            <div className="tiny muted">Дата берётся из EXIF ({fmtN(bySrc.exif)}), затем из имени вроде IMG_20250720_180211 ({fmtN(bySrc.name)}). Ручные разрезы и склейки сохраняются при любой настройке.</div>
          </section>
          {S.storage && !S.demo && (
            <section className="panel" aria-label="Хранилище">
              <h2 className="eyebrow" style={{ margin: 0 }}>Хранится в браузере</h2>
              <div className="meter"><i style={{ width: `${Math.min(100, S.storage.usage / Math.max(1, S.storage.quota) * 100)}%` }} /></div>
              <div className="tiny muted">{fmtBytes(S.storage.usage)} из доступных {fmtBytes(S.storage.quota)}. {S.storage.persisted ? 'Браузер не будет удалять эти данные сам.' : 'При нехватке места браузер может их удалить — держите исходные фото.'}</div>
            </section>
          )}
          {confirmClear ? (
            <div className="panel">
              <div>Удалить все фото, переписку и правки событий из этого браузера?</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn danger" type="button" onClick={async () => { setConfirmClear(false); await clearProject(); toast('Всё удалено'); }}>Удалить всё</button>
                <button className="btn" type="button" onClick={async () => { setConfirmClear(false); await clearProject({ keepCfg: true }); toast('Фото удалены, названия и правки событий сохранены'); }}>Только фото и чат</button>
                <button className="btn" type="button" onClick={() => setConfirmClear(false)}>Отмена</button>
              </div>
            </div>
          ) : (!S.demo && S.photos.length > 0 && <button className="btn danger" type="button" onClick={() => setConfirmClear(true)}>Очистить загруженное…</button>)}
        </aside>
      </div>
    </>
  );
}

function RangeField(p: { id: string; label: string; hint?: string; min: number; max: number; value: number; unit: string; onCommit: (v: number) => void }) {
  const [v, setV] = useState<number | null>(null);
  const shown = v ?? p.value;
  return (
    <div className="field">
      <label htmlFor={p.id}>{p.label}</label>
      {p.hint && <span className="hint">{p.hint}</span>}
      <div className="range">
        <input id={p.id} type="range" min={p.min} max={p.max} step={1} value={shown}
          onChange={e => setV(+e.target.value)}
          onPointerUp={() => { if (v != null) { p.onCommit(v); setV(null); } }}
          onKeyUp={() => { if (v != null) { p.onCommit(v); setV(null); } }} />
        <span className="mono num" style={{ width: 58, textAlign: 'right' }}>{shown}{p.unit}</span>
      </div>
    </div>
  );
}

function Timeline() {
  const ps = S.photos.filter(usable);
  if (!ps.length) return <div className="empty">Здесь появится лента по неделям.</div>;
  let t0 = Infinity, t1 = -Infinity;
  ps.forEach(p => { if (p.t! < t0) t0 = p.t!; if (p.t! > t1) t1 = p.t!; });
  const weekly = (t1 - t0) / (7 * DAY) <= 160;
  const step = weekly ? 7 * DAY : 30.44 * DAY;
  const start = new Date(t0); start.setHours(0, 0, 0, 0);
  const b0 = start.getTime();
  const n = Math.max(1, Math.floor((t1 - b0) / step) + 1);
  const cnt = new Array<number>(n).fill(0), inEv = new Array<boolean>(n).fill(false), evAt = new Array<number | null>(n).fill(null);
  ps.forEach(p => { cnt[Math.min(n - 1, Math.floor((p.t! - b0) / step))]++; });
  S.events.forEach(e => {
    if (!inGame(e)) return;
    const i = Math.min(n - 1, Math.floor((e.start - b0) / step)), j = Math.min(n - 1, Math.floor((e.end - b0) / step));
    for (let k = i; k <= j; k++) { inEv[k] = true; if (evAt[k] == null) evAt[k] = e.idx; }
  });
  const mx = Math.max(...cnt);
  const ticks: string[] = [];
  const K = Math.min(8, n);
  for (let k = 0; k < K; k++) ticks.push(monYear(b0 + Math.round(k * (n - 1) / Math.max(1, K - 1)) * step));
  return (
    <div className="timeline">
      <div className="bars">
        {cnt.map((c, i) => {
          const d = new Date(b0 + i * step);
          const lab = `${d.getDate()} ${MON_GEN[d.getMonth()]} ${d.getFullYear()}: ${c} фото`;
          const h = c ? Math.max(4, Math.round(Math.sqrt(c / mx) * 120)) : 2;
          const ev = evAt[i];
          return <button key={i} type="button" className={c ? (inEv[i] ? 'ev' : '') : 'zero'} style={{ height: h }} title={lab} aria-label={lab}
            tabIndex={ev == null ? -1 : 0} onClick={() => { if (ev != null) openEvent(ev); }} />;
        })}
      </div>
      <div className="ticks">{[...new Set(ticks)].map(t => <span key={t}>{t}</span>)}</div>
    </div>
  );
}
