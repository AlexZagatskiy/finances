import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Mortgage } from './mortgage';
describe('Mortgage calculator UI', () => {
  let fixture: ComponentFixture<Mortgage>;
  let component: Mortgage;
  let element: HTMLElement;
  beforeEach(() => {
    fixture = TestBed.createComponent(Mortgage);
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
  it('shows property price, contribution, duration and illustrative assumptions', () => {
    expect(component.form.getRawValue()).toMatchObject({
      propertyPrice: 600000,
      ownContribution: 120000,
      durationYears: 25,
      annualRate: 6.5,
    });
    expect(component.financing()).toMatchObject({ loan: 480000, contributionPercent: 20, ltv: 80 });
    expect(element.textContent).toContain('not bank offers');
    expect(component.results()).toBeNull();
    expect(element.querySelector('mat-expansion-panel-header')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
  });
  it('calculates two comparison cards on submission', () => {
    submit();
    expect(element.querySelectorAll('[data-installment-type]')).toHaveLength(2);
    expect(element.textContent).toContain('Total borrowing cost');
    expect(component.results()![0].schedule).toHaveLength(300);
  });
  it.each([
    ['propertyPrice', 700000],
    ['ownContribution', 150000],
    ['ownContributionPercent', 25],
    ['durationYears', 30],
    ['annualRate', 7],
    ['rateMode', 'constant'],
    ['fixedPeriodYears', 6],
    ['laterAnnualRate', 8],
    ['commissionRate', 1],
    ['upfrontCosts', 1000],
    ['monthlyCosts', 50],
  ] as const)('invalidates results after %s changes without recalculating', (field, value) => {
    submit();
    component.form.patchValue({ [field]: value });
    fixture.detectChanges();
    expect(component.results()).toBeNull();
    expect(element.querySelectorAll('[data-installment-type]')).toHaveLength(0);
    expect(element.textContent).toContain('Inputs changed');
  });
  it('updates the mortgage amount from a DOM input event', () => {
    submit();
    const input = element.querySelector<HTMLInputElement>(
      'input[formControlName="ownContribution"]',
    )!;
    input.value = '180000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(component.financing().loan).toBe(420000);
    expect(component.results()).toBeNull();
  });
  it.each([
    { propertyPrice: 0 },
    { ownContribution: 600000 },
    { ownContribution: -1 },
    { propertyPrice: 600000.001 },
    { annualRate: 101 },
    { durationYears: 2.5 },
    { durationYears: 3, fixedPeriodYears: 5 },
    { monthlyCosts: -1 },
  ])('rejects invalid input %s', (patch) => {
    component.form.patchValue(patch);
    submit();
    expect(component.results()).toBeNull();
    expect(component.error()).toBeTruthy();
    expect(element.querySelector('[role="alert"]')).toBeTruthy();
  });
  const edit = (field: string, value: string) => {
    const input = element.querySelector<HTMLInputElement>(`input[formControlName="${field}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };
  it('shows a connected default percentage and updates it when the amount changes', () => {
    expect(component.form.controls.ownContributionPercent.value).toBe(20);
    edit('ownContribution', '150000');
    expect(component.form.controls.ownContributionPercent.value).toBe(25);
    expect(
      element.querySelector<HTMLInputElement>('input[formControlName="ownContributionPercent"]')!
        .value,
    ).toBe('25');
  });
  it('updates the PLN amount and loan when the percentage changes', () => {
    edit('ownContributionPercent', '30');
    expect(component.form.controls.ownContribution.value).toBe(180000);
    expect(
      element.querySelector<HTMLInputElement>('input[formControlName="ownContribution"]')!.value,
    ).toBe('180000');
    expect(component.financing().loan).toBe(420000);
    submit();
    expect(component.results()![0].loanAmount).toBe(420000);
  });
  it('preserves the last edited contribution when the property price changes', () => {
    edit('ownContributionPercent', '25');
    edit('propertyPrice', '800000');
    expect(component.form.controls.ownContribution.value).toBe(200000);
    expect(component.form.controls.ownContributionPercent.value).toBe(25);
    edit('ownContribution', '120000');
    edit('propertyPrice', '600000');
    expect(component.form.controls.ownContribution.value).toBe(120000);
    expect(component.form.controls.ownContributionPercent.value).toBe(20);
  });
  it('rounds computed PLN amounts to grosze without feeding that rounding back into the typed percentage', () => {
    edit('propertyPrice', '1000.01');
    edit('ownContributionPercent', '33.33');
    expect(component.form.controls.ownContribution.value).toBe(333.3);
    expect(component.form.controls.ownContributionPercent.value).toBe(33.33);
  });
  it.each(['', '-1', '101'])('rejects a missing or invalid contribution percentage %s', (value) => {
    edit('ownContributionPercent', value);
    submit();
    expect(component.results()).toBeNull();
    expect(component.error()).toBeTruthy();
  });
  it('clears the linked value for an empty amount and recovers after entering a new value', () => {
    edit('ownContribution', '');
    expect(component.form.controls.ownContributionPercent.value).toBeNull();
    submit();
    expect(component.results()).toBeNull();
    edit('ownContribution', '60000');
    expect(component.form.controls.ownContributionPercent.value).toBe(10);
    submit();
    expect(component.results()).toHaveLength(2);
  });
  it('preserves the percentage across an invalid property price and recovers without NaN', () => {
    edit('ownContributionPercent', '20');
    edit('propertyPrice', '0');
    expect(component.form.controls.ownContribution.value).toBeNull();
    expect(component.financing().valid).toBe(false);
    edit('propertyPrice', '500000');
    expect(component.form.controls.ownContribution.value).toBe(100000);
    expect(component.financing().loan).toBe(400000);
  });
  it('supports zero contribution but rejects a fully self-funded property as having no mortgage', () => {
    edit('ownContributionPercent', '0');
    submit();
    expect(component.results()![0].loanAmount).toBe(600000);
    edit('ownContributionPercent', '100');
    submit();
    expect(component.results()).toBeNull();
    expect(component.error()).toContain('less than the property price');
  });
  it('hides and ignores the initial-period fields in a constant scenario', () => {
    component.form.patchValue({ rateMode: 'constant', durationYears: 1 });
    fixture.detectChanges();
    expect(element.querySelector('input[formControlName="fixedPeriodYears"]')).toBeNull();
    expect(component.form.controls.fixedPeriodYears.disabled).toBe(true);
    submit();
    expect(component.results()).toHaveLength(2);
    expect(component.results()![0].paymentAfterRateChange).toBeNull();
    component.form.patchValue({ rateMode: 'initial-fixed' });
    expect(component.form.controls.fixedPeriodYears.enabled).toBe(true);
    submit();
    expect(component.error()).toContain('cannot exceed');
  });
  it('preserves results when expanding fees or changing the displayed schedule', () => {
    submit();
    const result = component.results();
    element.querySelector<HTMLElement>('mat-expansion-panel-header')!.click();
    fixture.detectChanges();
    expect(component.results()).toBe(result);
    const headers = element.querySelectorAll<HTMLElement>('mat-expansion-panel-header');
    headers[1].click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(300);
    expect(element.querySelector('.schedule')?.getAttribute('tabindex')).toBe('0');
    component.selectedSchedule.set('decreasing');
    fixture.detectChanges();
    expect(element.querySelector('caption')?.textContent).toContain('Decreasing');
    expect(component.results()).toBe(result);
    expect(component.schedule()[0].principal).toBe(1600);
  });
});
