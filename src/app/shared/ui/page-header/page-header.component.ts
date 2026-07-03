import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'mm-page-header',
  imports: [],
  templateUrl: './page-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
