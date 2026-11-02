import raw from '../data/retail-bonds.json';
import { validateConfiguration } from './configuration';
import { calculateBond } from './calculate-bond';
import { roundMoney, roundTax } from './bond-math';
import { interestTax } from './taxation';
import { redemptionFee } from './redemption';
import { BondsCalculatorService } from '../services/bonds-calculator.service';
import { BondCalculatorInput } from '../models/calculation.model';
import { BondType } from '../models/bond.model';

const config = validateConfiguration(raw);
const input: BondCalculatorInput = {
  investmentAmount: 100,
  durationMonths: 36,
  includeFamilyBonds: true,
  expectedInflation: 0.035,
  expectedFutureNBPrate: 0.0375,
  capitalGainsTaxRate: 0.19,
};
const bond = (type: BondType) => config.bonds.find((b) => b.type === type)!;
const calculate = (type: BondType, overrides: Partial<BondCalculatorInput> = {}) =>
  calculateBond(bond(type), { ...input, durationMonths: bond(type).termMonths, ...overrides });

describe('Bond projections', () => {
  it('reads changed prices, rates and fees from definitions rather than type-specific constants', () => {
    const definition = {
      ...bond('TOS'),
      purchasePricePLN: 200,
      firstPeriodAnnualRate: 0.1,
      earlyRedemptionFeePLN: 7,
    };
    const result = calculateBond(definition, {
      ...input,
      investmentAmount: 450,
      durationMonths: 12,
      capitalGainsTaxRate: 0,
    });
    expect(result.bondCount).toBe(2);
    expect(result.unusedCash).toBe(50);
    expect(result.grossProfit).toBe(40);
    expect(result.earlyRedemptionFees).toBe(14);
    expect(result.finalValue).toBe(476);
  });
  // Reference cash flows for one PLN 100 bond, manually rounded at each contractual event.
  it.each([
    ['OTS', 0.5, 0.1, 0.4],
    ['ROR', 3.74, 0.73, 3.01], // .33 first coupon; eleven .31 coupons.
    ['DOR', 7.94, 1.68, 6.26], // .35 first coupon; twenty-three .33 coupons.
    ['TOS', 13.79, 2.63, 11.16],
    ['COI', 19.75, 3.76, 15.99], // 4.75 then three 5.00 coupons.
    ['EDO', 70.56, 13.41, 57.15],
    ['ROS', 37.23, 7.08, 30.15],
    ['ROD', 100.49, 19.1, 81.39],
  ] as const)('%s normal maturity matches reference cash flows', (type, gross, tax, net) => {
    const result = calculate(type);
    expect(result.grossProfit).toBe(gross);
    expect(result.taxAmount).toBe(tax);
    expect(result.netProfit).toBe(net);
    expect(result.finalValue).toBe(roundMoney(100 + net));
    expect(result.earlyRedemptionFees).toBe(0);
    expect(result.redeemedEarly).toBe(false);
  });
  it('pays monthly NBP coupons, taxing each once', () => {
    const r = calculate('ROR');
    expect(r.couponPayments).toHaveLength(11);
    expect(r.couponPayments[0]).toEqual({
      month: 1,
      grossAmount: 0.33,
      taxAmount: 0.07,
      netAmount: 0.26,
    });
    expect(r.couponPayments[1].netAmount).toBe(0.25);
    expect(calculate('ROR', { expectedFutureNBPrate: 0 }).grossProfit).toBe(0.33);
  });
  it('uses inflation assumptions only after the first year', () => {
    expect(calculate('COI', { durationMonths: 12, expectedInflation: 0 }).grossProfit).toBe(4.75);
    expect(calculate('COI', { durationMonths: 24, expectedInflation: 0 }).grossProfit).toBe(6.25);
  });
  it('capitalizes annually without taxing accumulated interest before redemption', () => {
    const r = calculate('TOS', { durationMonths: 24 });
    expect(r.grossProfit).toBe(8.99); // 4.40 + round(104.40 * .044)
    expect(r.earlyRedemptionFees).toBe(1);
    expect(r.taxAmount).toBe(1.52); // ceil(7.99 * .19)
    expect(r.couponPayments).toEqual([]);
  });
  it('keeps COI paid coupons as cash, charging the fee against final unpaid interest', () => {
    const r = calculate('COI', { durationMonths: 36 });
    expect(r.couponPayments.map((c) => c.netAmount)).toEqual([3.84, 4.05]);
    expect(r.grossProfit).toBe(14.75);
    expect(r.earlyRedemptionFees).toBe(2);
    expect(r.taxAmount).toBe(2.43);
    expect(r.netProfit).toBe(10.32);
    expect(r.finalValue).toBe(110.32);
  });
  it('handles partial-year and partial-coupon horizons, including OTS forfeiture', () => {
    expect(calculate('OTS', { durationMonths: 1 }).netProfit).toBe(0);
    expect(calculate('OTS', { durationMonths: 1 }).earlyRedemptionFees).toBe(0.17);
    const r = calculate('COI', { durationMonths: 13 });
    expect(r.grossProfit).toBe(5.17);
    expect(r.earlyRedemptionFees).toBe(0.42);
    expect(r.netProfit).toBe(3.84);
  });
  it('caps estimated redemption fees at unpaid interest without consuming principal', () => {
    expect(redemptionFee(bond('EDO'), 0.1, true)).toBe(0.1);
    expect(redemptionFee(bond('EDO'), 20, true)).toBe(3);
    expect(redemptionFee(bond('EDO'), 20, false)).toBe(0);
  });
  it('keeps unused cash once and uses the entire allocation for return metrics', () => {
    const r = calculate('TOS', { investmentAmount: 250.01 });
    expect(r.bondCount).toBe(2);
    expect(r.investedAmount).toBe(200);
    expect(r.unusedCash).toBe(50.01);
    expect(r.finalValue).toBe(272.33);
    expect(r.netProfit).toBe(22.32);
    expect(r.totalReturnPercent).toBeCloseTo((22.32 / 250.01) * 100);
    expect(r.annualizedReturnPercent).toBeCloseTo(((272.33 / 250.01) ** (1 / 3) - 1) * 100);
  });
  it.each([0, -1, NaN, Infinity, 99, 100.001, 1e10])(
    'rejects unsupported investment %s',
    (investmentAmount) => {
      expect(() => calculate('TOS', { investmentAmount })).toThrow();
    },
  );
  it.each([
    { durationMonths: 0 },
    { durationMonths: 1.5 },
    { durationMonths: 145 },
    { expectedInflation: -0.01 },
    { capitalGainsTaxRate: 1.01 },
    { expectedFutureNBPrate: NaN },
  ])('rejects unsupported inputs %s', (overrides) => {
    expect(() => calculate('ROD', overrides)).toThrow();
  });
  it('filters maturity and family eligibility and sorts by net profit', () => {
    const service = new BondsCalculatorService();
    const results = service.calculate({ ...input, includeFamilyBonds: false });
    expect(results.map((r) => r.bondType).sort()).toEqual(['COI', 'EDO', 'TOS']);
    expect(results.map((r) => r.netProfit)).toEqual(
      results.map((r) => r.netProfit).sort((a, b) => b - a),
    );
    expect(service.calculate({ ...input, durationMonths: 144, includeFamilyBonds: false })).toEqual(
      [],
    );
    expect(service.calculate({ ...input, durationMonths: 144 }).map((r) => r.bondType)).toEqual([
      'ROD',
    ]);
    expect(service.calculate({ ...input, durationMonths: 1 })).toHaveLength(8);
  });
  it('rejects direct calculation of ineligible bonds', () => {
    expect(() => calculate('OTS', { durationMonths: 12 })).toThrow();
    expect(() => calculate('ROS', { includeFamilyBonds: false })).toThrow();
  });
});

