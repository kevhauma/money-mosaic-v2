import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ParsedRowResult } from '@/core/import';
import { BadgeComponent, ButtonComponent, TableComponent, TypographyComponent } from '@/shared/ui';
import { negativeMoneyColor, SignedAmountPipe } from '@/shared/utils';
import { duplicatesToggleLabel } from '../../duplicate-scan';

/** How many rows the table renders at once — a 3,000-row file is previewed, not listed. */
const PREVIEW_LIMIT = 50;

@Component({
  selector: 'app-import-preview-step',
  imports: [BadgeComponent, ButtonComponent, SignedAmountPipe, TableComponent, TypographyComponent],
  templateUrl: './import-preview-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportPreviewStepComponent {
  readonly rows = input.required<ParsedRowResult[]>();
  /**
   * The rows this account already has (TICKET-IMP-14), by object identity — the session scans the
   * very array passed in above, so no key or index has to line the two up.
   */
  readonly duplicates = input<ReadonlySet<ParsedRowResult>>(new Set());

  /**
   * "Show only the rows already imported" — local, because it is a way of looking at this table and
   * nothing outside it cares. It exists because the table is capped at 50 rows: on a file that
   * overlaps heavily, the duplicates are the rows the user came to check, and without this they
   * could be anywhere in a 3,000-row file.
   */
  protected readonly duplicatesOnly = signal(false);

  protected readonly duplicateCount = computed(() => this.duplicates().size);

  /** Resolved here, not assembled at the binding — templates branch on state, they don't build it. */
  protected readonly toggleLabel = computed(() =>
    duplicatesToggleLabel(this.duplicateCount(), this.duplicatesOnly()),
  );

  protected toggleDuplicatesOnly(): void {
    this.duplicatesOnly.update((only) => !only);
  }

  /**
   * What the table is listing, before the 50-row cap — all rows, or only the already-present ones.
   *
   * Falls back to all rows when there are no duplicates left to filter to, which is not a corner
   * case: step 2 re-parses on every mapping edit, and the set is empty for the whole of each rescan.
   * Without the fallback the table would empty out *and* take the toggle that turns the filter off
   * with it, since that button only renders while duplicates exist.
   */
  private readonly listedRows = computed(() => {
    const duplicates = this.duplicates();
    return this.duplicatesOnly() && duplicates.size > 0
      ? this.rows().filter((row) => duplicates.has(row))
      : this.rows();
  });

  protected readonly listedCount = computed(() => this.listedRows().length);

  /** The visible slice with its display facts joined on — the amount's colour is decided here rather
   * than by a ternary at the binding (TICKET-UI-27). A valid row has a transaction; an invalid one
   * renders its errors instead, so it has no amount to colour. */
  protected readonly previewRows = computed(() => {
    const duplicates = this.duplicates();
    return this.listedRows()
      .slice(0, PREVIEW_LIMIT)
      .map((row) => ({
        row,
        amountColor: row.valid ? negativeMoneyColor(row.transaction.amount) : undefined,
        alreadyImported: duplicates.has(row),
      }));
  });
}
