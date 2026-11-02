import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MortgageCalculatorService } from './services/mortgage-calculator.service';
import { MortgageResult } from './models/mortgage.model';
import { formatPLN, money } from './calculation/mortgage-math';

const amount = (value: number) =>
  new FormControl(value, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0), Validators.max(1e9)],
  });
const rate = (value: number) =>
  new FormControl(value, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0), Validators.max(100)],
  });

@Component({
  selector: 'app-mortgage',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatSliderModule,
    MatExpansionModule,
    MatCardModule,
  ],
  templateUrl: './mortgage.html',
  styleUrl: './mortgage.scss',
})
export class Mortgage {
  private readonly calculator = inject(MortgageCalculatorService);
  private readonly destroyRef = inject(DestroyRef);
  readonly money = formatPLN;
  readonly results = signal<MortgageResult[] | null>(null);
  readonly error = signal('');
  readonly needsRecalculation = signal(false);
  readonly selectedSchedule = signal<'equal' | 'decreasing'>('equal');
  readonly schedule = computed(
    () => this.results()?.find((result) => result.type === this.selectedSchedule())?.schedule ?? [],
  );
  readonly form = new FormGroup({
    propertyPrice: amount(600000),
    ownContribution: new FormControl<number | null>(120000, [
      Validators.required,
      Validators.min(0),
      Validators.max(1e9),
    ]),
    ownContributionPercent: new FormControl<number | null>(20, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    durationYears: new FormControl(25, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(35)],
    }),
    annualRate: rate(6.5),
    rateMode: new FormControl<'constant' | 'initial-fixed'>('initial-fixed', { nonNullable: true }),
    fixedPeriodYears: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(35)],
    }),
    laterAnnualRate: rate(6.5),
    commissionRate: rate(0),
    upfrontCosts: amount(0),
    monthlyCosts: amount(0),
  });
  private readonly values = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  readonly financing = computed(() => {
    const v = this.values();
    const valid =
      Number.isFinite(v.propertyPrice) &&
      v.ownContribution !== null &&
      Number.isFinite(v.ownContribution) &&
      v.propertyPrice > 0 &&
      v.ownContribution >= 0 &&
      v.ownContribution < v.propertyPrice;
    return {
      valid,
      loan: valid ? money(v.propertyPrice - v.ownContribution!) : 0,
      contributionPercent: valid ? (v.ownContribution! / v.propertyPrice) * 100 : 0,
      ltv: valid ? ((v.propertyPrice - v.ownContribution!) / v.propertyPrice) * 100 : 0,
    };
  });
  readonly costFields = [
    { key: 'commissionRate', label: 'Bank commission (%)', max: 100, step: '.01' },
    { key: 'upfrontCosts', label: 'Other upfront costs (PLN)', max: 1e9, step: '.01' },
    { key: 'monthlyCosts', label: 'Monthly additional costs (PLN)', max: 1e9, step: '.01' },
  ] as const;

  private contributionAnchor: 'amount' | 'percent' = 'amount';

  private synchronizeContribution() {
    const { propertyPrice, ownContribution, ownContributionPercent } = this.form.getRawValue();
    const usablePrice = Number.isFinite(propertyPrice) && propertyPrice > 0;
    if (this.contributionAnchor === 'percent') {
      this.form.controls.ownContribution.setValue(
        usablePrice && ownContributionPercent !== null && Number.isFinite(ownContributionPercent)
          ? money((propertyPrice * ownContributionPercent) / 100)
          : null,
        { emitEvent: false },
      );
    } else {
      this.form.controls.ownContributionPercent.setValue(
        usablePrice && ownContribution !== null && Number.isFinite(ownContribution)
          ? Number(((ownContribution / propertyPrice) * 100).toPrecision(12))
          : null,
        { emitEvent: false },
      );
    }
  }

  constructor() {
    this.form.controls.ownContribution.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.contributionAnchor = 'amount';
        this.synchronizeContribution();
      });
    this.form.controls.ownContributionPercent.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.contributionAnchor = 'percent';
        this.synchronizeContribution();
      });
    this.form.controls.propertyPrice.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.synchronizeContribution());
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.results()) this.needsRecalculation.set(true);
      this.results.set(null);
      this.error.set('');
      const v = this.form.getRawValue();
      for (const control of [
        this.form.controls.fixedPeriodYears,
        this.form.controls.laterAnnualRate,
      ]) {
        if (v.rateMode === 'constant' && control.enabled) control.disable({ emitEvent: false });
        if (v.rateMode === 'initial-fixed' && control.disabled)
          control.enable({ emitEvent: false });
      }
    });
  }
  calculate() {
    this.form.markAllAsTouched();
    this.results.set(null);
    if (this.form.invalid) {
      this.error.set(
        'Check the highlighted fields. Amounts must be nonnegative and rates must be between 0% and 100%.',
      );
      return;
    }
    const v = this.form.getRawValue();
    if (
      !Number.isInteger(v.durationYears) ||
      (v.rateMode === 'initial-fixed' && !Number.isInteger(v.fixedPeriodYears))
    ) {
      this.error.set('Enter whole years for the duration and initial fixed period.');
      return;
    }
    try {
      this.results.set(
        this.calculator.compare({
          propertyPrice: v.propertyPrice,
          ownContribution: v.ownContribution!,
          durationMonths: v.durationYears * 12,
          annualRate: v.annualRate / 100,
          rateMode: v.rateMode,
          fixedPeriodMonths: v.fixedPeriodYears * 12,
          laterAnnualRate: v.laterAnnualRate / 100,
          commissionRate: v.commissionRate / 100,
          upfrontCosts: v.upfrontCosts,
          monthlyCosts: v.monthlyCosts,
        }),
      );
      this.error.set('');
      this.needsRecalculation.set(false);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Unable to calculate mortgage payments.');
    }
  }
}
