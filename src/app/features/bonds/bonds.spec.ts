import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Bonds } from './bonds';
import { BondsCalculatorService } from './services/bonds-calculator.service';
import { validateConfiguration } from './calculation/configuration';
import raw from './data/retail-bonds.json';

describe('Bonds calculator UI', () => {
  let fixture: ComponentFixture<Bonds>;
  let component: Bonds;
  let element: HTMLElement;
  beforeEach(() => {
    fixture = TestBed.createComponent(Bonds);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });
  const submit = () => {
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  it('loads defaults and shows verified date and offering', () => {
    expect(component.form.getRawValue()).toEqual({
      investmentAmount: 10000,
      durationYears: 3,
      expectedInflation: 3.5,
      expectedFutureNBPrate: 3.75,
      capitalGainsTaxRate: 19,
      includeFamilyBonds: false,
    });
    expect(element.textContent).toContain('November 2, 2026');
    expect(element.textContent).toContain('2026-11');
    expect(element.querySelectorAll('app-bond-result-card')).toHaveLength(0);
    expect(element.textContent).not.toContain('Reinvest paid coupons');
  });
  it('calculates sorted horizontal cards through form submission', () => {
    submit();
    expect(element.querySelectorAll('app-bond-result-card')).toHaveLength(3);
    expect(element.querySelector('.results-row')?.getAttribute('tabindex')).toBe('0');
    expect(element.querySelector('.results-row')?.classList.contains('tw:overflow-x-auto')).toBe(
      true,
    );
    expect(element.querySelector('app-bond-result-card')?.textContent).toContain(
      component.results()![0].bondType,
    );
    expect(element.querySelector('app-bond-result-card .best')).toBeTruthy();
    expect(element.textContent).toContain('Final investment value');
  });
  it.each([
    ['investmentAmount', 20000],
    ['durationYears', 4],
    ['expectedInflation', 4],
    ['expectedFutureNBPrate', 4],
    ['capitalGainsTaxRate', 20],
    ['includeFamilyBonds', true],
  ] as const)(
    'invalidates results immediately on %s changes, without recalculating',
    (field, value) => {
      submit();
      component.form.patchValue({ [field]: value });
      fixture.detectChanges();
      expect(component.results()).toBeNull();
      expect(element.querySelectorAll('app-bond-result-card')).toHaveLength(0);
      expect(element.textContent).toContain('Inputs changed');
      expect(element.querySelector('button[type="submit"]')?.textContent).toContain(
        'Calculate returns',
      );
    },
  );
  it('expands More settings without invalidating results', () => {
    submit();
    const previous = component.results();
    const header = element.querySelector<HTMLElement>('mat-expansion-panel-header')!;
    expect(header.getAttribute('aria-expanded')).toBe('false');
    header.click();
    fixture.detectChanges();
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(component.results()).toBe(previous);
    header.click();
    fixture.detectChanges();
    expect(component.results()).toBe(previous);
  });
  it('filters Family bonds and shows the empty state', () => {
    component.form.patchValue({ durationYears: 12 });
    submit();
    expect(element.textContent).toContain('No bonds qualify');
    component.form.patchValue({ includeFamilyBonds: true });
    submit();
    expect(element.querySelectorAll('app-bond-result-card')).toHaveLength(1);
    expect(element.querySelector('app-bond-result-card')?.textContent).toContain('ROD');
  });
  it.each([0, -1, null, 100.001, 99, 1e10])('validates unsupported investment %s', (amount) => {
    component.form.patchValue({ investmentAmount: amount });
    submit();
    expect(component.results()).toBeNull();
    expect(element.querySelector('[role="alert"]')).toBeTruthy();
  });
  it('invalidates results for a DOM input event', () => {
    submit();
    const input = element.querySelector<HTMLInputElement>(
      'input[formControlName="investmentAmount"]',
    )!;
    input.value = '12000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(component.results()).toBeNull();
    expect(component.form.controls.investmentAmount.value).toBe(12000);
  });
  it('validates rates and displays form errors', () => {
    component.form.patchValue({ expectedInflation: 101 });
    submit();
    expect(component.error()).toContain('rates between 0% and 100%');
  });
});

describe('Bond data UI warnings', () => {
  it.each(['2025-12-31', '2026-01-01', 'invalid', '', '2099-01-01'])(
    'warns for outdated or invalid asOf %s',
    (asOf) => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: BondsCalculatorService,
            useValue: {
              loadConfiguration: () => validateConfiguration({ ...raw, asOf }),
            },
          },
        ],
      });
      const fixture = TestBed.createComponent(Bonds);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Bond data may be outdated');
      expect(fixture.nativeElement.textContent).toContain('Bond data updated:');
    },
  );
  it('shows a meaningful configuration error without constructing guessed assumptions', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: BondsCalculatorService,
          useValue: {
            loadConfiguration: () => {
              throw new Error('Invalid bond configuration: missing fee');
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Bonds);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('missing fee');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
