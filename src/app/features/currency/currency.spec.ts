import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { Currency } from './currency';
import { CurrencyApi, Conversion, ConversionRequest } from './currency-api';
import { provideAppIcons } from '../../shared/icons';

const usd = { code: 'USD', name: 'US Dollar', symbol: '$', flag: 'us', digits: 2 };
const eur = { code: 'EUR', name: 'Euro', symbol: '€', flag: 'eu', digits: 2 };
const pln = { code: 'PLN', name: 'Polish złoty', symbol: 'zł', flag: 'pl', digits: 2 };
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('Currency interaction', () => {
  let requests: { input: ConversionRequest; response: Subject<Conversion> }[];
  let component: Currency;
  beforeEach(async () => {
    requests = [];
    const api = {
      currencies: signal([usd, eur]),
      popularCodes: signal(['USD', 'EUR']),
      allLoaded: signal(false),
      loading: signal(false),
      error: signal(''),
      bootstrap: () =>
        of({
          source: 'USD',
          target: 'EUR',
          bank: 'fed',
          country: 'US',
          currencies: [usd, eur],
          popularCodes: ['USD', 'EUR'],
        }),
      banks: () =>
        of({
          banks: [
            { code: 'fed', name: 'Federal Reserve' },
            { code: 'nbp', name: 'NBP' },
          ],
        }),
      convert: (input: ConversionRequest) => {
        const response = new Subject<Conversion>();
        requests.push({ input, response });
        return response;
      },
      loadAll: () => {},
    };
    TestBed.configureTestingModule({ providers: [provideAppIcons()] });
    TestBed.overrideComponent(Currency, {
      set: { providers: [{ provide: CurrencyApi, useValue: api }] },
    });
    const fixture = TestBed.createComponent(Currency);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await tick();
  });
  const respond = (
    request: { input: ConversionRequest; response: Subject<Conversion> },
    result: string,
  ) =>
    request.response.next({
      ...request.input,
      result,
      exactResult: result,
      rate: '0.9',
      asOf: '2026-11-01T12:00:00Z',
      fetchedAt: '2026-11-01T12:00:00Z',
      dateOnly: false,
      stale: false,
      derived: false,
      identity: false,
    });
  it('requests initial conversion and updates the opposite field', () => {
    expect(requests[0].input).toMatchObject({
      source: 'USD',
      target: 'EUR',
      amount: '100',
      side: 'source',
    });
    respond(requests[0], '90.00');
    expect(component.targetAmount.value).toBe('90.00');
  });
  it('debounces edits in either field and preserves the last edited amount', async () => {
    respond(requests[0], '90.00');
    component.targetAmount.setValue('2');
    component.edit('target');
    component.targetAmount.setValue('20,50');
    component.edit('target');
    expect(requests.length).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(requests.length).toBe(2);
    expect(requests[1].input).toMatchObject({ amount: '20.50', side: 'target' });
    respond(requests[1], '22.78');
    expect(component.targetAmount.value).toBe('20,50');
    expect(component.sourceAmount.value).toBe('22.78');
  });
  it('cancels obsolete conversions when currencies change', async () => {
    component.selectCurrency('source', pln);
    await tick();
    respond(requests[0], '999.00');
    expect(component.targetAmount.value).toBe('');
    respond(requests[1], '21.00');
    expect(component.targetAmount.value).toBe('21.00');
  });
  it('swap preserves the original unrounded anchor and selected bank', async () => {
    respond(requests[0], '90.00');
    component.swap();
    await tick();
    expect(component.source()?.code).toBe('EUR');
    expect(component.target()?.code).toBe('USD');
    expect(requests[1].input).toMatchObject({
      source: 'EUR',
      target: 'USD',
      amount: '100',
      side: 'target',
    });
    expect(component.bank()).toBe('fed');
  });
  it('clearing an amount cancels the pending request and clears the result', () => {
    component.sourceAmount.setValue('');
    component.edit('source');
    respond(requests[0], '999');
    expect(component.targetAmount.value).toBe('');
    expect(component.result()).toBeNull();
    expect(component.busy()).toBe(false);
  });
});
