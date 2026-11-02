export type BondType = 'OTS' | 'ROR' | 'DOR' | 'TOS' | 'COI' | 'EDO' | 'ROS' | 'ROD';
export interface BondDefinition {
  type: BondType;
  series: string;
  termMonths: number;
  purchasePricePLN: number;
  exchangePricePLN: number | null;
  firstPeriodAnnualRate: number;
  firstPeriodMonths: number;
  rateModel: 'fixed' | 'nbp' | 'inflation';
  margin: number;
  rateResetMonths: number | null;
  couponPaymentMonths: number;
  capitalizationMonths: number | null;
  earlyRedemptionFeePLN: number;
  earlyRedemptionRule:
    'forfeit_all_interest' | 'deduct_from_accrued_interest_subject_to_emission_terms';
  family800PlusOnly: boolean;
}
export interface BondsConfiguration {
  schemaVersion: string;
  asOf: string;
  offerMonth: string;
  currency: 'PLN';
  assumptions: {
    expectedInflation: number;
    expectedFutureNBPrate: number;
    capitalGainsTaxRate: number;
    purchaseAmountPLN: number;
    holdingPeriodMonths: number;
  };
  bonds: BondDefinition[];
  sources: string[];
  limitations: string[];
}
