---
name: project-map
description: Map of the MoneyMosaicVibe codebase — which feature, store, service, or shared component lives where. Use to locate code before searching the codebase manually.
---

# Project Map

`src/app/` tiers: `core/` (domain logic + persistence + app-wide stores), `feature-*/` (routed UI + feature-specific signal stores), `shared/` (UI primitives + utils + ECharts setup). `app.routes.ts` lazy-loads every feature.

**Bootstrap does not hydrate anything.** `app.config.ts` opens the Dexie database, fire-and-forgets a persistent-storage request, and (dev only, behind a dynamic import) runs the sample-data seed. Every store hydrates *itself* on first injection via `withHooks({ onInit })` (TICKET-PERF-07) — whichever route injects it first kicks that off, and `hydrate()` is idempotent/cached, so calling it again is a no-op re-fetch. Specs that need seeded data must therefore mock the repository **before** the component is created.

This file is hand-maintained and describes a moving codebase. Where it points at a registry (a barrel, a folder) rather than listing contents, follow the pointer — the registry is the source of truth, this map is the index.

## Features

Eleven feature folders are routed. `feature-data-management/` is the twelfth and is **not** routed — it renders as an embedded section of the Settings page (TICKET-SET-06, ratified by TICKET-DAT-04); there is no `/data` or `/settings/data` URL, and navigating to one fails to match rather than redirecting.

