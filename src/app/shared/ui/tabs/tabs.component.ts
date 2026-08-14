import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { daisyClasses } from '@/shared/utils';

export type TabsVariant = 'box' | 'border' | 'lift';

export type TabDefinition = {
  label: string;
  value: string;
  /** Route path — when set, the tab renders as a routerLink and owns its own active state. */
  link?: string;
  /** Mirrors `routerLinkActiveOptions.exact` for `link` tabs (e.g. a parent route with children). */
  exact?: boolean;
};

/**
 * Wraps daisyUI's `tabs`/`tab` classes. Supports two selection modes: value-driven (caller owns
 * `selected`, click updates it) and route-driven (a tab with `link` renders as a `routerLink` and
 * derives its own active state from the router) — both existing call sites (Categories/Rules) use
 * the route-driven mode.
 */
@Component({
  selector: 'mm-tabs',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './tabs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  readonly tabs = input.required<TabDefinition[]>();
  readonly selected = model<string>();
  readonly variant = input<TabsVariant>();
  /**
   * Renders the value-driven tabs as inert, while still showing which option is in effect — the
   * only reason to keep the control visible rather than hiding it.
   *
   * That last part is why this uses `aria-disabled` and not the native `disabled` attribute:
   * daisyUI styles the active pill as `.tab-active:not(.tab-disabled,[disabled])`, so either of
   * those would flatten both tabs to look identical. The tablist takes the dimming and the
   * `pointer-events-none`, so the tabs keep their contrast with each other; each tab drops out of
   * the tab order but still announces its state, and `selectTab` refuses the value regardless.
   */
  readonly disabled = input(false);
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    daisyClasses(
      'tabs',
      [
        this.variant() && `tabs-${this.variant()}`,
        this.disabled() && 'opacity-60 pointer-events-none',
      ],
      this.class(),
    ),
  );

  /**
   * The disabled state's two per-tab attributes, resolved once here rather than as ternaries in the
   * template — the same value for every tab, so the template shouldn't re-derive it per iteration.
   */
  protected readonly ariaDisabled = computed(() => this.disabled() || null);
  protected readonly tabIndex = computed(() => (this.disabled() ? -1 : null));

  protected selectTab(value: string): void {
    if (this.disabled()) return;
    this.selected.set(value);
  }
}
