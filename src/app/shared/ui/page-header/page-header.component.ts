import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TypographyComponent } from '../typography/typography.component';

@Component({
  selector: 'mm-page-header',
  imports: [TypographyComponent],
  templateUrl: './page-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
