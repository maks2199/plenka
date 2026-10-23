import { S, emit, saveCfg, toast } from '../lib/store';
import { flowItems, whoPool } from '../lib/show';
import { exportShow, startShow } from '../lib/play';
import { setMusic } from '../lib/persist';
import type { GameCfg } from '../lib/types';
import DemoBanner from './DemoBanner';

type StrKey = { [K in keyof GameCfg]: GameCfg[K] extends string ? K : never }[keyof GameCfg];
type NumKey = { [K in keyof GameCfg]: GameCfg[K] extends number ? K : never }[keyof GameCfg];
type BoolKey = { [K in keyof GameCfg]: GameCfg[K] extends boolean ? K : never }[keyof GameCfg];

const g = () => S.cfg.game;
const setG = (patch: Partial<GameCfg>) => { Object.assign(S.cfg.game, patch); saveCfg(); emit(); };

function Text({ k, label, placeholder }: { k: StrKey; label: string; placeholder?: string }) {
  return <div className="field"><label htmlFor={'g-' + k}>{label}</label><input className="in" id={'g-' + k} type="text" value={g()[k]} placeholder={placeholder} onChange={e => setG({ [k]: e.target.value } as Partial<GameCfg>)} /></div>;
}
function Num({ k, label, min, max, step = 1, hint, disabled }: { k: NumKey; label: string; min: number; max: number; step?: number; hint?: React.ReactNode; disabled?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={'g-' + k}>{label}</label>
      <input className="in" id={'g-' + k} type="number" min={min} max={max} step={step} value={g()[k]} disabled={disabled}
        onChange={e => { const v = parseFloat(e.target.value); if (isFinite(v)) setG({ [k]: Math.max(min, Math.min(max, v)) } as Partial<GameCfg>); }} />
      {hint}
    </div>
  );
}
function Check({ k, children }: { k: BoolKey; children: React.ReactNode }) {
  return <label className="check"><input type="checkbox" checked={g()[k]} onChange={e => setG({ [k]: e.target.checked } as Partial<GameCfg>)} /><span>{children}</span></label>;
}

export default function GameView() {
  const { out, D } = flowItems();
  const nStory = D.slides.filter(s => s.kind === 'story').length;
  const nIns = D.slides.filter(s => s.kind === 'before' || s.kind === 'who').length;
  const mins = Math.round((nStory * D.storySec + D.events.length * (D.titleSec + 40) + nIns * 40 + (g().reflect ? 300 : 0) + 120) / 60);
  const chatOk = whoPool().authors.length >= 2;
  return (
    <>
      <DemoBanner />
      <div className="split">
        <div className="main">
          <div><h1 className="h1">Сценарий вечера</h1><p className="lead">Для каждого события: размытый коллаж с вопросом, титул и сторис. Между событиями — вставки-вопросы. В конце рефлексия, цифры и таблица всех событий.</p></div>
          <div className="row2">
            <Text k="eyebrow" label="Надзаголовок" />
            <Text k="title" label="Заголовок интро" />
            <Text k="outro" label="Финальная фраза" />
            <Text k="outroSub" label="Подпись финала" placeholder={D.outro.sub} />
          </div>
          <div className="row3">
            <Num k="storyMax" label="Кадров в сторис на событие" min={1} max={60} />
            <Num k="storySec" label="Секунд на кадр" min={1} max={20} step={0.5} />
            <Num k="titleSec" label="Секунд на титул" min={1} max={10} step={0.2} />
          </div>
          <div className="panel">
            <h2 className="eyebrow" style={{ margin: 0 }}>Вопросы</h2>
            <Check k="guess">«Угадай событие» перед каждым титулом</Check>
            <Check k="caption">Подпись с датой и временем на кадрах сторис</Check>
            <div className="row2">
              <Num k="beforeEvery" label="«Что было раньше?» — после каждого N-го события" min={0} max={20} hint={<span className="hint">0 — не вставлять</span>} />
              <Num k="whoEvery" label="«Кто это написал?» — после каждого N-го" min={0} max={20} disabled={!chatOk}
                hint={<span className={'hint ' + (chatOk ? '' : 'rose')}>{chatOk ? 'цитаты из чата, 4 варианта автора' : 'нужна переписка с 2+ активными участниками'}</span>} />
            </div>
            <Check k="reflect">Рефлексия перед итогами</Check>
            <Text k="reflectText" label="Вопрос рефлексии" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button className="btn sm" type="button" onClick={() => { setG({ seed: Math.floor(Math.random() * 1e9) }); toast('Вставки перемешаны'); }}>↻ Перемешать вставки</button>
              <label className="pick" style={{ minHeight: 36, padding: '0 12px', borderColor: 'var(--line2)', color: 'var(--dim)' }}>
                {S.music ? '♪ ' + S.music.name : '+ Музыка (mp3)'}
                <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setMusic(f); }} />
              </label>
              {S.music && <button className="btn sm" type="button" onClick={() => setMusic(null)}>Убрать музыку</button>}
            </div>
          </div>
        </div>
        <aside className="side" aria-label="Порядок слайдов">
          <div className="rowhead"><h2 className="eyebrow" style={{ margin: 0 }}>Порядок · {D.slides.length} слайдов</h2><span className="mono tiny muted">~{mins} мин</span></div>
          <ol className="flow">
            {out.map((o, i) => (
              <li key={i} className={o.c}><span className="k">{o.k || ''}</span><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.t}</span><span className="x">{o.x}</span></li>
            ))}
          </ol>
          <div className="keys"><span><kbd>Space</kbd> вперёд / ответ</span><span><kbd>←</kbd> назад</span><span><kbd>P</kbd> пауза</span><span><kbd>F</kbd> экран</span><span><kbd>Esc</kbd> меню</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="btn primary" type="button" onClick={() => startShow()}>▸ Начать показ</button>
            <button className="btn" type="button" onClick={exportShow}>Скачать .html</button>
          </div>
          <div className="tiny muted">Скачанный файл открывается в любом браузере без интернета (кроме шрифтов) — удобно для проектора.</div>
        </aside>
      </div>
    </>
  );
}
