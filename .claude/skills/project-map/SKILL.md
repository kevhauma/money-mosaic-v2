---
name: project-map
description: Map of the MoneyMosaicVibe codebase — which feature, store, service, or shared component lives where. Use to locate code before searching the codebase manually.
---

# Project Map

`src/app/` tiers: `core/` (domain logic + persistence + shared entity stores), `feature-*/` (routed UI + feature-specific signal stores), `shared/` (UI primitives + utils). Routes in `app.routes.ts` lazy-load each feature; `app.config.ts` opens the DB and hydrates every store before render.

## Features (routed, lazy)

| Route | Folder | Store(s) | Key components |
|---|---|---|---|
| `/dashboard` (default) | `feature-dashboard/` | `stats.store.ts`, `category-comparison-settings.store.ts`, `dashboard-layout-settings.store.ts` | dashboard-overview, net-worth-header, account-balance-strip, category-breakdown-panel, category-comparison-panel, trend-chart-panel, weekday-weekend-split-panel, top-transactions-panel, action-queue-panel, dashboard-customize-panel (drag-to-reorder rows, `@angular/cdk/drag-drop`, lazy-`@defer`-loaded); `dashboard-row-order.ts`; `shared/echarts/echarts-setup.ts` registers ECharts modules |
| `/accounts` | `feature-accounts/` | *(consumes `AccountsStore` from `@/core/state`)* | accounts-overview, accounts-detail, account-form, account-balance-chart, net-worth-history-chart; `account-icons.ts` |
| `/transactions` | `feature-transactions/` | *(consumes `TransactionsStore`/`TransfersStore`/`TransferSettingsStore` from `@/core/state`)* | transactions-overview, transaction-edit-form, transaction-filters, transaction-bulk-bar, transfer-review; `transaction-filters.ts` |
| `/import` | `feature-import/` | `mapping-profiles.store.ts`, `import-batches.store.ts` | import-wizard steps: import-select-step, import-map-step, import-preview-step, import-summary-step |
| `/categories` | `feature-categories/` | `rules.store.ts`, `category-model.store.ts` *(consumes `CategoriesStore` from `@/core/state`)* | categories-overview, category-form, rules-overview, rule-form, rule-filters; `category-icons.ts`, `rule-summary.ts`, `rule-filters.ts`; also owns the trained auto-categoriser model state (`category-model.store.ts` + `category-model.service.ts`, backed by `core/ml`) even though its UI lives under `/learning` |
| `/learning` | `feature-learning/` | *(consumes `CategoryModelStore` from `@/feature-categories`, entity stores from `@/core/state`)* | learning-overview, model-status, suggestions-table, rule-proposals — surfaces the ML auto-categoriser: model status/training control, per-transaction category suggestions, and mined rule proposals |
| `/data` | `feature-data-management/` | *(none — calls `DataManagementRepository` from `@/core/data-access` directly)* | data-management-overview — full-database JSON export/import (replace vs. merge), TICKET-DAT-01. Standalone route rather than under a Settings shell since `TICKET-SET-01` hasn't landed |

Each feature: `{feature}.routes.ts`, feature-specific `*.store.ts` (if any), `index.ts` barrel, `components/` (one folder per component). Import cross-feature via `@/feature-x` barrel only. `feature-learning` importing `CategoryModelStore`/types from `@/feature-categories` is the intentional shape here — the model lives with the category domain, its dedicated review UI lives under `/learning`.

## Core domain logic (`core/`)

