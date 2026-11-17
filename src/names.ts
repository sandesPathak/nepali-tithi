/** English and Nepali (Devanagari) forms of a name. */
export interface Name {
  en: string;
  ne: string;
}

/** Index 0 = Pratipada … 13 = Chaturdashi; 14 is the paksha's last tithi. */
const TITHI_NAMES: readonly Name[] = [
  { en: 'Pratipada', ne: 'प्रतिपदा' },
  { en: 'Dwitiya', ne: 'द्वितीया' },
  { en: 'Tritiya', ne: 'तृतीया' },
  { en: 'Chaturthi', ne: 'चतुर्थी' },
  { en: 'Panchami', ne: 'पञ्चमी' },
  { en: 'Shashthi', ne: 'षष्ठी' },
  { en: 'Saptami', ne: 'सप्तमी' },
  { en: 'Ashtami', ne: 'अष्टमी' },
  { en: 'Navami', ne: 'नवमी' },
  { en: 'Dashami', ne: 'दशमी' },
  { en: 'Ekadashi', ne: 'एकादशी' },
  { en: 'Dwadashi', ne: 'द्वादशी' },
  { en: 'Trayodashi', ne: 'त्रयोदशी' },
  { en: 'Chaturdashi', ne: 'चतुर्दशी' }
];
const PURNIMA: Name = { en: 'Purnima', ne: 'पूर्णिमा' };
const AMAVASYA: Name = { en: 'Amavasya', ne: 'औंसी' };

/** Index 0 = Chaitra … 11 = Phalguna. */
const MONTH_NAMES: readonly Name[] = [
  { en: 'Chaitra', ne: 'चैत्र' },
  { en: 'Vaishakha', ne: 'वैशाख' },
  { en: 'Jyeshtha', ne: 'ज्येष्ठ' },
  { en: 'Ashadha', ne: 'आषाढ' },
  { en: 'Shravana', ne: 'श्रावण' },
  { en: 'Bhadrapada', ne: 'भाद्र' },
  { en: 'Ashwin', ne: 'आश्विन' },
  { en: 'Kartika', ne: 'कार्तिक' },
  { en: 'Margashirsha', ne: 'मार्गशीर्ष' },
  { en: 'Pausha', ne: 'पौष' },
  { en: 'Magha', ne: 'माघ' },
  { en: 'Phalguna', ne: 'फाल्गुन' }
];
const ADHIKA: Name = { en: 'Adhika', ne: 'अधिक' };

export const PAKSHA_NAMES = {
  shukla: { en: 'Shukla', ne: 'शुक्ल' },
  krishna: { en: 'Krishna', ne: 'कृष्ण' }
} as const satisfies Record<string, Name>;

function pick<T>(list: readonly T[], index: number, what: string): T {
  const found = list[index];
  if (found === undefined) throw new RangeError(`No ${what} ${index}`);
  return found;
}

/** Name of tithi 1–30. */
export function tithiName(tithi: number): Name {
  if (!Number.isInteger(tithi) || tithi < 1 || tithi > 30) {
    throw new RangeError(`No tithi ${tithi}`);
  }
  if (tithi === 15) return PURNIMA;
  if (tithi === 30) return AMAVASYA;
  return pick(TITHI_NAMES, (tithi - 1) % 15, 'tithi');
}

/** Name of lunar month 0–11, prefixed "Adhika" for a leap month. */
export function monthName(index: number, adhika = false): Name {
  const month = pick(MONTH_NAMES, index, 'month');
  if (!adhika) return month;
  return { en: `${ADHIKA.en} ${month.en}`, ne: `${ADHIKA.ne} ${month.ne}` };
}
