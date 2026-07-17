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
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    daisyClasses('tabs', [this.variant() && `tabs-${this.variant()}`], this.class()),
  );

  protected selectTab(value: string): void {
    this.selected.set(value);
  }
}
