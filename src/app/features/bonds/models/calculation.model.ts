export interface BondCalculatorInput {
  investmentAmount: number;
  durationMonths: number;
  includeFamilyBonds: boolean;
  expectedInflation: number;
  expectedFutureNBPrate: number;
  capitalGainsTaxRate: number;
}
export interface CouponPayment {
  month: number;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
}
export interface BondCalculationResult {
  bondType: string;
  series: string;
  name: string;
  summary: string;
  investedAmount: number; // Actual purchase cost, excluding unused cash.
  bondCount: number;
  unusedCash: number;
  grossProfit: number; // Interest before fees and tax, including capitalized interest.
  taxAmount: number;
  earlyRedemptionFees: number;
  netProfit: number; // Final value less original allocation.
  finalValue: number; // Net redemption + net paid coupons + unused cash.
  totalReturnPercent: number; // Relative to the entire allocation, including cash.
  annualizedReturnPercent: number; // Portfolio CAGR, with paid coupons held as cash.
  redeemedEarly: boolean;
  couponPayments: CouponPayment[];
  warnings: string[];
}
