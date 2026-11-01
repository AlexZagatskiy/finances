import { Decimal } from 'decimal.js';
import { Cache, ServiceError } from './cache.ts';
import { currencyInfo, countryCode, type BankInfo, type CurrencyInfo } from './metadata.ts';

export interface Quote {
  rate: string;
  asOf: string;
  fetchedAt: string;
  dateOnly: boolean;
  stale: boolean;
  derived: boolean;
  bank: string | null;
  availableBy?: string;
}
export interface ProviderOptions {
  apiKey?: string;
  fetcher?: typeof fetch;
  now?: () => number;
  marketTtl?: number;
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ServiceError(
      502,
      'INVALID_PROVIDER_RESPONSE',
      'The rate provider returned an unexpected response. Please try again.',
    );
  return value as Record<string, unknown>;
};
const text = (value: unknown): string => {
  if (typeof value !== 'string' || !value)
    throw new ServiceError(
      502,
      'INVALID_PROVIDER_RESPONSE',
      'The rate provider returned incomplete data. Please try again.',
    );
  return value;
};
export class RateProvider {
  private cache: Cache;
  private options: ProviderOptions;
  private now: () => number;
  private quotaUntil = 0;
  constructor(options: ProviderOptions = {}) {
    this.options = options;
    this.now = options.now ?? Date.now;
    this.cache = new Cache(this.now);
  }
  private async request(path: string, authenticated = true): Promise<unknown> {
    if (authenticated && !this.options.apiKey)
      throw new ServiceError(
        503,
        'NOT_CONFIGURED',
        'Exchange rates are not configured yet. Please try again later.',
      );
    if (authenticated && this.now() < this.quotaUntil)
      throw new ServiceError(
        429,
        'PROVIDER_LIMIT',
        'The rate service has reached its request allowance. Please try again later.',
      );
    let response: Response;
    try {
      response = await (this.options.fetcher ?? fetch)(`https://allratestoday.com${path}`, {
        headers: authenticated ? { Authorization: `Bearer ${this.options.apiKey}` } : {},
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ServiceError(
        504,
        'PROVIDER_TIMEOUT',
        'The rate provider could not be reached. Check your connection and try again.',
      );
    }
    if (!response.ok) {
      if (response.status === 429) {
        // Quota exhaustion affects all pairs. Do not repeatedly spend requests retrying it.
        this.quotaUntil = this.now() + 60 * 60_000;
        throw new ServiceError(
          429,
          'PROVIDER_LIMIT',
          'The rate service has reached its request allowance. Please try again later.',
        );
      }
      if ([400, 404, 422].includes(response.status))
        throw new ServiceError(
          422,
          'PAIR_UNAVAILABLE',
          'This pair is unavailable from the selected source. Choose another currency or bank.',
        );
      if ([401, 403].includes(response.status))
        throw new ServiceError(
          503,
          'PROVIDER_ACCESS',
          'The rate service is temporarily unavailable. Please try again later.',
        );
      throw new ServiceError(
        502,
        'PROVIDER_UNAVAILABLE',
        'No rate is available right now. Try another pair or retry shortly.',
      );
    }
    try {
      return await response.json();
    } catch {
      throw new ServiceError(
        502,
        'INVALID_PROVIDER_RESPONSE',
        'The rate provider returned an unreadable response. Please try again.',
      );
    }
  }
  async currencies(): Promise<CurrencyInfo[]> {
    const result = await this.cache.get('currencies', 86_400_000, 7 * 86_400_000, async () => {
      const data = object(await this.request('/api/v1/symbols', false));
      if (!Array.isArray(data['currencies']) || !data['currencies'].length)
        throw new ServiceError(502, 'INVALID_PROVIDER_RESPONSE', 'Currency list unavailable.');
      return data['currencies'].map((item) => {
        const c = object(item);
        const code = text(c['code']);
        if (!/^[A-Z]{3}$/.test(code))
          throw new ServiceError(
            502,
            'INVALID_PROVIDER_RESPONSE',
            'Invalid currency code from provider.',
          );
        return currencyInfo({ code, name: text(c['name']), symbol: text(c['symbol']) });
      });
    });
    return result.value;
  }
  async banks(): Promise<BankInfo[]> {
    return (
      await this.cache.get('banks', 86_400_000, 7 * 86_400_000, async () => {
        const data = object(await this.request('/api/v1/central-banks'));
        const sources = data['banks'];
        if (!Array.isArray(sources))
          throw new ServiceError(502, 'INVALID_PROVIDER_RESPONSE', 'Bank list unavailable.');
        return sources
          .map(object)
          .filter((b) => b['kind'] === 'central_bank' && b['code'] !== 'imf')
          .map((b) => ({
            code: text(b['code']),
            name: text(b['name']),
            country: countryCode(text(b['country'])),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      })
    ).value;
  }
  async quote(
    source: string,
    target: string,
    mode: 'market' | 'official',
    bank?: string,
  ): Promise<Quote> {
    const official = mode === 'official';
    const key = `${mode}:${official ? bank : ''}:${source}:${target}`;
    const ttl = (q: Quote) => {
      if (!official) return this.options.marketTtl ?? 60_000;
      // Check hourly, sooner at the publisher's announced UTC release time.
      const next = new Date(this.now());
      const [hour, minute] = (q.availableBy ?? '00:00').split(':').map(Number);
      next.setUTCHours(hour, minute, 0, 0);
      if (next.getTime() <= this.now()) next.setUTCDate(next.getUTCDate() + 1);
      return Math.max(60_000, Math.min(3_600_000, next.getTime() - this.now()));
    };
    const result = await this.cache.get(key, ttl, official ? 86_400_000 : 3_600_000, async () => {
      const params = new URLSearchParams({ source, target });
      const raw = await this.request(
        official ? `/api/v1/central-bank/${bank}/latest?${params}` : `/api/v1/rates?${params}`,
      );
      const data = object(official ? raw : Array.isArray(raw) ? raw[0] : null);
      if (data['source'] !== source || data['target'] !== target)
        throw new ServiceError(
          502,
          'INVALID_PROVIDER_RESPONSE',
          'The provider returned a different currency pair.',
        );
      const rawRate = data['rate'];
      if (!['string', 'number'].includes(typeof rawRate))
        throw new ServiceError(
          502,
          'INVALID_PROVIDER_RESPONSE',
          'No rate is available for this pair.',
        );
      let rate: Decimal;
      try {
        rate = new Decimal(String(rawRate));
      } catch {
        throw new ServiceError(502, 'INVALID_PROVIDER_RESPONSE', 'Invalid exchange rate.');
      }
      if (!rate.isFinite() || !rate.isPositive() || rate.isZero())
        throw new ServiceError(502, 'INVALID_PROVIDER_RESPONSE', 'Invalid exchange rate.');
      const asOf = text(data[official ? 'rate_date' : 'time']);
      if (!Number.isFinite(Date.parse(asOf)))
        throw new ServiceError(
          502,
          'INVALID_PROVIDER_RESPONSE',
          'The exchange rate has no valid timestamp.',
        );
      return {
        rate: rate.toString(),
        asOf,
        fetchedAt: new Date(this.now()).toISOString(),
        dateOnly: official,
        stale: data['stale'] === true,
        derived: data['derived'] === true,
        bank: official ? bank! : null,
        availableBy:
          typeof data['available_by_utc'] === 'string' &&
          /^\d{2}:\d{2}$/.test(data['available_by_utc'])
            ? data['available_by_utc']
            : undefined,
      } satisfies Quote;
    });
    const observedOld =
      !official &&
      this.now() - Date.parse(result.value.asOf) >
        Math.max(this.options.marketTtl ?? 60_000, 300_000);
    return { ...result.value, stale: result.stale || result.value.stale || observedOld };
  }
}
