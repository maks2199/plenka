import { beforeEach, describe, expect, it } from 'vitest';
import { S, defaultCfg } from '../src/lib/store';
import { rebuild } from '../src/lib/events';
import { buildShow } from '../src/lib/show';
import { metrics } from '../src/lib/metrics';
import playerSource from '../src/player/runtime.js?raw';
import { ph } from './helpers';

beforeEach(() => {
  S.cfg = defaultCfg(); S.cuts.clear(); S.joins.clear(); S.excluded.clear(); S.chat = []; S.gpx = [];
  const days = ['2025-01-03', '2025-03-08', '2025-05-01', '2025-07-19', '2025-09-06', '2025-12-31'];
  S.photos = days.flatMap((d, i) => Array.from({ length: 6 }, (_, k) => ph(`${d}T${String(10 + k).padStart(2, '0')}:00`, { lat: 60 + i + k * 0.01, lon: 30 })));
  for (let i = 0; i < 40; i++) S.chat.push({ t: new Date(2025, 4, 1, 10, i).getTime(), a: ['Аня', 'Боря', 'Вика'][i % 3], x: `сообщение номер ${i}, кто взял газ на этот раз` });
  rebuild();
});

describe('buildShow', () => {
  it('builds guess → title → stories per event, inserts and the final block', () => {
    const { D, used } = buildShow();
    const kinds = D.slides.map(s => s.kind);
    expect(kinds[0]).toBe('intro');
    expect(kinds.slice(-3)).toEqual(['stats', 'summary', 'outro']);
    expect(kinds.filter(k => k === 'guess').length).toBe(6);
    expect(kinds.filter(k => k === 'story').length).toBe(36);
    expect(kinds).toContain('before');
    expect(kinds).toContain('who');
    const maxIdx = Math.max(...D.slides.flatMap(s => s.kind === 'story' ? [s.im] : s.kind === 'guess' ? s.collage : []));
    expect(maxIdx).toBeLessThan(used.length);
    expect(D.summary.length).toBe(6);
  });
  it('respects skipped events and story length', () => {
    S.cfg.meta[S.events[0].key] = { skip: true };
    S.cfg.game.storyMax = 3;
    const { D } = buildShow();
    expect(D.events.length).toBe(5);
    expect(D.slides.filter(s => s.kind === 'story').length).toBe(15);
  });
  it('metrics count km from geotags and phrase hits from chat', () => {
    const m = Object.fromEntries(metrics().map(x => [x.id, x.num]));
    expect(m.events).toBe(6);
    expect(m.km as number).toBeGreaterThan(0);
    expect(m['ph:0']).toBe(40);
  });
  it('player source can be embedded as a plain script', () => {
    const code = playerSource.replace(/^\s*export\s+function\s+playerMain/m, 'function playerMain');
    expect(code).not.toMatch(/^\s*(import|export)\s/m);
    expect(code).not.toContain('</script');
    expect(() => new Function(code + ';return playerMain')()).not.toThrow();
  });
});
