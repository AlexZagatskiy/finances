import { BondDefinition } from '../models/bond.model';
import { roundMoney } from './bond-math';
// The supplied data does not specify emission-letter limits. This is explicitly an estimate:
// cap the fee at unpaid interest (including capitalized interest), preserving principal.
export function redemptionFee(
  bond: BondDefinition,
  unpaidInterest: number,
  early: boolean,
): number {
  if (!early) return 0;
  return roundMoney(
    bond.earlyRedemptionRule === 'forfeit_all_interest'
      ? unpaidInterest
      : Math.min(bond.earlyRedemptionFeePLN, Math.max(0, unpaidInterest)),
  );
}
