import { MortgageInput, MortgageResult, RepaymentMonth } from '../models/mortgage.model';
import { annuity, money } from './mortgage-math';

export function validateMortgage(input: MortgageInput): void {
  for (const [label, value] of [
    ['Property price', input.propertyPrice],
    ['Own contribution', input.ownContribution],
    ['Other upfront costs', input.upfrontCosts],
    ['Monthly additional costs', input.monthlyCosts],
  ] as const) {
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1e9 ||
      Math.abs(value - money(value)) > 1e-8
    )
      throw new Error(
        `${label} must be a PLN amount from 0 to 1 billion, with at most two decimal places.`,
      );
  }
  if (input.propertyPrice <= input.ownContribution)
    throw new Error(
      'Property price must be positive and own contribution must be less than the property price.',
    );
  if (
    !Number.isInteger(input.durationMonths) ||
    input.durationMonths < 12 ||
    input.durationMonths > 420
  )
    throw new Error('Choose a duration between 1 and 35 years in whole months.');
  if (!['constant', 'initial-fixed'].includes(input.rateMode))
    throw new Error('Choose an interest scenario.');
  const rates = [input.annualRate, input.commissionRate];
  if (input.rateMode === 'initial-fixed') {
    rates.push(input.laterAnnualRate);
    if (
      !Number.isInteger(input.fixedPeriodMonths) ||
      input.fixedPeriodMonths < 1 ||
      input.fixedPeriodMonths > input.durationMonths
    )
      throw new Error(
        'The initial fixed period must be at least one month and cannot exceed the mortgage duration.',
      );
  }
  if (rates.some((rate) => !Number.isFinite(rate) || rate < 0 || rate > 1))
    throw new Error('Interest and commission rates must be between 0% and 100%.');
}

export function calculateMortgage(
  input: MortgageInput,
  type: MortgageResult['type'],
): MortgageResult {
  validateMortgage(input);
  if (type !== 'equal' && type !== 'decreasing')
    throw new Error('Choose equal or decreasing installments.');
  const loanAmount = money(input.propertyPrice - input.ownContribution);
  const schedule: RepaymentMonth[] = [];
  let balance = loanAmount;
  let installment = money(annuity(balance, input.annualRate, input.durationMonths));
  const principalChunk = money(loanAmount / input.durationMonths);
  // Currency settlement uses integer grosze to preserve exact principal reconciliation.
  let balanceCents = Math.round(balance * 100);
  for (let month = 1; month <= input.durationMonths; month++) {
    const afterReset = input.rateMode === 'initial-fixed' && month > input.fixedPeriodMonths;
    const annualRate = afterReset ? input.laterAnnualRate : input.annualRate;
    if (afterReset && month === input.fixedPeriodMonths + 1)
      installment = money(annuity(balance, annualRate, input.durationMonths - month + 1));
    const interest = money((balance * annualRate) / 12);
    let principal = type === 'equal' ? money(Math.max(0, installment - interest)) : principalChunk;
    principal = Math.min(balance, principal);
    if (month === input.durationMonths) principal = balance; // Final rounding adjustment.
    const openingBalance = balance;
    balanceCents -= Math.round(principal * 100);
    balance = balanceCents / 100;
    const payment = money(principal + interest);
    schedule.push({
      month,
      annualRate,
      openingBalance,
      principal,
      interest,
      installment: payment,
      additionalCosts: input.monthlyCosts,
      totalPayment: money(payment + input.monthlyCosts),
      closingBalance: balance,
    });
  }
  const sum = (values: number[]) =>
    values.reduce((total, value) => total + Math.round(value * 100), 0) / 100;
  const totalInterest = sum(schedule.map((row) => row.interest));
  const commission = money(loanAmount * input.commissionRate);
  const recurringCosts = money(input.monthlyCosts * input.durationMonths);
  const totalBorrowingCost = sum([totalInterest, commission, input.upfrontCosts, recurringCosts]);
  return {
    type,
    loanAmount,
    ltvPercent: (loanAmount / input.propertyPrice) * 100,
    firstPayment: schedule[0].totalPayment,
    lastPayment: schedule.at(-1)!.totalPayment,
    highestPayment: Math.max(...schedule.map((row) => row.totalPayment)),
    paymentAfterRateChange:
      input.rateMode === 'initial-fixed' && input.fixedPeriodMonths < input.durationMonths
        ? schedule[input.fixedPeriodMonths].totalPayment
        : null,
    totalInterest,
    commission,
    upfrontCosts: input.upfrontCosts,
    recurringCosts,
    totalBorrowingCost,
    totalLoanPayments: sum([loanAmount, totalBorrowingCost]),
    initialCashNeeded: sum([input.ownContribution, commission, input.upfrontCosts]),
    totalProjectOutlay: sum([input.propertyPrice, totalBorrowingCost]),
    schedule,
  };
}
