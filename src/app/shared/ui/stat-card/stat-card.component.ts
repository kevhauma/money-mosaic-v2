import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TypographyComponent } from '../typography/typography.component';

export type StatCardColor =
  'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'mm-stat-card',
  imports: [RouterLink, NgTemplateOutlet, TypographyComponent],
  templateUrl: './stat-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly subLabel = input<string>();
  /** Hover text (daisyUI `tooltip`) shown over `subLabel`, e.g. the figures behind a "+12% vs. last year" delta. `\n`-separated lines each render on their own line. */
  readonly tooltip = input<string>();
  readonly color = input<StatCardColor>();
  readonly link = input<string>();
  readonly queryParams = input<Record<string, string>>();

  protected readonly tooltipLines = computed(() => this.tooltip()?.split('\n') ?? []);
}
