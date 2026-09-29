import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  DEFAULT_FORECAST_SETTINGS,
  ForecastSettingsRepository,
  type ForecastMode,
  type ForecastSettings,
} from '@/core/data-access';
import type { SavingBasis } from '@/core/stats';
import { createHydration, registerStoreReset, withHydrationState } from '@/core/store-reset';

/**
 * The forecast's own parameters (TICKET-FUT-02, FR-FUT-2), edited by TICKET-FUT-06.
 *
 * **Persisted, unlike `ChartOptionsStore`.** That store is deliberately in-memory because a hidden
 * chart series surviving a restart reads as the app being broken. These are inputs to a figure the
 * user acts on — a forecast that silently reset its lookback window on every reload would be worse,
 * not safer. The reversal is intentional and scoped to this one row.
 */
export const ForecastSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<ForecastSettings>(DEFAULT_FORECAST_SETTINGS),
  withComputed((store) => ({
    /**
     * The mode, always defined. `ForecastSettings.mode` is optional on the row (FUT-02 declared it
     * ahead of TICKET-FUT-09 needing it), which makes its state signal optional too — resolving the
     * default once here keeps every reader from repeating a `?? 'when-affordable'`.
     */
    activeMode: computed<ForecastMode>(() => store.mode?.() ?? 'when-affordable'),
    /** The scope, always an array. Empty means "every account", as it does on the row. */
    activeScopeAccountIds: computed<number[]>(() => store.scopeAccountIds?.() ?? []),
  })),
  withHydrationState(),
  withMethods((store) => {
    const forecastSettingsRepository = inject(ForecastSettingsRepository);

    /**
     * `hydrate` is idempotent and triggered on first injection (`withHooks` below,
     * TICKET-PERF-07); `retry` re-reads after a failed load and `reset` empties the store when the
     * signed-in user changes (TICKET-SRV-06, TICKET-AUTH-02).
     */
    const { hydrate, retry, reset } = createHydration(store, () =>
      forecastSettingsRepository.get().then((settings) => {
        patchState(store, settings);
      }),
    );

    return {
      reset,
      hydrate,
      retry,

      setLookbackMonths: async (lookbackMonths: number): Promise<void> => {
        await forecastSettingsRepository.setLookbackMonths(lookbackMonths);
        patchState(store, { lookbackMonths });
      },

      setBasis: async (basis: SavingBasis): Promise<void> => {
        await forecastSettingsRepository.setBasis(basis);
        patchState(store, { basis });
      },

      setSafetyNetAmount: async (safetyNetAmount: number): Promise<void> => {
        await forecastSettingsRepository.setSafetyNetAmount(safetyNetAmount);
        patchState(store, { safetyNetAmount });
      },

      /**
       * Which question `/future` is answering (TICKET-FUT-09). Persisted for the same reason the
       * window is: it changes what every figure on the page *means*, so a silent reset to the other
       * mode on reload would read as the app changing its answer.
       */
      setMode: async (mode: ForecastMode): Promise<void> => {
        await forecastSettingsRepository.setMode(mode);
        patchState(store, { mode });
      },

      /**
       * Which accounts the forecast may consider (TICKET-FUT-08). An empty selection is stored as
       * `undefined` rather than `[]` so "all accounts" has exactly one representation — unticking
       * the last account therefore reverts to all, instead of producing an empty forecast.
       */
      setScopeAccountIds: async (scopeAccountIds: number[]): Promise<void> => {
        await forecastSettingsRepository.setScopeAccountIds(scopeAccountIds);
        patchState(store, {
          scopeAccountIds: scopeAccountIds.length ? scopeAccountIds : undefined,
        });
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Registers this store for the sign-out wipe (TICKET-AUTH-02), before hydration starts.
      registerStoreReset('ForecastSettingsStore', store.reset, store.hydrate);

      // Fire-and-forget: kicks off hydration the moment anything first injects this store,
      // instead of at app bootstrap (TICKET-PERF-07). Idempotent, so flows that read
      // `lookbackMonths()`/`basis()` synchronously can still `await store.hydrate()` as a guard.
      // `.catch` because nothing awaits this: the failure is already on the store's `error` for the
      // page to render, and un-caught it would be an unhandled rejection too (TICKET-SRV-06).
      void store.hydrate().catch(() => undefined);
    },
  }),
);
