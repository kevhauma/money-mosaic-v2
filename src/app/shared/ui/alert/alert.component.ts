import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

export type AlertStatus = 'info' | 'success' | 'warning' | 'error';
export type AlertVariant = 'solid' | 'outline' | 'dash' | 'soft';

@Component({
  selector: 'mm-alert',
  imports: [],
  templateUrl: './alert.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  readonly status = input<AlertStatus>();
  readonly variant = input<AlertVariant>('solid');
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    daisyClasses(
      'alert',
      [
        this.status() && `alert-${this.status()}`,
        this.variant() !== 'solid' && `alert-${this.variant()}`,
      ],
      this.class(),
    ),
  );
}
