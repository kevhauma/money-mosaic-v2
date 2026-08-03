import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChevronLeft } from '@ng-icons/tabler-icons';
import { GUIDES, type Guide } from '../../data/guides';
import {
  ButtonComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { GuideStepsComponent } from '../guide-steps/guide-steps.component';

@Component({
  selector: 'app-guide-detail',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    GuideStepsComponent,
    NgIcon,
    PageHeaderComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './guide-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerChevronLeft })],
})
export class GuideDetailComponent {
  readonly slug = input<string>();

  protected readonly guide = computed<Guide | undefined>(() =>
    GUIDES.find((guide) => guide.slug === this.slug()),
  );
}
