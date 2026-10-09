import { computed, effect, inject, Injectable, type Signal } from '@angular/core';
import { UiPreferencesService } from '@/core/ui-preferences';
import { DEFAULT_STYLE, themeStyleById, type ThemeStyleId } from './theme-styles';

/**
 * Owns the app's single appearance axis: which theme `style` from `THEME_STYLES` renders it,
 * resolved straight to a daisyUI `data-theme` attribute on `<html>`.
 *
 * The choice is the signed-in account's, stored on the server with the rest of its interface state
 * (`UiPreferencesService`, TICKET-SRV-10) — it used to be this browser's, in `localStorage`. So a
 * signed-out screen renders `DEFAULT_STYLE`, and signing in applies that account's pick before the
 * shell's first paint: the app initializer awaits the read and constructs this service, whose
 * effect runs in the first change detection.
 *
 * A stored id the catalogue no longer has — a theme retired after somebody picked it — reads as
 * the default rather than as an unthemed page.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preferences = inject(UiPreferencesService);

  readonly style: Signal<ThemeStyleId> = computed(
    () => themeStyleById(this.preferences.themeStyle() ?? null)?.id ?? DEFAULT_STYLE,
  );

  constructor() {
    effect(() => {
      const dataTheme = themeStyleById(this.style())?.dataTheme ?? 'deformable';
      document.documentElement.setAttribute('data-theme', dataTheme);
    });
  }

  /**
   * Persists the pick for this account; the page re-themes once the server has it. Never rejects
   * (see `UiPreferencesService`), so a caller that does not care when it lands can `void` it.
   */
  select(style: ThemeStyleId): Promise<void> {
    if (!themeStyleById(style)) return Promise.resolve();
    return this.preferences.setThemeStyle(style);
  }
}
