import { describe, expect, it } from 'vitest';
import { zonedInstant } from '../src/civil-time';
import { sunriseOn } from '../src/sunrise';
import { nextOccurrence } from '../src/occurrence';
import { tithisBetween, udayaTithi } from '../src/tithi';

/*
 * Fixtures from a Dallas–Fort Worth Nepali wall patro for BS 2083, printed
 * from the Divya-Drishti Nepali Panchang. It gives each day's tithi at local
 * sunrise and the time it ends in Dallas time.
 */
const DFW = {
  latitude: 32.837,
  longitude: -97.082,
  timeZone: 'America/Chicago'
};
const KATHMANDU = {
  latitude: 27.7172,
  longitude: 85.324,
  timeZone: 'Asia/Kathmandu'
};

// [date, amanta month index, tithi, adhika, what the calendar prints]
const DAYS: [string, number, number, boolean, string][] = [
  ['2026-04-01', 0, 15, false, 'चैत्र शुक्ल पूर्णिमा'],
  ['2026-04-08', 0, 22, false, 'वैशाख कृष्ण सप्तमी अहोरात्र'],
  ['2026-04-09', 0, 22, false, 'वैशाख कृष्ण सप्तमी'],
  ['2026-04-16', 0, 29, false, 'वैशाख कृष्ण चतुर्दशी, औंसी क्षय'],
  ['2026-05-01', 1, 15, false, 'वैशाख शुक्ल पूर्णिमा'],
  ['2026-05-16', 1, 30, false, 'ज्येष्ठ कृष्ण औंसी'],
  ['2026-05-17', 2, 1, true, 'अधिक ज्येष्ठ शुक्ल प्रतिपदा'],
  ['2026-05-19', 2, 3, true, 'अधिक ज्येष्ठ शुक्ल तृतीया, चतुर्थी क्षय'],
  ['2026-08-05', 3, 22, false, 'श्रावण कृष्ण सप्तमी, अष्टमी क्षय'],
  ['2026-10-01', 5, 21, false, 'आश्विन कृष्ण षष्ठी'],
  ['2026-10-10', 5, 30, false, 'आश्विन कृष्ण औंसी'],
  ['2026-10-11', 6, 1, false, 'घटस्थापना, आश्विन शुक्ल प्रतिपदा'],
  ['2026-10-20', 6, 10, false, 'विजयादशमी'],
  ['2026-10-25', 6, 15, false, 'आश्विन शुक्ल पूर्णिमा'],
  ['2026-11-01', 6, 22, false, 'कार्तिक कृष्ण सप्तमी, अष्टमी क्षय'],
  ['2026-11-02', 6, 24, false, 'कार्तिक कृष्ण नवमी'],
  ['2026-11-08', 6, 30, false, 'लक्ष्मी पूजा, कार्तिक कृष्ण औंसी'],
  ['2026-11-09', 7, 1, false, 'गोवर्धन पूजा, म्हः पूजा'],
  ['2026-11-10', 7, 2, false, 'भाइटीका'],
  ['2026-11-13', 7, 5, false, 'कार्तिक शुक्ल पञ्चमी अहोरात्र'],
  ['2026-11-14', 7, 5, false, 'कार्तिक शुक्ल पञ्चमी'],
  ['2026-11-24', 7, 15, false, 'कार्तिक शुक्ल पूर्णिमा'],
  ['2027-02-04', 9, 29, false, 'माघ कृष्ण चतुर्दशी अहोरात्र'],
  ['2027-02-05', 9, 29, false, 'माघ कृष्ण चतुर्दशी'],
  ['2027-02-06', 9, 30, false, 'माघ कृष्ण औंसी'],
  ['2027-02-11', 10, 5, false, 'वसन्त पञ्चमी'],
  ['2027-03-06', 10, 29, false, 'महाशिवरात्रि'],
  ['2027-03-21', 11, 15, false, 'फागु पूर्णिमा'],
  ['2027-03-30', 11, 23, false, 'चैत्र कृष्ण अष्टमी']
];

