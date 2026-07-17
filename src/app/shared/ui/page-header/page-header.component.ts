import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FlexComponent } from '../flex/flex.component';
import { TypographyComponent } from '../typography/typography.component';

@Component({
  selector: 'mm-page-header',
  imports: [FlexComponent, TypographyComponent],
  templateUrl: './page-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
