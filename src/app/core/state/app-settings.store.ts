import { effect, inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { AppSettingsRepository, DEFAULT_APP_SETTINGS, type AppSettings } from '@/core/data-access';
import {
  accentColorById,
  DEFAULT_THEME_STYLE_IDS,
  ThemeService,
  type AccentColorId,
} from '@/core/theme';
import { syncFormatSettings, type CurrencySymbolPosition } from '@/shared/utils';

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

      setCurrencySymbol: async (currencySymbol: string): Promise<void> => {
        await appSettingsRepository.setCurrencySymbol(currencySymbol);
        patchState(store, { currencySymbol });
      },

      setCurrencySymbolPosition: async (
        currencySymbolPosition: CurrencySymbolPosition,
      ): Promise<void> => {
        await appSettingsRepository.setCurrencySymbolPosition(currencySymbolPosition);
        patchState(store, { currencySymbolPosition });
      },

      setLocale: async (locale: string): Promise<void> => {
        await appSettingsRepository.setLocale(locale);
        patchState(store, { locale });
      },

      setExcludedIncomeCategoryIds: async (excludedIncomeCategoryIds: number[]): Promise<void> => {
        await appSettingsRepository.setExcludedIncomeCategoryIds(excludedIncomeCategoryIds);
        patchState(store, { excludedIncomeCategoryIds });
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

      // Keeps `shared/utils/format-settings.ts`'s module-level signals in sync with the store —
      // covers both initial hydration and later edits, so every formatter call site (pipes,
      // dashboard formatters, chart tooltips) reformats without its own wiring. One sync point for
      // symbol/position/locale together (TICKET-SET-03/TICKET-SET-04/TICKET-NG-10 — previously two
      // separate effects, one per module-signal channel).
      effect(() => {
        syncFormatSettings({
          currencySymbol: store.currencySymbol(),
          currencySymbolPosition: store.currencySymbolPosition(),
          locale: store.locale(),
        });
      });
    },
  }),
);
