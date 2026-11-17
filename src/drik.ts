import {
  MakeTime,
  MoonPhase,
  SearchMoonPhase,
  SunPosition,
  e_tilt
} from 'astronomy-engine';
import { normalizeDegrees, type Engine } from './engine';

/** Longest a lunation lasts, with margin, for bounded searches. */
const LUNATION_SEARCH_DAYS = 32;

/**
 * Lahiri ayanamsa at J2000.0 in degrees: the Swiss Ephemeris SE_SIDM_LAHIRI
 * value, which is what Drik Panchang uses. The anchor and the IAU 2006
 * precession series below follow the MIT-licensed `panchanga` engine
 * (Hindu Society of North America), which pins them to Swiss Ephemeris.
 */
const LAHIRI_AT_J2000 = 23.8570923;
const DAYS_PER_JULIAN_CENTURY = 36525;

function precessionArcsec(centuries: number): number {
  const t = centuries;
  return (
    5028.796195 * t +
    1.1054348 * t ** 2 +
    0.00007964 * t ** 3 -
    0.000023857 * t ** 4 -
    0.0000000383 * t ** 5
  );
}

/** True (with nutation) Lahiri ayanamsa, to pair with the Sun's apparent longitude. */
function lahiriAyanamsa(instant: Date): number {
  const time = MakeTime(instant);
  const centuries = time.tt / DAYS_PER_JULIAN_CENTURY;
  const nutationArcsec = e_tilt(time).dpsi;
  return (
    LAHIRI_AT_J2000 + (precessionArcsec(centuries) + nutationArcsec) / 3600
  );
}

/** Modern ephemeris positions (astronomy-engine), as Drik Panchang uses. */
export const drik: Engine = {
  elongation: (instant) => MoonPhase(instant),

  sunSign(instant) {
    const sidereal = SunPosition(instant).elon - lahiriAyanamsa(instant);
    return Math.floor(normalizeDegrees(sidereal) / 30);
  },

  nextElongation(degrees, from) {
    const found = SearchMoonPhase(degrees % 360, from, LUNATION_SEARCH_DAYS);
    if (!found) throw new Error(`No elongation ${degrees}° within a lunation`);
    return found.date;
  },

  previousNewMoon(instant) {
    const found = SearchMoonPhase(0, instant, -LUNATION_SEARCH_DAYS);
    if (!found) throw new Error('No new moon within a lunation');
    return found.date;
  }
};
