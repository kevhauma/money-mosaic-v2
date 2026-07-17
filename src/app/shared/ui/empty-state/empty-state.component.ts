import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FlexComponent } from '../flex/flex.component';
import { TypographyComponent } from '../typography/typography.component';

@Component({
  selector: 'mm-empty-state',
  imports: [FlexComponent, TypographyComponent],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
