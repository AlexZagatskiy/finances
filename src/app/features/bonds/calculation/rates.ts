import { BondDefinition } from '../models/bond.model';
import { BondCalculatorInput } from '../models/calculation.model';
export const fixedRate = (bond: BondDefinition) => bond.firstPeriodAnnualRate;
export const inflationLinkedRate = (bond: BondDefinition, input: BondCalculatorInput) =>
  input.expectedInflation + bond.margin;
export const nbpLinkedRate = (bond: BondDefinition, input: BondCalculatorInput) =>
  input.expectedFutureNBPrate + bond.margin;
export function periodRate(
  bond: BondDefinition,
  input: BondCalculatorInput,
  month: number,
): number {
  if (month <= bond.firstPeriodMonths || bond.rateModel === 'fixed') return fixedRate(bond);
  return bond.rateModel === 'inflation'
    ? inflationLinkedRate(bond, input)
    : nbpLinkedRate(bond, input);
}
