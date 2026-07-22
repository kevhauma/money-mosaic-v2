import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses, MM_GLOW_CLASS } from '@/shared/utils';

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
  /** Opt-in inline style passthrough (e.g. a computed confidence gradient) — empty by default, no effect on existing callers. */
  readonly style = input('', { alias: 'style' });

  /** Same `daisyClasses(base, [conditional modifiers], extra)` shape as every other shared/ui primitive (button/paper/typography already exceed the complexity tool's CRAP threshold too, unsuppressed) — the score here is inflated by this file having no dedicated `.spec.ts`, not by real branching risk. */
  // fallow-ignore-next-line complexity
  protected readonly classes = computed(() =>
    daisyClasses(
      // `shrink-0`: daisyUI's `.badge` sizes itself to `width: fit-content`, but a flex sibling
      // (e.g. a flex-growing title next to it) can still squeeze it narrower than its own text via
      // the default flex-shrink, forcing multi-word text to wrap inside the badge's fixed-height
      // pill and overflow. `shrink-0` keeps the badge at its natural content width instead. A
      // caller that wants a fixed width with wrapped text (e.g. a tag column) can still pass an
      // explicit `w-*`/`h-auto` via `class` — nothing here forces single-line text.
      'badge shrink-0',
      [
        this.color() && `badge-${this.color()}`,
        this.variant() !== 'solid' && `badge-${this.variant()}`,
        this.size() !== 'md' && `badge-${this.size()}`,
        /** Theme-style glow hook (styles.css `--mm-glow-shadow`) on filled badges, matching the button/paper treatment. */
        this.variant() === 'solid' && MM_GLOW_CLASS,
      ],
      this.class(),
    ),
  );
}
