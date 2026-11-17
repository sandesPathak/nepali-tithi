import { normalizeDegrees, type Engine } from './engine';

/*
 * Surya Siddhanta true Sun and Moon, as Nepal's panchang committee computes
 * them. Constants and method follow the MIT-licensed model in
 * github.com/Unicodist/OSN.NepaliCalendar (tools/nepal-sambat/model.py),
 * which matches Hamro Patro's panchang tithi on 6,120 of 6,209 days.
 *
 * Positions are already sidereal, so there is no ayanamsa.
 */

const CIVIL_DAYS_PER_MAHAYUGA = 1_577_917_828;
const SUN_REVOLUTIONS = 4_320_000;
const MOON_REVOLUTIONS = 57_753_336;
/** The committee's bija: 488,199 revolutions instead of the text's 488,203. */
const MOON_APOGEE_REVOLUTIONS = 488_199;
const SUN_APOGEE = 77 + 17 / 60;

/** Kali epoch, mean midnight at Ujjain, as a Julian day. */
const KALI_EPOCH_JD = 588465.5 - 75.7683 / 360;
const UNIX_EPOCH_JD = 2440587.5;
const MS_PER_DAY = 86_400_000;

/** Days since the Kali epoch. */
function ahargana(instant: Date): number {
  return instant.getTime() / MS_PER_DAY + UNIX_EPOCH_JD - KALI_EPOCH_JD;
}

/**
 * Mean longitude from revolutions per mahayuga. The fraction of a revolution
 * is taken before scaling to degrees to keep double precision.
 */
function meanLongitude(revolutions: number, days: number): number {
  const turns = (revolutions * days) / CIVIL_DAYS_PER_MAHAYUGA;
  return (turns - Math.floor(turns)) * 360;
}

/** The manda (equation of centre) correction with a varying epicycle. */
function manda(
  mean: number,
  apogee: number,
  epicycleOdd: number,
  epicycleEven: number
): number {
  const anomaly = ((mean - apogee) * Math.PI) / 180;
  const epicycle =
    epicycleOdd - (epicycleOdd - epicycleEven) * Math.abs(Math.sin(anomaly));
  const correction = Math.asin((epicycle / 360) * Math.sin(anomaly));
  return normalizeDegrees(mean - (correction * 180) / Math.PI);
}

function sunLongitude(days: number): number {
  return manda(
    meanLongitude(SUN_REVOLUTIONS, days),
    SUN_APOGEE,
    14,
    13 + 40 / 60
  );
}

function moonLongitude(days: number): number {
  const apogee = normalizeDegrees(
    meanLongitude(MOON_APOGEE_REVOLUTIONS, days) + 90
  );
  return manda(meanLongitude(MOON_REVOLUTIONS, days), apogee, 32, 31 + 40 / 60);
}

function elongationAt(ms: number): number {
  const days = ahargana(new Date(ms));
  return normalizeDegrees(moonLongitude(days) - sunLongitude(days));
}

/**
 * Elongation changes by under 4° in six hours, so stepping six hours at a time
 * and adding up the change never misreads a wrap past 360°.
 */
const STEP_MS = MS_PER_DAY / 4;
const MAX_STEPS = 4 * 35;
const BISECTIONS = 40;

/** How far the elongation moves from `start` to `end`, in the search direction. */
function advance(start: number, end: number, direction: 1 | -1): number {
  return normalizeDegrees(
    direction * (elongationAt(end) - elongationAt(start))
  );
}

/** The instant the elongation has moved `degrees` from `from`, forward or back. */
function moveElongation(degrees: number, from: Date, direction: 1 | -1): Date {
  let covered = 0;
  let cursor = from.getTime();
  for (let step = 0; step < MAX_STEPS; step++) {
    const next = cursor + direction * STEP_MS;
    const stepAdvance = advance(cursor, next, direction);
    if (covered + stepAdvance >= degrees) {
      return bisect(cursor, next, degrees - covered, direction);
    }
    covered += stepAdvance;
    cursor = next;
  }
  throw new Error(`Elongation did not move ${degrees}° within a lunation`);
}

function bisect(
  start: number,
  end: number,
  degrees: number,
  direction: 1 | -1
): Date {
  let near = start;
  let far = end;
  for (let i = 0; i < BISECTIONS; i++) {
    const middle = (near + far) / 2;
    if (advance(start, middle, direction) < degrees) near = middle;
    else far = middle;
  }
  return new Date(far);
}

export const suryaSiddhanta: Engine = {
  elongation: (instant) => elongationAt(instant.getTime()),

  sunSign: (instant) => Math.floor(sunLongitude(ahargana(instant)) / 30),

  nextElongation(degrees, from) {
    const ahead = normalizeDegrees(degrees - elongationAt(from.getTime()));
    return ahead === 0 ? from : moveElongation(ahead, from, 1);
  },

  previousNewMoon(instant) {
    const since = elongationAt(instant.getTime());
    return since === 0 ? instant : moveElongation(since, instant, -1);
  }
};
