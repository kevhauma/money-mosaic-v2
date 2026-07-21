import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GUIDES, type Guide } from '../../data/guides';
import { PageHeaderComponent, PaperComponent, TypographyComponent } from '@/shared/ui';

@Component({
  selector: 'app-guides-index',
  imports: [PageHeaderComponent, PaperComponent, TypographyComponent],
  templateUrl: './guides-index.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidesIndexComponent {
  protected readonly guides: readonly Guide[] = GUIDES;
}
