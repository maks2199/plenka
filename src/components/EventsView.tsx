import { useEffect, useRef } from 'react';
import { S, emit, saveCfg } from '../lib/store';
import { fmtN, fmtRange, fmtShort, fmtTime, pad2, plural } from '../lib/format';
import { autoTitle, chatIn, collageOf, coverOf, defaultAnswer, gameEvents, inGame, kmOf, metaOf, qDrafts, storyOf, titleOf } from '../lib/events';
import { joinPrev, photoAction, selectEvent, selectPhoto, setTab, splitDays, type PhotoAct } from '../lib/actions';
import { startShow } from '../lib/play';
import type { EventMeta } from '../lib/types';
import DemoBanner from './DemoBanner';

const TYPES = ['Поездка', 'Природа', 'Город', 'Праздник', 'Спорт', 'Дома'];
const KEYMAP: Record<string, PhotoAct> = { s: 'story', 'ы': 'story', c: 'coll', 'с': 'coll', o: 'cover', 'щ': 'cover', x: 'x', 'ч': 'x', k: 'cut', 'л': 'cut' };

function useEventKeys() {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (S.playing || S.tab !== 'events') return;
      const tg = (ev.target as HTMLElement)?.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const e = S.events[S.ev];
      if (!e) return;
      const k = ev.key.toLowerCase();
      if (ev.key === 'ArrowRight') { ev.preventDefault(); selectPhoto(S.ph + 1); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); selectPhoto(S.ph - 1); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); selectEvent(S.ev + 1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); selectEvent(S.ev - 1); }
      else if (k === 'j' || k === 'о') { ev.preventDefault(); joinPrev(); }
      else if (KEYMAP[k]) { ev.preventDefault(); photoAction(KEYMAP[k]); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

/** Поле метаданных события: неуправляемое (key меняется вместе с событием), пишет в конфиг на каждый ввод. */
function MetaInput(p: { id: string; f: keyof EventMeta; label?: string; className?: string; placeholder?: string; inputMode?: 'decimal' | 'numeric' }) {
  const e = S.events[S.ev];
  const m = metaOf(e);
  return (
    <input className={'in ' + (p.className || '')} id={p.id} key={e.key + p.f + (p.f === 'q' ? m.qv || 0 : '')} type="text" inputMode={p.inputMode}
      defaultValue={(m[p.f] as string) || ''} placeholder={p.placeholder}
      onInput={ev => { (m as Record<string, unknown>)[p.f] = (ev.target as HTMLInputElement).value; saveCfg(); if (p.f === 'title' || p.f === 'km') emit(); }} />
  );
}

export default function EventsView() {
  useEventKeys();
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gridRef.current?.querySelector('[aria-current="true"]');
    (el as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest' });
  }, [S.ph, S.ev]); // только при смене кадра или события, не при наборе текста
  const evs = S.events;
  if (!evs.length) return <div className="empty">Событий пока нет. <button className="btn sm ghost-amber" type="button" onClick={() => setTab('load')}>Загрузить фото</button></div>;
  const e = evs[S.ev];
  const m = metaOf(e);
  const lp = e.photos;
  const cover = coverOf(e);
  const coll = new Set(collageOf(e).map(p => p.key));
  const story = new Set(storyOf(e).map(p => p.key));
  const autoStory = !(m.story && m.story.length), autoColl = !(m.collage && m.collage.length);
  const km = kmOf(e);
  const ch = chatIn(e);
  const authors = new Set(ch.map(x => x.a)).size;
  const at = autoTitle(e);
  const drafts = qDrafts(e);
  const sel = lp[S.ph];
  const selRole = sel ? [sel.key === cover.key ? 'обложка' : '', coll.has(sel.key) ? 'коллаж' : '', story.has(sel.key) ? 'сторис' : '', S.excluded.has(sel.key) ? 'убран' : ''].filter(Boolean).join(', ') : '';
  const set = (patch: Partial<EventMeta>) => { Object.assign(m, patch); saveCfg(); emit(); };

  return (
    <>
      <DemoBanner />
      <div className="evlayout">
        <nav className="evlist" aria-label="События">
          <div style={{ padding: '14px 16px 10px' }}>
            <div className="h2">{evs.length} {plural(evs.length, ['событие', 'события', 'событий'])}</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>в игре {gameEvents().length} · пауза {S.cfg.gapDays} дн · <kbd>↑</kbd><kbd>↓</kbd> между событиями</div>
          </div>
          {evs.map(x => {
            const xm = S.cfg.meta[x.key] || {};
            return (
              <button key={x.key} type="button" className={'evitem ' + (inGame(x) ? '' : 'out')} aria-current={x.idx === S.ev ? 'true' : undefined} onClick={() => selectEvent(x.idx)}>
                <span className="n">{pad2(x.idx + 1)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="t">{titleOf(x)}</span>
                  <span className="m">{fmtShort(x.start)} · {x.days} дн · {x.photos.length} фото{xm.type ? ' · ' + xm.type : ''}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="evedit" aria-label="Редактор события">
          <div className="evhead">
            <div className="mono small amber">СОБЫТИЕ №{pad2(e.idx + 1)} · {fmtRange(e.start, e.end)} · {e.days} {plural(e.days, ['день', 'дня', 'дней'])}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button className="btn sm" type="button" disabled={e.idx === 0} onClick={joinPrev} title="J">Склеить с предыдущим</button>
              <button className="btn sm" type="button" disabled={e.days < 2} onClick={splitDays}>Разрезать по дням</button>
              <button className="btn sm" type="button" aria-pressed={inGame(e)} onClick={() => set({ skip: inGame(e) })}>{inGame(e) ? 'В игре' : 'Не в игре'}</button>
            </div>
          </div>

          <div className="row2">
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label htmlFor="f-title">Название на титуле</label>
              <MetaInput id="f-title" f="title" className="big" placeholder={at.t} />
              <span className="hint">пусто — возьмём «{at.t}» ({at.why})</span>
            </div>
            <div className="field"><label htmlFor="f-blurb">Настроение под заголовком</label><MetaInput id="f-blurb" f="blurb" placeholder="одна фраза, можно пусто" /></div>
            <div className="field">
              <span className="lbl" id="type-l">Тип</span>
              <div className="chips" role="group" aria-labelledby="type-l">
                {TYPES.map(t => <button key={t} type="button" className="btn sm" aria-pressed={m.type === t} onClick={() => set({ type: m.type === t ? '' : t })}>{t}</button>)}
              </div>
            </div>
          </div>

          <div className="row3">
            <div className="field">
              <label htmlFor="f-km">Км</label>
              <MetaInput id="f-km" f="km" inputMode="decimal" placeholder={km.v != null && km.src !== 'вручную' ? fmtN(km.v) : '—'} />
              <span className={'hint ' + (km.v == null ? 'rose' : '')}>{km.v == null ? 'нет треков и геометок — впишите руками' : km.src === 'вручную' ? 'введено вручную' : `≈ ${fmtN(km.v)} км по ${km.src === 'GPX' ? 'GPX-треку' : 'геометкам фото'}`}</span>
            </div>
            <div className="field">
              <label htmlFor="f-ppl">Человек</label>
              <MetaInput id="f-ppl" f="ppl" inputMode="numeric" placeholder={authors ? String(authors) : '—'} />
              <span className="hint">{authors ? `в чате за эти дни писали ${authors}` : 'для итогов и рекордов'}</span>
            </div>
            <div className="field"><span className="lbl">Из чата</span><div className="mono" style={{ minHeight: 44, display: 'flex', alignItems: 'center', fontSize: 20 }}>{fmtN(ch.length)}</div><span className="hint">сообщений за эти дни ±3 ч</span></div>
          </div>

          <div className="qbox">
            <div className="rowhead">
              <h2 className="eyebrow amber" style={{ margin: 0 }}>Угадай событие · вопрос перед титулом</h2>
              <button className="btn sm" type="button" onClick={() => set({ qv: (m.qv || 0) + 1, q: '' })}>↻ другой черновик ({drafts.length})</button>
            </div>
            <div className="field"><label htmlFor="f-q">Вопрос-подсказка</label><MetaInput id="f-q" f="q" className="q" placeholder={drafts[(m.qv || 0) % drafts.length]} /></div>
            <div className="field"><label htmlFor="f-a">Что показать после ответа</label><MetaInput id="f-a" f="a" placeholder={defaultAnswer(e)} /></div>
          </div>

          <section aria-labelledby="st-h" className="qbox" style={{ gap: 10 }}>
            <div className="rowhead" style={{ alignItems: 'center' }}>
              <h2 className="eyebrow amber" id="st-h" style={{ margin: 0 }}>Сторис · {story.size} {plural(story.size, ['кадр', 'кадра', 'кадров'])} · {autoStory ? `авто: равномерно по времени, до ${S.cfg.game.storyMax}` : 'выбраны вручную'}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {!autoStory && <button className="btn sm" type="button" onClick={() => photoAction('auto')}>Вернуть авто</button>}
                <button className="btn sm ghost-amber" type="button" onClick={() => startShow(e.key)}>▸ Посмотреть это событие</button>
              </div>
            </div>
            <div className="strip">
              {lp.map((p, i) => story.has(p.key) && (
                <button key={p.key} type="button" aria-current={i === S.ph ? 'true' : undefined} aria-label={`Кадр сторис ${fmtTime(p.t!)}`} onClick={() => selectPhoto(i)}><img src={p.thumbUrl} alt="" loading="lazy" /></button>
              ))}
            </div>
            <div className="tiny muted">Идут после титула события, по {S.cfg.game.storySec} с на кадр. Выберите кадр в сетке ниже: <kbd>S</kbd> — добавить в сторис или убрать, <kbd>X</kbd> — выкинуть из события совсем. Как только меняете вручную, автовыбор отключается.</div>
          </section>

          <section aria-labelledby="ph-h" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="rowhead">
              <h2 className="eyebrow" id="ph-h" style={{ margin: 0 }}>Кадры · {lp.length} · сторис {story.size}{autoStory ? ' (авто)' : ''} · коллаж {coll.size}{autoColl ? ' (авто)' : ''}</h2>
              <div className="keys"><span><kbd>←</kbd><kbd>→</kbd> кадр</span><span><kbd>S</kbd> сторис</span><span><kbd>C</kbd> коллаж</span><span><kbd>O</kbd> обложка</span><span><kbd>X</kbd> убрать</span><span><kbd>K</kbd> разрезать здесь</span><span><kbd>J</kbd> склеить</span></div>
            </div>
            <div className="toolbar">
              <span className="sel">{sel ? `${sel.name} · ${fmtTime(sel.t!)}${sel.tsrc !== 'exif' ? ` · дата из ${sel.tsrc === 'name' ? 'имени' : 'файла'}` : ''}${selRole ? ' · ' + selRole : ''}` : ''}</span>
              <button className="btn sm" type="button" aria-pressed={!!sel && story.has(sel.key)} onClick={() => photoAction('story')}>Сторис S</button>
              <button className="btn sm" type="button" aria-pressed={!!sel && coll.has(sel.key) && !autoColl} onClick={() => photoAction('coll')}>Коллаж C</button>
              <button className="btn sm" type="button" aria-pressed={!!sel && sel.key === m.cover} onClick={() => photoAction('cover')}>Обложка O</button>
              <button className="btn sm" type="button" aria-pressed={!!sel && S.excluded.has(sel.key)} onClick={() => photoAction('x')}>Убрать X</button>
              <button className="btn sm" type="button" disabled={S.ph === 0} onClick={() => photoAction('cut')}>Разрезать здесь K</button>
            </div>
            <div className="grid" ref={gridRef}>
              {lp.map((p, i) => (
                <button key={p.key} type="button" className={'ph ' + (S.excluded.has(p.key) ? 'x' : '')} aria-current={i === S.ph ? 'true' : undefined} aria-label={`${p.name}, ${fmtTime(p.t!)}`} onClick={() => selectPhoto(i)}>
                  <img src={p.thumbUrl} alt="" loading="lazy" decoding="async" />
                  <span className="tags">
                    {p.key === cover.key && <span className="o">обложка</span>}
                    {coll.has(p.key) && <span className={autoColl ? 'a' : 'o'}>коллаж</span>}
                    {story.has(p.key) && <span className={autoStory ? 'a' : ''}>сторис</span>}
                  </span>
                  <span className="time">{fmtTime(p.t!).slice(6)}</span>
                </button>
              ))}
            </div>
          </section>
        </section>
      </div>
    </>
  );
}
