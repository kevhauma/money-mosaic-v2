import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

export type DividerOrientation = 'horizontal' | 'vertical';

/** Wraps daisyUI's `divider` class. Optional projected content renders as the divider's label. */
@Component({
  selector: 'mm-divider',
  imports: [],
  templateUrl: './divider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerComponent {
  readonly orientation = input<DividerOrientation>('horizontal');
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    daisyClasses(
      'divider',
      [this.orientation() === 'vertical' && 'divider-horizontal'],
      this.class(),
    ),
  );
}
