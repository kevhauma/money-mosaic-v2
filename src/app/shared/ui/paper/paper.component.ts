import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { daisyClasses } from '@/shared/utils';

export type PaperElevation = 'flat' | 'raised' | 'floating';

/**
 * design-language.md §3 — "Dimensional Layering". Light mode reads depth via `box-shadow`; dark
 * mode steps the surface instead (a plain box-shadow barely reads against a dark background
 * regardless of exactly how dark). Every elevation — not just `flat` — carries a visible
 * `border-${borderColor}` outline: the app shell's content area sits on `bg-base-200` (see
 * `app.html`), so a shadow alone isn't enough separation against a same-tone page background,
 * especially with `dark:shadow-none`.
 */
const ELEVATION_SHADOW_CLASSES: Record<'raised' | 'floating', string> = {
  raised: 'shadow-[0_1px_2px_rgba(11,11,17,.06),0_1px_3px_rgba(11,11,17,.08)] dark:shadow-none',
  floating: 'shadow-[0_4px_12px_rgba(11,11,17,.10),0_2px_4px_rgba(11,11,17,.06)] dark:shadow-none',
};

/**
 * Default background per elevation when the caller doesn't pass an explicit `background` override
 * — this is where the dark-mode surface step actually lives, since a custom `background` (a tinted
 * callout, or `""` for none) must fully replace it rather than fight it in dark mode. The page
 * shell's content area is `bg-base-200`, so `raised`/`floating` step *up* to `base-300` (lighter,
 * i.e. more "raised") rather than `base-200`, which would be indistinguishable from the page itself.
 */
const ELEVATION_DEFAULT_BACKGROUND: Record<PaperElevation, string> = {
  flat: 'bg-base-100',
  raised: 'bg-base-100 dark:bg-base-300',
  floating: 'bg-base-100 dark:bg-base-300',
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
  /** design-language.md §3's restrained aurora-violet ring on `floating` surfaces — reserved for modals and the dashboard's hero panel, not every floating card, so it's opt-in rather than baked into the `floating` elevation itself. No effect on `flat`/`raised`. */
  readonly glow = input(false);
  readonly class = input('', { alias: 'class' });
  /** Opt-in inline style passthrough (e.g. a per-instance accent color bar) — empty by default, no effect on existing callers. */
  readonly style = input('', { alias: 'style' });

  protected readonly classes = computed(() => {
    const elevation = this.elevation();
    const borderClass = `border border-${this.borderColor()}`;
    const elevationClass =
      elevation === 'flat' ? borderClass : `${borderClass} ${ELEVATION_SHADOW_CLASSES[elevation]}`;
    const background = this.background() ?? ELEVATION_DEFAULT_BACKGROUND[elevation];

    return daisyClasses(
      'card',
      [
        background,
        elevationClass,
        this.fullHeight() && 'h-full',
        this.link() && `transition ${this.linkHover()}`,
        elevation === 'floating' &&
          this.glow() &&
          'dark:ring-1 dark:ring-[oklch(60%_0.17_285_/_15%)]',
      ],
      this.class(),
    );
  });
}
