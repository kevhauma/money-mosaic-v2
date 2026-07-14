# TICKET-SOLID-05 — Move the shared entity stores to `core/state`, breaking all 20 barrel cycles

- **Area:** Architecture (state placement, feature barrels)
- **Type:** Refactor
- **Traceability:** CR3-3; executes the already-backlogged CR-6.1 and CR2-4.1
- **Fallow evidence (2026-07-14):** 20 circular dependencies (86.2 per 1k files — the only red vital sign), every one a walk around the feature-accounts ↔ feature-categories barrel loop

## User story

As a developer, I want the entity stores that every feature consumes to live below the feature layer, so cross-feature store access stops creating import cycles between lazy-loaded feature barrels.

## Description

Feature-categories components import `AccountsStore` from the `@/feature-accounts` barrel while feature-accounts chart components import `CategoriesStore` from `@/feature-categories`; both barrels also re-export their routes and components, so the two feature graphs each pull the other in whole — 20 distinct cycles. Each import individually follows the CLAUDE.md barrel rule; the fix is placement, not convention. Moving the four widely-shared entity stores under `core/` dissolves every cycle without any consumer changing what it uses.

## Current situation (as-is)

- Cycle edges: [rules-overview.component.ts:13](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.ts) and [rule-form.component.ts:20](../../../src/app/feature-categories/components/rule-form/rule-form.component.ts) import `AccountsStore` from `@/feature-accounts`; [account-balance-chart.component.ts:18](../../../src/app/feature-accounts/components/account-balance-chart/account-balance-chart.component.ts) and [net-worth-history-chart.component.ts:17](../../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts) import `CategoriesStore` from `@/feature-categories`.
- The cycle weakens the lazy-route boundary (each chunk transitively references the other feature) and makes module-initialization order load-path-dependent — the same risk class that already forced the documented deep-import exceptions in `app.routes.ts` and [transfer-matching.ts:2-4](../../../src/app/core/transfers/transfer-matching.ts).
- Candidate stores (consumed across 2+ features): `AccountsStore`, `CategoriesStore`, `TransactionsStore`, `TransfersStore`.

## Desired result (to-be)

- The shared entity stores live in `core/state/` (new folder, own barrel, exported like the other `core` modules); feature folders keep their feature-specific stores (`RulesStore`, `ImportBatchesStore`, `StatsStore`, …).
- All consumers import them via `@/core/state`; the `@/feature-accounts` ↔ `@/feature-categories` store imports disappear.
- Fallow reports **0** circular dependencies.
- The `transfer-matching.ts` and `app.routes.ts` deep-import exceptions are re-evaluated: keep them only if a cycle would still exist without them, and update their justifying comments either way.

## Acceptance criteria

- [ ] `fallow dead-code --format json --quiet` reports `circular_dependencies: 0`.
- [ ] No component/store behaviour change: this is a move + import-path update only (git should show renames, not rewrites).
- [ ] Moved stores keep their existing specs (moved alongside), all passing.
- [ ] `.claude/skills/project-map/SKILL.md` and the `coding-conventions` skill are updated to name `core/state` as the home of shared entity stores and when a store belongs there vs. in a feature.
- [ ] Cross-feature imports still go through barrels (`@/core/state`) — no new deep-path imports introduced.
- [ ] Verified via the fallow skill and coding-conventions skill, plus a live browser smoke test (dashboard, transactions, accounts detail, categories/rules pages all load).

## Notes

- Mostly mechanical but wide (many import lines); land it in a quiet window, not alongside a feature branch.
- CR2-4.1's interim suggestion (an `ownSavingsIbans` computed on `AccountsStore`) is superseded by this ticket; if it was never added, skip it entirely.
- The 20-cycle count is a useful regression signal — don't add `fallow-ignore` suppressions in the meantime.