- `core/state/` — the shared entity stores consumed across 2+ features: `AccountsStore`, `CategoriesStore`, `TransactionsStore`, `TransfersStore`, `TransferSettingsStore`. A store belongs here once components/stores in more than one feature need it directly (the original signal was the `feature-accounts` ↔ `feature-categories` barrel cycle these used to create); a store only one feature touches (`RulesStore`, `CategoryModelStore`, `StatsStore`, `ImportBatchesStore`, ...) stays in that feature folder. Own `index.ts` barrel, consumed via `@/core/state` like any other `core` module.
- `core/data-access/` — Dexie `AppDb` + one repository per entity → see the **data-model** skill.
- `core/import/` — CSV pipeline: `csv-parse.worker.ts` (PapaParse Web Worker) + `csv-worker.types.ts`, `csv-parse.ts`, `csv-import.service.ts`, `csv-row-mapper.ts`, `delimiter-guess.ts`, `account-detection.ts` (ownIban → account), `import.service.ts` (orchestrates insert + dedupe + batch record).
- `core/categorisation/` — `rule-matching.ts` (pure predicate logic), `rules-engine.service.ts` (applies rules; respects `categoryManual`), `co-owner-contribution.ts` + `co-owner-contribution.service.ts` (attributes a joint-account transaction to a registered co-owner IBAN).
- `core/transfers/` — `transfer-matching.ts` (pure candidate matching), `transfer-matching.service.ts`, `transfer-linking.service.ts`, `transfer-cleanup.service.ts` (unlinks/cleans up transfer pairs on delete).
- `core/accounts/` — `account-deletion.service.ts` (cascades transaction/transfer cleanup), `joint-owner-lookup.ts` (resolve a co-owner from an IBAN).
- `core/transactions/` — `attribution-override.ts` (per-transaction net-worth/income weighting override for joint accounts), `nullify-transaction.ts` (exclude a transaction from income/expense stats without deleting it), `transaction-deletion.service.ts`.
- `core/ml/` — the auto-categoriser: `model-config.ts` (feature config/thresholds), `feature-hashing.ts` (hashing-trick text features), `category-model.worker.ts` + `.types.ts` (trains a model off the main thread), `rule-proposal-mining.ts` (mines candidate rules from confident predictions), `training-window.ts` (bounds training data by configurable year window).
- `core/stats/` — pure aggregation, one file per statistic: `period-stats.ts`, `net-worth-trend.ts`, `account-balance-trend.ts`, `category-breakdown.ts`, `category-composition-trend.ts`, `category-kind-contribution.ts`, `category-period-comparison.ts`, `date-buckets.ts`, `granularity-for-span.ts`, `chart-zoom-window.ts`, `full-history-range.ts`, `period-window.ts`, `spending-rate.ts`, `top-transactions.ts`, `weekday-weekend-split.ts`, `year-over-year.ts`, `classify-joint-leg.ts` / `joint-account-stake.ts` / `joint-contributor-breakdown.ts` (joint-account ownership weighting); `range-state.store.ts` holds the selected date range/grouping.

Pure logic files (`*-matching.ts`, `stats/*.ts`, `csv-row-mapper.ts`, `fingerprint.ts`, `core/ml/*`) have TestBed-free spec files beside them — extend those when changing logic.

## Shared

- `shared/ui/` — `mm-`-prefixed daisyUI wrapper primitives: button, input, select, badge, alert, modal, page-header, empty-state, confirm-dialog, stat-card, paginator, date-range-input, granularity-picker, range-grouping-switcher. Variant-driven typed inputs; never expose raw daisy classes (see coding-conventions skill).
- `shared/utils/` — `fingerprint.ts` (txn dedupe hash), `iban.ts` + `validators/iban.validator.ts`, `signed-amount.pipe.ts`, `currency-format.ts`, `percentage.ts`, `confidence-color.ts` (ML suggestion confidence → badge color), `debounced-text.ts`, `pagination.ts`, `selection-model.ts` (bulk-select state), `sortable.ts`, `search-params.ts` (URL param keys), `with-archivable.ts` (signalStore feature for archive/unarchive), `daisy-classes.ts`.
- `shared/echarts/` — `echarts-setup.ts` (registers the ECharts modules actually used, keeping the bundle lean), `tooltip-formatter.ts`.

## Docs

- `docs/v1.0_foundation/finance-app-spec.md` — functional requirements (FR-TXN-*, FR-CAT-*, FR-TRF-*, FR-IMP-*...), referenced from code comments.
- `docs/v1.0_foundation/overview.md`, `docs/v1.0_foundation/ui-layout-spec.md` — v1 scope and layout.
- `docs/v1.1_joint_accounts/`, `docs/v1.2_auto_categorise/`, `docs/v1.3_dashboard_insights/` — shipped: joint/co-owner accounts, the ML auto-categoriser (`/learning`), and dashboard/insights panels. Each has its own `overview.md` + `tickets/`.
- `docs/v1.4_data_management/` — TICKET-DAT-01 (export/import) shipped as `feature-data-management/`; TICKET-DAT-02/03 still open.
- `docs/v1.6_income_growth/`, `docs/v1.7_loan_tracker/` — specced but **not yet implemented** (no `feature-income`/`feature-loans` code exists yet); ticket-shaped like the shipped versions.
- `docs/v1.5_redesign/prepare.md`, `docs/v1.8_extended_date_range_picker/requirements.md` — free-form design/spec notes, not the ticket+overview.md shape.
- `docs/v2/overview.md` — deferred v2+ backlog (settings, public pages, privacy mode, changelog).
- `docs/v9999_ideas/requirements.md` — unscoped idea backlog.
