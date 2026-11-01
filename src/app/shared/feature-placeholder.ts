import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-feature-placeholder',
  imports: [MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="feature-title">
      <p class="eyebrow tw:mb-4">A LITTLE CLARITY FOR YOUR MONEY</p>
      <h1 id="feature-title" tabindex="-1">{{ title() }}</h1>
      <p class="intro tw:mt-4 tw:max-w-xl">{{ description() }}</p>
      <mat-card appearance="outlined" class="placeholder-card tw:mt-8 tw:md:mt-10">
        <mat-card-content class="placeholder-content">
          <span class="feature-icon"><mat-icon [svgIcon]="icon()" /></span>
          <span class="status tw:mt-6"><span class="status-dot"></span> Coming soon</span>
          <h2 class="tw:mt-5">{{ headline() }}</h2>
          <p class="placeholder-description tw:mt-3 tw:max-w-md">{{ message() }}</p>
          <div class="preview-note tw:mt-8">
            <mat-icon svgIcon="spark" />
            <span>This tool is taking shape. Check back as we build.</span>
          </div>
        </mat-card-content>
      </mat-card>
      <div class="tw:mt-8 tw:md:mt-10">
        <p class="eyebrow tw:mb-5">WHAT’S AHEAD</p>
        <ul class="tw:grid tw:grid-cols-1 tw:gap-5 tw:md:grid-cols-3">
          @for (feature of features(); track feature.title; let index = $index) {
            <li class="future-feature">
              <span class="feature-number">0{{ index + 1 }}</span>
              <h3 class="tw:mt-3 tw:font-semibold">{{ feature.title }}</h3>
              <p class="tw:mt-2 tw:text-sm tw:leading-6">{{ feature.description }}</p>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .eyebrow {
      color: var(--app-muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.8px;
    }
    h1 {
      font-size: clamp(30px, 4vw, 42px);
      font-weight: 650;
      letter-spacing: -1.6px;
      line-height: 1.15;
    }
    .intro {
      color: var(--app-muted);
      font-size: 15px;
      line-height: 1.8;
    }
    .placeholder-card {
      border-color: var(--app-border);
      border-radius: 24px;
      background: var(--app-surface);
      box-shadow: 0 4px 24px #243e3503;
    }
    .placeholder-card .placeholder-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px;
      text-align: center;
    }
    .feature-icon {
      display: grid;
      place-items: center;
      width: 80px;
      height: 80px;
      border: 1px solid #d3e8df;
      border-radius: 24px;
      background: var(--app-accent-soft);
      color: var(--app-accent);
      transform: rotate(-6deg);
    }
    .feature-icon mat-icon {
      width: 36px;
      height: 36px;
      transform: rotate(6deg);
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border-radius: 999px;
      background: #f4f2ec;
      color: #73613f;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #997b41;
    }
    h2 {
      font-size: clamp(22px, 3vw, 28px);
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: -0.7px;
    }
    .placeholder-description {
      color: var(--app-muted);
      font-size: 14px;
      line-height: 1.8;
    }
    .preview-note {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--app-muted);
      font-size: 11px;
    }
    .preview-note mat-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }
    .future-feature {
      border-top: 1px solid var(--app-border);
      padding-top: 18px;
    }
    .feature-number {
      color: var(--app-accent);
      font-size: 11px;
      font-weight: 700;
    }
    .future-feature h3 {
      font-size: 14px;
    }
    .future-feature p {
      color: var(--app-muted);
    }
    @media (max-width: 767px) {
      .placeholder-card .placeholder-content {
        padding: 36px 20px;
      }
    }
  `,
})
export class FeaturePlaceholder {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input.required<string>();
  readonly headline = input.required<string>();
  readonly message = input.required<string>();
  readonly features = input.required<readonly { title: string; description: string }[]>();
}
