# Money Mosaic — v1.6 Income growth (Overview)

Every prior stat release (v1.0's FR-STAT-1..7, v1.3's FR-STAT-8..13) treats income as one lump figure per
period, folded into the dashboard — a single number on a stat card, one line on the income/expense trend
chart, one bucket in the category breakdown. v1.6 pulls income out into its **own routed page and feature
area** and turns it from a number into a *trend the user can trust*: is it actually growing, shrinking, or
just noisy — broken down by source, tracked year over year and across multiple years, smoothed against
one-off noise (including *real but lumpy* income like a 13th month or vacation pay), flagged when
something structurally changes (a raise, a pay cut, a stream that quietly stopped), and checked against
gross pay so a shifting take-home ratio doesn't hide inside "net income is up." Each ticketed line links
to a `tickets/TICKET-*.md` file carrying its own user story, description, as-is/to-be, and acceptance
criteria — this file is only the index + build order.

**Scope is personal income only** (transactions in a `kind: 'income'` category — Salary, Other Income,
any custom income category the user adds). This is deliberately *not* the household/joint-account
view: `joint-contributor-breakdown.ts` (v1.1/v1.3-in-progress) already answers "who put money into this
joint account," which is a different question living on the account detail page. Conflating the two would
make "my income is up 8%" mean something different depending on whether a partner happened to pay in
extra that month — so this vision keeps them as two separate concepts.

**No new recurring/one-off classification for *whether* something counts as income.** Rather than
inferring cadence, v1.6 reuses the existing income *categories* the user already assigns, and lets the
user choose which ones count toward "my income growth" (FR-INC-3) — e.g. excluding "Other Income" if
it's mostly noisy one-off gifts/refunds, so a bonus month doesn't get read as sustained growth without
the user's say-so. The same selection feeds the gross/net ratio (FR-INC-11), so "net income" always means
the same thing across the whole page. Separately, FR-INC-4 lets the user flag a category as *lumpy but
real* (an annual bonus that should still count as income, just not as a monthly spike) — that's a display
smoothing choice, not an inclusion/exclusion choice, so it's kept as its own story rather than overloaded
onto FR-INC-3.

**Architecture:** a new routed feature, `/income` → `feature-income/` (own `income.store.ts`,
`income.routes.ts`, nav entry — same shape as `feature-accounts`/`feature-transactions`), *not* a
dashboard panel. The route is a lazy child of the `AppShellComponent` layout route in `app.routes.ts`,
and the nav item goes in `core/layout/app-shell/app-shell.component.html` (the sidebar moved out of
`app.html` during the shell extraction). Collaborator stores come from `@/core/state`
(`TransactionsStore`/`CategoriesStore`/`AccountsStore`/`RangeStore`) since TICKET-SOLID-05. New pure
aggregation lives in `core/stats/` alongside the existing helpers (yearly rollup, multi-year
comparison, annual-smoothing, step-change/gap detection). Two schema-level additions:
- The income-category selection (FR-INC-3) is persisted as `excludedIncomeCategoryIds` on the
  already-shipped `appSettings` singleton (schema v12) — additive optional field, no version bump
  needed, since Dexie's `.stores()` only declares indexes, not the full field set (same as
  `Category.sortOrder`). Stored as an *exclusion* list, mirroring
  `categoryComparisonSettings.excludedCategoryIds`, so a newly created income category counts by
  default without a sync effect. **Shipped 2026-07-30.**
- The salary metadata figures (FR-INC-10) are the one new piece of **user input** this version
  adds — bank CSVs never contain gross pay, and can't tell a bonus baked into a salary deposit apart
  from the regular pay in it. That needs an actual new table, `salaryMetadata` (schema **v13**, no
  `.upgrade()` needed — new empty table), with its own thin repository
  (`salary-metadata.repository.ts`) following the existing one-repository-per-entity convention,
  keyed by month (`yearMonth: 'YYYY-MM'`, `grossWage`, optional `bonus`).

