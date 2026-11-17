import type { Engine } from './engine';

/**
 * A lunation, new moon to new moon, named the amanta way.
 *
 * `index` is 0 = Chaitra … 11 = Phalguna. A month takes its name from the
 * sidereal sign the Sun is in at the new moon that starts it, one sign on:
 * a new moon with the Sun in Meena (11) starts Chaitra (0).
 *
 * When the Sun stays in one sign for the whole lunation (no sankranti), the
 * lunation is adhika: a leap month carrying the next month's name, so the
 * same name then comes round twice. Two sankrantis in one lunation make a
 * kshaya month: it keeps the first name and also stands for the next month,
 * which has no lunation of its own that year. Under the Nepal method one
 * falls in 2028–29 (Margashirsha with Pausha); the drik method has none.
 */
export interface Lunation {
  index: number;
  adhika: boolean;
  kshaya: boolean;
  startsAt: Date;
  endsAt: Date;
}

const MS_PER_DAY = 86_400_000;

function lunationFrom(engine: Engine, newMoon: Date): Lunation {
  // Search from a day on so the start new moon itself is not found again.
  const nextNewMoon = engine.nextElongation(
    0,
    new Date(newMoon.getTime() + MS_PER_DAY)
  );
  const signAtStart = engine.sunSign(newMoon);
  const signsCrossed = (engine.sunSign(nextNewMoon) - signAtStart + 12) % 12;
  return {
    index: (signAtStart + 1) % 12,
    adhika: signsCrossed === 0,
    kshaya: signsCrossed >= 2,
    startsAt: newMoon,
    endsAt: nextNewMoon
  };
}

/** The lunation an instant falls in. */
export function lunationAt(engine: Engine, instant: Date): Lunation {
  return lunationFrom(engine, engine.previousNewMoon(instant));
}

/** The lunation straight after this one. */
export function followingLunation(
  engine: Engine,
  lunation: Lunation
): Lunation {
  return lunationFrom(engine, lunation.endsAt);
}

/**
 * Month index under the purnimanta reckoning used in Nepal and north India.
 * A krishna-paksha tithi is credited to the next month: amanta "Shravana
 * Krishna Ashtami" is purnimanta "Bhadra Krishna Ashtami" (Janmashtami).
 * Shukla tithis are named the same either way.
 */
export function purnimantaIndex(amantaIndex: number, tithi: number): number {
  return tithi > 15 ? (amantaIndex + 1) % 12 : amantaIndex;
}
