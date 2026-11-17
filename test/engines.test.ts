import { describe, expect, it } from 'vitest';
import { drik } from '../src/drik';
import { normalizeDegrees, tithiForElongation } from '../src/engine';
import { engineFor } from '../src/methods';
import { suryaSiddhanta } from '../src/surya-siddhanta';
import type { Method } from '../src/engine';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** The total solar eclipse new moon, 2024-04-08 18:21 UTC. */
const NEW_MOON = new Date('2024-04-08T18:21:00Z');

describe('tithiForElongation', () => {
  it('maps elongation edges to tithis 1, 15, 16 and 30', () => {
    expect(tithiForElongation(0)).toBe(1);
    expect(tithiForElongation(11.999)).toBe(1);
    expect(tithiForElongation(12)).toBe(2);
    expect(tithiForElongation(179.999)).toBe(15);
    expect(tithiForElongation(180)).toBe(16);
    expect(tithiForElongation(359.999)).toBe(30);
  });
});

describe('normalizeDegrees', () => {
  it('wraps negative and over-360 angles', () => {
    expect(normalizeDegrees(-1)).toBe(359);
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(725)).toBe(5);
  });
});

describe('engineFor', () => {
  it('defaults to the Nepal panchang model', () => {
    expect(engineFor()).toBe(suryaSiddhanta);
    expect(engineFor('drik')).toBe(drik);
  });

  it('refuses an unknown method', () => {
    expect(() => engineFor('vakya' as Method)).toThrow(RangeError);
  });
});

describe('drik', () => {
  it('finds a known new moon to the minute', () => {
    const found = drik.previousNewMoon(new Date('2024-04-10T00:00:00Z'));
    expect(Math.abs(found.getTime() - NEW_MOON.getTime())).toBeLessThan(
      2 * MINUTE
    );
  });

  it('finds a known full moon (2024-04-23 23:49 UTC)', () => {
    const fullMoon = drik.nextElongation(180, new Date('2024-04-15T00:00:00Z'));
    const expected = new Date('2024-04-23T23:49:00Z').getTime();
    expect(Math.abs(fullMoon.getTime() - expected)).toBeLessThan(2 * MINUTE);
  });
});

describe.each([
  ['drik', drik],
  ['nepal-panchang', suryaSiddhanta]
] as const)('%s engine', (_name, engine) => {
  it('lands searches on the elongation asked for', () => {
    const from = new Date('2024-04-15T00:00:00Z');
    for (const target of [12, 96, 180, 348]) {
      const found = engine.nextElongation(target, from);
      expect(found.getTime()).toBeGreaterThanOrEqual(from.getTime());
      expect(found.getTime() - from.getTime()).toBeLessThan(31 * DAY);
      const error = normalizeDegrees(engine.elongation(found) - target + 180);
      expect(Math.abs(error - 180)).toBeLessThan(0.001);
    }
  });

  it('treats 360° as the next new moon', () => {
    const found = engine.nextElongation(360, new Date('2024-04-01T00:00:00Z'));
    // Surya Siddhanta conjunctions can be hours off the true one.
    expect(Math.abs(found.getTime() - NEW_MOON.getTime())).toBeLessThan(
      12 * HOUR
    );
  });

  it('finds the new moon before an instant, not after', () => {
    const instant = new Date('2024-04-20T00:00:00Z');
    const found = engine.previousNewMoon(instant);
    expect(found.getTime()).toBeLessThanOrEqual(instant.getTime());
    expect(Math.abs(found.getTime() - NEW_MOON.getTime())).toBeLessThan(
      12 * HOUR
    );
  });

  it('puts the Sun into Mesha (the Nepali new year) on 13–14 April', () => {
    expect(engine.sunSign(new Date('2024-04-12T00:00:00Z'))).toBe(11);
    expect(engine.sunSign(new Date('2024-04-14T12:00:00Z'))).toBe(0);
  });

  it('puts the Sun into Makara (Maghe Sankranti) on 14–15 January', () => {
    expect(engine.sunSign(new Date('2024-01-13T00:00:00Z'))).toBe(8);
    expect(engine.sunSign(new Date('2024-01-16T00:00:00Z'))).toBe(9);
  });
});
