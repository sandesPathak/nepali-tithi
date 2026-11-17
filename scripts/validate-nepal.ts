/**
 * Compares our sunrise tithi for Kathmandu with the tithi printed in Nepali
 * patros, day by day.
 *
 *   npm run validate:nepal -- <source> <folder> <bs_years.json> [method] [--list]
 *
 * Sources (clone them; nothing is vendored here):
 * - `hamro`: github.com/S4NKALP/nepali-calendar-api, a Hamro Patro scrape,
 *   BS 2067 onward has tithis. Pass its `data` folder. (MIT)
 * - `bibhuticoder`: github.com/bibhuticoder/nepali-calendar-api, an older
 *   scrape, BS 1970–2074, with known runs of shifted days. Pass its `api`
 *   folder.
 *
 * bs_years.json is the BS month-length table from the Apache-2.0
 * nepali-date-engine (src/data/bs_years.json); AD dates come from it.
 *
 * The data has the tithi name but not the paksha, so tithis are compared
 * within the paksha (1–14), with purnima and amavasya checked exactly.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addDays } from '../src/civil-time';
import type { Method } from '../src/engine';
import { udayaTithi } from '../src/tithi';

const KATHMANDU = {
  latitude: 27.7172,
  longitude: 85.324,
  timeZone: 'Asia/Kathmandu'
};
/** BS 1970 Baishakh 1. */
const FIRST_BS_YEAR = 1970;
const FIRST_DAY = '1913-04-13';

const PRINTED_TITHI: Record<string, number> = {
  प्रतिपदा: 1,
  दृतीया: 2,
  द्वितीया: 2,
  तृतीया: 3,
  चतुर्थी: 4,
  पञ्चमी: 5,
  षष्ठी: 6,
  सप्तमी: 7,
  अष्टमी: 8,
  नवमी: 9,
  दशमी: 10,
  एकादशी: 11,
  द्वादशी: 12,
  त्रयोदशी: 13,
  त्रायोदशी: 13,
  चतुर्दशी: 14,
  चतुर्दशि: 14,
  चतुर्दसी: 14,
  पुर्णिमा: 15,
  पूर्णिमा: 15,
  औसी: 30,
  औंसी: 30
};

/** One printed day: BS year, month (0-based) and day, and the tithi text. */
interface PrintedDay {
  bsYear: number;
  month: number;
  bsDay: number;
  tithi: string;
}

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

function devanagariNumber(text: string): number {
  const ascii = text
    .trim()
    .replace(/[०-९]/g, (digit) => String(DEVANAGARI_DIGITS.indexOf(digit)));
  return /^\d+$/.test(ascii) ? Number(ascii) : NaN;
}

/** bibhuticoder: one file per BS year, months keyed by name, grid order. */
function* bibhuticoderDays(folder: string): Generator<PrintedDay> {
  for (let bsYear = FIRST_BS_YEAR; bsYear <= 2074; bsYear++) {
    const year = JSON.parse(
      readFileSync(join(folder, `${bsYear}.json`), 'utf8')
    ) as Record<string, { np: string; tithi: string }[]>;
    let month = 0;
    for (const days of Object.values(year)) {
      for (const day of days) {
        yield { bsYear, month, bsDay: Number(day.np), tithi: day.tithi };
      }
      month++;
    }
  }
}

/**
 * hamro: one file per month. The grid also shows the tail of the month
 * before and the head of the month after; only the run from day 1 counts.
 */
function* hamroDays(folder: string): Generator<PrintedDay> {
  for (let bsYear = FIRST_BS_YEAR; bsYear <= 2100; bsYear++) {
    for (let month = 0; month < 12; month++) {
      const file = join(folder, String(bsYear), `${month + 1}.json`);
      if (!existsSync(file)) continue;
      const { days } = JSON.parse(readFileSync(file, 'utf8')) as {
        days: { n: string; t: string }[];
      };
      let expected = 1;
      for (const day of days) {
        const bsDay = devanagariNumber(day.n);
        if (bsDay !== expected) {
          if (expected > 1 && bsDay === 1) break;
          continue;
        }
        yield { bsYear, month, bsDay, tithi: day.t };
        expected++;
      }
    }
  }
}

/** Printed name to tithi number; named Ekadashis count as Ekadashi. */
function printedTithi(raw: string): number | undefined {
  const name = raw.trim();
  if (name.endsWith('एकादशी')) return 11;
  return PRINTED_TITHI[name];
}

function withinPaksha(tithi: number): number {
  if (tithi === 15 || tithi === 30) return tithi;
  return ((tithi - 1) % 15) + 1;
}

/** AD date of every BS month start, from the month-length table. */
function monthStarts(table: Record<string, number[]>): Map<string, string> {
  const starts = new Map<string, string>();
  let start = FIRST_DAY;
  for (const [year, lengths] of Object.entries(table)) {
    lengths.forEach((length, month) => {
      starts.set(`${year}-${month}`, start);
      start = addDays(start, length);
    });
  }
  return starts;
}

interface Tally {
  checked: number;
  matched: number;
}

function main(): void {
  const [source, folder, monthTable, method = 'nepal-panchang', flag] =
    process.argv.slice(2);
  if (
    !folder ||
    !monthTable ||
    (source !== 'hamro' && source !== 'bibhuticoder')
  ) {
    throw new Error(
      'Usage: <hamro|bibhuticoder> <folder> <bs_years.json> [method]'
    );
  }
  const table = JSON.parse(readFileSync(monthTable, 'utf8')) as Record<
    string,
    number[]
  >;
  const starts = monthStarts(table);
  const days =
    source === 'hamro' ? hamroDays(folder) : bibhuticoderDays(folder);
  const byDecade = new Map<string, Tally>();
  const misses: string[] = [];
  let skipped = 0;

  for (const day of days) {
    const start = starts.get(`${day.bsYear}-${day.month}`);
    const length = table[String(day.bsYear)]?.[day.month] ?? 0;
    if (!start || !(day.bsDay >= 1 && day.bsDay <= length)) continue;
    const printed = printedTithi(day.tithi);
    if (printed === undefined) {
      skipped++;
      continue;
    }
    const adDate = addDays(start, day.bsDay - 1);
    const ours = withinPaksha(
      udayaTithi(adDate, KATHMANDU, { method: method as Method }).tithi
    );
    const decade = `${adDate.slice(0, 3)}0s`;
    const tally = byDecade.get(decade) ?? { checked: 0, matched: 0 };
    tally.checked++;
    if (ours === printed) tally.matched++;
    else misses.push(`${adDate} printed ${printed} ours ${ours}`);
    byDecade.set(decade, tally);
  }

  let checked = 0;
  let matched = 0;
  for (const [decade, tally] of byDecade) {
    checked += tally.checked;
    matched += tally.matched;
    const percent = ((100 * tally.matched) / tally.checked).toFixed(2);
    console.log(`${decade}  ${tally.matched}/${tally.checked}  ${percent}%`);
  }
  const percent = ((100 * matched) / checked).toFixed(2);
  console.log(
    `all    ${matched}/${checked}  ${percent}%  (skipped ${skipped})`
  );
  if (flag === '--list') misses.forEach((miss) => console.log(miss));
}

main();