**Revised 2026-08-01, before FR-INC-4/FR-INC-10 were built.** The "annual lump sum" flag (FR-INC-4)
is no longer a `Category` field — it's a page-level setting, `smoothedBonusCategoryIds?: number[]`
on the same `appSettings` singleton as FR-INC-3's exclusion list (additive, non-indexed, no version
bump), following that field's precedent exactly. It, FR-INC-3's category filter, and FR-INC-12's
career start date control are consolidated into a single **Income settings popup**
(`IncomeSettingsComponent`) behind one trigger in the page header, rather than three separate
controls scattered across the page. Separately, FR-INC-10 grew a `bonus` field — for the case where
the lump sum is embedded *inside* the regular salary deposit rather than its own transaction/category
(so there's nothing for FR-INC-4's per-category setting to flag) — which FR-INC-11's ratio subtracts
before comparing net to gross. See TICKET-INC-04's and TICKET-INC-10's Notes for why these are two
separate, complementary mechanisms rather than one.

> **Refreshed 2026-07-30.** These tickets were written when the app was at schema v6 with a flat
> five-feature route list; v1.3–v1.5 and the v2 code review have shipped since. The as-is sections
> below and in each ticket now describe the code as it actually stands. The four changes that most
> affect implementation: (1) `trend-buckets.ts`/`computeTrendBuckets()` are gone, replaced by
> `category-composition-trend.ts`'s `computeCategoryCompositionTrend()` — which already does per-bucket
> per-category income series, capped at top-5 and scoped to the topbar range; (2) transfer exclusion is
> no longer a `transferId != null` check — `classifyForStats()` is the single classification pipeline
> every aggregate must route through; (3) bucket granularity is chart-local state (TICKET-STAT-15),
> there is no `RangeStore.groupBy`; (4) schema is at v12, and from `.version(11)` onward a version block
> declares only its new/changed tables, not the full table map. One product decision is reopened by what
> shipped since — see TICKET-INC-03's note on persisting the category selection.

## Income (FR-INC — new)

This set introduces a new requirement family, **FR-INC**, and is the first version to ship an entirely new routed feature area rather than extending an existing one. **Unlike v1.3's set, these tickets are *not* mutually independent**, so the list below is ordered by dependency, not by FR number:

