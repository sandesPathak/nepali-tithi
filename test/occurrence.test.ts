import { describe, expect, it } from 'vitest';
import { addDays } from '../src/civil-time';
import { nextOccurrence } from '../src/occurrence';
import { udayaTithi } from '../src/tithi';

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

// Dates below are Hamro Patro's (see nepal-patro.test.ts).
describe('nextOccurrence in Kathmandu', () => {
  it('finds Mha Puja (Kartika Shukla Pratipada) 2026', () => {
    expect(
      nextOccurrence({ monthIndex: 7, tithi: 1 }, '2026-01-01', KATHMANDU)
    ).toMatchObject({
      date: '2026-11-10',
      kind: 'sunrise',
      alsoNextDay: false,
      adhika: false
    });
  });

  it('gives the first day of a repeated tithi and flags it', () => {
    expect(
      nextOccurrence({ monthIndex: 6, tithi: 8 }, '2026-10-01', KATHMANDU)
    ).toMatchObject({ date: '2026-10-18', alsoNextDay: true });
  });

  it('puts a skipped tithi on the day it runs', () => {
    // Bhadra Krishna Navami 2026 never sees a sunrise: 10-04 is Ashtami at
    // sunrise and 10-05 is Dashami, so Navami runs on 10-04.
    expect(
      nextOccurrence({ monthIndex: 5, tithi: 24 }, '2026-09-01', KATHMANDU)
    ).toMatchObject({ date: '2026-10-04', kind: 'kshaya' });
  });

  it('includes the from date itself', () => {
    expect(
      nextOccurrence({ monthIndex: 7, tithi: 1 }, '2026-11-10', KATHMANDU).date
    ).toBe('2026-11-10');
  });

  it('moves to next year once this year’s date has passed', () => {
    const next = nextOccurrence(
      { monthIndex: 7, tithi: 1 },
      '2026-11-11',
      KATHMANDU
    );
    expect(next.date.startsWith('2027-')).toBe(true);
    expect(udayaTithi(next.date, KATHMANDU)).toMatchObject({
      monthIndex: 7,
      tithi: 1
    });
  });

  it('uses the regular Jyeshtha in a leap year unless asked for the leap one', () => {
    const target = { monthIndex: 2, tithi: 8 };
    const regular = nextOccurrence(target, '2026-05-01', KATHMANDU);
    expect(regular.adhika).toBe(false);
    expect(regular.date > '2026-06-15').toBe(true);
    const leap = nextOccurrence(target, '2026-05-01', KATHMANDU, {
      leapMonth: 'leap'
    });
    expect(leap).toMatchObject({ date: '2026-05-24', adhika: true });
  });

  it('uses the regular month in a year with no leap month either way', () => {
    const target = { monthIndex: 7, tithi: 1 };
    expect(
      nextOccurrence(target, '2026-01-01', KATHMANDU, { leapMonth: 'leap' })
        .date
    ).toBe('2026-11-10');
  });

  it('refuses a bad target', () => {
    expect(() =>
      nextOccurrence({ monthIndex: 12, tithi: 1 }, '2026-01-01', KATHMANDU)
    ).toThrow(RangeError);
    expect(() =>
      nextOccurrence({ monthIndex: 0, tithi: 31 }, '2026-01-01', KATHMANDU)
    ).toThrow(RangeError);
    expect(() =>
      nextOccurrence({ monthIndex: 0, tithi: 0 }, '2026-01-01', KATHMANDU)
    ).toThrow(RangeError);
  });
});

describe('nextOccurrence invariants', () => {
  it('finds each day of a year as its own udaya tithi (Kathmandu and Dallas)', () => {
    for (const place of [KATHMANDU, DALLAS]) {
      for (let offset = 0; offset < 365; offset += 7) {
        const date = addDays('2025-01-03', offset);
        const reading = udayaTithi(date, place);
        const yesterday = udayaTithi(addDays(date, -1), place);
        // The second day of a repeated tithi belongs to the day before.
        const expected =
          yesterday.tithi === reading.tithi ? addDays(date, -1) : date;
        const found = nextOccurrence(reading, addDays(date, -40), place, {
          leapMonth: reading.adhika ? 'leap' : 'regular'
        });
        expect(found.date).toBe(expected);
      }
    }
  });

  it('can land a day apart in Kathmandu and Dallas', () => {
    const target = { monthIndex: 7, tithi: 1 };
    const kathmandu = nextOccurrence(target, '2026-01-01', KATHMANDU).date;
    const dallas = nextOccurrence(target, '2026-01-01', DALLAS).date;
    expect([addDays(kathmandu, -1), kathmandu]).toContain(dallas);
  });
});
