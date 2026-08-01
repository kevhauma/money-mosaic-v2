import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { GUIDES, type Guide } from '../../data/guides';
import {
  ButtonComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  PaperComponent,
} from '@/shared/ui';
import { GuideStepsComponent } from '../guide-steps/guide-steps.component';

@Component({
  selector: 'app-guide-detail',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    GuideStepsComponent,
    PageHeaderComponent,
    PaperComponent,
  ],
  templateUrl: './guide-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuideDetailComponent {
  readonly slug = input<string>();

  protected readonly guide = computed<Guide | undefined>(() =>
    GUIDES.find((guide) => guide.slug === this.slug()),
  );
}
