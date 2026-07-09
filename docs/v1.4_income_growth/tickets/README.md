# Money Mosaic — v1.4 Tickets

Tickets for the **income growth** user stories in [../user-stories.md](../user-stories.md). Each ticket carries a description, current situation (as-is), desired result (to-be), and detailed acceptance criteria. This set introduces a new requirement family, **FR-INC** (traced back to [../../v1.0_foundation/finance-app-spec.md](../../v1.0_foundation/finance-app-spec.md)'s existing FR-ACC/FR-TXN/FR-CAT/FR-TRF/FR-IMP/FR-STAT/FR-DAT families) — the first version to ship an entirely new routed feature area rather than extending an existing one.

| Ticket | Area | Title | Source story |
|---|---|---|---|
| [INC-01](./TICKET-INC-01-income-page-scaffold.md) | Income | Dedicated Income page (route, store, nav) | user-stories §9, adds FR-INC-1 |
| [INC-02](./TICKET-INC-02-income-by-category-trend-chart.md) | Income | Income-by-category trend chart | user-stories §9, adds FR-INC-2 |
| [INC-03](./TICKET-INC-03-income-category-selection.md) | Income | Income category selection control | user-stories §9, adds FR-INC-3 |
| [INC-04](./TICKET-INC-04-annual-lump-sum-smoothing.md) | Income | Annual lump-sum smoothing | user-stories §9, adds FR-INC-4 |
| [INC-05](./TICKET-INC-05-income-growth-rate-panel.md) | Income | Income growth-rate panel | user-stories §9, adds FR-INC-5 |
| [INC-06](./TICKET-INC-06-yearly-income-view.md) | Income | Yearly income view | user-stories §9, adds FR-INC-6 |
| [INC-07](./TICKET-INC-07-multi-year-income-comparison.md) | Income | Multi-year income comparison | user-stories §9, adds FR-INC-7 |
| [INC-08](./TICKET-INC-08-raise-pay-cut-step-change-detection.md) | Income | Raise / pay-cut step-change detection | user-stories §9, adds FR-INC-8 |
| [INC-09](./TICKET-INC-09-lost-income-stream-warning.md) | Income | Lost income stream warning | user-stories §9, adds FR-INC-9 |
| [INC-10](./TICKET-INC-10-monthly-gross-wage-entry.md) | Income | Monthly gross wage entry | user-stories §9, adds FR-INC-10 |
| [INC-11](./TICKET-INC-11-gross-net-ratio.md) | Income | Gross/net ratio | user-stories §9, adds FR-INC-11 |

**Unlike v1.3's set, these tickets are *not* mutually independent.** Real dependencies:

- INC-02, INC-04, INC-05, INC-08, INC-09, INC-11 all read `IncomeStore.selectedIncomeCategoryIds()` → depend on **INC-03**.
- INC-04 (smoothing) rewrites the series INC-02 (chart) renders and INC-05/INC-08 consume → depend on **INC-02**.
- INC-05 (growth panel) and INC-08 (step-change) consume the *smoothed* series → depend on **INC-04**.
- INC-07 (multi-year) consumes INC-06's per-year output directly → depends on **INC-06**.
- INC-11 (gross/net ratio) needs both the gross entries and the category selection → depends on **INC-10** and **INC-03**.
- INC-01 (page shell) is a prerequisite for every other ticket having somewhere to render.

## Suggested build order

1. **INC-01** — page shell + route + nav; nothing else has anywhere to live without it.
2. **INC-03** — category selection; almost every later aggregate is parameterised by it.
3. **INC-02** — the base per-category series + trend chart; first real content, and the series every later ticket builds on.
4. **INC-06** → **INC-07** — yearly view then multi-year comparison; independent of INC-02's monthly series, can run in parallel with steps 2–3.
5. **INC-04** — annual lump-sum smoothing, layered onto INC-02's series once it exists.
6. **INC-05** — growth-rate panel, needs INC-02 + INC-04.
7. **INC-08** — step-change detection, needs INC-04's smoothed series.
8. **INC-09** — lost-income-stream warning; only needs INC-02's raw series, can slot in any time after step 3.
9. **INC-10** — gross wage entry; genuinely independent (new table, no dependency on the trend series), can be built any time.
10. **INC-11** — gross/net ratio, last: needs INC-10 + INC-03.

## Definition of Done (applies to every ticket)

Per [../../../CLAUDE.md](../../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. **This set does add one Dexie schema change** (INC-10's `grossWageEntries` table, schema v7 — additive, no `.upgrade()` needed) and one new non-indexed `Category` field (INC-04's `smoothAnnually`, no version bump). Every other ticket derives from existing `Transaction`/`Category`/`Account` data. The production bundle budget in `angular.json` is never raised. Components/stores never touch `appDb` tables directly — always through a repository (`GrossWageRepository` for the new table). Every new aggregate excludes linked transfers the same way the existing `core/stats/` helpers do, so "income" means the same thing across the whole page.
