import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TypographyComponent } from '@/shared/ui';
import type { ColumnFieldDef } from '../import-map-step/import-map-step.component';

/**
 * The collapsed, clickable summary state of one guided-mapper row (TICKET-IMP-07) — split out of
 * `ColumnMapFieldComponent` purely to keep each state's own template small/flat (fallow flagged
 * the combined active+collapsed template as critically complex).
 */
@Component({
  selector: 'app-column-map-collapsed-field',
  imports: [TypographyComponent],
  templateUrl: './column-map-collapsed-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapCollapsedFieldComponent {
  readonly field = input.required<ColumnFieldDef>();
  readonly control = input.required<FormControl<string>>();
  readonly resolvedSample = input<string>();
  readonly duplicateWarning = input<string>();

  readonly opened = output<void>();

  /** Collapses the three mutually-exclusive display states into one dispatch point for `@switch`. */
  protected state(): 'required' | 'mapped' | 'unset' {
    if (this.control().invalid && this.control().touched) return 'required';
    if (this.control().value) return 'mapped';
    return 'unset';
  }
}
