import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerInfoCircle } from '@ng-icons/tabler-icons';
import { CollapseComponent, InputComponent, TableComponent } from '@/shared/ui';
import { bucketKeysInRange } from '@/shared/utils';
import { INCOME_GRANULARITY } from '../../income-granularity';
import { IncomeStore } from '../../income.store';
import { resolveSalaryMetadataWrite } from '../../salary-metadata-edit';
import { buildSalaryMetadataSections } from '../../salary-metadata-rows';

/** What the info icon on the "Bonus" header explains — the one column whose meaning isn't self-evident. */
export const BONUS_COLUMN_HINT =
  "The part of this month's deposit that was a 13th month, vacation, or holiday bonus rather than regular pay. Subtracted from your net income before it's compared to gross wage.";

/** One month's row with its two cells' controls attached, so the template reads fields rather than calling a lookup per cell. */
type EditableRow = {
  yearMonth: string;
  label: string;
  grossWageControl: FormControl<number | null>;
  bonusControl: FormControl<number | null>;
};

type EditableYearSection = { year: string; open: boolean; rows: EditableRow[] };

/**
 * The salary-metadata editor (FR-INC-10, TICKET-INC-10): gross wage and embedded bonus, one row per
 * month, grouped into a collapsible section per year.
 *
 * **Always editable, no save button.** Every month in the income page's range already has a row;
 * editing a cell and blurring persists it. Blurring an untouched cell writes nothing, so tabbing
 * across a decade of empty months never creates a single row (see `resolveSalaryMetadataWrite`).
 *
 * **Built once per mount, from a snapshot.** The host renders it only while its modal is open, so
 * the form controls are created in the constructor from the store's current values and never need a
 * sync effect fighting the user mid-edit. Re-opening the modal builds a fresh table from fresh
 * values.
 */
@Component({
  selector: 'app-salary-metadata-table',
  imports: [CollapseComponent, InputComponent, NgIcon, ReactiveFormsModule, TableComponent],
  templateUrl: './salary-metadata-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerInfoCircle })],
})
export class SalaryMetadataTableComponent implements OnInit, AfterViewInit {
  /** `YYYY-MM` to expand, scroll to and focus — set when the user reached this table by clicking that month on the trend chart. */
  readonly focusMonth = input<string>();

  private readonly incomeStore = inject(IncomeStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly bonusHint = BONUS_COLUMN_HINT;

  protected readonly sections = signal<EditableYearSection[]>([]);

  /**
   * Built here rather than in the constructor: a signal `input()` isn't set until after
   * construction, so `focusMonth()` would always read `undefined` there and every chart click
   * would open on the current year instead of the clicked one.
   */
  ngOnInit(): void {
    const range = this.incomeStore.incomeRange();
    // The year the user asked for, if they arrived by clicking a chart point; otherwise this one.
    const openYear = this.focusMonth()?.slice(0, 4) ?? String(new Date().getFullYear());

    this.sections.set(
      buildSalaryMetadataSections(
        bucketKeysInRange(range.from, range.to, INCOME_GRANULARITY),
        this.incomeStore.salaryMetadataByMonth(),
      ).map((section) => ({
        year: section.year,
        open: section.year === openYear,
        rows: section.rows.map((row) => ({
          yearMonth: row.yearMonth,
          label: row.label,
          grossWageControl: new FormControl<number | null>(row.grossWage),
          bonusControl: new FormControl<number | null>(row.bonus),
        })),
      })),
    );
  }

  /**
   * The rows exist from the first render (daisyUI's collapse hides a closed section with CSS, not
   * by removing it), so the view-init hook is the earliest point the requested cell can be found —
   * and unlike `afterNextRender` it fires under `TestBed` too.
   */
  ngAfterViewInit(): void {
    this.focusRequestedMonth();
  }

  protected setSectionOpen(year: string, open: boolean): void {
    this.sections.update((sections) =>
      sections.map((section) => (section.year === year ? { ...section, open } : section)),
    );
  }

  /**
   * Persists one month if — and only if — its cells now say something different from what's stored.
   * Reads both cells rather than just the blurred one: the two are a single row, and writing one
   * without the other would drop the neighbour on every edit.
   */
  protected persist(row: EditableRow): void {
    const write = resolveSalaryMetadataWrite(
      row.yearMonth,
      { grossWage: row.grossWageControl.value, bonus: row.bonusControl.value },
      this.incomeStore.salaryMetadataByMonth().get(row.yearMonth),
    );

    if (write.kind === 'upsert') void this.incomeStore.setSalaryMetadata(write.entry);
    else if (write.kind === 'remove') void this.incomeStore.removeSalaryMetadata(write.id);
  }

  /** Scrolls the chart-clicked month into view and puts the cursor in its gross-wage cell. */
  private focusRequestedMonth(): void {
    const month = this.focusMonth();
    if (month === undefined) return;

    const cell = this.host.nativeElement.querySelector<HTMLInputElement>(
      `[data-month="${month}"] input`,
    );
    // Optional-called like `mm-modal`'s `showModal?.()`: jsdom implements neither, and neither is
    // load-bearing for anything but the visual result.
    cell?.scrollIntoView?.({ block: 'center' });
    cell?.focus();
  }
}
