import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses, MM_PRIVACY_BLURRED_CLASS } from '@/shared/utils';

/**
 * Wraps a figure the user may not want a bystander to read (TICKET-PRIV-01) and blurs it while
 * `blurred` is `true`, leaving everything around it — labels, charts, links — sharp and usable.
 * Off by default, and off means the projected content renders with no treatment at all.
 *
 * `select-none` (not `pointer-events-none`) is what stops a blurred figure being recovered by
 * selecting and copying it: it makes the text unselectable on its own, whereas `pointer-events-none`
 * would additionally swallow clicks meant for the drilldown links these figures sit inside.
 *
 * Deliberately unaware of `AppSettingsStore` — a caller passes the boolean, so the same primitive
 * serves a per-component override later without growing a second code path.
 */
@Component({
  selector: 'mm-privacy-blur',
  imports: [],
  templateUrl: './privacy-blur.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyBlurComponent {
  readonly blurred = input(false);
  readonly class = input('', { alias: 'class' });

  /**
   * `inline-block` rather than a plain block: these wrap figures sitting inside flex rows and
   * alongside sibling text, and a blur filter needs a box of its own to paint into.
   */
  protected readonly classes = computed(() =>
    daisyClasses(
      'inline-block',
      [this.blurred() && `${MM_PRIVACY_BLURRED_CLASS} select-none`],
      this.class(),
    ),
  );
}
