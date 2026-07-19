import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { daisyClasses, MM_SQUISH_CLASS } from '@/shared/utils';
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
  imports: [RouterLink, NgTemplateOutlet, TypographyComponent],
  templateUrl: './stat-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly subLabel = input<string>();
  /** Hover text (daisyUI `tooltip`) shown over `subLabel`, e.g. the figures behind a "+12% vs. last year" delta. `\n`-separated lines each render on their own line. */
  readonly tooltip = input<string>();
  readonly color = input<StatCardColor>();
  readonly link = input<string>();
  readonly queryParams = input<Record<string, string>>();
  readonly tilt = input<StatCardTilt>('none');
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
