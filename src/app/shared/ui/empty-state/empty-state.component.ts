import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'mm-empty-state',
  imports: [],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
