import {
  addDays,
  assertPlace,
  civilDateOf,
  zonedInstant,
  type CivilDate,
  type Place
} from './civil-time';
import { DEGREES_PER_TITHI, type Engine } from './engine';
import { followingLunation, lunationAt, type Lunation } from './lunar-month';
import { engineFor } from './methods';
import { sunriseOn } from './sunrise';
import type { Options } from './tithi';

/** The tithi to find each year: a stored `TithiReading` fits this shape. */
export interface TithiTarget {
  /** Amanta month index, 0 = Chaitra. */
  monthIndex: number;
  /** 1–30. */
  tithi: number;
}

/**
 * In a year with a leap month of the target's name, which one to use.
 * `regular` (the default) is the nija month, the usual practice for
 * birthdays; `leap` uses the adhika month when there is one.
 */
export type LeapMonthChoice = 'regular' | 'leap';

export interface OccurrenceOptions extends Options {
  leapMonth?: LeapMonthChoice;
}

export interface Occurrence {
  date: CivilDate;
  /**
   * `sunrise`: the tithi is running at sunrise on `date`.
   * `kshaya`: the tithi starts and ends between two sunrises, so no day has
   * it at sunrise; `date` is the day it runs.
   */
  kind: 'sunrise' | 'kshaya';
  /** The tithi is also running at the next day's sunrise (a repeated tithi). */
  alsoNextDay: boolean;
  startsAt: Date;
  endsAt: Date;
  /** The lunation found was a leap month. */
  adhika: boolean;
}

/** Enough lunations to cover two years, so a kshaya year is stepped over. */
const MAX_LUNATIONS = 27;

function assertTarget({ monthIndex, tithi }: TithiTarget): void {
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new RangeError(`No month ${monthIndex}`);
  }
  if (!Number.isInteger(tithi) || tithi < 1 || tithi > 30) {
    throw new RangeError(`No tithi ${tithi}`);
  }
}

/** When the tithi starts and ends inside a lunation. */
function tithiWindow(
  engine: Engine,
  lunation: Lunation,
  tithi: number
): [Date, Date] {
  const startsAt =
    tithi === 1
      ? lunation.startsAt
      : engine.nextElongation(
          (tithi - 1) * DEGREES_PER_TITHI,
          lunation.startsAt
        );
  const endsAt =
    tithi === 30
      ? lunation.endsAt
      : engine.nextElongation(tithi * DEGREES_PER_TITHI, lunation.startsAt);
  return [startsAt, endsAt];
}

/** The calendar day a tithi window is observed on at a place. */
function observedDay(
  [startsAt, endsAt]: [Date, Date],
  place: Place
): Pick<Occurrence, 'date' | 'kind' | 'alsoNextDay'> {
  let date = civilDateOf(startsAt, place.timeZone);
  if (sunriseOn(date, place) < startsAt) date = addDays(date, 1);
  if (sunriseOn(date, place) >= endsAt) {
    // No sunrise inside the window: it runs on the day before this sunrise.
    return { date: addDays(date, -1), kind: 'kshaya', alsoNextDay: false };
  }
  const alsoNextDay = sunriseOn(addDays(date, 1), place) < endsAt;
  return { date, kind: 'sunrise', alsoNextDay };
}

function isWanted(
  lunation: Lunation,
  previous: Lunation | undefined,
  monthIndex: number,
  choice: LeapMonthChoice
): boolean {
  // A kshaya lunation stands for its own month and the one it swallowed.
  const swallowed = lunation.kshaya && (lunation.index + 1) % 12 === monthIndex;
  if (swallowed) return true;
  if (lunation.index !== monthIndex) return false;
  if (choice === 'regular') return !lunation.adhika;
  // A leap month comes just before the regular month of the same name.
  const afterLeapTwin =
    previous?.adhika === true && previous.index === monthIndex;
  return lunation.adhika || !afterLeapTwin;
}

/**
 * The first date on or after `from` that the tithi falls on at a place.
 *
 * A repeated tithi gives the first of its two days. Results depend on the
 * place: the same tithi can fall a day apart in Kathmandu and Dallas.
 */
export function nextOccurrence(
  target: TithiTarget,
  from: CivilDate,
  place: Place,
  options: OccurrenceOptions = {}
): Occurrence {
  assertTarget(target);
  assertPlace(place);
  const engine = engineFor(options.method);
  const choice = options.leapMonth ?? 'regular';
  let previous: Lunation | undefined;
  let lunation = lunationAt(
    engine,
    zonedInstant(from, '00:00', place.timeZone)
  );

  for (let step = 0; step < MAX_LUNATIONS; step++) {
    if (isWanted(lunation, previous, target.monthIndex, choice)) {
      const window = tithiWindow(engine, lunation, target.tithi);
      const day = observedDay(window, place);
      if (day.date >= from) {
        const [startsAt, endsAt] = window;
        return { ...day, startsAt, endsAt, adhika: lunation.adhika };
      }
    }
    previous = lunation;
    lunation = followingLunation(engine, lunation);
  }
  throw new Error('Tithi not found within two years');
}
