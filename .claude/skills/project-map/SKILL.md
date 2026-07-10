---
name: project-map
description: Map of the MoneyMosaicVibe codebase — which feature, store, service, or shared component lives where. Use to locate code before searching the codebase manually.
---

# Project Map

`src/app/` tiers: `core/` (domain logic + persistence), `feature-*/` (routed UI + signal stores), `shared/` (UI primitives + utils). Routes in `app.routes.ts` lazy-load each feature; `app.config.ts` opens the DB and hydrates every store before render.

## Features (routed, lazy)

| Route | Folder | Store(s) | Key components |
|---|---|---|---|
| `/dashboard` (default) | `feature-dashboard/` | `stats.store.ts` | dashboard overview, category breakdown panel, charts (`echarts-setup.ts` registers ECharts modules) |
| `/accounts` | `feature-accounts/` | `accounts.store.ts` | accounts-overview, accounts-detail, account-form; `account-icons.ts` |
| `/transactions` | `feature-transactions/` | `transactions.store.ts`, `transfers.store.ts`, `transfer-settings.store.ts` | transaction list/edit-form, transfer-review |
| `/import` | `feature-import/` | `mapping-profiles.store.ts`, `import-batches.store.ts` | import wizard steps (preview step etc.) |
| `/categories` | `feature-categories/` | `categories.store.ts`, `rules.store.ts` | categories-overview, category-form, rules-overview, rule-form; `category-icons.ts`, `rule-summary.ts` |

Each feature: `{feature}.routes.ts`, `*.store.ts`, `index.ts` barrel, `components/` (one folder per component). Import cross-feature via `@/feature-x` barrel only.

## Core domain logic (`core/`)

- `core/data-access/` — Dexie `AppDb` + one repository per entity → see the **data-model** skill.
- `core/import/` — CSV pipeline: `csv-parse.worker.ts` (PapaParse Web Worker) + `csv-worker.types.ts`, `csv-import.service.ts`, `csv-row-mapper.ts`, `delimiter-guess.ts`, `account-detection.ts` (ownIban → account), `import.service.ts` (orchestrates insert + dedupe + batch record).
- `core/categorisation/` — `rule-matching.ts` (pure predicate logic), `rules-engine.service.ts` (applies rules; respects `categoryManual`).
- `core/transfers/` — `transfer-matching.ts` (pure candidate matching), `transfer-matching.service.ts`, `transfer-linking.service.ts`.
- `core/stats/` — pure aggregation: `period-stats.ts`, `net-worth-trend.ts`, `category-breakdown.ts`, `date-buckets.ts`, `trend-buckets.ts`; `range-state.store.ts` holds the selected date range/grouping.

Pure logic files (`*-matching.ts`, `stats/*.ts`, `csv-row-mapper.ts`, `fingerprint.ts`) have TestBed-free spec files beside them — extend those when changing logic.

## Shared

- `shared/ui/` — `mm-`-prefixed daisyUI wrapper primitives: button, input, select, badge, alert, page-header, empty-state, confirm-dialog, stat-card, range-grouping-switcher. Variant-driven typed inputs; never expose raw daisy classes (see coding-conventions skill).
- `shared/utils/` — `fingerprint.ts` (txn dedupe hash), `iban.ts` + `validators/iban.validator.ts`, `signed-amount.pipe.ts`, `search-params.ts` (URL param keys), `with-archivable.ts` (signalStore feature for archive/unarchive), `daisy-classes.ts`.

## Docs

- `docs/v1.0_foundation/finance-app-spec.md` — functional requirements (FR-TXN-*, FR-CAT-*, FR-TRF-*, FR-IMP-*...), referenced from code comments.
- `docs/v1.0_foundation/overview.md`, `docs/v1.0_foundation/ui-layout-spec.md` — v1 scope and layout.
- `docs/v2/requirements.md` — deferred v2+ backlog (data management, cross-cutting polish).
