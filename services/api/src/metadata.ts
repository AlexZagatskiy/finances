import countries from 'world-countries/countries.json' with { type: 'json' };

export const popularCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'HKD', 'SGD'];
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string | null;
  digits: number;
}
export interface BankInfo {
  code: string;
  name: string;
  country?: string | null;
}

// Verified against AllRatesToday's institution catalogue; Eurozone countries default to ECB.
const countryBanks: Record<string, string> = {
  US: 'fed',
  GB: 'boe',
  PL: 'nbp',
  UA: 'nbu',
  JP: 'boj',
  CN: 'pboc',
  AU: 'rba',
  CA: 'boc',
  CH: 'snb',
  HK: 'hkma',
  SG: 'mas',
  IN: 'rbi',
  NZ: 'rbnz',
  NO: 'norges',
  SE: 'riksbank',
  DK: 'dnb',
  CZ: 'cnb',
  HU: 'mnb',
  RO: 'bnr',
  IS: 'cbi',
  TR: 'tcmb',
  BR: 'bcb',
  MX: 'banxico',
  ZA: 'sarb',
  KR: 'bok',
  ID: 'bi',
  MY: 'bnm',
  TH: 'bot',
  PH: 'bsp',
  VN: 'sbv',
  IL: 'boi',
  AE: 'cbuae',
  SA: 'sama',
  EG: 'cbe',
  NG: 'cbn',
  PK: 'sbp',
  BD: 'bb',
  LK: 'cbsl',
  NP: 'nrb',
  TW: 'cbc',
  AR: 'bcra',
  CL: 'bcch',
  CO: 'sfc',
  PE: 'bcrp',
  UY: 'bcu',
  PY: 'bcp',
  GE: 'nbg',
  KZ: 'nbk',
  UZ: 'cbu',
  AL: 'boa',
  BA: 'cbbh',
  AZ: 'cbar',
  BH: 'cbb',
  KW: 'cbk',
  OM: 'cbo',
  JO: 'cbj',
  PS: 'pma',
  MM: 'cbm',
  KH: 'nbc',
  GH: 'bog',
  GT: 'banguat',
  MN: 'bom',
  MO: 'amcm',
  LA: 'bol',
  VE: 'bcv',
  DO: 'bcrd',
  RU: 'cbr',
  IT: 'bdi',
  BG: 'bnb',
};
export function countryCode(name: string): string | null {
  const aliases: Record<string, string> = {
    'South Korea': 'KR',
    Russia: 'RU',
    Laos: 'LA',
    Vietnam: 'VN',
    Taiwan: 'TW',
    Macao: 'MO',
    Türkiye: 'TR',
  };
  return (
    aliases[name] ??
    countries.find(
      (c) => c.name.common === name || c.name.official === name || c.altSpellings.includes(name),
    )?.cca2 ??
    null
  );
}
const flags: Record<string, string | null> = {
  USD: 'us',
  EUR: 'eu',
  GBP: 'gb',
  AUD: 'au',
  NZD: 'nz',
  CHF: 'ch',
  CNY: 'cn',
  CNH: 'cn',
  JPY: 'jp',
  SGD: 'sg',
  INR: 'in',
  ZAR: 'za',
  XAF: null,
  XOF: null,
  XCD: null,
  XPF: null,
};
export function currencyInfo(item: { code: string; name: string; symbol: string }): CurrencyInfo {
  const matching = countries.filter((c) => Object.hasOwn(c.currencies, item.code));
  const flag = Object.hasOwn(flags, item.code)
    ? flags[item.code]
    : matching.length === 1
      ? matching[0].cca2.toLowerCase()
      : null;
  const digits =
    new Intl.NumberFormat('en', { style: 'currency', currency: item.code }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  return { ...item, flag, digits };
}
export function defaults(countryCode?: string) {
  const country = countries.find((c) => c.cca2 === countryCode?.toUpperCase());
  // Bulgaria adopted EUR in 2026; country datasets may lag the change.
  const source =
    country?.cca2 === 'BG'
      ? 'EUR'
      : country
        ? (Object.keys(country.currencies)[0] ?? 'USD')
        : 'USD';
  return {
    country: country?.cca2 ?? null,
    source,
    target: source === 'USD' ? 'EUR' : 'USD',
    bank: countryBanks[country?.cca2 ?? ''] ?? (source === 'EUR' ? 'ecb' : country ? null : 'fed'),
  };
}
