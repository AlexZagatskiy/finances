import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatListModule, MatSelectionList } from '@angular/material/list';
import { CurrencyApi, CurrencyInfo } from './currency-api';

@Component({
  selector: 'app-currency-selector',
  imports: [A11yModule, OverlayModule, MatListModule],
  template: `
    <button
      type="button"
      class="currency-trigger"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      [attr.aria-label]="label() + ': ' + (selected()?.code ?? '') + '. Change currency'"
      aria-haspopup="dialog"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-controls]="isOpen() ? panelId() : null"
      (click)="open()"
    >
      @if (selected()?.flag; as flag) {
        <img class="flag" [src]="'flags/' + flag + '.svg'" alt="" width="24" height="18" />
      } @else {
        <span class="neutral-flag" aria-hidden="true">¤</span>
      }
      <span>{{ selected()?.code ?? 'Select' }}</span>
    </button>
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      [cdkConnectedOverlayViewportMargin]="12"
      [cdkConnectedOverlayPush]="true"
      (backdropClick)="close()"
      (overlayKeydown)="onKeydown($event)"
    >
      <div
        class="currency-dropdown"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="label()"
        [id]="panelId()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
      >
        <div class="search-row">
          <input
            #searchInput
            cdkFocusInitial
            type="search"
            class="currency-search"
            aria-label="Search currency code or name"
            placeholder="Search currency code or name"
            autocomplete="off"
            [value]="query()"
            (input)="search(searchInput.value)"
            (keydown.arrowdown)="$event.preventDefault(); focusOptions()"
          />
          <button
            type="button"
            class="close-button"
            aria-label="Close currency selector"
            (click)="close()"
          >
            ×
          </button>
        </div>
        <div class="options" (scroll)="scrolled($event)">
          <mat-selection-list
            #list
            [multiple]="false"
            [hideSingleSelectionIndicator]="true"
            aria-label="Currencies"
            (selectionChange)="choose($event.options[0].value)"
          >
            @for (currency of options(); track currency.code) {
              <mat-list-option [value]="currency" [selected]="currency.code === selected()?.code">
                <span class="option-row">
                  @if (currency.flag) {
                    <img
                      class="tw:ml-1 flag"
                      [src]="'flags/' + currency.flag + '.svg'"
                      alt=""
                      width="24"
                      height="18"
                    />
                  } @else {
                    <span class="neutral-flag" aria-hidden="true">¤</span>
                  }
                  <span
                    ><strong>{{ currency.code }}</strong
                    ><span class="currency-name">{{ currency.name }}</span></span
                  >
                </span>
              </mat-list-option>
            }
          </mat-selection-list>
          @if (!options().length && !api.loading()) {
            <p class="list-note" role="status">No matching currencies</p>
          }
          @if (!api.allLoaded() && !api.loading() && !query()) {
            <p class="list-note">Scroll or search for more currencies</p>
          }
        </div>
        @if (api.loading()) {
          <p class="list-note" role="status">Loading currencies…</p>
        }
        @if (api.error()) {
          <p class="selector-error" role="alert">
            {{ api.error() }}
            <button type="button" (click)="api.loadAll()">Retry currency list</button>
          </p>
        }
      </div>
    </ng-template>
  `,
  styleUrl: './currency-selector.scss',
})
export class CurrencySelector {
  protected readonly api = inject(CurrencyApi);
  readonly selected = input<CurrencyInfo>();
  readonly label = input.required<string>();
  readonly changed = output<CurrencyInfo>();
  protected readonly isOpen = signal(false);
  protected readonly query = signal('');
  protected readonly panelId = computed(
    () => `currency-dropdown-${this.label().replace(/\s+/g, '-').toLowerCase()}`,
  );
  private readonly list = viewChild(MatSelectionList);
  protected readonly options = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const all = this.api.currencies();
    const selected = this.selected();
    const list = selected && !all.some((c) => c.code === selected.code) ? [selected, ...all] : all;
    return list
      .filter((c) => !query || `${c.code} ${c.name}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => {
        const favorites = this.api.popularCodes();
        const rank = (code: string) => (favorites.includes(code) ? favorites.indexOf(code) : 100);
        return rank(a.code) - rank(b.code) || a.name.localeCompare(b.name);
      });
  });
  open() {
    this.query.set('');
    this.isOpen.set(true);
  }
  close() {
    this.isOpen.set(false);
  }
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }
  focusOptions() {
    this.list()?.focus();
  }
  search(value: string) {
    this.query.set(value);
    if (value.trim()) this.api.loadAll();
  }
  choose(currency: CurrencyInfo) {
    this.changed.emit(currency);
    this.close();
  }
  scrolled(event: Event) {
    const panel = event.target as HTMLElement;
    if (panel.scrollHeight - panel.scrollTop - panel.clientHeight < 100) this.api.loadAll();
  }
}
