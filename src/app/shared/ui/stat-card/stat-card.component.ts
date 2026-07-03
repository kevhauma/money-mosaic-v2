import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type StatCardColor =
  'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'mm-stat-card',
  imports: [RouterLink],
  templateUrl: './stat-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly subLabel = input<string>();
  readonly color = input<StatCardColor>();
  readonly link = input<string>();
  readonly queryParams = input<Record<string, string>>();

  protected readonly valueClass = computed(() => (this.color() ? `text-${this.color()}` : ''));
}
