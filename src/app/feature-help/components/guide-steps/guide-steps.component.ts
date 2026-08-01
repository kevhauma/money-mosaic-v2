import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TypographyComponent } from '@/shared/ui';
import type { GuideStep } from '../../data/guides';

/**
 * A guide's numbered steps, and nothing else (TICKET-PUB-08). Presentational and route-unaware, so
 * the same rendering serves `/help/:slug` and the Income page's first-visit intro — one
 * implementation means the two surfaces cannot drift, which is the whole reason the intro renders
 * `GUIDES` data rather than a second copy of the words.
 *
 * Takes a plain `steps` array rather than a whole `Guide`: the intro shows only the first three
 * (`steps.slice(0, 3)`), and a component that took the guide would have to be told which slice.
 */
@Component({
  selector: 'app-guide-steps',
  imports: [TypographyComponent],
  templateUrl: './guide-steps.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuideStepsComponent {
  readonly steps = input.required<readonly GuideStep[]>();
}
