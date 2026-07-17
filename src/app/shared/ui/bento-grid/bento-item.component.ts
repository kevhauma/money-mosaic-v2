import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

export type BentoSpan = '1' | '2' | '3' | '4';

/**
 * A `mm-bento-grid` child's column/row footprint (FR-UI-3) — panel authors declare "I'm a 2x1
 * tile" via `colSpan`/`rowSpan` instead of writing `col-span-2` by hand. Pure layout only: wraps
 * its content in `mm-paper` for the actual surface styling, never duplicates it here.
 */
@Component({
  selector: 'mm-bento-item',
  template: '<div [class]="classes()"><ng-content /></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoItemComponent {
  readonly colSpan = input<BentoSpan>('1');
  readonly rowSpan = input<BentoSpan>('1');
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    daisyClasses(
      '',
      [
        this.colSpan() !== '1' && `col-span-${this.colSpan()}`,
        this.rowSpan() !== '1' && `row-span-${this.rowSpan()}`,
      ],
      this.class(),
    ),
  );
}
