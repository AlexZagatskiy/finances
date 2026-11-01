import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholder } from '../../shared/feature-placeholder';

@Component({
  selector: 'app-bonds',
  imports: [FeaturePlaceholder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-feature-placeholder
      title="Bonds calculator"
      icon="bonds"
      description="Give your longer-term plans a little perspective, one calculation at a time."
      headline="See how your savings could grow."
      message="A simple way to explore bond returns is coming. Soon, you’ll have a clearer view of how time and interest work together."
      [features]="features"
    />
  `,
})
export class Bonds {
  protected readonly features = [
    {
      title: 'Estimated returns',
      description: 'Explore potential interest earnings for a chosen amount and term.',
    },
    {
      title: 'Growth over time',
      description: 'See how interest can add up as your investment matures.',
    },
    {
      title: 'Different scenarios',
      description: 'Compare assumptions and understand how they affect the result.',
    },
  ];
}
