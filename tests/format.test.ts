import { describe, expect, it } from 'vitest';
import { dateFromName, dayDiff, fmtRange, plural, sampleEvenly } from '../src/lib/format';

describe('format', () => {
  it('reads dates from common camera and messenger file names', () => {
    expect(new Date(dateFromName('IMG_20250720_180211.jpg')!).toISOString().slice(0, 16)).toBe(new Date(2025, 6, 20, 18, 2, 11).toISOString().slice(0, 16));
    expect(dateFromName('IMG-20250502-WA0003.jpg')).toBe(new Date(2025, 4, 2, 12).getTime());
    expect(dateFromName('PXL_20240101_000102345.jpg')).not.toBeNull();
    expect(dateFromName('DSC_0042.JPG')).toBeNull();
  });
  it('counts calendar days', () => {
    expect(dayDiff(new Date(2025, 0, 1, 23, 50).getTime(), new Date(2025, 0, 2, 0, 10).getTime())).toBe(1);
    expect(dayDiff(new Date(2025, 0, 1, 1).getTime(), new Date(2025, 0, 1, 23).getTime())).toBe(0);
  });
  it('formats ranges in Russian', () => {
    expect(fmtRange(new Date(2025, 6, 20).getTime(), new Date(2025, 6, 27).getTime())).toBe('20–27 июля 2025');
    expect(fmtRange(new Date(2025, 8, 28).getTime(), new Date(2025, 9, 2).getTime())).toBe('28 сентября – 2 октября 2025');
  });
  it('plural and sampling', () => {
    expect([1, 2, 5, 11, 21].map(n => plural(n, ['день', 'дня', 'дней']))).toEqual(['день', 'дня', 'дней', 'дней', 'день']);
    expect(sampleEvenly([0, 1, 2, 3, 4, 5, 6, 7], 4)).toEqual([0, 2, 4, 6]);
  });
});
