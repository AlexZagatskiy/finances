import { Injectable } from '@angular/core';
import data from '../data/retail-bonds.json';
import { validateConfiguration } from '../calculation/configuration';
import { calculateBond } from '../calculation/calculate-bond';
import { validateInput } from '../calculation/bond-math';
import { BondCalculatorInput } from '../models/calculation.model';

@Injectable({ providedIn: 'root' })
export class BondsCalculatorService {
  loadConfiguration() {
    return validateConfiguration(data);
  }
  calculate(input: BondCalculatorInput) {
    validateInput(input);
    return this.loadConfiguration()
      .bonds.filter(
        (b) =>
          b.termMonths >= input.durationMonths &&
          (!b.family800PlusOnly || input.includeFamilyBonds),
      )
      .map((b) => calculateBond(b, input))
      .sort((a, b) => b.netProfit - a.netProfit || a.bondType.localeCompare(b.bondType));
  }
}
