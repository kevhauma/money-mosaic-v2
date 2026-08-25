import { computed, effect, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  AppSettingsRepository,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type RecentRange,
} from '@/core/data-access';
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
  withComputed(({ privacyMode }) => ({
    /**
     * `privacyMode` resolved against its off-by-default (TICKET-PRIV-01). Every consumer reads this
     * rather than `privacyMode() ?? false` — the stored field is a tri-state-via-`undefined` like
     * its neighbours, and the screens honouring it grew from one to four (TICKET-PRIV-02), so the
     * `??` belongs in one place instead of at each new call site.
     */
    privacyModeEnabled: computed(() => privacyMode() ?? false),
  })),
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

      /** Categories the Dashboard's spending heatmap leaves out entirely (TICKET-STAT-32). */
      setHeatmapExcludedCategoryIds: async (
        heatmapExcludedCategoryIds: number[],
      ): Promise<void> => {
        await appSettingsRepository.setHeatmapExcludedCategoryIds(heatmapExcludedCategoryIds);
        patchState(store, { heatmapExcludedCategoryIds });
      },

      setCareerStartDate: async (careerStartDate: string | undefined): Promise<void> => {
        await appSettingsRepository.setCareerStartDate(careerStartDate);
        patchState(store, { careerStartDate });
      },

      setSmoothedBonusCategoryIds: async (smoothedBonusCategoryIds: number[]): Promise<void> => {
        await appSettingsRepository.setSmoothedBonusCategoryIds(smoothedBonusCategoryIds);
        patchState(store, { smoothedBonusCategoryIds });
      },

      setGrossColor: async (grossColor: AccentColorId | undefined): Promise<void> => {
        await appSettingsRepository.setGrossColor(grossColor);
        patchState(store, { grossColor });
      },

      setMainIncomeCategoryId: async (mainIncomeCategoryId: number | undefined): Promise<void> => {
        await appSettingsRepository.setMainIncomeCategoryId(mainIncomeCategoryId);
        patchState(store, { mainIncomeCategoryId });
      },

      /** Blurs every figure on the insight pages while on — Dashboard, Income, Recurring, Explore (TICKET-PRIV-01, widened by TICKET-PRIV-02). */
      setPrivacyMode: async (privacyMode: boolean): Promise<void> => {
        await appSettingsRepository.setPrivacyMode(privacyMode);
        patchState(store, { privacyMode });
      },

      /** The month (1–12) a fiscal year begins in (TICKET-SET-09); read by `RangeStore` to resolve the two fiscal quick ranges (TICKET-STAT-37). */
      setFiscalYearStartMonth: async (fiscalYearStartMonth: number): Promise<void> => {
        await appSettingsRepository.setFiscalYearStartMonth(fiscalYearStartMonth);
        patchState(store, { fiscalYearStartMonth });
      },

      /** Records that a guide's first-visit intro has been shown (TICKET-PUB-08); idempotent. */

      /**
       * Records an applied range (TICKET-STAT-40) — most-recent-first, deduped by its expression
       * pair (re-applying a listed range moves it to the top rather than adding a second row), and
       * capped at 10. Global across pages: one list, not one per page, because a range is worth
       * remembering for having been built, not for where the user was standing.
       */
      recordRecentRange: async (fromExpr: string, toExpr: string): Promise<void> => {
        const withoutDuplicate = (store.recentRanges() ?? []).filter(
          (range) => range.fromExpr !== fromExpr || range.toExpr !== toExpr,
        );
        const recentRanges: RecentRange[] = [{ fromExpr, toExpr }, ...withoutDuplicate].slice(
          0,
          10,
        );
        await appSettingsRepository.setRecentRanges(recentRanges);
        patchState(store, { recentRanges });
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