describe('day tithi in Dallas–Fort Worth', () => {
  it.each(DAYS)('%s is %s/%s (%s, %s)', (date, monthIndex, tithi, adhika) => {
    expect(udayaTithi(date, DFW)).toMatchObject({
      monthIndex,
      tithi,
      adhika
    });
  });
});

// [tithi, ends on (Dallas date), at (Dallas time)]
const ENDS: [number, string, string][] = [
  [15, '2026-04-01', '20:16'],
  [30, '2026-04-17', '06:57'],
  [4, '2026-05-20', '05:43'],
  [10, '2026-10-21', '00:06'],
  [22, '2026-11-01', '07:20'],
  [23, '2026-11-02', '05:10'],
  [30, '2026-11-08', '23:48'],
  [29, '2027-02-05', '07:22'],
  [29, '2027-03-07', '01:50'],
  [22, '2027-03-29', '07:20']
];

const MINUTE = 60_000;

describe('tithi end times', () => {
  it.each(ENDS)('tithi %s ends %s %s Dallas time', (tithi, date, time) => {
    const printed = zonedInstant(date, time, DFW.timeZone);
    const span = tithisBetween(
      new Date(printed.getTime() - 3 * MINUTE * 60),
      new Date(printed.getTime() + 3 * MINUTE * 60)
    ).find((candidate) => candidate.reading.tithi === tithi);
    expect(span).toBeDefined();
    // The patro truncates to the minute; allow one minute either way.
    const off = Math.abs((span?.endsAt.getTime() ?? 0) - printed.getTime());
    expect(off).toBeLessThanOrEqual(MINUTE);
  });
});

describe('festival dates in Dallas–Fort Worth', () => {
  it('Ghatasthapana 2026', () => {
    expect(
      nextOccurrence({ monthIndex: 6, tithi: 1 }, '2026-09-01', DFW).date
    ).toBe('2026-10-11');
  });

  it('Mha Puja is a day earlier in Dallas than in Kathmandu', () => {
    const target = { monthIndex: 7, tithi: 1 };
    expect(nextOccurrence(target, '2026-09-01', DFW).date).toBe('2026-11-09');
    expect(nextOccurrence(target, '2026-09-01', KATHMANDU).date).toBe(
      '2026-11-10'
    );
  });

  it('Bhai Tika 2026', () => {
    expect(
      nextOccurrence({ monthIndex: 7, tithi: 2 }, '2026-09-01', DFW).date
    ).toBe('2026-11-10');
  });

  it('a skipped Ashtami falls on the day it runs', () => {
    expect(
      nextOccurrence({ monthIndex: 6, tithi: 23 }, '2026-10-15', DFW)
    ).toMatchObject({ date: '2026-11-01', kind: 'kshaya' });
  });

  it('a repeated Saptami gives its first day', () => {
    expect(
      nextOccurrence({ monthIndex: 0, tithi: 22 }, '2026-04-01', DFW)
    ).toMatchObject({ date: '2026-04-08', alsoNextDay: true });
  });
});

/*
 * On these days a tithi ends within seconds of Dallas sunrise and the patro
 * puts it before sunrise where we put it after, so the day's tithi differs.
 * No one sunrise rule matches the patro on all of them (5 Aug 2026, 31 s
 * after sunrise, it agrees with us), so the gap is calculation noise, not a
 * rule. These tests only pin down how close they are.
 */
const KNIFE_EDGE: [string, number, string][] = [
  ['2026-04-17', 30, 'patro: Pratipada (Mata Tirtha Aunsi on 04-16)'],
  ['2027-03-29', 22, 'patro: Ashtami']
];

describe('days decided by seconds', () => {
  it.each(KNIFE_EDGE)(
    '%s: tithi %s ends within a minute of sunrise (%s)',
    (date, tithi) => {
      const sunrise = sunriseOn(date, DFW);
      const span = tithisBetween(
        new Date(sunrise.getTime() - 60 * MINUTE),
        new Date(sunrise.getTime() + 60 * MINUTE)
      ).find((candidate) => candidate.reading.tithi === tithi);
      const gap = Math.abs((span?.endsAt.getTime() ?? 0) - sunrise.getTime());
      expect(gap).toBeLessThan(MINUTE);
    }
  );
});
