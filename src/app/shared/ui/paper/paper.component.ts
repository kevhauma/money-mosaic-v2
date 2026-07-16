import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { daisyClasses } from '@/shared/utils';

export type PaperElevation = 'flat' | 'raised' | 'floating';

/** Pre-UI-11 stand-ins for real depth tokens — plain Tailwind/daisyUI utilities already in use across the app today, not new design-system values. `flat`'s border color is a separate axis (`borderColor`), since some flat surfaces need a tinted border (e.g. a danger-zone panel). */
const ELEVATION_SHADOW_CLASSES: Record<'raised' | 'floating', string> = {
  raised: 'shadow-sm',
  floating: 'shadow-md',
};

@Component({
  selector: 'mm-paper',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './paper.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaperComponent {
  readonly elevation = input<PaperElevation>('raised');
  readonly fullHeight = input(false);
  readonly link = input<string>();
  readonly queryParams = input<Record<string, string>>();
  /**
   * Escape hatches for the two style pieces a caller can't safely override via `class`: Tailwind
   * generates utility classes in build order, not usage order, so a passthrough `class="bg-warning/10"`
   * isn't guaranteed to win a cascade fight against this component's own `bg-base-100`/`border-base-300`.
   * Narrow, explicit inputs sidestep that instead of gambling on class order.
   */
  readonly background = input('bg-base-100');
  readonly borderColor = input('base-300');
  /** Hover tint for the `link` variant — defaults to the neutral hover every plain surface uses; a tinted callout card (e.g. a warning-colored notice) overrides it to match its own background. */
  readonly linkHover = input('hover:bg-base-200');
  /** Overrides the default `card-body` inner wrapper — most consumers want daisyUI's card padding, but a handful of compact surfaces (a filter bar, a list row) need their own utility classes instead. */
  readonly bodyClass = input('card-body');
  readonly class = input('', { alias: 'class' });
  /** Opt-in inline style passthrough (e.g. a per-instance accent color bar) — empty by default, no effect on existing callers. */
  readonly style = input('', { alias: 'style' });

  protected readonly classes = computed(() => {
    const elevation = this.elevation();
    const elevationClass =
      elevation === 'flat'
        ? `border border-${this.borderColor()}`
        : ELEVATION_SHADOW_CLASSES[elevation];

    return daisyClasses(
      'card',
      [
        this.background(),
        elevationClass,
        this.fullHeight() && 'h-full',
        this.link() && `transition ${this.linkHover()}`,
      ],
      this.class(),
    );
  });
}
