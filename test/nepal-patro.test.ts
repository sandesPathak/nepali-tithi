import { describe, expect, it } from 'vitest';
import { udayaTithi } from '../src/tithi';

const KATHMANDU = {
  latitude: 27.7172,
  longitude: 85.324,
  timeZone: 'Asia/Kathmandu'
};

/*
 * Tithis as Hamro Patro's day pages printed them (checked in October 2026 by
 * the OSN.NepaliCalendar project). Month is the amanta index, 0 = Chaitra.
 */
const HAMRO_PATRO: [
  date: string,
  month: number,
  tithi: number,
  adhika: boolean
][] = [
  ['2026-09-26', 5, 15, false], // BS 2083-06-10 Bhadra Purnima
  ['2026-09-27', 5, 16, false],
  ['2026-10-04', 5, 23, false],
  ['2026-10-05', 5, 25, false], // Navami skipped
  ['2026-10-10', 5, 30, false],
  ['2026-10-11', 6, 1, false],
  ['2026-10-18', 6, 8, false], // Ashtami on two days
  ['2026-10-19', 6, 8, false],
  ['2026-10-29', 6, 19, false],
  ['2026-11-10', 7, 1, false], // Mha Puja, Kartik Shukla Pratipada
  ['2026-11-20', 7, 11, false],
  ['2026-07-20', 3, 6, false],
  ['2027-01-28', 9, 21, false],
  ['2022-10-16', 6, 21, false],
  ['2026-05-24', 2, 8, true] // Adhika Jyeshtha
];

describe('nepal-panchang method against Hamro Patro', () => {
  it.each(HAMRO_PATRO)('%s', (date, month, tithi, adhika) => {
    expect(udayaTithi(date, KATHMANDU)).toMatchObject({
      monthIndex: month,
      tithi,
      adhika
    });
  });
});

describe('drik method', () => {
  it('can differ from the Nepal patro near sunrise (2025-02-04)', () => {
    // Hamro Patro prints Magha Shukla Shashthi; modern positions already
    // have Saptami running at Kathmandu sunrise.
    expect(udayaTithi('2025-02-04', KATHMANDU).tithi).toBe(6);
    expect(udayaTithi('2025-02-04', KATHMANDU, { method: 'drik' }).tithi).toBe(
      7
    );
  });
});
