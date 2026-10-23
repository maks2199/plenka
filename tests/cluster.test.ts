import { describe, expect, it } from 'vitest';
import { clusterPhotos } from '../src/lib/events';
import { ph } from './helpers';

const opts = (o: Partial<Parameters<typeof clusterPhotos>[1]> = {}) => ({ gapDays: 1, minPhotos: 1, useFileDates: true, cuts: new Set<string>(), joins: new Set<string>(), ...o });

describe('clusterPhotos', () => {
  const trip = [ph('2025-07-19T10:00'), ph('2025-07-19T22:30'), ph('2025-07-20T09:15'), ph('2025-07-21T18:00')];
  const party = [ph('2025-07-26T20:00'), ph('2025-07-26T23:50')];

  it('keeps a multi-day trip together and splits after an empty day (gapDays=1)', () => {
    const ev = clusterPhotos([...party, ...trip], opts());
    expect(ev.map(e => e.photos.length)).toEqual([4, 2]);
    expect(ev[0].days).toBe(3);
  });
  it('gapDays=0 makes every calendar day its own event', () => {
    expect(clusterPhotos(trip, opts({ gapDays: 0 })).length).toBe(3);
  });
  it('a large gapDays merges everything within the window', () => {
    expect(clusterPhotos([...trip, ...party], opts({ gapDays: 10 })).length).toBe(1);
  });
  it('manual cut and join override the automatic split', () => {
    const cut = clusterPhotos(trip, opts({ cuts: new Set([trip[2].key]) }));
    expect(cut.map(e => e.photos.length)).toEqual([2, 2]);
    const joined = clusterPhotos([...trip, ...party], opts({ joins: new Set([party[0].key]) }));
    expect(joined.length).toBe(1);
  });
  it('marks small events and can ignore file-date photos', () => {
    const lone = ph('2025-09-01T12:00', { tsrc: 'file' });
    const ev = clusterPhotos([...trip, lone], opts({ minPhotos: 3 }));
    expect(ev[1].small).toBe(true);
    expect(clusterPhotos([...trip, lone], opts({ useFileDates: false })).length).toBe(1);
  });
});
