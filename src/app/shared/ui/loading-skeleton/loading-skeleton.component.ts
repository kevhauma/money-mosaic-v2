import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Placeholder block for a view whose data hasn't hydrated yet (TICKET-PERF-05) — distinct from
 * `mm-empty-state`, which is for a genuinely empty dataset once hydration has finished.
 */
@Component({
  selector: 'mm-loading-skeleton',
  imports: [],
  templateUrl: './loading-skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSkeletonComponent {
  readonly rows = input(3);
  readonly class = input('', { alias: 'class' });

  protected readonly rowIndexes = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
}
