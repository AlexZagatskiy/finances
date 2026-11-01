import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholder } from '../../shared/feature-placeholder';

@Component({
  selector: 'app-mortgage',
  imports: [FeaturePlaceholder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-feature-placeholder
      title="Mortgage calculator"
      icon="home"
      description="Make room for the bigger picture before taking the next step toward a home."
      headline="Your next chapter, in clearer numbers."
      message="A place to explore mortgage payments and repayment scenarios is on its way. For now, this is a preview of what’s ahead."
      [features]="features"
    />
  `,
})
export class Mortgage {
  protected readonly features = [
    {
      title: 'Monthly payments',
      description: 'Explore how loan amount, interest, and term shape your payments.',
    },
    {
      title: 'The full picture',
      description: 'Understand total interest and the overall cost of a mortgage.',
    },
    {
      title: 'Room to compare',
      description: 'Try different scenarios to see how your options stack up.',
    },
  ];
}
