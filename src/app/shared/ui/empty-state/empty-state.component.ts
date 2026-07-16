import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TypographyComponent } from '../typography/typography.component';

@Component({
  selector: 'mm-empty-state',
  imports: [TypographyComponent],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
