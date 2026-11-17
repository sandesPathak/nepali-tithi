/** A calendar date as people write it, `YYYY-MM-DD`, with no time zone. */
export type CivilDate = string;

/** Where something happens. The time zone is an IANA id such as `Asia/Kathmandu`. */
export interface Place {
  latitude: number;
  longitude: number;
  timeZone: string;
}

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CIVIL_TIME = /^(\d{2}):(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function parseCivilDate(date: CivilDate): [number, number, number] {
  const match = CIVIL_DATE.exec(date);
  if (!match) throw new RangeError(`Expected a YYYY-MM-DD date, got "${date}"`);
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3])
  ];
  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  if (roundTrip.getUTCMonth() !== month - 1 || roundTrip.getUTCDate() !== day) {
    throw new RangeError(`"${date}" is not a real date`);
  }
  return [year, month, day];
}

function parseCivilTime(time: string): [number, number] {
  const match = CIVIL_TIME.exec(time);
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  if (!match || hours > 23 || minutes > 59) {
    throw new RangeError(`Expected a 24-hour HH:MM time, got "${time}"`);
  }
  return [hours, minutes];
}

/** How far ahead of UTC the zone's wall clock is at that instant, in ms. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second')
  );
  const wholeSeconds = Math.floor(instant.getTime() / 1000) * 1000;
  return wallClockAsUtc - wholeSeconds;
}

/**
 * The instant a wall-clock reading happens in a zone.
 *
 * The offset is looked up twice because the first guess can land on the other
 * side of a DST change; the second lookup is taken at the corrected instant.
 */
export function zonedInstant(
  date: CivilDate,
  time: string,
  timeZone: string
): Date {
  const [year, month, day] = parseCivilDate(date);
  const [hours, minutes] = parseCivilTime(time);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hours, minutes);
  const firstGuess =
    wallClockAsUtc - zoneOffsetMs(new Date(wallClockAsUtc), timeZone);
  return new Date(
    wallClockAsUtc - zoneOffsetMs(new Date(firstGuess), timeZone)
  );
}

/** The calendar date an instant falls on in a zone. */
export function civilDateOf(instant: Date, timeZone: string): CivilDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(instant);
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const [year, month, day] = parseCivilDate(date);
  return new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

export function assertPlace(place: Place): void {
  const { latitude, longitude, timeZone } = place;
  if (!(Math.abs(latitude) <= 90))
    throw new RangeError(`Bad latitude ${latitude}`);
  if (!(Math.abs(longitude) <= 180))
    throw new RangeError(`Bad longitude ${longitude}`);
  // Throws RangeError for an unknown zone.
  new Intl.DateTimeFormat('en-US', { timeZone });
}
