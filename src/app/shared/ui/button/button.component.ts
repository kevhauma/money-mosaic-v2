import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { daisyClasses, MM_SQUISH_CLASS } from '@/shared/utils';

export type ButtonColor =
  'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
export type ButtonVariant = 'solid' | 'outline' | 'dash' | 'soft' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonShape = 'default' | 'square' | 'circle' | 'wide' | 'block';

@Component({
  selector: 'mm-button',
  imports: [RouterLink, NgTemplateOutlet],
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
  /**
   * For a button that discloses something (a row's detail, a collapsible section) — native
   * attributes do not forward through a wrapping component, so a disclosure button has no way to
   * announce its state without its own input. Left `undefined` on every ordinary button, which is
   * correct: `aria-expanded` on a control that expands nothing is a lie to a screen reader.
   *
   * Applied to the `<button>` branch only, deliberately — the `link()` branch renders an `<a>`,
   * which navigates rather than discloses, and has nothing to be expanded.
   */
  readonly ariaExpanded = input<boolean>();
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    daisyClasses(
      'btn',
      [
        this.color() && `btn-${this.color()}`,
        this.variant() !== 'solid' && `btn-${this.variant()}`,
        this.size() !== 'md' && `btn-${this.size()}`,
        this.shape() !== 'default' && `btn-${this.shape()}`,
        /** Theme-style press/hover hook (styles.css `--mm-squish-*`), every variant except `link` (no fill for a squish to read against). */
        this.variant() !== 'link' && MM_SQUISH_CLASS,
      ],
      this.class(),
    ),
  );
}
