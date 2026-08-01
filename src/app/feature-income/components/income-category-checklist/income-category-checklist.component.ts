import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  BadgeComponent,
  FieldsetComponent,
  LabelComponent,
  TypographyComponent,
} from '@/shared/ui';
import type { SelectableIncomeCategoryVm } from '../../income-category-vm';

/**
 * One labelled checklist of income categories inside the Income settings popup (TICKET-INC-04).
 * Presentational and stateless in the `mm-granularity-picker` mould: the caller owns the rows and
 * reacts to `toggled`, so the same markup serves both the "counts toward growth" list (FR-INC-3)
 * and the "annual lump sum" list (FR-INC-4) without either owning the other's chrome.
 *
 * Keeps the `mm-label as="label"` + native checkbox + colour-swatch row the dashboard's
 * category-exclusion control established, rather than inventing a second option-row pattern.
 */
@Component({
  selector: 'app-income-category-checklist',
  imports: [BadgeComponent, FieldsetComponent, LabelComponent, TypographyComponent],
  templateUrl: './income-category-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeCategoryChecklistComponent {
  readonly legend = input.required<string>();
  readonly categories = input.required<SelectableIncomeCategoryVm[]>();
  /** Shown under the legend when there are no rows to tick — why the list is empty, not just a blank gap. */
  readonly emptyMessage = input.required<string>();
  /** One-line explanation of what ticking a row does, under the legend. */
  readonly hint = input<string>();

  readonly toggled = output<number>();
}
