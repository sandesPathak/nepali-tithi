/**
 * How the Sun and Moon positions behind a tithi are worked out.
 *
 * - `nepal-panchang`: the Surya Siddhanta model Nepal's panchang committee
 *   (Nepal Panchanga Nirnayak Bikas Samiti) uses, so it matches the tithi
 *   printed in Nepali patros such as Hamro Patro.
 * - `drik`: modern ephemeris positions, as Drik Panchang and most Indian
 *   panchangs use.
 *
 * The two agree except when a tithi changes within a few hours of sunrise,
 * which happens on roughly one day in ten.
 */
export type Method = 'nepal-panchang' | 'drik';

/** Degrees of Moon-minus-Sun elongation in one tithi. */
export const DEGREES_PER_TITHI = 12;

export interface Engine {
  /** Moon-minus-Sun longitude in degrees, [0, 360). */
  elongation(instant: Date): number;
  /** Sidereal sign of the Sun, 0 = Mesha … 11 = Meena. */
  sunSign(instant: Date): number;
  /** The first instant at or after `from` when the elongation is `degrees`. */
  nextElongation(degrees: number, from: Date): Date;
  /** The new moon at or before an instant. */
  previousNewMoon(instant: Date): Date;
}

/** Tithi 1–30 for an elongation: 15 = purnima, 30 = amavasya. */
export function tithiForElongation(elongation: number): number {
  return Math.floor(elongation / DEGREES_PER_TITHI) + 1;
}

export function normalizeDegrees(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}
