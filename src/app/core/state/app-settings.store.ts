import { effect, inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { AppSettingsRepository, DEFAULT_APP_SETTINGS, type AppSettings } from '@/core/data-access';
import {
  accentColorById,
  DEFAULT_THEME_STYLE_IDS,
  ThemeService,
  type AccentColorId,
} from '@/core/theme';

export const AppSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<AppSettings>(DEFAULT_APP_SETTINGS),
  withMethods((store) => {
    const appSettingsRepository = inject(AppSettingsRepository);
    let hydration: Promise<void> | null = null;

    /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
    const hydrate = (): Promise<void> => {
      if (!hydration) {
        hydration = appSettingsRepository.get().then((settings) => {
          patchState(store, settings);
        });
      }
      return hydration;
    };

    return {
      hydrate,

      setPrimaryColor: async (primaryColor: AccentColorId | undefined): Promise<void> => {
        await appSettingsRepository.setPrimaryColor(primaryColor);
        patchState(store, { primaryColor });
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Fire-and-forget on first injection instead of app bootstrap (TICKET-PERF-07).
      void store.hydrate();

      // Applies/clears the `--color-primary`/`--color-primary-content` override as inline styles
      // on <html> — inline style wins over the theme's own CSS-variable declaration by
      // specificity, and clearing it (no accent picked, or a non-default theme active) lets the
      // active theme's own baked-in accent show through untouched (TICKET-SET-02).
      const themeService = inject(ThemeService);
      effect(() => {
        const accent = accentColorById(store.primaryColor());
        const styleId = themeService.style();
        const pair =
          accent && DEFAULT_THEME_STYLE_IDS.includes(styleId)
            ? styleId === 'deformable-dark'
              ? accent.dark
              : accent.light
            : null;

        const rootStyle = document.documentElement.style;
        if (pair) {
          rootStyle.setProperty('--color-primary', pair.primary);
          rootStyle.setProperty('--color-primary-content', pair.primaryContent);
        } else {
          rootStyle.removeProperty('--color-primary');
          rootStyle.removeProperty('--color-primary-content');
        }
      });
    },
  }),
);