describe('Money boundary', () => {
  it.each([
    [1.005, 1.01],
    [2.675, 2.68],
    [0.1 + 0.2, 0.3],
    [-1.005, -1.01],
    [1.0049, 1],
  ])('rounds %s to %s', (value, expected) => expect(roundMoney(value)).toBe(expected));
  it('rounds tax up without adding a grosz to an integral floating-point cent', () => {
    expect(roundTax(0.07 * 3)).toBe(0.21);
    expect(roundTax(0.1900001)).toBe(0.2);
    expect(interestTax(-1, 0.19)).toBe(0);
    expect(interestTax(1, 0)).toBe(0);
  });
});

describe('Configuration validation', () => {
  it('loads all eight actual definitions and assumptions', () => {
    expect(config.bonds).toHaveLength(8);
    expect(config.assumptions.expectedInflation).toBe(0.035);
  });
  it.each([
    { bonds: [] },
    { assumptions: {} },
    { currency: 'EUR' },
    { offerMonth: '2026-99' },
    { bonds: raw.bonds.map((b, i) => (i ? b : { ...b, purchasePricePLN: 0 })) },
    { bonds: raw.bonds.map((b, i) => (i ? b : { ...b, earlyRedemptionFeePLN: undefined })) },
    { bonds: raw.bonds.map((b, i) => (i ? b : { ...b, earlyRedemptionRule: 'unknown' })) },
    { bonds: raw.bonds.map((b, i) => (i === 1 ? { ...b, rateResetMonths: null } : b)) },
  ])('reports invalid configuration instead of inventing terms', (overrides) => {
    expect(() => validateConfiguration({ ...raw, ...overrides })).toThrow(
      'Invalid bond configuration',
    );
  });
});
