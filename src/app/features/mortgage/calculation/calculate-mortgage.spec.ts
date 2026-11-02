import { calculateMortgage, validateMortgage } from './calculate-mortgage';
import { annuity, money } from './mortgage-math';
import { MortgageInput } from '../models/mortgage.model';
import { MortgageCalculatorService } from '../services/mortgage-calculator.service';
const base: MortgageInput = {
  propertyPrice: 15000,
  ownContribution: 3000,
  durationMonths: 12,
  annualRate: 0.12,
  rateMode: 'constant',
  fixedPeriodMonths: 12,
  laterAnnualRate: 0.12,
  commissionRate: 0,
  upfrontCosts: 0,
  monthlyCosts: 0,
};
describe('Mortgage calculation', () => {
  it('matches a reference annuity payment and standard 30-year example', () => {
    expect(annuity(12000, 0.12, 12)).toBeCloseTo(1066.185464, 5);
    const r = calculateMortgage(base, 'equal');
    expect(r.schedule[0]).toMatchObject({
      principal: 946.19,
      interest: 120,
      installment: 1066.19,
      closingBalance: 11053.81,
    });
    expect(money(annuity(100000, 0.06, 360))).toBe(599.55);
  });
  it('matches independently summed decreasing interest: 1% × (12000 + 11000 + ... + 1000)', () => {
    const r = calculateMortgage(base, 'decreasing');
    expect(r.firstPayment).toBe(1120);
    expect(r.lastPayment).toBe(1010);
    expect(r.totalInterest).toBe(780);
    expect(r.totalLoanPayments).toBe(12780);
    expect(r.schedule.every((row) => row.principal === 1000)).toBe(true);
  });
  it.each(['equal', 'decreasing'] as const)(
    'reconciles principal, interest, costs and balances for %s',
    (type) => {
      const r = calculateMortgage(
        {
          ...base,
          propertyPrice: 600000.01,
          ownContribution: 120000,
          durationMonths: 300,
          annualRate: 0.065,
          rateMode: 'initial-fixed',
          fixedPeriodMonths: 60,
          laterAnnualRate: 0.08,
          commissionRate: 0.015,
          upfrontCosts: 1234.56,
          monthlyCosts: 99.99,
        },
        type,
      );
      expect(r.schedule).toHaveLength(300);
      expect(r.schedule.at(-1)!.closingBalance).toBe(0);
      expect(money(r.schedule.reduce((sum, row) => sum + row.principal, 0))).toBe(r.loanAmount);
      expect(money(r.schedule.reduce((sum, row) => sum + row.interest, 0))).toBe(r.totalInterest);
      expect(
        money(
          r.schedule.reduce((sum, row) => sum + row.totalPayment, 0) +
            r.commission +
            r.upfrontCosts,
        ),
      ).toBe(r.totalLoanPayments);
      for (const row of r.schedule) {
        expect(row.closingBalance).toBeGreaterThanOrEqual(0);
        expect(money(row.openingBalance - row.principal)).toBe(row.closingBalance);
      }
    },
  );
  it.each(['equal', 'decreasing'] as const)(
    'supports zero interest for %s without counting own contribution twice',
    (type) => {
      const r = calculateMortgage({ ...base, annualRate: 0 }, type);
      expect(r.firstPayment).toBe(1000);
      expect(r.totalInterest).toBe(0);
      expect(r.totalBorrowingCost).toBe(0);
      expect(r.initialCashNeeded).toBe(3000);
      expect(r.totalProjectOutlay).toBe(15000);
      expect(r.ltvPercent).toBe(80);
    },
  );
  it('accounts for upfront commission and monthly costs without financing them', () => {
    const r = calculateMortgage(
      { ...base, annualRate: 0, commissionRate: 0.02, upfrontCosts: 100, monthlyCosts: 10 },
      'equal',
    );
    expect(r.loanAmount).toBe(12000);
    expect(r.commission).toBe(240);
    expect(r.firstPayment).toBe(1010);
    expect(r.recurringCosts).toBe(120);
    expect(r.totalBorrowingCost).toBe(460);
    expect(r.totalLoanPayments).toBe(12460);
    expect(r.initialCashNeeded).toBe(3340);
    expect(r.totalProjectOutlay).toBe(15460);
  });
  it('resets the annuity at month 13 using remaining balance and duration', () => {
    const r = calculateMortgage(
      {
        ...base,
        propertyPrice: 2400,
        ownContribution: 0,
        durationMonths: 24,
        annualRate: 0,
        rateMode: 'initial-fixed',
        fixedPeriodMonths: 12,
        laterAnnualRate: 0.12,
      },
      'equal',
    );
    expect(r.schedule[11].closingBalance).toBe(1200);
    expect(r.schedule[11].annualRate).toBe(0);
    expect(r.schedule[12]).toMatchObject({
      annualRate: 0.12,
      openingBalance: 1200,
      interest: 12,
      installment: 106.62,
    });
    expect(r.paymentAfterRateChange).toBe(106.62);
    expect(r.highestPayment).toBeGreaterThanOrEqual(106.62);
  });
  it('keeps decreasing principal unchanged at the rate transition', () => {
    const r = calculateMortgage(
      {
        ...base,
        durationMonths: 24,
        rateMode: 'initial-fixed',
        fixedPeriodMonths: 12,
        laterAnnualRate: 0.24,
      },
      'decreasing',
    );
    expect(r.schedule[11].principal).toBe(500);
    expect(r.schedule[12]).toMatchObject({ principal: 500, interest: 120, totalPayment: 620 });
  });
  it('supports a fixed period equal to the full term without a subsequent reset', () => {
    const r = calculateMortgage(
      { ...base, rateMode: 'initial-fixed', laterAnnualRate: 0.99 },
      'equal',
    );
    expect(r.paymentAfterRateChange).toBeNull();
    expect(r.schedule.every((row) => row.annualRate === 0.12)).toBe(true);
  });
  it('does not apply inactive later-rate assumptions', () => {
    expect(
      calculateMortgage({ ...base, fixedPeriodMonths: NaN, laterAnnualRate: NaN }, 'equal')
        .firstPayment,
    ).toBe(1066.19);
  });
  it('handles zero and near-zero interest without numerical cancellation', () => {
    expect(annuity(12000, 0, 12)).toBe(1000);
    expect(annuity(12000, 1e-12, 12)).toBeCloseTo(1000, 7);
    expect(money(1.005)).toBe(1.01);
    expect(money(2.675)).toBe(2.68);
  });
  it.each([0.01, 1, 100.01, 1e9])(
    'reconciles a rounding boundary principal %s over 35 years',
    (propertyPrice) => {
      const r = calculateMortgage(
        { ...base, propertyPrice, ownContribution: 0, durationMonths: 420, annualRate: 0.065 },
        'equal',
      );
      expect(r.schedule.at(-1)!.closingBalance).toBe(0);
      expect(money(r.schedule.reduce((sum, row) => sum + row.principal, 0))).toBe(propertyPrice);
    },
  );
  it.each([
    { propertyPrice: 0 },
    { propertyPrice: Infinity },
    { propertyPrice: NaN },
    { propertyPrice: 1e10 },
    { propertyPrice: 100.001 },
    { ownContribution: -1 },
    { ownContribution: 15000 },
    { ownContribution: 20000 },
    { durationMonths: 0 },
    { durationMonths: 421 },
    { durationMonths: 12.5 },
    { annualRate: -0.01 },
    { annualRate: 1.01 },
    { annualRate: NaN },
    { commissionRate: 2 },
    { upfrontCosts: -1 },
    { monthlyCosts: 1.001 },
    { rateMode: 'initial-fixed' as const, fixedPeriodMonths: 13 },
    { rateMode: 'initial-fixed' as const, fixedPeriodMonths: 0 },
    { rateMode: 'initial-fixed' as const, laterAnnualRate: NaN },
  ])('rejects invalid input %s', (overrides) => {
    expect(() => validateMortgage({ ...base, ...overrides })).toThrow();
  });
  it('compares both repayment plans using the same input', () => {
    const results = new MortgageCalculatorService().compare(base);
    expect(results.map((r) => r.type)).toEqual(['equal', 'decreasing']);
    expect(results[0].loanAmount).toBe(results[1].loanAmount);
    expect(results[0].totalInterest).toBeGreaterThan(results[1].totalInterest);
    expect(results[0].firstPayment).toBeLessThan(results[1].firstPayment);
  });
});
