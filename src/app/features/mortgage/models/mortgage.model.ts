export interface MortgageInput {
  propertyPrice: number;
  ownContribution: number;
  durationMonths: number;
  annualRate: number; // Nominal annual decimal, not RRSO.
  rateMode: 'constant' | 'initial-fixed';
  fixedPeriodMonths: number;
  laterAnnualRate: number; // Scenario after the initial fixed period.
  commissionRate: number;
  upfrontCosts: number; // Paid separately, never financed.
  monthlyCosts: number; // Constant additional costs throughout the term.
}
export interface RepaymentMonth {
  month: number;
  annualRate: number;
  openingBalance: number;
  principal: number;
  interest: number;
  installment: number;
  additionalCosts: number;
  totalPayment: number;
  closingBalance: number;
}
export interface MortgageResult {
  type: 'equal' | 'decreasing';
  loanAmount: number;
  ltvPercent: number;
  firstPayment: number;
  lastPayment: number;
  highestPayment: number;
  paymentAfterRateChange: number | null;
  totalInterest: number;
  commission: number;
  upfrontCosts: number;
  recurringCosts: number;
  totalBorrowingCost: number; // Interest + fees + additional costs; excludes principal and own capital.
  totalLoanPayments: number; // Principal + total borrowing cost; excludes own capital.
  initialCashNeeded: number; // Own capital + commission + upfront costs.
  totalProjectOutlay: number; // Own capital + principal + total borrowing cost.
  schedule: RepaymentMonth[];
}
