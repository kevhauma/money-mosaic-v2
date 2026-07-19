import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { daisyClasses, MM_SQUISH_CLASS } from '@/shared/utils';

export type PaperElevation = 'flat' | 'raised' | 'floating';

/**
 * Theme-style elevation hooks (styles.css) — the surface treatment per tier (shadow, well, glow,
 * glass blur, ...) lives entirely in each theme's `--mm-elev-*` custom properties, so this
 * component stays theme-agnostic. Every elevation — not just `flat` — carries a visible
 * `border-${borderColor}` outline: the app shell's content area sits on `bg-base-200` (see
 * `app.html`), so a shadow alone isn't guaranteed to be enough separation against a same-tone
 * page background in every theme.
 */
const ELEVATION_CLASSES: Record<PaperElevation, string> = {
  flat: 'mm-elev-flat',
  raised: 'mm-elev-raised',
  floating: 'mm-elev-floating',
};

/**
 * Default background per elevation when the caller doesn't pass an explicit `background` override
 * — a custom `background` (a tinted callout, or `""` for none) must fully replace it rather than
 * fight it. The surface color per tier is a theme decision (a dark theme steps `raised` up to a
 * lighter tone, neumorphism keeps every tier on one clay), so each tier reads its own
 * `--mm-surface-*` custom property — every theme block in styles.css must define all three.
 */
const ELEVATION_DEFAULT_BACKGROUND: Record<PaperElevation, string> = {
  flat: 'bg-(--mm-surface-flat)',
  raised: 'bg-(--mm-surface-raised)',
  floating: 'bg-(--mm-surface-floating)',
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
  readonly background = input<string>();
  readonly borderColor = input('base-300');
  /** Hover tint for the `link` variant — defaults to the neutral hover every plain surface uses; a tinted callout card (e.g. a warning-colored notice) overrides it to match its own background. */
  readonly linkHover = input('hover:bg-base-200');
  /** Overrides the default `card-body` inner wrapper — most consumers want daisyUI's card padding, but a handful of compact surfaces (a filter bar, a list row) need their own utility classes instead. */
  readonly bodyClass = input('card-body');
  /** Opt-in accent halo on `floating` surfaces (`mm-halo` hook, `--mm-halo-shadow` per theme) — reserved for modals and the net-worth header, not every floating card, so it's opt-in rather than baked into the `floating` elevation itself. No effect on `flat`/`raised`. */
  readonly glow = input(false);
  readonly class = input('', { alias: 'class' });
  /** Opt-in inline style passthrough (e.g. a per-instance accent color bar) — empty by default, no effect on existing callers. */
  readonly style = input('', { alias: 'style' });

  protected readonly classes = computed(() => {
    const elevation = this.elevation();
    const borderClass = `border border-${this.borderColor()}`;
    const background = this.background() ?? ELEVATION_DEFAULT_BACKGROUND[elevation];

    return daisyClasses(
      'card',
      [
        background,
        borderClass,
        ELEVATION_CLASSES[elevation],
        elevation === 'floating' && this.glow() && 'mm-halo',
        this.fullHeight() && 'h-full',
        this.link() && `${MM_SQUISH_CLASS} ${this.linkHover()}`,
      ],
      this.class(),
    );
  });
}
