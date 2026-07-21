import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FAQ_ENTRIES, type FaqEntry } from '../../data/faq';
import { CollapseComponent, PageHeaderComponent, TypographyComponent } from '@/shared/ui';

@Component({
  selector: 'app-faq-page',
  imports: [CollapseComponent, PageHeaderComponent, TypographyComponent],
  templateUrl: './faq-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqPageComponent {
  protected readonly entries: readonly FaqEntry[] = FAQ_ENTRIES;
}