- [x] [TICKET-INC-01](./tickets/TICKET-INC-01-income-page-scaffold.md) — Dedicated Income page (route, store, nav) (adds FR-INC-1) — prerequisite for every other ticket having somewhere to render
- [x] [TICKET-INC-03](./tickets/TICKET-INC-03-income-category-selection.md) — Choose which income categories count toward growth (adds FR-INC-3) — almost every later aggregate is parameterised by `IncomeStore.selectedIncomeCategoryIds()`
- [x] [TICKET-INC-02](./tickets/TICKET-INC-02-income-by-category-trend-chart.md) — Income-by-category trend chart (adds FR-INC-2, builds on `category-composition-trend.ts`'s `CategorySeriesEntry` shape) — needs INC-03; the base series every later ticket builds on
- [x] [TICKET-INC-06](./tickets/TICKET-INC-06-yearly-income-view.md) — Yearly income view, one bar per calendar year (adds FR-INC-6) — independent of INC-02's monthly series, can run in parallel with it
- [x] [TICKET-INC-12](./tickets/TICKET-INC-12-career-start-date.md) — Career start date filters the Income page from where your working life started, not where the data does
- [x] [TICKET-INC-07](./tickets/TICKET-INC-07-multi-year-income-comparison.md) — Multi-year income comparison (adds FR-INC-7) — needs INC-06's per-year output
- [x] [TICKET-INC-04](./tickets/TICKET-INC-04-annual-lump-sum-smoothing.md) — Annual lump-sum smoothing for a category, plus the consolidated Income settings popup (adds FR-INC-4) — needs INC-02/03/12, rewrites the series INC-02 renders
- [x] [TICKET-INC-05](./tickets/TICKET-INC-05-income-growth-rate-panel.md) — Income growth-rate panel, period-over-period and YoY (adds FR-INC-5) — needs INC-02 + INC-04
- [x] [TICKET-INC-08](./tickets/TICKET-INC-08-raise-pay-cut-step-change-detection.md) — Raise/pay-cut step-change detection (adds FR-INC-8) — needs INC-04's smoothed series
- [x] [TICKET-INC-09](./tickets/TICKET-INC-09-lost-income-stream-warning.md) — Lost income stream warning (adds FR-INC-9) — only needs INC-02's raw series, can slot in any time after it
- [x] [TICKET-INC-10](./tickets/TICKET-INC-10-monthly-gross-wage-entry.md) — Monthly salary metadata: gross wage + embedded bonus, opened from its own modal (adds FR-INC-10) — genuinely independent (new table, no dependency on the trend series), can be built any time
- [ ] [TICKET-INC-11](./tickets/TICKET-INC-11-gross-net-ratio.md) — Gross/net ratio per month (adds FR-INC-11) — last: needs INC-10 + INC-03

## Considered, not ticketed yet

- **Household/joint income view** — deliberately out of scope here; it's the existing account-detail
  concern (`joint-contributor-breakdown.ts`), not a "growth" question. Could get its own v1.6-adjacent
  ticket (a contribution trend over time, not just a snapshot) but that's a different vision than this
  one and shouldn't be numbered under the same FR-INC stories, to avoid conflating "my income" with
  "household inflow."
- **Recurring/one-off inference at the transaction level** (cadence detection per counterparty rather
  than per category) — explicitly deferred; the category-selection control (FR-INC-3) covers the same
  need with much less new logic, by letting the user just exclude noisy categories.
- **Auto-detecting lump-sum/annual categories** (inferring "this looks like a once-a-year bonus" from
  amount/cadence patterns) — explicitly deferred in favour of the manual per-category flag (FR-INC-4);
  consistent with the "no new inferred classification" principle already applied to FR-INC-3.
- **Auto-deriving gross wage** (payslip import/OCR, tax-bracket estimation from net alone) — manual
  monthly entry only for v1.6; deriving gross from net would need country-specific tax-bracket logic
  that's a whole feature on its own.
- **Forecasting/projected income** — already parked under "v3" in
  [../v1.0_foundation/finance-app-spec.md](../v1.0_foundation/finance-app-spec.md)'s deferred list
  ("forecasting/insights"), and explored further in
  [../v9999_ideas/competitive-analysis.md](../v9999_ideas/competitive-analysis.md) §4 (cash-flow
  forecasting); step-change detection (FR-INC-8) is retrospective only, not a
  predictive model, and the gross/net ratio (FR-INC-11) is a historical trend, not a tax projection —
  neither should grow into one here.
- **Income vs. expense growth comparison** ("is my income growing faster than my spending") — natural
  follow-on once FR-INC-5 exists, but adds a second axis (expense growth) this vision doesn't need to
  carry; worth a ticket once income growth alone has shipped and proven useful.
- **User-configurable step-change/gap-detection thresholds** — FR-INC-8/FR-INC-9 ship with fixed
  constants (±15% / 3-month window; 75% cadence / 6-month minimum). A settings surface for tuning them
  is a reasonable follow-up once real usage shows whether the defaults are too noisy or too quiet.
  (Originally noted as "v1.7"; v1.7 is now the Loan tracker, so this is unscheduled.)

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus the `Fallow` code-quality check, plus a live browser check for any UI-visible change. **This set does add one Dexie schema change** (INC-10's `salaryMetadata` table, schema **v13** — additive, minimal `.stores()` declaration per the v11+ convention, no `.upgrade()` needed) and two new non-indexed `appSettings` fields (INC-03's `excludedIncomeCategoryIds`, shipped, and INC-04's `smoothedBonusCategoryIds`, no version bump for either). Every other ticket derives from existing `Transaction`/`Category`/`Account` data. The production bundle budget in `angular.json` is never raised. Components/stores never touch `appDb` tables directly — always through a repository (`SalaryMetadataRepository` for the new table). Every new aggregate routes per-transaction decisions through `classifyForStats()` (directly or via `computeCategoryBreakdown()`) rather than re-checking `transferId`/`nullified`/savings itself, so "income" means the same thing across the whole page and can't drift from the dashboard's numbers. User-facing amounts and dates go through `formatCurrency()`/`localeDate` (TICKET-SET-03/04 made both settings-driven), and charts through `@/shared/echarts`'s theme helpers.
