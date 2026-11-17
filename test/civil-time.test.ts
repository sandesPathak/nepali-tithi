import { describe, expect, it } from 'vitest';
import {
  addDays,
  assertPlace,
  civilDateOf,
  zonedInstant
} from '../src/civil-time';

describe('zonedInstant', () => {
  it('uses Nepal +05:45', () => {
    expect(
      zonedInstant('2024-01-15', '06:00', 'Asia/Kathmandu').toISOString()
    ).toBe('2024-01-15T00:15:00.000Z');
  });

  it('uses the zone history, not today’s offset (Nepal was +05:30 before 1986)', () => {
    expect(
      zonedInstant('1980-06-01', '05:30', 'Asia/Kathmandu').toISOString()
    ).toBe('1980-06-01T00:00:00.000Z');
  });

  it('handles both sides of a US DST change', () => {
    expect(
      zonedInstant('2026-03-07', '12:00', 'America/Chicago').toISOString()
    ).toBe('2026-03-07T18:00:00.000Z');
    expect(
      zonedInstant('2026-03-09', '12:00', 'America/Chicago').toISOString()
    ).toBe('2026-03-09T17:00:00.000Z');
  });

  it('accepts midnight and the last minute of the day', () => {
    expect(zonedInstant('2026-01-01', '00:00', 'UTC').toISOString()).toBe(
      '2026-01-01T00:00:00.000Z'
    );
    expect(zonedInstant('2026-01-01', '23:59', 'UTC').toISOString()).toBe(
      '2026-01-01T23:59:00.000Z'
    );
  });

  it('refuses malformed and impossible input', () => {
    expect(() => zonedInstant('2026-02-30', '00:00', 'UTC')).toThrow(
      RangeError
    );
    expect(() => zonedInstant('15/01/2024', '00:00', 'UTC')).toThrow(
      RangeError
    );
    expect(() => zonedInstant('2026-01-01', '24:00', 'UTC')).toThrow(
      RangeError
    );
    expect(() => zonedInstant('2026-01-01', '7am', 'UTC')).toThrow(RangeError);
  });
});

describe('civilDateOf', () => {
  it('gives the local date, which can differ from the UTC date', () => {
    const instant = new Date('2024-01-15T20:00:00Z');
    expect(civilDateOf(instant, 'Asia/Kathmandu')).toBe('2024-01-16');
    expect(civilDateOf(instant, 'America/Chicago')).toBe('2024-01-15');
  });
});

describe('addDays', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2024-03-01', 0)).toBe('2024-03-01');
  });
});

describe('assertPlace', () => {
  it('accepts a real place and the extreme coordinates', () => {
    expect(() =>
      assertPlace({
        latitude: 27.7,
        longitude: 85.3,
        timeZone: 'Asia/Kathmandu'
      })
    ).not.toThrow();
    expect(() =>
      assertPlace({ latitude: -90, longitude: 180, timeZone: 'UTC' })
    ).not.toThrow();
  });

  it('refuses out-of-range coordinates, NaN and unknown zones', () => {
    expect(() =>
      assertPlace({ latitude: 91, longitude: 0, timeZone: 'UTC' })
    ).toThrow(RangeError);
    expect(() =>
      assertPlace({ latitude: 0, longitude: 180.1, timeZone: 'UTC' })
    ).toThrow(RangeError);
    expect(() =>
      assertPlace({ latitude: NaN, longitude: 0, timeZone: 'UTC' })
    ).toThrow(RangeError);
    expect(() =>
      assertPlace({ latitude: 0, longitude: 0, timeZone: 'Mars/Olympus' })
    ).toThrow(RangeError);
  });
});