| Route | Folder | Store(s) it owns | What's there |
|---|---|---|---|
| `/` + `/home` | `feature-home/` | — | home-landing — the public landing page. `/` redirects returning visitors to `/dashboard` (`homeRedirectGuard`); `/home` stays reachable, linked from Settings. Rendered *outside* the app shell. |
| `/dashboard` | `feature-dashboard/` | `stats.store.ts`, `category-comparison-settings.store.ts`, `dashboard-layout-settings.store.ts` | dashboard-overview + one component per panel (net-worth-header, account-balance-strip, category-breakdown, category-comparison, trend-chart, weekday-weekend-split, top-transactions, action-queue, customize-panel). Drag-to-reorder rows via `@angular/cdk/drag-drop`, lazily `@defer`-loaded; `dashboard-row-order.ts` |
| `/income` | `feature-income/` | `income.store.ts` | income-overview + income-category-filter + income-yearly-panel + income-career-start — the v1.6 income page. Renders the income-by-category trend chart (TICKET-INC-02) with the yearly bar view beneath it (TICKET-INC-06), both filtered by the FR-INC-3 category selection (TICKET-INC-03) and both reading `IncomeStore.incomeRange` — the data's full history clamped to the user's career start date (TICKET-INC-12), set from the control in the page header's `[actions]` slot; empty state when nothing is selected. Each chart is its own panel component, not another chart on the page class. **Two conventions this page deliberately departs from, and later FR-INC tickets should follow the page, not the convention:** buckets are fixed to calendar months (no `mm-granularity-picker`, unlike TICKET-STAT-15's per-chart control), and the topbar range does *not* scrub the zoom window (unlike TICKET-STAT-03's account charts) — it always opens on full monthly history. Both are explained in `income-overview.component.ts`. Provides `provideEchartsCore` at the route level like the Dashboard/Accounts routes |
| `/accounts` | `feature-accounts/` | *(consumes `AccountsStore`)* | accounts-overview, accounts-detail, account-form, account-card, account-balance-block, account-balance-chart, net-worth-history-chart; `account-card-vm.ts`, `account-icons.ts` |
| `/transactions` | `feature-transactions/` | *(consumes `TransactionsStore`/`TransfersStore`/`TransferSettingsStore`)* | transactions-overview, transaction-row, category-select-cell, transaction-edit-form, transaction-filters, transaction-bulk-bar, transfer-review, attribution-override-fieldset; `transaction-filters.ts`, `transaction-row-vm.ts` |
| `/import` | `feature-import/` | `mapping-profiles.store.ts`, `import-batches.store.ts` import-wizard drives four steps (select → map → preview → summary), with the mapping step further split into `column-map-*` field/stepper components; `import-wizard-session.ts` is the component-scoped `@Injectable()` state machine the wizard provides itself, and `column-mapping.ts` / `mapper-steps.ts` / `import-queue.ts` hold its pure logic |
| `/categories` | `feature-categories/` | `rules.store.ts`, `category-model.store.ts` *(consumes `CategoriesStore`)* | categories-overview, category-form, rules-overview, rule-form, rule-condition-row, rule-filters, rule-share-bar; `category-icons.ts`, `rule-summary.ts`, `rule-filters.ts`, `rule-labels.ts`, `rule-condition-editor.ts`. Also owns the auto-categoriser model state (`category-model.store.ts` + `category-model.service.ts`, backed by `core/ml`) even though its UI lives under `/learning` |
| `/learning` | `feature-learning/` | *(consumes `CategoryModelStore` from `@/feature-categories`)* | learning-overview, model-status, suggestions-table, rule-proposals — the ML auto-categoriser's UI: training control, per-transaction suggestions, mined rule proposals |
| `/help` | `feature-help/` | — | faq-page, guides-index, guide-detail; content is data, not markup — `data/faq.ts` and `data/guides.ts` |
| `/changelog` | `feature-changelog/` | — | changelog-page (Changelog + Roadmap tabs); content in `data/changelog-entries.ts` + `data/roadmap-entries.ts`, grouped by `group-changelog-entries.ts` / `group-roadmap-entries.ts`. Append-only — see the **changelog-entry** and **roadmap-entry** skills |
| `/settings` | `feature-settings/` | *(consumes `AppSettingsStore`, `ThemeService`)* | settings-overview is composition only; one component per section: settings-theme-section, settings-currency-locale-section, settings-data-section, settings-about-section (TICKET-SET-07). **A new setting ships as a new section component**, not another block on the page |
| *(none — embedded in `/settings`)* | `feature-data-management/` | *(none — calls `DataManagementRepository` directly)* | data-management-overview — whole-database JSON export/import (replace vs. merge) and delete-all |

Each feature: `{feature}.routes.ts` (if routed), its own `*.store.ts` (if any), an `index.ts` barrel, and `components/` with one folder per component. Cross-feature imports go through `@/feature-x` barrels only — with one deliberate exception, `app.routes.ts` importing `feature-transactions/transactions.routes` directly to break a barrel cycle (don't "fix" it). Feature-internal components need not be barrel-exported; several aren't, on purpose.

`feature-learning` importing `CategoryModelStore` from `@/feature-categories` is the intended shape: the model lives with the category domain, its review UI lives under `/learning`.

## Store registry

Every store in the app. The placement rule (CR4-10): **any store consumed across features lives in `core/state/`, entity or not**; a store only one feature touches stays in that feature folder. It's a lookup, not a judgment call.

| Store | Location | Why there |
|---|---|---|
| `AccountsStore` | `core/state/` | consumed by accounts, transactions, dashboard, stats |
| `CategoriesStore` | `core/state/` | consumed by categories, transactions, dashboard, learning |
| `TransactionsStore` | `core/state/` | consumed almost everywhere |
| `TransfersStore` | `core/state/` | transactions + stats |
| `TransferSettingsStore` | `core/state/` | transactions + the transfer services |
| `AppSettingsStore` | `core/state/` | app-wide singleton (theme accent, currency symbol/position, locale) — not an entity store, still cross-feature |
| `RangeStore` (`range-state.store.ts`) | `core/state/` | the selected date range/grouping, read by the app shell, dashboard panels, and account charts. Moved here from `core/stats/` by TICKET-SOLID-07 |
| `IncomeStore` | `feature-income/` | single feature; derives only (no repository of its own yet) — reads `CategoriesStore` for `incomeCategories`, `AccountsStore`/`TransactionsStore` for `fullHistoryRange` (the *data's* span) and `latestTransactionDate`, and `AppSettingsStore` for both persisted settings. Exposes the FR-INC-3 selection as `selectedIncomeCategoryIds()`/`toggleIncomeCategory()` (persisted as `appSettings.excludedIncomeCategoryIds`) and the FR-INC-12 anchor as `incomeRange()`/`setCareerStartDate()`/`rejectCareerStartDate()` (persisted as `appSettings.careerStartDate`). **Every panel on `/income` reads `incomeRange`, not `fullHistoryRange`** — clamping helpers live in `feature-income/career-start-date.ts` |
| `RulesStore` | `feature-categories/` | single feature |
| `CategoryModelStore` | `feature-categories/` | owned by categories; `feature-learning` consumes it through that barrel |
| `StatsStore` | `feature-dashboard/` | single feature |
| `CategoryComparisonSettingsStore` | `feature-dashboard/` | single feature |
| `DashboardLayoutSettingsStore` | `feature-dashboard/` | single feature |
| `MappingProfilesStore` | `feature-import/` | single feature |
| `ImportBatchesStore` | `feature-import/` | single feature |

Cross-check with `git ls-files '*.store.ts'`. Note that ephemeral, component-scoped flow state is **not** a store: `ImportWizardSession` is a plain `@Injectable()` named `*Session`, provided by the owning component — see the coding-conventions skill.

## Core domain logic (`core/`)

- `core/state/` — the store registry above. Own `index.ts`, consumed via `@/core/state`.
- `core/data-access/` — Dexie `AppDb` + one repository per entity → see the **data-model** skill. Nothing outside this folder touches `appDb` tables.
- `core/import/` — CSV pipeline: `csv-parse.worker.ts` (PapaParse in a Web Worker) + `csv-worker.types.ts`, `csv-parse.ts`, `csv-import.service.ts`, `csv-row-mapper.ts`, `delimiter-guess.ts`, `account-detection.ts` (ownIban → account), `import.service.ts` (insert + dedupe + batch record).
- `core/categorisation/` — `rule-matching.ts` (pure predicates + `OPERATORS_BY_FIELD`), `rules-engine.service.ts` (applies rules, respects `categoryManual`), `co-owner-contribution.ts` + its service.
- `core/transfers/` — `transfer-matching.ts` (pure candidate matching, `isSavingsMovement`), plus the matching/linking/cleanup services.
- `core/accounts/` — `account-deletion.service.ts` (cascades transaction/transfer cleanup), `joint-owner-lookup.ts`.
- `core/transactions/` — `attribution-override.ts` (per-transaction joint-account weighting override), `nullify-transaction.ts`, `transaction-deletion.service.ts`.
- `core/ml/` — the auto-categoriser: `model-config.ts`, `feature-hashing.ts`, `category-model.worker.ts` + `.types.ts` (trains off the main thread), `rule-proposal-mining.ts`, `training-window.ts`.
- `core/stats/` — pure aggregation, roughly one file per statistic — `ls` it rather than trusting a list here. The one entry point worth knowing: `classify-for-stats.ts`, the single per-transaction classification pipeline every income/expense/savings aggregation shares (its exclusion *ordering* is load-bearing; see its two spec files).
- `core/theme/` — `theme.service.ts` (applies the selected style + accent to `<html>`, persists to `localStorage`), `theme-styles.ts` (the theme catalogue), `accent-colors.ts` (accent presets + swatch resolution).
- `core/onboarding/` — `visited.service.ts` plus `home-redirect.guard.ts` / `mark-visited.guard.ts`, which decide whether `/` shows the landing page or redirects to the dashboard.
- `core/layout/` — `app-shell/`, the drawer/sidebar/topbar shell every routed feature renders inside.
- `core/storage/` — `storage-status.service.ts` (the persistent-storage request, FR-DAT-4).
- `core/links/` — `external-links.ts` (the GitHub repo URL and friends).

Pure logic files (`*-matching.ts`, `core/stats/*`, `csv-row-mapper.ts`, `fingerprint.ts`, `core/ml/*`) have TestBed-free specs beside them — extend those when changing logic.

## Shared

- `shared/ui/` — `mm-`-prefixed daisyUI wrapper primitives. **The list is `shared/ui/index.ts`** — read it rather than a copy here. They take typed, variant-driven inputs and never expose raw daisyUI classes (see the coding-conventions skill). One naming quirk: the `typography` folder's selector is `mm-text` (TICKET-UI-02).
- `shared/utils/` — signals, pipes, validators, and pure helpers; `ls` it for the current set. The ones worth knowing by name: `format-settings.ts` (the app-wide currency/locale signals every formatter reads), `currency-format.ts` / `date-format.ts` / `number-format.ts` and their pipes, `pagination.ts`, `selection-model.ts`, `debounced-text.ts`, `structural-filters.ts`, `link-control-to-setting.ts` (the only place the control↔store write-back pattern lives), `with-archivable.ts` + `with-persisted-crud.ts` (signalStore features), `date-buckets.ts`, `fingerprint.ts`, `iban.ts`, `search-params.ts`.
- `shared/echarts/` — `echarts-setup.ts` (registers only the ECharts modules actually used, keeping the bundle lean), `tooltip-formatter.ts`, `chart-theme.ts` (per-theme categorical palette + animation resolvers), and `bucketed-axis-option.ts` (`bucketedZoomAxisOption`, the grid/axis/`dataZoom` shell every full-history bucketed chart shares so their zoom geometry stays identical).

## Docs

`docs/` holds one folder per version/milestone, each with `overview.md` (the ticket checklist) + `tickets/`, alongside code-review backlogs. **`docs/README.md` explains the folder-naming scheme and lists what's shipped versus specced — read that instead of a version list here, which would go stale immediately.**

Two anchors that don't move: `docs/v1.0_foundation/finance-app-spec.md` (the FR-* functional requirements referenced from code comments) and `docs/v1.0_foundation/ui-layout-spec.md`. For "what does the spec say about X", ask the **spec-navigator** subagent rather than grepping.
