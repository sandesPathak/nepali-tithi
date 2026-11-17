import type { TithiTarget } from './occurrence';
import type { Paksha } from './tithi';

const PAKSHAS: readonly string[] = ['shukla', 'krishna'];

/**
 * The target for a tithi as a Nepali patro names it, for people who know
 * their tithi birthday but not their date of birth. Bhadra Krishna Ashtami
 * (Janmashtami) is `patroTarget(5, 'krishna', 8)`.
 *
 * Patros name a krishna paksha after the month it ends (purnimanta), so it
 * belongs to the amanta month before. `day` is 1–15; 15 is purnima in
 * shukla paksha and aunsi in krishna.
 */
export function patroTarget(
  month: number,
  paksha: Paksha,
  day: number
): TithiTarget {
  if (!Number.isInteger(month) || month < 0 || month > 11) {
    throw new RangeError(`No month ${month}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 15) {
    throw new RangeError(`No day ${day} in a paksha`);
  }
  // Checked at run time too: the paksha usually comes straight from a form.
  if (!PAKSHAS.includes(paksha)) {
    throw new RangeError(`No paksha ${paksha}`);
  }
  return paksha === 'shukla'
    ? { monthIndex: month, tithi: day }
    : { monthIndex: (month + 11) % 12, tithi: 15 + day };
}
