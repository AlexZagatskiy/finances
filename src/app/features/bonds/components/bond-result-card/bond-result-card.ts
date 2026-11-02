import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { BondCalculationResult } from '../../models/calculation.model';
import { formatPLN } from '../../calculation/bond-math';

@Component({
  selector: 'app-bond-result-card',
  imports: [MatCardModule, DecimalPipe],
  template: `
    <mat-card appearance="outlined" [class.best]="best()">
      <mat-card-content>
        <p class="rank">{{ best() ? 'Highest projected net profit' : 'Projected comparison' }}</p>
        <h3>{{ result().bondType }} — {{ result().name }}</h3>
        <p class="muted">{{ result().series }}</p>
        <p class="model">{{ result().summary }}</p>
        <p class="muted">Projected net profit</p>
        <p class="profit">{{ money(result().netProfit) }}</p>
        <p class="return">{{ result().totalReturnPercent | number: '1.2-2' }}% total net return</p>
        <dl>
          <div>
            <dt>Final investment value</dt>
            <dd>{{ money(result().finalValue) }}</dd>
          </div>
          <div>
            <dt>Annualized net return</dt>
            <dd>{{ result().annualizedReturnPercent | number: '1.2-2' }}%</dd>
          </div>
          <div>
            <dt>Gross interest earned</dt>
            <dd>{{ money(result().grossProfit) }}</dd>
          </div>
          <div>
            <dt>Capital gains tax</dt>
            <dd>{{ money(result().taxAmount) }}</dd>
          </div>
          @if (result().redeemedEarly) {
            <div>
              <dt>Early redemption fee</dt>
              <dd>{{ money(result().earlyRedemptionFees) }}</dd>
            </div>
          }
          <div>
            <dt>Bonds purchased</dt>
            <dd>{{ result().bondCount }}</dd>
          </div>
          <div>
            <dt>Actual purchase cost</dt>
            <dd>{{ money(result().investedAmount) }}</dd>
          </div>
          <div>
            <dt>Unused cash</dt>
            <dd>{{ money(result().unusedCash) }}</dd>
          </div>
        </dl>
        <p class="status">{{ result().redeemedEarly ? 'Early redemption' : 'Normal maturity' }}</p>
        <ul>
          @for (note of result().warnings; track note) {
            <li>{{ note }}</li>
          }
        </ul>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
      width: min(340px, 82vw);
      flex: 0 0 auto;
      scroll-snap-align: start;
    }
    mat-card {
      height: 100%;
      border-radius: 22px;
      border-color: var(--app-border);
      background: var(--app-surface);
    }
    mat-card.best {
      border: 2px solid var(--app-accent);
    }
    mat-card-content {
      padding: 24px;
    }
    .rank,
    .return,
    .status {
      color: var(--app-accent);
      font-size: 12px;
      font-weight: 650;
    }
    h3 {
      margin: 16px 0 4px;
      font-size: 23px;
      font-weight: 650;
    }
    .muted,
    .model,
    dt,
    li {
      color: var(--app-muted);
      font-size: 12px;
    }
    .model {
      min-height: 44px;
      margin: 12px 0 24px;
      line-height: 1.6;
    }
    .profit {
      font-size: 30px;
      font-weight: 650;
      margin: 4px 0;
      letter-spacing: -1px;
    }
    dl {
      margin: 24px 0;
    }
    dl div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin: 12px 0;
    }
    dd {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      text-align: right;
    }
    ul {
      padding-left: 16px;
      margin-top: 16px;
    }
    li {
      line-height: 1.7;
      margin-top: 8px;
    }
  `,
})
export class BondResultCard {
  readonly result = input.required<BondCalculationResult>();
  readonly best = input(false);
  readonly money = formatPLN;
}
