import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string | null;
  digits: number;
}
export interface BankInfo {
  code: string;
  name: string;
  country?: string | null;
}
export interface Bootstrap {
  source: string;
  target: string;
  bank: string | null;
  country: string | null;
  currencies: CurrencyInfo[];
  popularCodes: string[];
}
export type Side = 'source' | 'target';
export type RateMode = 'market' | 'official';
export interface ConversionRequest {
  source: string;
  target: string;
  amount: string;
  side: Side;
  mode: RateMode;
  bank?: string;
}
export interface Conversion extends ConversionRequest {
  result: string;
  exactResult: string;
  rate: string;
  asOf: string | null;
  fetchedAt: string | null;
  dateOnly: boolean;
  stale: boolean;
  derived: boolean;
  identity: boolean;
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Unable to connect. Check your connection and try again.';
    const body: unknown = error.error;
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string')
      return body.message;
  }
  return 'The service is unavailable right now. Please try again.';
}

@Injectable()
export class CurrencyApi {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly currencies = signal<CurrencyInfo[]>([]);
  readonly popularCodes = signal<string[]>([]);
  readonly allLoaded = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');

  private readonly apiBaseUrl: string = environment.apiBaseUrl;

  bootstrap() {
    return this.http.get<Bootstrap>(`${this.apiBaseUrl}/api/bootstrap`);
  }
  banks() {
    return this.http.get<{ banks: BankInfo[] }>(`${this.apiBaseUrl}/api/banks`);
  }
  convert(request: ConversionRequest) {
    return this.http.post<Conversion>(`${this.apiBaseUrl}/api/convert`, request);
  }
  loadAll() {
    if (this.allLoaded() || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<{ currencies: CurrencyInfo[] }>(`${this.apiBaseUrl}/api/currencies`)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ currencies }) => {
          this.currencies.set(currencies);
          this.allLoaded.set(true);
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
  }
}
