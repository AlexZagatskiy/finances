// Rounding stays behind this boundary so a decimal implementation can replace number later.
function scaled(value: number): number {
  const cents = value * 100;
  const nearest = Math.round(cents);
  return Math.abs(cents - nearest) <= Number.EPSILON * Math.max(1, Math.abs(cents)) * 4
    ? nearest
    : cents;
}
export function roundMoney(value: number): number {
  const cents = scaled(Math.abs(value));
  const tolerance = Number.EPSILON * Math.max(1, cents) * 4;
  return (Math.sign(value) * Math.floor(cents + 0.5 + tolerance)) / 100;
}
export const roundInterest = roundMoney;
// Conservative estimate: positive taxable interest tax rounded up to a grosz per bond.
export function roundTax(value: number): number {
  return Math.ceil(scaled(Math.max(0, value))) / 100;
}
export const formatPLN = (value: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'PLN' }).format(value);
export function validateInput(
  input: import('../models/calculation.model').BondCalculatorInput,
): void {
  if (
    !Number.isFinite(input.investmentAmount) ||
    input.investmentAmount <= 0 ||
    input.investmentAmount > 1e9 ||
    Math.abs(roundMoney(input.investmentAmount) - input.investmentAmount) > 1e-8
  )
    throw new Error(
      'Enter an investment between PLN 0.01 and PLN 1,000,000,000 with at most two decimal places.',
    );
  if (
    !Number.isInteger(input.durationMonths) ||
    input.durationMonths < 1 ||
    input.durationMonths > 144
  )
    throw new Error('Choose a whole-month duration from 1 to 144 months.');
  for (const rate of [
    input.expectedInflation,
    input.expectedFutureNBPrate,
    input.capitalGainsTaxRate,
  ]) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 1)
      throw new Error(
        'Assumed rates must be between 0% and 100%. Negative-rate scenarios are not supported.',
      );
  }
  if (typeof input.includeFamilyBonds !== 'boolean')
    throw new Error('Choose Family 800+ eligibility.');
}
