import { describe, expect, it } from 'vitest';
import { addDays } from '../src/civil-time';
import { monthName } from '../src/names';
import { patroTarget } from '../src/patro-target';
import { udayaTithi, type Paksha } from '../src/tithi';

const KATHMANDU = {
  latitude: 27.7172,
  longitude: 85.324,
  timeZone: 'Asia/Kathmandu'
};

describe('patroTarget', () => {
  it('maps Janmashtami (Bhadra Krishna Ashtami) to amanta Shravana', () => {
    expect(patroTarget(5, 'krishna', 8)).toEqual({ monthIndex: 4, tithi: 23 });
  });

  it('keeps shukla paksha in its own month', () => {
    expect(patroTarget(7, 'shukla', 1)).toEqual({ monthIndex: 7, tithi: 1 });
    expect(patroTarget(6, 'shukla', 15)).toEqual({ monthIndex: 6, tithi: 15 });
  });

  it('wraps Chaitra Krishna back to Phalguna and gives aunsi as 30', () => {
    expect(patroTarget(0, 'krishna', 1)).toEqual({ monthIndex: 11, tithi: 16 });
    expect(patroTarget(0, 'krishna', 15)).toEqual({
      monthIndex: 11,
      tithi: 30
    });
  });

  it('round-trips every patro label over a year', () => {
    for (let offset = 0; offset < 366; offset++) {
      const reading = udayaTithi(addDays('2025-04-14', offset), KATHMANDU);
      const [monthWord = '', pakshaWord = ''] = reading.label.en.split(' ');
      const month = Array.from({ length: 12 }, (_, index) => index).find(
        (index) => monthName(index, false).en === monthWord
      );
      const paksha = pakshaWord.toLowerCase() as Paksha;
      const day = reading.tithi > 15 ? reading.tithi - 15 : reading.tithi;
      expect(patroTarget(month ?? -1, paksha, day)).toEqual({
        monthIndex: reading.monthIndex,
        tithi: reading.tithi
      });
    }
  });

  it('refuses months, days and pakshas out of range', () => {
    expect(() => patroTarget(12, 'shukla', 1)).toThrow(RangeError);
    expect(() => patroTarget(-1, 'shukla', 1)).toThrow(RangeError);
    expect(() => patroTarget(0, 'shukla', 0)).toThrow(RangeError);
    expect(() => patroTarget(0, 'krishna', 16)).toThrow(RangeError);
    expect(() => patroTarget(0, 'shukla', 1.5)).toThrow(RangeError);
    expect(() => patroTarget(0, 'dark' as Paksha, 1)).toThrow(RangeError);
  });
});
