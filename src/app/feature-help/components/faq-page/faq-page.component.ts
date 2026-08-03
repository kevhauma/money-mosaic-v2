import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChevronLeft } from '@ng-icons/tabler-icons';
import { FAQ_ENTRIES, type FaqEntry } from '../../data/faq';
import {
  ButtonComponent,
  CollapseComponent,
  PageHeaderComponent,
  TypographyComponent,
} from '@/shared/ui';

@Component({
  selector: 'app-faq-page',
  imports: [ButtonComponent, CollapseComponent, NgIcon, PageHeaderComponent, TypographyComponent],
  templateUrl: './faq-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerChevronLeft })],
})
export class FaqPageComponent {
  protected readonly entries: readonly FaqEntry[] = FAQ_ENTRIES;
}
