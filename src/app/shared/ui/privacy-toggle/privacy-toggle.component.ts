import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerEye, tablerEyeOff } from '@ng-icons/tabler-icons';
import { AppSettingsStore } from '@/core/state';
import { ButtonComponent } from '../button/button.component';

/**
 * The "Hide amounts" control every insight page carries (TICKET-PRIV-02) — Dashboard, Income,
 * Recurring and Explore. TICKET-PRIV-01 hand-rolled it on the Dashboard alone; a second page would
 * have copied the label, the two icons and the click handler, and the wording would have drifted the
 * first time one of the four was reworded. Drop-in by design: a page adds
 * `<mm-privacy-toggle actions-end />` and nothing else — no icon registration, no store injection,
 * no handler on the page class.
 *
 * **The one `shared/ui` primitive that knows a store.** Every other primitive here takes its state as
 * an `input()`, and `mm-privacy-blur` deliberately still does — a caller passes the boolean, so the
 * same blur serves a per-component override later. This one is the opposite case: there is exactly
 * one global privacy setting, and a `[value]`/`(valueChange)` pair would mean four pages wiring the
 * identical two lines to the identical store, which is the duplication the component exists to
 * remove. It reads `AppSettingsStore` through `@/core/state` like any feature component would.
 *
 * Worded as the action it performs rather than the state it is in, and rendered as visible text
 * beside its neighbours — a bare eye icon is exactly what TICKET-STAT-25 removed from the Dashboard
 * header, and the visible label *is* the accessible name.
 */
@Component({
  selector: 'mm-privacy-toggle',
  imports: [ButtonComponent, NgIcon],
  templateUrl: './privacy-toggle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerEye, tablerEyeOff })],
})
export class PrivacyToggleComponent {
  private readonly appSettingsStore = inject(AppSettingsStore);

  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;

  protected readonly toggle = computed(() =>
    this.privacyMode()
      ? { label: 'Show amounts', icon: 'tablerEyeOff' }
      : { label: 'Hide amounts', icon: 'tablerEye' },
  );

  protected togglePrivacyMode(): void {
    void this.appSettingsStore.setPrivacyMode(!this.privacyMode());
  }
}
