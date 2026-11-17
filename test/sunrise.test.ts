import { describe, expect, it } from 'vitest';
import { sunriseOn } from '../src/sunrise';

const KATHMANDU = {
  latitude: 27.7172,
  longitude: 85.324,
  timeZone: 'Asia/Kathmandu'
};
const DALLAS = {
  latitude: 32.7767,
  longitude: -96.797,
  timeZone: 'America/Chicago'
};
const TROMSO = { latitude: 69.65, longitude: 18.96, timeZone: 'Europe/Oslo' };
const MINUTE = 60_000;

describe('sunriseOn', () => {
  it('gives Kathmandu sunrise near 06:55 local on a January day', () => {
    // 06:55 NPT = 01:10 UTC; published tables give 06:55–06:56.
    const expected = new Date('2024-01-15T01:10:00Z').getTime();
    const sunrise = sunriseOn('2024-01-15', KATHMANDU).getTime();
    expect(Math.abs(sunrise - expected)).toBeLessThan(3 * MINUTE);
  });

  it('gives the sunrise of the local date west of UTC', () => {
    // Dallas 2024-07-01 sunrise about 06:22 CDT = 11:22 UTC.
    const expected = new Date('2024-07-01T11:22:00Z').getTime();
    const sunrise = sunriseOn('2024-07-01', DALLAS).getTime();
    expect(Math.abs(sunrise - expected)).toBeLessThan(3 * MINUTE);
  });

  it('refuses polar night instead of returning another day’s sunrise', () => {
    expect(() => sunriseOn('2024-12-21', TROMSO)).toThrow(RangeError);
  });
});
