import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ParsedRowResult } from '@/core/import';
import { BadgeComponent, TableComponent, TypographyComponent } from '@/shared/ui';
import { negativeMoneyColor, SignedAmountPipe } from '@/shared/utils';

@Component({
  selector: 'app-import-preview-step',
  imports: [BadgeComponent, SignedAmountPipe, TableComponent, TypographyComponent],
  templateUrl: './import-preview-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportPreviewStepComponent {
  readonly rows = input.required<ParsedRowResult[]>();

  /** The visible slice with its display facts joined on — the amount's colour is decided here rather
   * than by a ternary at the binding (TICKET-UI-27). A valid row has a transaction; an invalid one
   * renders its errors instead, so it has no amount to colour. */
  protected readonly previewRows = computed(() =>
    this.rows()
      .slice(0, 50)
      .map((row) => ({
        row,
        amountColor: row.valid ? negativeMoneyColor(row.transaction.amount) : undefined,
      })),
  );
}
