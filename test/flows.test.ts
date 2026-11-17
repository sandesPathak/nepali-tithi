import { describe, expect, it } from 'vitest';
import { addDays, type Place } from '../src/civil-time';
import { lunationAt } from '../src/lunar-month';
import { DEFAULT_METHOD, engineFor } from '../src/methods';
import { nextOccurrence, type Occurrence } from '../src/occurrence';
import { birthTithi, udayaTithi, type TithiReading } from '../src/tithi';

/*
 * The life-event flow end to end: a member gives a date of birth (time
 * optional) and a birth place, the server stores the birth tithi, and each
 * year the reminder date is the next time that tithi falls where it is celebrated.
 */

const CELEBRATED_AT: Place = {
  latitude: 32.837,
  longitude: -97.082,
  timeZone: 'America/Chicago'
};

const BIRTH_PLACES = {
  kathmandu: {
    latitude: 27.7172,
    longitude: 85.324,
    timeZone: 'Asia/Kathmandu'
  },
  biratnagar: {
    latitude: 26.4525,
    longitude: 87.2718,
    timeZone: 'Asia/Kathmandu'
  },
  dharan: { latitude: 26.8065, longitude: 87.2846, timeZone: 'Asia/Kathmandu' },
  darjeeling: {
    latitude: 27.041,
    longitude: 88.2663,
    timeZone: 'Asia/Kolkata'
  },
  thimphu: { latitude: 27.4728, longitude: 89.639, timeZone: 'Asia/Thimphu' },
  dallas: {
    latitude: 32.7767,
    longitude: -96.797,
    timeZone: 'America/Chicago'
  },
  newYork: {
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: 'America/New_York'
  },
  honolulu: {
    latitude: 21.3069,
    longitude: -157.8583,
    timeZone: 'Pacific/Honolulu'
  },
  london: { latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London' },
  sydney: {
    latitude: -33.8688,
    longitude: 151.2093,
    timeZone: 'Australia/Sydney'
  }
} satisfies Record<string, Place>;

/** What the server would store on the life event. */
function stored({ monthIndex, tithi, adhika }: TithiReading) {
  return { monthIndex, tithi, adhika };
}

/** The reminder date really is the stored tithi where it is celebrated. */
function expectTithiOn(
  target: { monthIndex: number; tithi: number },
  occurrence: Occurrence
): void {
  const { date, kind, startsAt } = occurrence;
  // The month: its own lunation, or a kshaya lunation that swallowed it.
  const lunation = lunationAt(engineFor(DEFAULT_METHOD), startsAt);
  const months = lunation.kshaya
    ? [lunation.index, (lunation.index + 1) % 12]
    : [lunation.index];
  expect(months).toContain(target.monthIndex);
  if (kind === 'sunrise') {
    expect(udayaTithi(date, CELEBRATED_AT).tithi).toBe(target.tithi);
    return;
  }
  // A skipped tithi runs between this sunrise and the next.
  const before = udayaTithi(date, CELEBRATED_AT).tithi;
  const after = udayaTithi(addDays(date, 1), CELEBRATED_AT).tithi;
  expect(before).toBe(target.tithi === 1 ? 30 : target.tithi - 1);
  expect(after).toBe(target.tithi === 30 ? 1 : target.tithi + 1);
}

describe('member gives a date of birth with no time', () => {
  it.each([undefined, null, ''])('treats time %j as unknown', (time) => {
    const birth = birthTithi({
      date: '1990-08-15',
      time,
      place: BIRTH_PLACES.kathmandu
    });
    expect(birth.basis).toBe('sunrise');
    expect(birth.reading.label.en).toBe('Bhadrapada Krishna Dashami');
  });

  it('stores the tithi and finds this year’s and next year’s dates', () => {
    const birth = birthTithi({
      date: '1990-08-15',
      place: BIRTH_PLACES.kathmandu
    });
    const target = stored(birth.reading);
    const thisYear = nextOccurrence(target, '2026-01-01', CELEBRATED_AT);
    expect(thisYear.date.startsWith('2026-')).toBe(true);
    expectTithiOn(target, thisYear);
    const nextYear = nextOccurrence(
      target,
      addDays(thisYear.date, 1),
      CELEBRATED_AT
    );
    expect(nextYear.date.startsWith('2027-')).toBe(true);
    expectTithiOn(target, nextYear);
  });
});

describe('member gives a date and time of birth', () => {
  it('uses the tithi at that moment, which can differ from the day’s', () => {
    // 15 Aug 1990, Kathmandu: Dashami at sunrise, Ekadashi from mid-morning.
    const place = BIRTH_PLACES.kathmandu;
    const { tithisThatDay } = birthTithi({ date: '1990-08-15', place });
    expect(tithisThatDay.length).toBeGreaterThan(1);
    const [, second] = tithisThatDay;
    if (!second) throw new Error('Expected two tithis that day');
    const minutes = new Date(second.startsAt.getTime() + 60 * 60_000);
    const time = minutes.toLocaleTimeString('en-GB', {
      timeZone: place.timeZone,
      hour: '2-digit',
      minute: '2-digit'
    });
    const birth = birthTithi({ date: '1990-08-15', time, place });
    expect(birth.basis).toBe('birth-time');
    expect(birth.reading.tithi).toBe(second.reading.tithi);
  });

  it('gives the tithi still running for a birth before sunrise', () => {
    const place = BIRTH_PLACES.kathmandu;
    const early = birthTithi({ date: '1990-08-15', time: '03:00', place });
    const [first] = birthTithi({ date: '1990-08-15', place }).tithisThatDay;
    expect(early.reading.tithi).toBe(first?.reading.tithi);
  });

  it('refuses a time that isn’t HH:MM', () => {
    const place = BIRTH_PLACES.kathmandu;
    for (const time of ['7pm', '25:00', '12:60', '9:5']) {
      expect(() => birthTithi({ date: '1990-08-15', time, place })).toThrow(
        RangeError
      );
    }
  });
});

describe('births that need care', () => {
  it('a birth in a leap month is celebrated in the regular month', () => {
    // 24 May 2026, Kathmandu, is in Adhika Jyeshtha.
    const birth = birthTithi({
      date: '2026-05-24',
      place: BIRTH_PLACES.kathmandu
    });
    expect(birth.reading.adhika).toBe(true);
    const next = nextOccurrence(
      stored(birth.reading),
      '2027-01-01',
      CELEBRATED_AT
    );
    expect(next.adhika).toBe(false);
    expectTithiOn(birth.reading, next);
  });

  it('a birth during a skipped tithi still gets a yearly date', () => {
    // Bhadra Krishna Navami 2026 never sees a Kathmandu sunrise.
    const birth = birthTithi({
      date: '2026-10-04',
      time: '18:00',
      place: BIRTH_PLACES.kathmandu
    });
    expect(birth.reading.tithi).toBe(24);
    const next = nextOccurrence(
      stored(birth.reading),
      '2027-01-01',
      CELEBRATED_AT
    );
    expectTithiOn(birth.reading, next);
  });

  it('a Pausha birthday still comes round in the 2028–29 kshaya year', () => {
    // Under the Nepal method the lunation from 16 Dec 2028 takes in both
    // Margashirsha and Pausha, so both birthdays fall inside it.
    for (const monthIndex of [8, 9]) {
      const next = nextOccurrence(
        { monthIndex, tithi: 8 },
        '2028-09-01',
        CELEBRATED_AT
      );
      expect(next.date > '2028-12-15').toBe(true);
      expect(next.date < '2029-01-15').toBe(true);
    }
  });

  it('a birth on a US daylight-saving day', () => {
    for (const date of ['2010-03-14', '2010-11-07']) {
      const birth = birthTithi({
        date,
        time: '12:00',
        place: BIRTH_PLACES.dallas
      });
      expect(birth.reading.tithi).toBeGreaterThanOrEqual(1);
    }
  });

  it('a birth in Nepal before 1986, when the clock was +05:30', () => {
    const birth = birthTithi({
      date: '1975-04-14',
      time: '06:00',
      place: BIRTH_PLACES.kathmandu
    });
    expect(birth.basis).toBe('birth-time');
  });
});

/** Same numbers every run, so a failure can be reproduced. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

describe('every flow, across many births', () => {
  const random = seededRandom(2083);
  const places = Object.entries(BIRTH_PLACES);
  const cases = Array.from({ length: 150 }, () => {
    const [name, place] = places[Math.floor(random() * places.length)] ?? [
      'kathmandu',
      BIRTH_PLACES.kathmandu
    ];
    const date = addDays('1920-01-01', Math.floor(random() * 38_000));
    const hasTime = random() < 0.5;
    const hour = String(Math.floor(random() * 24)).padStart(2, '0');
    const minute = String(Math.floor(random() * 60)).padStart(2, '0');
    const today = addDays('2026-01-01', Math.floor(random() * 3650));
    return {
      name,
      place,
      date,
      time: hasTime ? `${hour}:${minute}` : '',
      today
    };
  });

  it.each(cases)(
    '$name $date $time → next date in Dallas from $today',
    ({ place, date, time, today }) => {
      const birth = birthTithi({ date, time, place });
      expect(birth.basis).toBe(time ? 'birth-time' : 'sunrise');
      expect(birth.tithisThatDay.length).toBeGreaterThanOrEqual(1);
      expect(birth.tithisThatDay.length).toBeLessThanOrEqual(3);

      const target = stored(birth.reading);
      const next = nextOccurrence(target, today, CELEBRATED_AT);
      expect(next.date >= today).toBe(true);
      // A lunar year is 354 days, 384 with a leap month.
      expect(next.date < addDays(today, 390)).toBe(true);
      expect(next.adhika).toBe(false);
      expectTithiOn(target, next);

      const after = nextOccurrence(
        target,
        addDays(next.date, 1),
        CELEBRATED_AT
      );
      const gap = (Date.parse(after.date) - Date.parse(next.date)) / 86_400_000;
      expect(gap).toBeGreaterThanOrEqual(352);
      expect(gap).toBeLessThanOrEqual(386);
    }
  );
});
