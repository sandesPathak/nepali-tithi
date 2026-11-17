import { Body, Observer, SearchRiseSet } from 'astronomy-engine';
import { zonedInstant, type CivilDate, type Place } from './civil-time';

/** SearchRiseSet direction for a rising body. */
const RISING = 1;

/**
 * Sunrise on a calendar date at a place: the upper limb clearing the horizon
 * with standard refraction (34'). Both methods use this modern sunrise; that
 * is also what Nepal's panchang committee does.
 */
export function sunriseOn(date: CivilDate, place: Place): Date {
  const observer = new Observer(place.latitude, place.longitude, 0);
  const localMidnight = zonedInstant(date, '00:00', place.timeZone);
  const sunrise = SearchRiseSet(Body.Sun, observer, RISING, localMidnight, 1);
  if (!sunrise) {
    throw new RangeError(`The Sun does not rise on ${date} at this latitude`);
  }
  return sunrise.date;
}
