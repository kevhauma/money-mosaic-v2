import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerInfoCircle } from '@ng-icons/tabler-icons';
import { daisyClasses, MM_SQUISH_CLASS } from '@/shared/utils';
import { PrivacyBlurComponent } from '../privacy-blur/privacy-blur.component';
import { TypographyComponent } from '../typography/typography.component';

export type StatCardColor =
  'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

/**
 * A stat card is no longer a daisyUI `.stats`-joined segment; each one is its own free-standing
 * block (originally a Memphis-redesign idea, kept for every theme). `'a'`/`'b'` alternate the
 * `mm-tilt-l`/`mm-tilt-r` theme-style hooks — inert unless the active theme sets `--mm-tilt-*`
 * (Memphis rotates them off-axis so a row reads as a scattered stack); `'none'` opts out entirely.
 */
export type StatCardTilt = 'none' | 'a' | 'b';

const TILT_CLASSES: Record<Exclude<StatCardTilt, 'none'>, string> = {
  a: 'mm-tilt-l',
  b: 'mm-tilt-r',
};

/** Same surface recipe as `mm-paper`'s `raised` elevation (`--mm-surface-raised` background + `mm-elev-raised` theme hook) — a stat card is a small paper. */
const STAT_SURFACE_CLASSES =
  'stat rounded-box border border-base-300 bg-(--mm-surface-raised) mm-elev-raised';

@Component({
  selector: 'mm-stat-card',
  imports: [RouterLink, NgTemplateOutlet, NgIcon, PrivacyBlurComponent, TypographyComponent],
  templateUrl: './stat-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerInfoCircle })],
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly subLabel = input<string>();
  /** Hover text (daisyUI `tooltip`) shown over `subLabel`, e.g. the figures behind a "+12% vs. last year" delta. `\n`-separated lines each render on their own line. */
  readonly tooltip = input<string>();
  /**
   * One sentence saying what this card's figure actually counts (TICKET-STAT-42), reachable from an
   * info affordance beside the label. Distinct from `tooltip` in both what it holds and how it
   * behaves: `tooltip` carries the *figures* behind the sub-label and is blurred under privacy mode,
   * while a definition is prose about the measure and stays legible — hiding "what this counts"
   * along with "how much" would make the card less private, not more. The affordance is a real
   * `<button>` so it is reachable by keyboard (daisyUI's `.tooltip` opens on `:has(:focus-visible)`
   * as well as `:hover`), and it carries the sentence as its accessible name so a screen reader
   * gets the definition rather than "more info".
   */
  readonly definition = input<string>();
  readonly color = input<StatCardColor>();
  readonly link = input<string>();
  readonly queryParams = input<Record<string, string>>();
  readonly tilt = input<StatCardTilt>('none');
  /**
   * Blurs `value`, `subLabel` and the `tooltip` (TICKET-PRIV-01, tooltip added by TICKET-PRIV-02) —
   * all three are real figures, a YoY delta no less than the headline number, and the tooltip is
   * usually the *only* place a percentage card spells its amounts out in full ("Jan 2025 – Jan 2026:
   * €38,400"). Blurring the card while a hover hands the figure back is not privacy mode. `label`
   * stays sharp: the point is that the card still reads as "Income" while the amount doesn't. A
   * boolean rather than a store read, so the card stays a dumb primitive.
   */
  readonly blurred = input(false);
  readonly class = input('', { alias: 'class' });

  protected readonly tooltipLines = computed(() => this.tooltip()?.split('\n') ?? []);

  private readonly tiltClass = computed(() => {
    const tilt = this.tilt();
    return tilt !== 'none' && TILT_CLASSES[tilt];
  });

  protected readonly classes = computed(() =>
    daisyClasses(STAT_SURFACE_CLASSES, [this.tiltClass()], this.class()),
  );

  protected readonly linkClasses = computed(() =>
    daisyClasses(
      STAT_SURFACE_CLASSES,
      [this.tiltClass(), `${MM_SQUISH_CLASS} hover:bg-base-200`],
      this.class(),
    ),
  );
}
