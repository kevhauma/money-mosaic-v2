import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

export type FlexDirection = 'row' | 'col';
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export type FlexGap = '0' | '1' | '2' | '3' | '4' | '6';

/**
 * Wraps the raw `flex` utility (plus `flex-col`/`items-*`/`justify-*`/`gap-*`/`flex-wrap`
 * modifiers). Purely a readability aid for editor tooling that visually hides Tailwind classes —
 * see TICKET-UI-15 — not a reuse-driven extraction; unset inputs emit no class, matching each
 * call site's original modifier set exactly rather than forcing a default.
 */
@Component({
  selector: 'mm-flex',
  imports: [],
  templateUrl: './flex.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlexComponent {
  readonly direction = input<FlexDirection>('row');
  readonly align = input<FlexAlign>();
  readonly justify = input<FlexJustify>();
  readonly gap = input<FlexGap>();
  readonly wrap = input(false);
  readonly class = input('', { alias: 'class' });

  private readonly directionClass = computed(() => this.direction() === 'col' && 'flex-col');
  private readonly alignClass = computed(() => this.align() && `items-${this.align()}`);
  private readonly justifyClass = computed(() => this.justify() && `justify-${this.justify()}`);
  private readonly gapClass = computed(() => this.gap() && `gap-${this.gap()}`);
  private readonly wrapClass = computed(() => this.wrap() && 'flex-wrap');

  protected readonly classes = computed(() =>
    daisyClasses(
      'flex',
      [
        this.directionClass(),
        this.alignClass(),
        this.justifyClass(),
        this.gapClass(),
        this.wrapClass(),
      ],
      this.class(),
    ),
  );
}
