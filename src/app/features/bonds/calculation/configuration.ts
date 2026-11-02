import { BondsConfiguration } from '../models/bond.model';
import { roundMoney } from './bond-math';

export function validateConfiguration(value: unknown): BondsConfiguration {
  const fail = (detail: string): never => {
    throw new Error(`Invalid bond configuration: ${detail}`);
  };
  const record = (v: unknown): Record<string, unknown> =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : fail('expected an object');
  const number = (v: unknown, min: number, max = 1e9): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const period = (v: unknown): v is number => number(v, 1, 144) && Number.isInteger(v);
  const root = record(value);
  if (root['schemaVersion'] !== '1.0.0' || root['currency'] !== 'PLN')
    fail('unsupported schema or currency');
  if (typeof root['offerMonth'] !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(root['offerMonth']))
    fail('offerMonth is required');
  // Invalid asOf is surfaced by the dedicated freshness warning, rather than hiding the whole calculator.
  const a = record(root['assumptions']);
  for (const key of ['expectedInflation', 'expectedFutureNBPrate', 'capitalGainsTaxRate'])
    if (!number(a[key], 0, 1)) fail(`invalid assumption ${key}`);
  if (
    !number(a['purchaseAmountPLN'], 0.01) ||
    roundMoney(a['purchaseAmountPLN']) !== a['purchaseAmountPLN'] ||
    !period(a['holdingPeriodMonths']) ||
    (a['holdingPeriodMonths'] as number) % 12 !== 0
  )
    fail('invalid default investment or whole-year UI duration');
  for (const key of ['sources', 'limitations'])
    if (
      !Array.isArray(root[key]) ||
      !(root[key] as unknown[]).every((x) => typeof x === 'string') ||
      !root[key].length
    )
      fail(`${key} is required`);
  const types = ['OTS', 'ROR', 'DOR', 'TOS', 'COI', 'EDO', 'ROS', 'ROD'];
  if (!Array.isArray(root['bonds']) || root['bonds'].length !== types.length)
    fail('all eight bond types are required');
  const seen = new Set<string>();
  for (const item of root['bonds'] as unknown[]) {
    const b = record(item);
    const type = b['type'];
    if (typeof type !== 'string' || !types.includes(type) || seen.has(type))
      fail('invalid or duplicate bond type');
    seen.add(type as string);
    if (typeof b['series'] !== 'string' || !b['series']) fail(`${type}: missing series`);
    for (const key of ['termMonths', 'firstPeriodMonths', 'couponPaymentMonths'])
      if (!period(b[key])) fail(`${type}: invalid ${key}`);
    const term = b['termMonths'] as number;
    for (const key of [
      'firstPeriodMonths',
      'couponPaymentMonths',
      'capitalizationMonths',
      'rateResetMonths',
    ]) {
      const p = b[key];
      if ((key === 'capitalizationMonths' || key === 'rateResetMonths') && p === null) continue;
      if (!period(p) || p > term || term % p !== 0) fail(`${type}: unsupported ${key}`);
    }
    if (!number(b['purchasePricePLN'], 0.01) || !number(b['earlyRedemptionFeePLN'], 0))
      fail(`${type}: missing price or fee`);
    for (const key of ['purchasePricePLN', 'earlyRedemptionFeePLN'])
      if (roundMoney(b[key] as number) !== b[key]) fail(`${type}: ${key} must use whole grosze`);
    if (b['exchangePricePLN'] !== null && !number(b['exchangePricePLN'], 0.01))
      fail(`${type}: invalid exchange price`);
    if (b['capitalizationMonths'] !== null && b['couponPaymentMonths'] !== term)
      fail(`${type}: mixed interim coupons and capitalization are unsupported`);
    for (const key of ['firstPeriodAnnualRate', 'margin'])
      if (!number(b[key], 0, 1)) fail(`${type}: invalid ${key}`);
    if (!['fixed', 'inflation', 'nbp'].includes(String(b['rateModel'])))
      fail(`${type}: unsupported interest model`);
    if (
      b['rateModel'] !== 'fixed' &&
      (!period(b['rateResetMonths']) ||
        (b['firstPeriodMonths'] as number) % (b['rateResetMonths'] as number) !== 0)
    )
      fail(`${type}: missing rate reset schedule`);
    if (typeof b['family800PlusOnly'] !== 'boolean') fail(`${type}: missing eligibility`);
    if (
      !['forfeit_all_interest', 'deduct_from_accrued_interest_subject_to_emission_terms'].includes(
        String(b['earlyRedemptionRule']),
      )
    )
      fail(`${type}: unsupported redemption rule`);
  }
  return value as BondsConfiguration;
}
