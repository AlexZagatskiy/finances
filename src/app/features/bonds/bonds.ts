import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { BondsCalculatorService } from './services/bonds-calculator.service';
import { BondsConfiguration } from './models/bond.model';
import { BondCalculationResult } from './models/calculation.model';
import { dataFreshness, parseCalendarDate } from './calculation/freshness';
import { BondResultCard } from './components/bond-result-card/bond-result-card';

@Component({
  selector: 'app-bonds',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSliderModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatCardModule,
    BondResultCard,
  ],
  templateUrl: './bonds.html',
  styleUrl: './bonds.scss',
})
export class Bonds {
  private readonly calculator = inject(BondsCalculatorService);
  private readonly destroyRef = inject(DestroyRef);
  readonly config: BondsConfiguration | null;
  readonly configError: string;
  readonly verifiedDate: Date | null;
  readonly freshnessWarning: string | null;
  readonly results = signal<BondCalculationResult[] | null>(null);
  readonly error = signal('');
  readonly needsRecalculation = signal(false);
  readonly form;
  readonly rateFields = [
    { key: 'expectedInflation', label: 'Expected annual inflation (%)' },
    { key: 'expectedFutureNBPrate', label: 'Expected future NBP reference rate (%)' },
    { key: 'capitalGainsTaxRate', label: 'Capital gains tax (%)' },
  ] as const;

  constructor() {
    let config: BondsConfiguration | null = null;
    let error = '';
    try {
      config = this.calculator.loadConfiguration();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unable to load bond configuration.';
    }
    this.config = config;
    this.configError = error;
    this.verifiedDate = parseCalendarDate(config?.asOf);
    this.freshnessWarning = dataFreshness(config?.asOf);
    const a = config?.assumptions;
    const rateControl = (value: number | undefined) =>
      new FormControl(value == null ? null : Number((value * 100).toPrecision(15)), [
        Validators.required,
        Validators.min(0),
        Validators.max(100),
      ]);
    this.form = new FormGroup({
      investmentAmount: new FormControl(a?.purchaseAmountPLN ?? null, [
        Validators.required,
        Validators.min(0.01),
        Validators.max(1e9),
      ]),
      durationYears: new FormControl(a ? a.holdingPeriodMonths / 12 : null, [
        Validators.required,
        Validators.min(1),
        Validators.max(12),
      ]),
      expectedInflation: rateControl(a?.expectedInflation),
      expectedFutureNBPrate: rateControl(a?.expectedFutureNBPrate),
      capitalGainsTaxRate: rateControl(a?.capitalGainsTaxRate),
      includeFamilyBonds: new FormControl(false, { nonNullable: true }),
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.results() !== null) this.needsRecalculation.set(true);
      this.results.set(null);
      this.error.set('');
    });
  }
  calculate() {
    this.form.markAllAsTouched();
    this.results.set(null);
    if (!this.config) return;
    if (this.form.invalid) {
      this.error.set(
        'Enter a positive investment and complete all assumptions with rates between 0% and 100%.',
      );
      return;
    }
    const v = this.form.getRawValue();
    if (!Number.isInteger(v.durationYears)) {
      this.error.set('Choose a whole-year duration from 1 to 12 years.');
      return;
    }
    try {
      this.results.set(
        this.calculator.calculate({
          investmentAmount: v.investmentAmount!,
          durationMonths: v.durationYears! * 12,
          expectedInflation: v.expectedInflation! / 100,
          expectedFutureNBPrate: v.expectedFutureNBPrate! / 100,
          capitalGainsTaxRate: v.capitalGainsTaxRate! / 100,
          includeFamilyBonds: v.includeFamilyBonds,
        }),
      );
      this.error.set('');
      this.needsRecalculation.set(false);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Unable to calculate returns.');
    }
  }
}
