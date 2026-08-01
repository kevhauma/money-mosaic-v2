import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { SalaryMetadata } from '@/core/data-access';
import { ButtonComponent, InputComponent, LabelComponent, TypographyComponent } from '@/shared/ui';
import { IncomeStore } from '../../income.store';
import { monthLabel } from '../../salary-metadata-rows';
import { resolveSalaryMetadataWrite } from '../../salary-metadata-edit';
import { BONUS_COLUMN_HINT } from '../salary-metadata-table/salary-metadata-table.component';

/**
 * One month's gross wage and bonus, opened by clicking that month on the trend chart
 * (TICKET-INC-18). Clicking a spike is a one-month question — "what was June?" — and answering it
 * by navigating to a multi-year table and scrolling to find the row is the wrong shape, which is
 * what the old focus-month wiring was working around. The full table stays `/income/salary`'s job,
 * and this carries a link there for the user who came to edit one month and stayed to fill in
 * several.
 *
 * Writes through the same pure `resolveSalaryMetadataWrite` and the same `IncomeStore` methods the
 * table uses — same save-on-blur semantics, same "both cells cleared deletes the row" rule, no
 * second write path to drift.
 *
 * Built from a snapshot, like the table: the host renders it only while its modal is open, so the
 * controls are created from the store's current values (via `yearMonth`'s `computed`) and never need
 * a sync effect fighting the user mid-edit.
 */
@Component({
  selector: 'app-salary-month-modal',
  imports: [
    ButtonComponent,
    InputComponent,
    LabelComponent,
    ReactiveFormsModule,
    TypographyComponent,
  ],
  templateUrl: './salary-month-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryMonthModalComponent implements OnInit {
  /** The `YYYY-MM` the user clicked. */
  readonly yearMonth = input.required<string>();

  private readonly incomeStore = inject(IncomeStore);

  protected readonly bonusHint = BONUS_COLUMN_HINT;

  protected readonly label = computed(() => monthLabel(this.yearMonth()));

  private readonly stored = computed(() =>
    this.incomeStore.salaryMetadataByMonth().get(this.yearMonth()),
  );

  protected readonly grossWageControl = new FormControl<number | null>(null);
  protected readonly bonusControl = new FormControl<number | null>(null);

  /**
   * Seeded here rather than in the constructor: a signal `input()` isn't set until after
   * construction, so `yearMonth()` would still be undefined there and every click would open on an
   * empty pair of fields — the same pitfall `SalaryMetadataTableComponent`'s own `ngOnInit` notes.
   * Set once rather than through an effect: the host mounts this per opening, so "the values as
   * they were when the modal opened" is exactly the right snapshot.
   */
  ngOnInit(): void {
    const entry: Partial<SalaryMetadata> = this.stored() ?? {};
    this.grossWageControl.setValue(entry.grossWage ?? null);
    this.bonusControl.setValue(entry.bonus ?? null);
  }

  /**
   * Persists this month if — and only if — its fields now say something different from what's
   * stored. Reads both rather than just the blurred one: the two are a single row, and writing one
   * without the other would drop its neighbour on every edit.
   */
  protected persist(): void {
    const write = resolveSalaryMetadataWrite(
      this.yearMonth(),
      { grossWage: this.grossWageControl.value, bonus: this.bonusControl.value },
      this.stored(),
    );

    if (write.kind === 'upsert') void this.incomeStore.setSalaryMetadata(write.entry);
    else if (write.kind === 'remove') void this.incomeStore.removeSalaryMetadata(write.id);
  }
}
