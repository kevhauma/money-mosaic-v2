# TICKET-STAT-12 — Round chart tooltip values to 2 decimal places

- **Area:** Statistics & Dashboard
- **Type:** Bug fix
- **Traceability:** fixes FR-STAT-3 (category breakdown), FR-STAT-4 (trends), and the account balance/net-worth history views (TICKET-STAT-02/03)

## User story

As a user, I want the numbers shown when I hover over a chart (income/expense/net-worth trend, account balance history, category breakdown donut) to be rounded to 2 decimal places like every other money figure in the app, so a hover popup doesn't show raw floating-point noise (e.g. `1234.5600000000002`) that looks broken and is harder to read than the already-correct figures right next to the chart.

## Description

Every one of the app's four `ngx-echarts` chart components sets `tooltip: { trigger: ... }` without a `formatter`, so echarts falls back to its own default tooltip renderer, which stringifies the raw `series[].data` number with no rounding or currency formatting at all. Every other money value in the app is already routed through `SignedAmountPipe` (or an equivalent `Intl.NumberFormat` currency formatter) and reads correctly — only the chart hover popups bypass it. This ticket adds a `formatter` to all four chart options that reuses the app's existing EUR currency formatting, and fixes one more raw, unformatted amount cell found during the audit (the CSV import preview table).

## Current situation (as-is)

- [net-worth-history-chart.component.ts:31](../../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts) — `tooltip: { trigger: 'axis' }`, no `formatter`; series `data` (line 48) is `points.map((point) => point.netWorth)`, raw floats.
- [account-balance-chart.component.ts:29](../../../src/app/feature-accounts/components/account-balance-chart/account-balance-chart.component.ts) — same gap; series `data` (line 40) is `points.map((point) => point.netWorth)`, raw floats.
- [trend-chart-panel.component.ts:26](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts) — same gap; `series` (lines 35-42) push raw `bucket.income`, `-bucket.expense`, `point.netWorth`.
- [category-breakdown-panel.component.ts:63](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts) — `tooltip: { trigger: 'item' }`, no `formatter`; pie `data` (lines 68-72) uses `value: entry.total`, the raw total — even though a correctly rounded `entry.formattedTotal` (line 54, via the local `EUR_FORMATTER`) already exists on the same view-model and is used in the list below the chart, just not wired into the tooltip.
- Currency formatting is duplicated three times instead of shared: [signed-amount.pipe.ts:3-7](../../../src/app/shared/utils/signed-amount.pipe.ts) (`SignedAmountPipe`, `Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR', signDisplay: 'always' })`), [category-breakdown-panel.component.ts:22](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts) (unsigned variant), and [dashboard-overview.component.ts:13-17](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts) (another unsigned variant). All three are functionally the same `Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' })` call with only `signDisplay` differing.
- [import-preview-step.component.html:26](../../../src/app/feature-import/components/import-preview-step/import-preview-step.component.html) — `<td ...>{{ row.transaction.amount }}</td>`, raw amount interpolated directly, no pipe at all.

## Desired result (to-be)

- A new shared `shared/utils/currency-format.ts` exports one `Intl.NumberFormat`-backed `formatCurrency(amount: number, options?: { signed?: boolean }): string` (or equivalent), EUR/`en-BE`, always 2 decimal places. `SignedAmountPipe` and the two ad-hoc formatters in `category-breakdown-panel.component.ts` and `dashboard-overview.component.ts` are refactored to call it instead of constructing their own `Intl.NumberFormat`, so there's exactly one source of currency-rounding truth.
- All four chart `tooltip` configs gain a `formatter` that renders each series/point's value through that shared formatter (axis-trigger charts format every series in the hovered bucket; the item-trigger pie formats the single hovered slice), so a hover popup always shows a 2-decimal EUR amount (e.g. `€1,234.56`) instead of a raw float.
- `category-breakdown-panel`'s pie tooltip reuses the same value the adjacent list already shows (`entry.formattedTotal`) rather than re-formatting `entry.total` separately, so the two can't drift.
- The import-preview table's amount cell renders through `| signedAmount` (or the new shared formatter) instead of raw interpolation, matching every other amount cell in the app.

## Acceptance criteria

- [x] `shared/utils/currency-format.ts` exists, is exported from `shared/utils/index.ts`, and is the single place that constructs the EUR `Intl.NumberFormat`.
- [x] `SignedAmountPipe`, `category-breakdown-panel.component.ts`'s formatter, and `dashboard-overview.component.ts`'s formatter all delegate to the shared util instead of each declaring their own `Intl.NumberFormat`.
- [x] `net-worth-history-chart.component.ts`, `account-balance-chart.component.ts`, `trend-chart-panel.component.ts`, and `category-breakdown-panel.component.ts` each set a `tooltip.formatter` that renders every value through the shared formatter — verified for both axis-trigger (multi-series) and item-trigger (pie) tooltip shapes.
- [x] `category-breakdown-panel`'s tooltip formatter reuses the entry's existing `formattedTotal` rather than reformatting `total` independently.
- [x] `import-preview-step.component.html:26` renders `row.transaction.amount` through `| signedAmount` instead of raw interpolation.
- [x] No chart's underlying data values change — only the tooltip's rendered text; axis labels, legends, and drill-down behaviour are unaffected.
- [x] Persistence/derivation is untouched — this is display-only formatting, no store or repository changes.
- [x] Unit tests cover: `formatCurrency` (or equivalent) rounds to exactly 2 decimals for values with more precision (e.g. `1234.5600000000002` → `€1,234.56`), formats negative values correctly, and (for the signed variant) always shows a sign; each chart-option builder's `tooltip.formatter` output is asserted for a sample data point in its `.spec.ts`.
- [x] Verified via the fallow skill and coding-conventions skill.
- [x] Verified live in the browser: hovering a point on the dashboard trend chart, the account balance/net-worth history charts, and the category breakdown donut each shows a value rounded to 2 decimals; the import CSV preview step shows amounts formatted like the rest of the app.

## Notes

- This is purely a presentation-layer fix — the underlying floating-point drift in stored/derived amounts (if any) is out of scope; only how values are *displayed* changes.
- Scope was set to the four chart tooltips (the reported symptom) plus the one other raw-interpolation amount cell found during the audit (import preview). If a further sweep later turns up more raw amount interpolations elsewhere, treat that as a separate follow-up ticket rather than re-opening this one.
