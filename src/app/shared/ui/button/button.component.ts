import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { daisyClasses } from '@/shared/utils';

export type ButtonColor =
  'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
export type ButtonVariant = 'solid' | 'outline' | 'dash' | 'soft' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonShape = 'default' | 'square' | 'circle' | 'wide' | 'block';

@Component({
  selector: 'mm-button',
  imports: [RouterLink],
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly color = input<ButtonColor>();
  readonly variant = input<ButtonVariant>('solid');
  readonly size = input<ButtonSize>('md');
  readonly shape = input<ButtonShape>('default');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly link = input<string>();
  readonly ariaLabel = input<string>();
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    daisyClasses(
      'btn',
      [
        this.color() && `btn-${this.color()}`,
        this.variant() !== 'solid' && `btn-${this.variant()}`,
        this.size() !== 'md' && `btn-${this.size()}`,
        this.shape() !== 'default' && `btn-${this.shape()}`,
      ],
      this.class(),
    ),
  );
}
