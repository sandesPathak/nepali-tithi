import {
  DEGREES_PER_TITHI,
  tithiForElongation,
  type Engine,
  type Method
} from './engine';
import {
  addDays,
  assertPlace,
  zonedInstant,
  type CivilDate,
  type Place
} from './civil-time';
import { lunationAt, purnimantaIndex } from './lunar-month';
import { engineFor } from './methods';
import { PAKSHA_NAMES, monthName, tithiName, type Name } from './names';
import { sunriseOn } from './sunrise';

export type Paksha = 'shukla' | 'krishna';

export interface Options {
  /** Defaults to `nepal-panchang`, which matches Nepali patros. */
  method?: Method;
}

/** A tithi and the lunar month it belongs to. */
export interface TithiReading {
  /** 1–30: 1–15 shukla (15 = purnima), 16–30 krishna (30 = amavasya). */
  tithi: number;
  paksha: Paksha;
  /** Amanta month index, 0 = Chaitra. Store this; it is what dates are found by. */
  monthIndex: number;
  adhika: boolean;
  /** Purnimanta label, the way Nepali patros write it: "Bhadra Krishna Ashtami". */
  label: Name;
  /** The same tithi with the amanta month name, as used in south and west India. */
  amantaLabel: Name;
}

/** A tithi together with when it starts and ends. */
export interface TithiSpan {
  reading: TithiReading;
  startsAt: Date;
  endsAt: Date;
}

function label(monthIndex: number, adhika: boolean, tithi: number): Name {
  const month = monthName(monthIndex, adhika);
  const paksha = PAKSHA_NAMES[tithi > 15 ? 'krishna' : 'shukla'];
  const day = tithiName(tithi);
  return {
    en: `${month.en} ${paksha.en} ${day.en}`,
    ne: `${month.ne} ${paksha.ne} ${day.ne}`
  };
}

function readingAt(engine: Engine, instant: Date): TithiReading {
  const tithi = tithiForElongation(engine.elongation(instant));
  const lunation = lunationAt(engine, instant);
  return {
    tithi,
    paksha: tithi > 15 ? 'krishna' : 'shukla',
    monthIndex: lunation.index,
    adhika: lunation.adhika,
    label: label(
      purnimantaIndex(lunation.index, tithi),
      lunation.adhika,
      tithi
    ),
    amantaLabel: label(lunation.index, lunation.adhika, tithi)
  };
}

/** The tithi prevailing at an instant. */
export function tithiAt(instant: Date, options: Options = {}): TithiReading {
  return readingAt(engineFor(options.method), instant);
}

/**
 * The tithi of a calendar day at a place: the one prevailing at sunrise
 * (udaya tithi). This is how Nepali patros assign one tithi to each date.
 */
export function udayaTithi(
  date: CivilDate,
  place: Place,
  options: Options = {}
): TithiReading {
  assertPlace(place);
  return tithiAt(sunriseOn(date, place), options);
}

/** Every tithi that runs during [from, until), each clipped to that window. */
export function tithisBetween(
  from: Date,
  until: Date,
  options: Options = {}
): TithiSpan[] {
  const engine = engineFor(options.method);
  const spans: TithiSpan[] = [];
  let cursor = from;
  // Tracked by count, not re-read at each boundary: at the exact boundary
  // instant the angle can round back to the tithi that just ended.
  let tithi = tithiForElongation(engine.elongation(from));
  while (cursor < until) {
    const ends = engine.nextElongation(tithi * DEGREES_PER_TITHI, cursor);
    // The month is read mid-tithi, safely away from a new-moon boundary.
    const reading = readingAt(engine, midpoint(cursor, ends));
    const endsAt = ends < until ? ends : until;
    spans.push({ reading, startsAt: cursor, endsAt });
    cursor = endsAt;
    tithi = (tithi % 30) + 1;
  }
  return spans;
}

function midpoint(start: Date, end: Date): Date {
  return new Date((start.getTime() + end.getTime()) / 2);
}

/** What the birth tithi was worked out from. */
export type BirthBasis = 'birth-time' | 'sunrise';

export interface BirthTithi {
  reading: TithiReading;
  basis: BirthBasis;
  /**
   * Every tithi that ran during the local calendar day of birth. When there
   * is more than one and no birth time was given, the family may count a
   * different tithi than the sunrise one; show these so they can confirm.
   */
  tithisThatDay: TithiSpan[];
}

export interface BirthInput {
  date: CivilDate;
  /**
   * 24-hour local time at the birth place, `HH:MM`. Optional: leave it out,
   * or pass null or '' (an empty form field), when the family doesn't know it.
   */
  time?: string | null;
  place: Place;
}

/**
 * The birth tithi. With a birth time it is the tithi at that moment (janma
 * tithi). Without one it is the sunrise tithi of the birth date at the birth
 * place, which is what the patro shows for that day.
 */
export function birthTithi(
  { date, time, place }: BirthInput,
  options: Options = {}
): BirthTithi {
  assertPlace(place);
  const dayStart = zonedInstant(date, '00:00', place.timeZone);
  const dayEnd = zonedInstant(addDays(date, 1), '00:00', place.timeZone);
  const tithisThatDay = tithisBetween(dayStart, dayEnd, options);
  if (time) {
    const born = zonedInstant(date, time, place.timeZone);
    return {
      reading: tithiAt(born, options),
      basis: 'birth-time',
      tithisThatDay
    };
  }
  return {
    reading: udayaTithi(date, place, options),
    basis: 'sunrise',
    tithisThatDay
  };
}
