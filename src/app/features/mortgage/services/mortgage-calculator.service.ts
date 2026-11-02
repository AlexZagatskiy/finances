import { Injectable } from '@angular/core';
import { calculateMortgage } from '../calculation/calculate-mortgage';
import { MortgageInput } from '../models/mortgage.model';
@Injectable({ providedIn: 'root' })
export class MortgageCalculatorService {
  compare(input: MortgageInput) {
    return [calculateMortgage(input, 'equal'), calculateMortgage(input, 'decreasing')];
  }
}
