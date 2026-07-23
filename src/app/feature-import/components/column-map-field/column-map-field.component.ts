import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl } from '@angular/forms';
import type { ColumnFieldDef } from '../import-map-step/import-map-step.component';
import { ColumnMapActiveFieldComponent } from '../column-map-active-field/column-map-active-field.component';
import { ColumnMapCollapsedFieldComponent } from '../column-map-collapsed-field/column-map-collapsed-field.component';

/**
 * One row of the import mapper's guided column-mapping flow (TICKET-IMP-07) — routes between the
 * active (expanded, editable) and collapsed (clickable summary) state, each its own component so
 * neither template carries the other's branching (fallow flagged the combined template as
 * critically complex). Owns no state of its own.
 */
@Component({
  selector: 'app-column-map-field',
  imports: [ColumnMapActiveFieldComponent, ColumnMapCollapsedFieldComponent],
  templateUrl: './column-map-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapFieldComponent {
  readonly field = input.required<ColumnFieldDef>();
  readonly control = input.required<FormControl<string>>();
  readonly headers = input.required<string[]>();
  readonly active = input.required<boolean>();
  readonly isLast = input(false);
  readonly resolvedSample = input<string>();
  readonly duplicateWarning = input<string>();

  readonly opened = output<void>();
  readonly advanced = output<void>();
}
