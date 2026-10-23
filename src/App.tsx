import { useEffect, useRef } from 'react';
import { S, useStore, type Tab } from './lib/store';
import { gameEvents } from './lib/events';
import { setTab } from './lib/actions';
import { entriesFromDrop, ingest } from './lib/importers';
import { exportShow, startShow } from './lib/play';
import LoadView from './components/LoadView';
import EventsView from './components/EventsView';
import GameView from './components/GameView';
import StatsView from './components/StatsView';

const TABS: [Tab, string][] = [['load', 'Загрузка'], ['events', 'События'], ['game', 'Сценарий'], ['stats', 'Итоги']];

export default function App() {
  useStore();
  useGlobalDrop();
  return (
    <>
      <header className="top">
        <div className="brand"><span className="logo">плёнка<i>.</i></span><span className="tagline">игра-рефлексия из ваших фото</span></div>
        <nav className="tabs" aria-label="Разделы">
          {TABS.map(([id, l]) => (
            <button key={id} type="button" className="tab" aria-current={S.tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              {l}{id === 'events' && S.events.length > 0 && <span className="n">{gameEvents().length}</span>}
            </button>
          ))}
        </nav>
        <div className="actions">
          <button className="btn" type="button" onClick={exportShow}>Скачать показ .html</button>
          <button className="btn primary" type="button" onClick={() => startShow()}>▸ Показ</button>
        </div>
      </header>
      <main className="wrap">
        {!S.ready ? <div className="restore">Поднимаю сохранённый проект…</div>
          : S.tab === 'load' ? <LoadView />
          : S.tab === 'events' ? <EventsView />
          : S.tab === 'game' ? <GameView />
          : <StatsView />}
      </main>
      <div className="toast" role="status" hidden={!S.toast}>{S.toast}</div>
    </>
  );
}

/** Файлы можно бросить в любое место окна. */
function useGlobalDrop() {
  const depth = useRef(0);
  useEffect(() => {
    const setOver = (on: boolean) => document.getElementById('drop')?.classList.toggle('over', on);
    const enter = (e: DragEvent) => { if (S.playing) return; e.preventDefault(); depth.current++; setOver(true); };
    const leave = () => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); };
    const over = (e: DragEvent) => { if (!S.playing) e.preventDefault(); };
    const drop = async (e: DragEvent) => {
      if (S.playing || !e.dataTransfer) return;
      e.preventDefault(); depth.current = 0; setOver(false);
      const entries = await entriesFromDrop(e.dataTransfer);
      if (!entries.length) return;
      if (S.tab !== 'load') setTab('load');
      await ingest(entries, entries.length === 1 ? entries[0].file.name : `${entries.length} файлов`, 'files');
    };
    document.addEventListener('dragenter', enter);
    document.addEventListener('dragleave', leave);
    document.addEventListener('dragover', over);
    document.addEventListener('drop', drop);
    return () => {
      document.removeEventListener('dragenter', enter);
      document.removeEventListener('dragleave', leave);
      document.removeEventListener('dragover', over);
      document.removeEventListener('drop', drop);
    };
  }, []);
}
