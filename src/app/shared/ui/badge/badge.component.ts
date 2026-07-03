import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

export type BadgeColor =
  'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
export type BadgeVariant = 'solid' | 'outline' | 'dash' | 'soft' | 'ghost';
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'mm-badge',
  imports: [],
  templateUrl: './badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly color = input<BadgeColor>();
  readonly variant = input<BadgeVariant>('solid');
  readonly size = input<BadgeSize>('md');
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    daisyClasses(
      'badge',
      [
        this.color() && `badge-${this.color()}`,
        this.variant() !== 'solid' && `badge-${this.variant()}`,
        this.size() !== 'md' && `badge-${this.size()}`,
      ],
      this.class(),
    ),
  );
}
