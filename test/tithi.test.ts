import { describe, expect, it } from 'vitest';
import { drik } from '../src/drik';
import {
  followingLunation,
  lunationAt,
  purnimantaIndex
} from '../src/lunar-month';
import { suryaSiddhanta } from '../src/surya-siddhanta';
import { monthName, tithiName } from '../src/names';
import { birthTithi, tithiAt, tithisBetween, udayaTithi } from '../src/tithi';

const KATHMANDU = {
  latitude: 27.7172,
  longitude: 85.324,
  timeZone: 'Asia/Kathmandu'
};
/** Expected values below are modern-ephemeris (Drik Panchang) times. */
const DRIK = { method: 'drik' } as const;

describe('names', () => {
  it('names both ends of each paksha', () => {
    expect(tithiName(1).en).toBe('Pratipada');
    expect(tithiName(14).en).toBe('Chaturdashi');
    expect(tithiName(15).ne).toBe('पूर्णिमा');
    expect(tithiName(16).en).toBe('Pratipada');
    expect(tithiName(29).en).toBe('Chaturdashi');
    expect(tithiName(30).ne).toBe('औंसी');
  });

  it('refuses tithi and month numbers out of range', () => {
    expect(() => tithiName(0)).toThrow(RangeError);
    expect(() => tithiName(31)).toThrow(RangeError);
    expect(() => monthName(12)).toThrow(RangeError);
    expect(() => monthName(-1)).toThrow(RangeError);
  });

  it('prefixes a leap month', () => {
    expect(monthName(4, true)).toEqual({
      en: 'Adhika Shravana',
      ne: 'अधिक श्रावण'
    });
  });
});

describe.each([
  ['drik', drik],
  ['nepal-panchang', suryaSiddhanta]
] as const)('lunar months (%s)', (_name, engine) => {
  it('flags Adhika Shravana 2023 and the regular Shravana after it', () => {
    const leap = lunationAt(engine, new Date('2023-08-01T00:00:00Z'));
    expect(leap).toMatchObject({ index: 4, adhika: true, kshaya: false });
    expect(followingLunation(engine, leap)).toMatchObject({
      index: 4,
      adhika: false
    });
  });

  it('flags Adhika Jyeshtha 2026', () => {
    expect(lunationAt(engine, new Date('2026-06-01T00:00:00Z'))).toMatchObject({
      index: 2,
      adhika: true
    });
  });

  it('chains lunations end to start', () => {
    const first = lunationAt(engine, new Date('2025-01-01T00:00:00Z'));
    const second = followingLunation(engine, first);
    expect(second.startsAt).toEqual(first.endsAt);
    expect(second.index).toBe((first.index + 1) % 12);
  });
});

describe('purnimantaIndex', () => {
  it('wraps Phalguna krishna into Chaitra under purnimanta', () => {
    expect(purnimantaIndex(11, 16)).toBe(0);
    expect(purnimantaIndex(11, 15)).toBe(11);
    expect(purnimantaIndex(4, 30)).toBe(5);
  });
});

describe('udayaTithi', () => {
  it('gives Ashadha Purnima (Guru Purnima) on 2024-07-21 in Kathmandu', () => {
    const reading = udayaTithi('2024-07-21', KATHMANDU);
    expect(reading).toMatchObject({ tithi: 15, monthIndex: 3, adhika: false });
    expect(reading.label.en).toBe('Ashadha Shukla Purnima');
  });

  it('labels Janmashtami 2024 the Nepali (purnimanta) way', () => {
    const reading = udayaTithi('2024-08-26', KATHMANDU, DRIK);
    expect(reading.tithi).toBe(23);
    expect(reading.paksha).toBe('krishna');
    expect(reading.label).toEqual({
      en: 'Bhadrapada Krishna Ashtami',
      ne: 'भाद्र कृष्ण अष्टमी'
    });
    expect(reading.amantaLabel.en).toBe('Shravana Krishna Ashtami');
  });

  it('refuses a bad place', () => {
    expect(() =>
      udayaTithi('2024-08-26', { ...KATHMANDU, latitude: 120 })
    ).toThrow(RangeError);
  });
});

describe('tithisBetween', () => {
  it('returns contiguous spans that exactly cover the window', () => {
    const from = new Date('2024-08-25T00:00:00Z');
    const until = new Date('2024-08-28T00:00:00Z');
    const spans = tithisBetween(from, until);
    expect(spans.length).toBeGreaterThanOrEqual(3);
    expect(spans[0]?.startsAt).toEqual(from);
    expect(spans.at(-1)?.endsAt).toEqual(until);
    spans.slice(1).forEach((span, i) => {
      expect(span.startsAt).toEqual(spans[i]?.endsAt);
      expect(span.reading.tithi).toBe((spans[i]?.reading.tithi ?? 0) + 1);
    });
  });

  it('is empty for an empty window', () => {
    const instant = new Date('2024-08-25T00:00:00Z');
    expect(tithisBetween(instant, instant)).toEqual([]);
  });

  it('wraps from amavasya (30) to pratipada (1)', () => {
    const spans = tithisBetween(
      new Date('2024-04-08T12:00:00Z'),
      new Date('2024-04-09T00:00:00Z')
    );
    expect(spans.map((span) => span.reading.tithi)).toEqual([30, 1]);
  });
});

describe('birthTithi', () => {
  it('uses the sunrise tithi when no time is given, and lists the day’s tithis', () => {
    const birth = birthTithi({ date: '2024-08-26', place: KATHMANDU }, DRIK);
    expect(birth.basis).toBe('sunrise');
    expect(birth.reading.tithi).toBe(23);
    expect(birth.tithisThatDay.map((span) => span.reading.tithi)).toEqual([
      22, 23
    ]);
  });

  it('uses the tithi at the birth moment when a time is given', () => {
    // Ashtami began about 03:54 NPT on 2024-08-26, so 02:00 is still Saptami.
    const early = birthTithi(
      { date: '2024-08-26', time: '02:00', place: KATHMANDU },
      DRIK
    );
    expect(early.basis).toBe('birth-time');
    expect(early.reading.tithi).toBe(22);
    const later = birthTithi(
      { date: '2024-08-26', time: '12:00', place: KATHMANDU },
      DRIK
    );
    expect(later.reading.tithi).toBe(23);
  });

  it('refuses a malformed birth time', () => {
    expect(() =>
      birthTithi({ date: '2024-08-26', time: '25:00', place: KATHMANDU })
    ).toThrow(RangeError);
  });
});

describe('tithiAt', () => {
  it('agrees with tithisBetween about which tithi is running', () => {
    const instant = new Date('2025-02-26T10:00:00Z');
    const [span] = tithisBetween(instant, new Date(instant.getTime() + 1));
    expect(span?.reading).toEqual(tithiAt(instant));
  });
});
