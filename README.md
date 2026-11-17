# nepali-tithi

Works out a person's birth tithi from their date of birth, optional time of birth and place
of birth. It also gives the date that tithi falls on each year at any place, so you can
send tithi birthday and anniversary reminders. Results match Nepali patros: it uses the
Surya Siddhanta method that Nepal's panchang committee uses, not the modern drik method.

```sh
npm install nepali-tithi
```

```ts
import { birthTithi, nextOccurrence } from 'nepali-tithi';

const kathmandu = {
  latitude: 27.7172,
  longitude: 85.324,
  timeZone: 'Asia/Kathmandu'
};
const dallas = {
  latitude: 32.7767,
  longitude: -96.797,
  timeZone: 'America/Chicago'
};

// Time of birth is optional: leave it out, or pass null or ''.
const birth = birthTithi({ date: '1990-08-15', place: kathmandu });
birth.reading.label; // { en: 'Bhadrapada Krishna Dashami', ne: 'भाद्र कृष्ण दशमी' }

nextOccurrence(birth.reading, '2026-11-05', dallas);
// { date: '2027-08-26', kind: 'sunrise', alsoNextDay: false, adhika: false, … }
```

Works in Node 18+ (CommonJS, with TypeScript types). Each call takes about 1 ms.

## Accuracy

Checked day by day against Nepali patros, with the default `nepal-panchang` method:

| Compared with                                                                       | Checked       | Match                |
| ----------------------------------------------------------------------------------- | ------------- | -------------------- |
| Hamro Patro, BS 2067–2084                                                           | 5,537 days    | **98.5%**            |
| Dallas–Fort Worth wall patro, BS 2083 (Divya-Drishti Nepali Panchang), Dallas times | 384 end times | **376** within 1 min |
| Older patro data, BS 1970–2074                                                      | 37,933 days   | 92.8%                |

- **Where it differs:** on days when a tithi ends close to sunrise. Patros computed
  independently disagree with each other on those days too; a typical year has two or
  three.
- **Older data:** most misses come in runs of consecutive days, a sign of shifted rows in
  that data rather than a wrong tithi.
- **Why not drik by default:** the modern `drik` method matches Hamro Patro on 90.7% of days
  and only 5 of the 384 Dallas end times. It does match an independent Drik engine
  (`panchanga`) on all 458 days sampled, so it is there when you want drik results.
- **Kept honest:** the Dallas patro runs in the test suite (`test/dallas-patro.test.ts`), and
  `npm run validate:nepal` repeats the Hamro Patro comparison (see [Development](#development)).

## Using it in an app

1. **Ask for** the date of birth, an optional time of birth (`HH:MM`, 24-hour, local to the
   birth place) and the place of birth. From the place you need its latitude, longitude
   and IANA time zone.
2. **Work out the birth tithi** with `birthTithi`. When no time was given and the birth
   date had two tithis, `tithisThatDay` has more than one entry. Show them so the family
   can pick the one they go by.
   If someone knows their tithi birthday but not their date of birth, let them pick the patro
   month, paksha and tithi instead, and use `patroTarget` to get the target.
3. **Store** `reading.monthIndex`, `reading.tithi` and `reading.adhika`. Store
   `reading.label` too if you want to show it without recomputing.
4. **Each year**, call `nextOccurrence({ monthIndex, tithi }, today, place)`, where `place`
   is where the day is celebrated, not where the person was born. The result is the date
   to remind on and show.

`today` is a `YYYY-MM-DD` date in the celebration place's time zone. The result can be
`today` itself.

## API

| Function                                        | Returns                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `birthTithi({ date, time?, place }, options?)`  | `{ reading, basis: 'birth-time' \| 'sunrise', tithisThatDay }`                                                                                            |
| `nextOccurrence(target, from, place, options?)` | `{ date, kind: 'sunrise' \| 'kshaya', alsoNextDay, startsAt, endsAt, adhika }`                                                                            |
| `udayaTithi(date, place, options?)`             | The tithi at sunrise on a date: what the patro prints for that day                                                                                        |
| `tithiAt(instant, options?)`                    | The tithi running at an instant                                                                                                                           |
| `tithisBetween(from, until, options?)`          | Every tithi in a time window, with start and end instants                                                                                                 |
| `tithiName(tithi)`, `monthName(index, adhika)`  | English and Nepali names                                                                                                                                  |
| `patroTarget(month, paksha, day)`               | The target for a tithi named the patro way (e.g. `5, 'krishna', 8` = Bhadra Krishna Ashtami), for people who know their tithi but not their date of birth |

A reading is `{ tithi, paksha, monthIndex, adhika, label, amantaLabel }`:

- `tithi` runs from 1 to 30. 1–15 is shukla paksha, ending at purnima (15); 16–30 is
  krishna paksha, ending at aunsi (30).
- `monthIndex` runs from 0 to 11, with 0 = Chaitra, and counts months the amanta way
  (new moon to new moon).
- `label` is written the purnimanta way, as Nepali patros write it.

Bad input throws a `RangeError`. That covers a malformed date or time, coordinates out of
range, an unknown time zone, and a tithi or month out of range.

## Which calculation

Pass `{ method }` in the options:

| Method                     | What it is                                                                                            | Matches Hamro Patro (BS 2067–2084, 5,537 days) |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `nepal-panchang` (default) | Surya Siddhanta Sun and Moon with the Nepal panchang committee's correction, read at a modern sunrise | **98.5%**                                      |
| `drik`                     | Modern ephemeris (astronomy-engine), as Drik Panchang uses                                            | 90.7%                                          |

The two methods only disagree when a tithi changes within a few hours of sunrise. See
[Accuracy](#accuracy) for how each was measured.

## Rules the code follows

- **A day's tithi** is the one running at sunrise at that place (udaya tithi), as in the
  patro. Sunrise is the modern one (upper limb, 34′ refraction).
- **Birth tithi:**
  - With a birth time, it is the tithi at that moment.
  - Without one, it is the birth date's sunrise tithi at the birth place.
- **Repeated tithi** (running at two sunrises): the first day is used, and `alsoNextDay` is
  set.
- **Skipped tithi** (no sunrise inside it): the day it runs on is used, with
  `kind: 'kshaya'`.
- **Leap month** (adhika): the regular month is used by default; pass `leapMonth: 'leap'`
  to use the leap month when there is one. A birth in a leap month is celebrated in the
  regular month of the same name in other years.
- **Lost month** (kshaya): it stands for both months it covers. Under `nepal-panchang` this
  happens in 2028–29, when one lunation covers both Margashirsha and Pausha. Birthdays from
  either month fall in it.
- **Same tithi, different places:** the same tithi can land a day apart in Kathmandu and
  Dallas. Pass the place where the day is celebrated.
- **Close calls:** when a tithi ends within about a minute of sunrise, patros computed
  independently can disagree on that day. A typical year has two or three such days.

Polar latitudes where the Sun doesn't rise throw a `RangeError`.

## Development

```sh
npm test               # vitest
npm run lint           # eslint + prettier
npm run validate:nepal # compare with patro data; sources are listed in the script header
```

## Credits

- Surya Siddhanta constants and method: OSN.NepaliCalendar (MIT),
  `tools/nepal-sambat/model.py`.
- Lahiri ayanamsa anchor and series: `panchanga` by the Hindu Society of North America (MIT).
- Astronomy: astronomy-engine (MIT).

MIT licensed. See `LICENSE`.
