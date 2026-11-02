import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app.ts';
import { Cache, ServiceError } from './cache.ts';
import { defaults } from './metadata.ts';

const currencies = ['USD', 'EUR', 'JPY', 'KWD', 'PLN'].map((code) => ({
  code,
  name: code,
  symbol: code,
}));
const now = Date.parse('2026-11-01T12:00:00Z');
function fixture() {
  const calls: string[] = [];
  let time = now;
  let failed = false;
  const app = buildApp({
    apiKey: 'test-key',
    now: () => time,
    fetcher: async (url) => {
      const path = new URL(String(url));
      calls.push(path.pathname);
      if (path.pathname.endsWith('/symbols')) return Response.json({ currencies });
      if (path.pathname.endsWith('/central-banks'))
        return Response.json({
          banks: [
            { code: 'nbp', name: 'NBP', country: 'Poland', kind: 'central_bank' },
            { code: 'ecb', name: 'ECB', country: 'Eurozone', kind: 'central_bank' },
          ],
        });
      if (failed) return Response.json({}, { status: 502 });
      const source = path.searchParams.get('source');
      const target = path.searchParams.get('target');
      const data = {
        source,
        target,
        rate: target === 'JPY' ? '150.125' : target === 'KWD' ? '0.3075' : '0.925',
        time: new Date(now).toISOString(),
      };
      return Response.json(
        path.pathname.includes('central-bank/')
          ? {
              ...data,
              bank: 'nbp',
              rate_date: '2026-10-30',
              derived: true,
              available_by_utc: '11:15',
            }
          : [data],
      );
    },
  });
  const convert = (overrides = {}) =>
    app.inject({
      method: 'POST',
      url: '/api/convert',
      payload: {
        source: 'USD',
        target: 'EUR',
        mode: 'market',
        side: 'source',
        amount: '100',
        ...overrides,
      },
    });
  return {
    app,
    calls,
    convert,
    advance: (ms: number) => {
      time += ms;
    },
    fail: () => {
      failed = true;
    },
  };
}
test('decimal calculation, reverse editing and amount-independent cache', async (t) => {
  const f = fixture();
  t.after(() => f.app.close());
  assert.equal((await f.convert({ amount: '0.1' })).json().result, '0.09');
  assert.equal((await f.convert({ amount: '100' })).json().result, '92.50');
  assert.equal((await f.convert({ side: 'target', amount: '92.50' })).json().result, '100.00');
  assert.equal(f.calls.filter((p) => p.endsWith('/rates')).length, 1);
});
test('rounds half-up for zero and three-decimal currencies', async (t) => {
  const f = fixture();
  t.after(() => f.app.close());
  assert.equal((await f.convert({ target: 'JPY', amount: '4' })).json().result, '601');
  assert.equal((await f.convert({ target: 'KWD', amount: '1' })).json().result, '0.308');
  assert.equal((await f.convert({ amount: '0' })).json().result, '0.00');
});
test('rejects invalid input and unsupported codes without upstream rate calls', async (t) => {
  const f = fixture();
  t.after(() => f.app.close());
  for (const amount of ['-1', '1e4', 'NaN', '1,00', '1.1234567890123'])
    assert.equal((await f.convert({ amount })).statusCode, 400);
  assert.equal((await f.convert({ source: 'ZZZ' })).statusCode, 400);
  assert.equal((await f.convert({ mode: 'official' })).statusCode, 400);
  assert.equal(f.calls.filter((p) => p.endsWith('/rates')).length, 0);
});
test('identity conversion does not fetch a rate', async (t) => {
  const f = fixture();
  t.after(() => f.app.close());
  const response = (await f.convert({ target: 'USD' })).json();
  assert.equal(response.result, '100.00');
  assert.equal(response.asOf, null);
  assert.equal(f.calls.filter((p) => p.endsWith('/rates')).length, 0);
});
test('bank and mode are isolated; official publication date is preserved', async (t) => {
  const f = fixture();
  t.after(() => f.app.close());
  await f.convert();
  const result = (await f.convert({ mode: 'official', bank: 'nbp' })).json();
  assert.equal(result.asOf, '2026-10-30');
  assert.equal(result.dateOnly, true);
  await f.convert({ mode: 'official', bank: 'ecb' });
  assert.equal(f.calls.filter((p) => p.includes('/latest')).length, 2);
});
test('expired quotes are refreshed; failed refresh has bounded stale fallback', async (t) => {
  const f = fixture();
  t.after(() => f.app.close());
  await f.convert();
  f.advance(61_000);
  await f.convert();
  assert.equal(f.calls.filter((p) => p.endsWith('/rates')).length, 2);
  f.advance(61_000);
  f.fail();
  const stale = (await f.convert()).json();
  assert.equal(stale.stale, true);
  assert.equal(stale.asOf, new Date(now).toISOString());
  f.advance(3_600_000);
  assert.equal((await f.convert()).statusCode, 502);
});
test('concurrent cache misses coalesce and permanent errors never use stale data', async () => {
  let now = 0;
  const cache = new Cache(() => now);
  let calls = 0;
  const load = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return 42;
  };
  const results = await Promise.all([
    cache.get('pair', 10, 100, load),
    cache.get('pair', 10, 100, load),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(results, [
    { value: 42, stale: false },
    { value: 42, stale: false },
  ]);
  now = 11;
  await assert.rejects(
    cache.get('pair', 10, 100, async () => {
      throw new ServiceError(422, 'MISSING', 'Missing');
    }),
  );
});
test('country defaults: Poland, US, Eurozone and unknown', () => {
  assert.deepEqual(defaults('PL'), { country: 'PL', source: 'PLN', target: 'USD', bank: 'nbp' });
  assert.equal(defaults('US').target, 'EUR');
  assert.equal(defaults('DE').bank, 'ecb');
  assert.equal(defaults().source, 'PLN');
  assert.equal(defaults().target, 'USD');
});
test('only explicitly configured country headers influence defaults', async (t) => {
  const f = fixture();
  t.after(() => f.app.close());
  const response = await f.app.inject({ url: '/api/bootstrap', headers: { 'cf-ipcountry': 'PL' } });
  assert.equal(response.json().source, 'PLN');
});
