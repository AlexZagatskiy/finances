import { BondDefinition } from '../models/bond.model';
import {
  BondCalculationResult,
  BondCalculatorInput,
  CouponPayment,
} from '../models/calculation.model';
import { roundInterest, roundMoney, validateInput } from './bond-math';
import { periodRate } from './rates';
import { redemptionFee } from './redemption';
import { interestTax } from './taxation';

export function calculateBond(
  bond: BondDefinition,
  input: BondCalculatorInput,
): BondCalculationResult {
  validateInput(input);
  if (
    bond.termMonths < input.durationMonths ||
    (bond.family800PlusOnly && !input.includeFamilyBonds)
  )
    throw new Error('This bond is not eligible for the selected horizon or Family 800+ settings.');
  const count = Math.floor(input.investmentAmount / bond.purchasePricePLN);
  if (!count) throw new Error(`The investment must cover at least one ${bond.type} bond.`);
  const investedAmount = roundMoney(count * bond.purchasePricePLN);
  const unusedCash = roundMoney(input.investmentAmount - investedAmount);
  const early = input.durationMonths < bond.termMonths;
  let principal = bond.purchasePricePLN;
  let accrued = 0;
  let paidGross = 0;
  let paidTax = 0;
  const couponPayments: CouponPayment[] = [];
  // Equal-month accrual is illustrative; exact contract day counts are absent from the data.
  for (let month = 1; month <= input.durationMonths; month++) {
    accrued += (principal * periodRate(bond, input, month)) / 12;
    // Settle the final month's interest only once, after applying any redemption fee.
    if (month === input.durationMonths) break;
    if (month % bond.couponPaymentMonths === 0) {
      const gross = roundInterest(accrued);
      const tax = interestTax(gross, input.capitalGainsTaxRate);
      paidGross += gross;
      paidTax += tax;
      couponPayments.push({
        month,
        grossAmount: roundMoney(gross * count),
        taxAmount: roundMoney(tax * count),
        netAmount: roundMoney((gross - tax) * count),
      });
      accrued = 0;
    } else if (bond.capitalizationMonths && month % bond.capitalizationMonths === 0) {
      principal += roundInterest(accrued);
      accrued = 0;
    }
  }
  const unpaid = roundMoney(principal - bond.purchasePricePLN + roundInterest(accrued));
  const fee = redemptionFee(bond, unpaid, early);
  const finalTax = interestTax(unpaid - fee, input.capitalGainsTaxRate);
  const grossProfit = roundMoney((paidGross + unpaid) * count);
  const taxAmount = roundMoney((paidTax + finalTax) * count);
  const earlyRedemptionFees = roundMoney(fee * count);
  const netProfit = roundMoney(grossProfit - taxAmount - earlyRedemptionFees);
  const finalValue = roundMoney(input.investmentAmount + netProfit);
  const warnings = ['Paid coupons are included as cash earning 0% after payout.'];
  if (bond.rateModel === 'inflation')
    warnings.push(
      `Later annual rates assume ${(input.expectedInflation * 100).toFixed(2)}% inflation plus the configured margin; this is not a forecast.`,
    );
  if (bond.rateModel === 'nbp')
    warnings.push(
      `Later monthly resets assume a ${(input.expectedFutureNBPrate * 100).toFixed(2)}% NBP reference rate plus the configured margin.`,
    );
  if (bond.family800PlusOnly)
    warnings.push(
      'Requires Family 800+ eligibility and sufficient purchase entitlement; entitlement limits are not modeled.',
    );
  if (early)
    warnings.push(
      'Estimated early redemption: fee capped at unpaid interest. Exact fee limits, notice and settlement dates require the emission letter.',
    );
  return {
    bondType: bond.type,
    series: bond.series,
    name: bond.termMonths < 12 ? `${bond.termMonths}-month` : `${bond.termMonths / 12}-year`,
    summary: `${bond.rateModel === 'fixed' ? 'Fixed rate' : bond.rateModel === 'nbp' ? 'NBP-linked' : 'Inflation-linked'} · ${bond.capitalizationMonths ? `capitalization every ${bond.capitalizationMonths} months` : `coupons every ${bond.couponPaymentMonths} months`}`,
    investedAmount,
    bondCount: count,
    unusedCash,
    grossProfit,
    taxAmount,
    earlyRedemptionFees,
    netProfit,
    finalValue,
    totalReturnPercent: (netProfit / input.investmentAmount) * 100,
    annualizedReturnPercent:
      (Math.pow(finalValue / input.investmentAmount, 12 / input.durationMonths) - 1) * 100,
    redeemedEarly: early,
    couponPayments,
    warnings,
  };
}
