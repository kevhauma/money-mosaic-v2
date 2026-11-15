# TICKET-FUT-12 — The future page waits for its data

- **Area:** Forecast
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-14, part, and CR6-A2 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-FUT-3 (the page), FR-FUT-4/5/6 (ETAs, chart, required saving), the account scope ([TICKET-FUT-08](./TICKET-FUT-08-account-scope.md)); TICKET-SRV-06 (hydration states)

## User story

As someone planning on the Future page, I want it to show it's loading, or that loading failed, before I touch a control, so a click never overwrites my saved forecast settings with defaults.

## Description

`/future` reads five stores but only partly waits for two of them. Its controls show the built-in defaults until the forecast settings arrive, and a click during that window, or after a failed load, saves a whole value built from those defaults. A failed load never shows an error: sections stay on a skeleton or a "loading" notice for good.

## Current situation (as-is)

- [`future-overview.component.html`](../../../src/app/feature-future/components/future-overview/future-overview.component.html) renders `app-forecast-controls`, `app-goals-panel` and `app-net-worth-projection-chart` straight away, with no `mm-hydration-boundary`.
- [`ForecastStore`](../../../src/app/feature-future/forecast.store.ts) derives everything from `TransactionsStore`, `AccountsStore`, `CategoriesStore`, `GoalsStore` and `ForecastSettingsStore`. Its only gate is `dataReady: accountsStore.dataReady` (line 300), which is transactions plus transfers hydrated ([`accounts.store.ts`](../../../src/app/core/state/accounts.store.ts) line 166).
- **Settings, before load:** [`ForecastSettingsStore`](../../../src/app/core/state/forecast-settings.store.ts) starts on `DEFAULT_FORECAST_SETTINGS` (line 29). [`forecast-controls.component.ts`](../../../src/app/feature-future/components/forecast-controls/forecast-controls.component.ts) shows those defaults ungated: mode, basis, lookback, safety net and scope.
- **Settings, after a click:** `toggleScopeAccount` (lines 118–124) builds the next scope from the current, default, `scopeAccountIds()` and calls `setScopeAccountIds`, which saves the **whole list** (store lines 90–95). Ticking one account before the load lands, or after it fails, replaces a saved scope of three accounts with one. The other setters likewise save a default-derived value the user never saw.
- **Goals, on failure:** [`goals-panel.component.html`](../../../src/app/feature-future/components/goals-panel/goals-panel.component.html) line 21 shows a skeleton while `!goalsStore.hydrated()`. A failed goals load never sets `hydrated`, so the skeleton stays, with no error and no retry.
- **Transactions or transfers, on failure:** `dataReady` stays false, so the notice reads its loading state ([`forecast-notices.ts`](../../../src/app/feature-future/forecast-notices.ts) line 159) and the chart stays hidden for good.
- **Accounts and categories** aren't gated at all. Before they load, the starting balance and the scope list come from empty stores.

## Desired result (to-be)

- The page's sections sit inside one `mm-hydration-boundary`, fed by `hydrationOf(transactionsStore, transfersStore, accountsStore, categoriesStore, goalsStore, forecastSettingsStore)`, following the income page ([`income-overview.component.ts`](../../../src/app/feature-income/components/income-overview/income-overview.component.ts) line 166).
- While any of these loads, the page shows a skeleton and no controls, so no setter can run from defaults.
- If any fails, the page shows the error and Retry, which re-reads only the stores that failed.
- The per-section loading branches that the boundary makes redundant (the goals skeleton, the notice's loading state) are removed, unless something else still uses them.

## Acceptance criteria

- [ ] While `ForecastSettingsStore` is loading, no forecast control is rendered or clickable.
- [ ] Saved scope = accounts 1, 2 and 3. If the settings load fails, the page shows the error with Retry, no scope checkbox is shown, and the saved scope stays [1, 2, 3].
- [ ] A failed `GoalsStore` load shows the error with Retry instead of an endless skeleton. Retry after the server returns shows the goals.
- [ ] A failed transactions load shows the error with Retry instead of an endless "loading" notice.
- [ ] Once everything has loaded, the page renders exactly as today (existing future-page specs pass).
- [ ] Settings writes still go through `ForecastSettingsStore` → its repository, never a direct API call from a component.
- [ ] Component specs cover loading, error and Retry, and loaded states.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: reloading `/future` shows a skeleton, then the page. With the API stopped, it shows the error and Retry, and no control can be clicked.

## Notes

- Saving whole lists from client state (CR6-A2) is the root reason a premature click is destructive. Gating the page removes the window on this page. Toggling items on the server instead is a broader change, out of scope here.
- The dashboard's half of CR6-14 is TICKET-NG-11, and the loans pages are TICKET-LOAN-19.
