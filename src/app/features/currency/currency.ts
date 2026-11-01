import { Component, DestroyRef, computed, inject, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, timer, switchMap } from 'rxjs';
import {
  CurrencyApi,
  CurrencyInfo,
  BankInfo,
  Conversion,
  Side,
  RateMode,
  errorMessage,
} from './currency-api';
import { CurrencySelector } from './currency-selector';
import { parseAmount } from './amount';

@Component({
  selector: 'app-currency',
  providers: [CurrencyApi],
  imports: [
    DatePipe,
    ReactiveFormsModule,
    CurrencySelector,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './currency.html',
  styleUrl: './currency.scss',
})
export class Currency implements OnInit {
  protected readonly api = inject(CurrencyApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly source = signal<CurrencyInfo | undefined>(undefined);
  readonly target = signal<CurrencyInfo | undefined>(undefined);
  readonly sourceAmount = new FormControl('100', { nonNullable: true });
  readonly targetAmount = new FormControl('', { nonNullable: true });
  readonly mode = signal<RateMode>('market');
  readonly bank = signal<string | null>(null);
  readonly banks = signal<BankInfo[]>([]);
  readonly bankLoading = signal(false);
  readonly bankError = signal('');
  readonly initializing = signal(true);
  readonly initError = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly inputError = signal('');
  readonly result = signal<Conversion | null>(null);
  readonly activeSide = signal<Side>('source');
  readonly bankName = computed(
    () => this.banks().find((b) => b.code === this.bank())?.name ?? 'Central bank',
  );
  readonly displayRate = computed(() =>
    this.result()
      ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: 8 }).format(
          Number(this.result()!.rate),
        )
      : '',
  );
  private request?: Subscription;
  private country: string | null = null;

  ngOnInit() {
    this.initialize();
  }
  initialize() {
    this.initializing.set(true);
    this.initError.set('');
    this.api
      .bootstrap()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.api.currencies.set(data.currencies);
          this.api.popularCodes.set(data.popularCodes);
          this.source.set(data.currencies.find((c) => c.code === data.source));
          this.target.set(data.currencies.find((c) => c.code === data.target));
          this.country = data.country;
          this.bank.set(data.bank);
          this.initializing.set(false);
          this.convert();
        },
        error: (error) => {
          this.initError.set(errorMessage(error));
          this.initializing.set(false);
        },
      });
  }
  edit(side: Side) {
    this.activeSide.set(side);
    this.convert(300);
  }
  selectCurrency(side: Side, currency: CurrencyInfo) {
    (side === 'source' ? this.source : this.target).set(currency);
    this.convert();
  }
  swap() {
    const source = this.source();
    this.source.set(this.target());
    this.target.set(source);
    const amount = this.sourceAmount.value;
    this.sourceAmount.setValue(this.targetAmount.value);
    this.targetAmount.setValue(amount);
    this.activeSide.set(this.activeSide() === 'source' ? 'target' : 'source');
    this.convert();
  }
  setMode(mode: RateMode) {
    this.mode.set(mode);
    if (mode === 'official' && !this.banks().length) this.loadBanks();
    this.convert();
  }
  setBank(bank: string) {
    this.bank.set(bank);
    this.convert();
  }
  loadBanks() {
    if (this.bankLoading()) return;
    this.bankLoading.set(true);
    this.bankError.set('');
    this.api
      .banks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ banks }) => {
          this.banks.set(banks);
          this.bankLoading.set(false);
          if (!banks.some((b) => b.code === this.bank()))
            this.bank.set(
              banks.find((b) => this.country && b.country === this.country)?.code ?? null,
            );
          if (this.mode() === 'official') this.convert();
        },
        error: (error) => {
          this.bankError.set(errorMessage(error));
          this.bankLoading.set(false);
        },
      });
  }
  convert(delay = 0) {
    this.request?.unsubscribe();
    this.result.set(null);
    this.error.set('');
    this.inputError.set('');
    this.busy.set(false);
    const side = this.activeSide();
    const input = side === 'source' ? this.sourceAmount : this.targetAmount;
    const output = side === 'source' ? this.targetAmount : this.sourceAmount;
    output.setValue('');
    const amount = parseAmount(input.value);
    if (amount === null) {
      if (input.value.trim())
        this.inputError.set(
          'Enter a positive number with up to 15 whole digits and 12 decimal places. Use a comma or point for decimals.',
        );
      return;
    }
    const source = this.source()?.code;
    const target = this.target()?.code;
    if (
      !source ||
      !target ||
      (this.mode() === 'official' && (!this.bank() || this.bankLoading() || this.bankError()))
    )
      return;
    this.busy.set(true);
    this.request = timer(delay)
      .pipe(
        switchMap(() =>
          this.api.convert({
            source,
            target,
            amount,
            side,
            mode: this.mode(),
            ...(this.mode() === 'official' && this.bank() ? { bank: this.bank()! } : {}),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          output.setValue(result.result);
          this.result.set(result);
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
        },
      });
  }
}
