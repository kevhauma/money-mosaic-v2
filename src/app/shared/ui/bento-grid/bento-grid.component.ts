import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

export type BentoColumns = '2' | '3' | '4';

/** Each column count's responsive breakpoint scale — always 1 column on mobile, stepping up to the requested count by `lg`. */
const COLUMN_CLASSES: Record<BentoColumns, string> = {
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

/**
 * Bento Box Grid layout primitive (FR-UI-3) — a named, reusable CSS grid container with a fixed
 * column/gap scale. Pure layout only: no color/border/padding opinions belong here, that's
 * `mm-paper`'s job — a `mm-bento-item` wraps its content in `mm-paper`, not the other way round.
 */
@Component({
  selector: 'mm-bento-grid',
  template: '<div [class]="classes()"><ng-content /></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// fallow-ignore-next-line unrendered-component -- shared/ui primitive built ahead of its dashboard consumer (TICKET-UI-12); adopted once Phase A + UI-11's tokens land
export class BentoGridComponent {
  readonly columns = input<BentoColumns>('3');
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    daisyClasses(`grid gap-6 ${COLUMN_CLASSES[this.columns()]}`, [], this.class()),
  );
}
