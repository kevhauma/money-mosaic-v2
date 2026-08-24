import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CategorySelectOption } from '../../category-picker';

/** Which layout the cell is sitting in — a table cell, or a card on a phone (TICKET-TXN-12). */
export type CategorySelectDensity = 'table' | 'card';

/**
 * The `<select>`'s own classes per density, resolved here rather than assembled in the template.
 * The card variant is full-width (a card has no column to fit) and drops `select-sm`, whose 32px
 * height is below the 44px touch minimum the card layout holds itself to.
 */
const SELECT_CLASS: Record<CategorySelectDensity, string> = {
  table: 'select select-sm w-40',
  card: 'select min-h-11 w-full',
};

/**
 * The transactions page's inline category quick-set (TICKET-TXN-09, CR4-1 §5 Option B). Owns the
 * option-list markup and the `HTMLSelectElement` unwrapping, so callers bind a typed
 * `categoryChange` (`undefined` = uncategorised) instead of the `$any($event.target).value` cast
 * the page template used to carry.
 *
 * Shared by both of the page's row presentations — the table row and the phone card
 * (TICKET-TXN-12) — which is why the layout difference is a `density` input rather than a second
 * copy of the option list: the list is memoised once per page for all fifty rows, and two copies
 * would be two chances for the applicability filtering to drift.
 */
@Component({
  selector: 'app-category-select-cell',
  templateUrl: './category-select-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategorySelectCellComponent {
  readonly options = input.required<readonly CategorySelectOption[]>();
  /** The selected option's value; `''` selects "Uncategorised". */
  readonly selectedId = input('');
  readonly density = input<CategorySelectDensity>('table');

  readonly categoryChange = output<number | undefined>();

  protected readonly selectClass = computed(() => SELECT_CLASS[this.density()]);

  protected onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.categoryChange.emit(value === '' ? undefined : Number(value));
  }
}
