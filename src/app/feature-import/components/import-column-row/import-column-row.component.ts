import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BadgeComponent, SelectComponent, TypographyComponent } from '@/shared/ui';
import type { ColumnRowVm } from '../../column-statements';

const ROW_CLASS = 'flex flex-col gap-1 border-t border-base-200 px-2 py-2';

/**
 * One field of the Columns section (TICKET-IMP-17): its name, a select of the file's headers bound
 * to the host's form control, what the first line reads as (or, with no column yet, what the field
 * is for), the marker, and a clash note when another field reads the same column.
 */
@Component({
  selector: 'app-import-column-row',
  imports: [ReactiveFormsModule, BadgeComponent, SelectComponent, TypographyComponent],
  templateUrl: './import-column-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportColumnRowComponent {
  readonly row = input.required<ColumnRowVm>();
  readonly headers = input.required<string[]>();
  readonly control = input.required<FormControl<string>>();

  protected readonly containerClass = computed(() =>
    this.row().marker === 'check' ? `${ROW_CLASS} rounded-box bg-warning/10` : ROW_CLASS,
  );
  protected readonly detail = computed(() => this.row().reading || this.row().reason || '');
  protected readonly readingColor = computed(() =>
    this.row().readingProblem ? ('warning' as const) : undefined,
  );
}
