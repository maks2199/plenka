import { useState, type FormEvent } from 'react';
import { S, emit, saveCfg } from '../lib/store';
import { fmtN, fmtShort, parseNum } from '../lib/format';
import { gameEvents, kmOf, metaOf, titleOf } from '../lib/events';
import { metrics, records } from '../lib/metrics';
import DemoBanner from './DemoBanner';

export default function StatsView() {
  const ms = metrics();
  const recs = records();
  const on = ms.filter(m => !S.cfg.statsOff[m.id]);
  const [pLabel, setPLabel] = useState('');
  const [pPat, setPPat] = useState('');
  const [mVal, setMVal] = useState('');
  const [mUnit, setMUnit] = useState('');
  const [mLabel, setMLabel] = useState('');
  const commit = () => { saveCfg(); emit(); };
  const addPhrase = (e: FormEvent) => { e.preventDefault(); S.cfg.phrases.push({ label: pLabel.trim(), pattern: pPat.trim() }); setPLabel(''); setPPat(''); commit(); };
  const addManual = (e: FormEvent) => {
    e.preventDefault();
    const v = mVal.trim();
    S.cfg.manual.push({ value: /^[\d\s.,]+$/.test(v) && parseNum(v) != null ? parseNum(v)! : v, unit: mUnit.trim(), label: mLabel.trim() });
    setMVal(''); setMUnit(''); setMLabel(''); commit();
  };
  return (
    <>
      <DemoBanner />
      <div className="split">
        <div className="main">
          <div><h1 className="h1">Итоги по смыслу</h1><p className="lead">Не только «сколько кадров», а что вы сделали вместе. Отмеченные цифры попадут на финальный слайд — первые шесть по порядку.</p></div>
          <div className="mgrid">
            {ms.map(m => {
              const off = !!S.cfg.statsOff[m.id];
              const pos = on.indexOf(m);
              return (
                <article key={m.id} className={'mcard ' + (off ? 'off' : '')}>
                  <div className="top2">
                    <span className={'badge ' + (/чат|переписка/.test(m.src) ? 'chat' : '')}>{m.src}</span>
                    <label className="check" style={{ minHeight: 36 }}><input type="checkbox" checked={!off} aria-label={`На слайд: ${m.label}`} onChange={e => { S.cfg.statsOff[m.id] = !e.target.checked; commit(); }} /></label>
                  </div>
                  <div className="mv">{typeof m.num === 'number' ? fmtN(m.num) : m.num}{m.unit && <small>{m.unit}</small>}</div>
                  <div style={{ fontWeight: 600 }}>{m.label}</div>
                  <div className="note">
                    {pos >= 0 && pos < 6 ? <span className="amber">на слайде · {pos + 1}</span> : pos >= 6 ? 'не влезает, снимите другие' : 'не показывается'}
                    {m.note ? ' · ' + m.note : ''}
                    {m.del && <> · <button className="btn sm" style={{ minHeight: 28, padding: '0 6px', border: 0, color: 'var(--rose)' }} type="button" onClick={() => { S.cfg[m.del!.kind].splice(m.del!.i, 1); S.cfg.statsOff = {}; commit(); }}>удалить</button></>}
                  </div>
                </article>
              );
            })}
          </div>
          {recs.length > 0 && (
            <section className="panel">
              <h2 className="eyebrow" style={{ margin: 0 }}>Рекорды · строка под цифрами</h2>
              {recs.map(r => <div key={r.k}><span className="mono tiny muted">{r.k}</span><div>{r.t} — <span className="amber">{r.v}</span></div></div>)}
            </section>
          )}
          <section aria-labelledby="km-h" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="h2" id="km-h">Километры по событиям</h2>
            <div style={{ overflowX: 'auto', border: '1px solid var(--line)' }}>
              <table className="kmtable">
                <thead><tr><th>Событие</th><th>Даты</th><th>Источник</th><th style={{ textAlign: 'right' }}>Км</th></tr></thead>
                <tbody>
                  {gameEvents().map(e => {
                    const k = kmOf(e);
                    return (
                      <tr key={e.key}>
                        <td>{titleOf(e)}</td>
                        <td className="mono tiny muted">{fmtShort(e.start)}</td>
                        <td className={'mono tiny ' + (k.v == null ? 'rose' : 'muted')}>{k.v == null ? 'нет данных' : k.src}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input className="in mono" style={{ width: 90, minHeight: 36, textAlign: 'right' }} type="text" inputMode="decimal" key={e.key}
                            defaultValue={(S.cfg.meta[e.key] || {}).km || ''} placeholder={k.v != null && k.src !== 'вручную' ? fmtN(k.v) : '—'} aria-label={`Км: ${titleOf(e)}`}
                            onChange={ev => { metaOf(e).km = ev.target.value; saveCfg(); }} onBlur={() => emit()} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="side">
          <form className="panel" onSubmit={addPhrase}>
            <h2 className="eyebrow" style={{ margin: 0 }}>Счётчик фразы в чате</h2>
            <div className="field"><label htmlFor="p-label">Подпись на слайде</label><input className="in" id="p-label" value={pLabel} onChange={e => setPLabel(e.target.value)} placeholder="раз спросили «где ключи?»" required /></div>
            <div className="field"><label htmlFor="p-pat">Что искать (через | несколько вариантов)</label><input className="in mono" id="p-pat" value={pPat} onChange={e => setPPat(e.target.value)} placeholder="ключ|ключи" required /></div>
            <button className="btn primary" type="submit" disabled={!S.chat.length}>Добавить счётчик</button>
            {!S.chat.length && <div className="tiny rose">Сначала загрузите переписку.</div>}
          </form>
          <form className="panel" onSubmit={addManual}>
            <h2 className="eyebrow" style={{ margin: 0 }}>Своя цифра</h2>
            <div className="row2">
              <div className="field"><label htmlFor="m-val">Значение</label><input className="in" id="m-val" value={mVal} onChange={e => setMVal(e.target.value)} placeholder="14" required /></div>
              <div className="field"><label htmlFor="m-unit">Единица</label><input className="in" id="m-unit" value={mUnit} onChange={e => setMUnit(e.target.value)} placeholder="шт" /></div>
            </div>
            <div className="field"><label htmlFor="m-label">Подпись</label><input className="in" id="m-label" value={mLabel} onChange={e => setMLabel(e.target.value)} placeholder="костров" required /></div>
            <button className="btn" type="submit">Добавить цифру</button>
          </form>
        </aside>
      </div>
    </>
  );
}
