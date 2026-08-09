import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CategorySelectOption } from '../../category-picker';

/**
 * The transactions table's inline category quick-set cell (TICKET-TXN-09, CR4-1 §5 Option B).
 * Owns the option-list markup and the `HTMLSelectElement` unwrapping, so callers bind a typed
 * `categoryChange` (`undefined` = uncategorised) instead of the `$any($event.target).value` cast
 * the page template used to carry.
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

  readonly categoryChange = output<number | undefined>();

  protected onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.categoryChange.emit(value === '' ? undefined : Number(value));
  }
}
