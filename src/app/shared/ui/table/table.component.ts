import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

export type TableDensity = 'compact' | 'normal';
export type TableScroll = 'x' | 'auto';

/**
 * The `overflow-x-auto` wrapper + `<table class="table">` shell every list/detail feature was
 * re-authoring identically (93 occurrences / 8 files per TICKET-UI-01's audit) — `<thead>`/`<tr>`/
 * `<th>`/`<td>` stay hand-authored by the caller via content projection. daisyUI's zebra/border
 * chrome lives entirely on the `<table>` element itself (no per-row/per-cell classes needed), and
 * wrapping `<tr>`/`<td>` in their own components would put them one DOM level below `<tbody>`,
 * breaking the `:nth-child` selectors daisyUI's own zebra striping relies on — so this stays a
 * single shell primitive rather than a full `mm-table-row`/`mm-table-cell` family. `scroll="auto"`
 * switches from horizontal-only scroll to `overflow-auto` for tables that also clamp a max-height
 * (pair with a `max-h-*` utility via `class`).
 */
@Component({
  selector: 'mm-table',
  imports: [],
  templateUrl: './table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent {
  readonly density = input<TableDensity>('normal');
  readonly scroll = input<TableScroll>('x');
  readonly class = input('', { alias: 'class' });

  protected readonly wrapperClasses = computed(() =>
    daisyClasses(
      'rounded-box border border-base-300',
      [this.scroll() === 'auto' ? 'overflow-auto' : 'overflow-x-auto'],
      this.class(),
    ),
  );

  protected readonly tableClasses = computed(() =>
    daisyClasses('table', [this.density() === 'compact' && 'table-xs'], ''),
  );
}
