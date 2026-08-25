# TICKET-STAT-44 — Category breakdown draws a donut for a single 100% category

- **Area:** Dashboard / Stats
- **Released in:** [v2.3 UX review](../../releases/v2.3_ux_review/overview.md)
- **Type:** Bug fix
- **Traceability:** UX review (UXR-21); extends FR-STAT-2 (category breakdown)

## User story

As someone glancing at my category breakdown, I want the chart to only appear when there is a breakdown to show, so that a single category does not get drawn as a proportion of itself.

## Current situation (as-is)

The dashboard's Category breakdown renders an ECharts donut regardless of how many categories are present. With a single category — "Salary" at 100% on the seeded income side — the result is a complete ring occupying half the card while conveying exactly one number, which the adjacent list already states.

Related presentation problems in the same panel:

- The Expense donut's slice labels **collide and truncate** ("Groceri…") once several categories are present.
- A "**Show more (1)**" disclosure appears for exactly one additional row — a control costing a click to reveal a single line.
- The `/dashboard` "Category period comparison" renders four cards each showing three grey bars, one red bar, "0%", and "Avg €950.00 / High €950.00 / Low €950.00" — ~~an empty state formatted like data~~, and one whose red bar reads as an error.

  > **Correction, 2026-08-23, recorded while implementing.** Not an empty state. Traced through
  > [category-period-comparison.ts](../../../src/app/core/stats/category-period-comparison.ts):
  > `average`/`highest`/`lowest` are taken over `totalsWithData`, which is the same set of
  > contributing periods for *every* category, and the panel already refuses to render at all below
  > two of them (`hasEnoughData`, TICKET-STAT-04). So a card can never be showing "only one period
  > has data". Avg = High = Low = €950 with a 0% delta is a **fixed monthly cost measured
  > correctly** — the dev seed's €950 housing, identical in every window period.
  >
  > The defect is presentational and one layer up: stating one unchanging figure three times under
  > three different headings, over a delta of 0%, reads as a card that failed to compute rather than
  > as a bill that never changes. That is what is fixed — the card now says the figure once. The
  > criterion below is amended to match; no `core/stats` arithmetic was touched.
  >
  > The **red bar** was also checked and is not this ticket's to fix: the selected bar is
  > `bg-primary` ([comparison-category-card.component.html](../../../src/app/feature-dashboard/components/comparison-category-card/comparison-category-card.component.html)),
  > not `bg-error`. It only reads red because primary and error sit five hue degrees apart in both
  > default themes — exactly [TICKET-UI-27](../../design-system/tickets/TICKET-UI-27-separate-money-colours-from-brand-colour.md),
  > as this ticket's own Notes predicted.

## Desired result (to-be)

- With a single category, the panel shows the figure directly instead of drawing a proportion of itself.
- Slice labels stay legible as the category count grows, or move to the accompanying list.
- A disclosure only appears when it hides enough rows to be worth a click.
- Panels with no meaningful comparison say so, rather than rendering placeholder numbers and a red bar.

## Acceptance criteria

- [x] With exactly one category, the panel renders a direct figure rather than a full-ring donut. (Live on `/dashboard`: the Income column (one source, Salary) renders `€2.800,00 / Salary / All of this range’s income, from one source — nothing to split.` with `[echarts]` count `0`, while the Expense column keeps its donut (`[echarts]` count `1`). Spec: *replaces the donut with the figure itself when there is exactly one category*.)
- [x] With several categories, no slice label overlaps another or is truncated mid-word at the default dashboard width. (No slice labels are painted at all — `label: { show: false }` on the pie series, so there is nothing that can collide at any category count. The names moved to the accompanying list, which now carries each slice's colour as a swatch (`background-color` read live off every row). Screenshotted with six expense categories. Spec: *paints no slice labels…* and *gives every list row its slice colour*.)
- [x] The "Show more" disclosure appears only above a stated threshold of hidden rows. (`DISCLOSURE_MIN_HIDDEN = 3` in [category-breakdown-panel.component.ts](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts); below it the column simply lists everything. Live: the seeded Expense column has 6 categories — one over the top-5 — and now renders all six rows with no disclosure, where it used to show the reported "Show more (1)". Specs: *offers no disclosure when it would hide fewer than three rows* (7 categories → no button) and *offers the disclosure once it hides three rows or more* (8 → `Show more (3)`).)
- [x] ~~"Category period comparison" renders an explanatory empty state when there is no prior period to compare against~~, **and states an unchanging figure once instead of as three identical statistics**, and does not use the error colour for a non-error. (Superseded per the correction above — the "no prior period" case cannot reach a card, and the panel's existing `hasEnoughData` empty state already covers it. Built instead: `formattedFigures` goes `null` when `highest === lowest`, and the card renders `€950,00 every period — unchanged.` in place of Avg/High/Low. Specs: *states a fixed cost once rather than as three identical statistics* and *keeps Avg/High/Low as soon as the figure actually moves* in [category-comparison-panel.component.spec.ts](../../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.spec.ts), plus *states the one figure once when it never moved* on the card. Error colour: the bar is `bg-primary`, never `bg-error` — deferred to TICKET-UI-27 as this ticket's Notes anticipated.)
- [x] The accompanying data table remains correct in every case, including the single-category one. (The list is that table and is untouched by the chart branch — live, the one-source Income column still lists `Salary €2.800,00 · 100%`. Spec: *keeps the accompanying list correct in the one-category case*. The uncategorised callout moved onto the column view-model in the same change and its two existing specs pass unmodified.)
- [x] Unit tests cover: one category renders the direct figure, not the donut; several categories render the chart; the disclosure threshold; the ~~no-comparison~~ **unchanged-figure** empty state. (Seven specs under `describe('presentation defects (TICKET-STAT-44)')`, plus three on the comparison side — see the amended criterion above for why "no-comparison" became "unchanged". `ng test`: 287 files / 3372 tests, up from 3355.)
- [x] Verified live in the browser on a single-category range and a multi-category range. (Both at once on `/dashboard`, July 2026: the Income column is the single-category case and Expense the multi-category one, side by side in the same panel. Screenshotted. The comparison cards below read `Housing / €950,00 every period — unchanged.` ×4, replacing the reported `Avg/High/Low €950.00` and `0%`.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow health --complexity` initially **failed** at 31 cognitive on this template — over the 30 ceiling. Fixed by refactoring rather than suppressing: the `kind === 'expense' && uncategorisedCallout()` test and the `transactionCount === 1 ? '' : 's'` plural both moved onto the column view-model, which is the convention anyway (templates state facts, they don't derive them). Both gates then exit `0`.)

## Notes

- The "Accounts" dashboard widget has a related shape problem — a full-width card holding two small pills and roughly 500px of empty space. Not scoped here, but the same question applies: does this content justify this container.
- The red bar in the comparison cards may be resolved for free by [TICKET-UI-27](../../design-system/tickets/TICKET-UI-27-separate-money-colours-from-brand-colour.md) if it is the brand/error collision; check before treating it separately.
