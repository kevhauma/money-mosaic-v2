# TICKET-REC-02 — Recurring payments panel: what repeats, what it costs per month

- **Area:** Recurring
- **Type:** Feature
- **Traceability:** adds **FR-REC-2**, rendering FR-REC-1's detection
  ([TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md)). Graduated from gap #3 of
  [competitive-analysis.md](../../v9999_ideas/competitive-analysis.md). Privacy-mode compliance per
  [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).

## User story

As someone who suspects the subscriptions are quietly adding up, I want one list of every payment
the app has detected as recurring — what it is, how often, what it typically costs, and what that
means per month — so I can see my total recurring commitment and spot the ones worth cancelling.

## Description

Adds a "Recurring payments" section to the Explore page: a table of detected series (name,
category, cadence, typical amount, last paid, next expected, monthly equivalent) with a summary
line totalling the monthly-equivalent cost, and expandable rows showing the actual occurrences
behind each series.

## Current situation (as-is)

- [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md) computes
  `RecurringPaymentSeries[]` but nothing renders it.
- The Explore page ([explore-overview.component.html](../../../src/app/feature-explore/components/explore-overview/explore-overview.component.html))
  renders the money-flow Sankey and nothing else; its sections pattern (each panel decides for
  itself whether it has anything to draw) is established there.
- The Transactions list can show any of these transactions individually, but no view groups them
  into "this is the same bill, monthly".

## Desired result (to-be)

- New `app-recurring-payments-panel` under `feature-explore/components/recurring-payments-panel/`,
  `OnPush`, rendered on `/explore` below the money-flow section, exported via the components
  barrel like its siblings.
- Reads `TransactionsStore`/`CategoriesStore`/`AccountsStore` from `@/core/state` — never a
  repository or `appDb` — and calls `detectRecurringPayments` over the **full history**, with
  today's date supplied by the component (the aggregate stays clock-free).
- **Deliberately not filtered by the Explore date range** — cadence only exists across time. A
  short caption states this plainly ("Detected across your whole history — not filtered by the
  range above"), because a page whose header range doesn't apply to one section must say so rather
  than let the user misread it.
- The table lists each active series: label, category (colour-chipped, "Uncategorised" explicit),
  cadence in words ("Monthly"), typical amount, last paid date, next expected date, and monthly
  equivalent. A summary line totals it: "*N* recurring payments ≈ €*X*/month".
- Expanding a row reveals its occurrences (date + amount per transaction) inline — the evidence
  for the detection, so a false positive is diagnosable at a glance.
- Amounts through `formatCurrency()`, dates through `localeDate`; every amount (rows, occurrences,
  summary) masks under privacy mode per TICKET-PRIV-01.
- Sorted by monthly equivalent descending — the expensive commitments first.
- Nothing detected → the section renders a quiet empty state saying detection needs at least three
  occurrences of a payment, so a fresh import isn't read as "you have no subscriptions".
- This is a real `<table>` with a caption — no separate sr-only mirror needed (the
  [TICKET-STAT-20](../../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md)
  convention exists for canvas charts; here the accessible table *is* the UI).

## Acceptance criteria

- [x] The panel renders on `/explore` with the detected series, their cadence, typical amount,
      last paid, next expected, and monthly equivalent, sorted by monthly equivalent descending.
      (`recurring-payments-panel.component.html` renders the seven-column table;
      `explore-overview.component.html` mounts `<app-recurring-payments-panel />`. Specs: *"lists
      each detected series with its cadence, typical amount, dates and monthly equivalent"* and
      *"sorts the series by monthly equivalent, most expensive first"*.)
- [x] The summary line shows the series count and the summed monthly-equivalent total. (Spec:
      *"summarises the count and the summed monthly-equivalent total"* — "2 recurring payments"
      and €17.99 from a €12.99 + €5.00 pair. The total is summed from the series' own
      `monthlyEquivalent`s, so it can never disagree with the column above it.)
- [x] Expanding a series shows its individual occurrences with dates and amounts. (Spec: *"expands
      a series to its individual occurrences, and collapses again"* — four dated rows, and
      `aria-expanded` flipping on the disclosure button both ways.)
- [x] The section does not react to the Explore date range, and the caption saying so is present.
      (Spec: *"states that detection ignores the page range, and does not react when the range
      changes"* — a range excluding every occurrence leaves the rendered cells identical. The panel
      injects no `RangeStore`, which is what makes that structural rather than incidental.)
- [x] All amounts (rows, occurrences, summary) honour privacy mode; dates and amounts use
      `localeDate`/`formatCurrency()`. (Spec: *"blurs every amount under privacy mode — rows,
      occurrences and the summary"*, which asserts both the 7 expected `.mm-privacy-blurred`
      wrappers *and* that no element renders a currency figure as its own text outside one. Dates
      go through `formatDate` — `localeDate`'s own pure function — in the row view-model rather
      than the pipe, since the row is built in the class.)
- [x] The empty state renders when no series is detected and explains the three-occurrence
      minimum. (Spec: *"explains the three-occurrence minimum when nothing is detected"*; rendered
      via `mm-empty-state` rather than a hand-rolled block.)
- [x] Data access goes through `TransactionsStore`/`CategoriesStore`/`AccountsStore` from
      `@/core/state` — no repository or Dexie import in the component. (Plus `AppSettingsStore` for
      privacy mode; the component's only other imports are `@/core/stats`, `@/core/transfers`,
      `@/shared/ui`, `@/shared/echarts` and `@/shared/utils`. Confirmed by the
      `conventions-reviewer`: "store access exclusively via `@/core/state`".)
- [x] Unit tests cover: series render with correct per-row figures and sort order; the summary
      total; row expansion showing occurrences; privacy-mode masking; the empty state; the
      panel ignoring an Explore range change. (`recurring-payments-panel.component.spec.ts`, 8
      cases — the listed six plus the uncategorised-label case; `explore-overview.component.spec.ts`
      additionally asserts the panel survives the empty-range branch, which is the overview's own
      composition decision and not provable from the panel's spec.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched. (2026-08-07: "All files pass linting"; 239 spec files / 2485 tests passed;
      "Application bundle generation complete", no budget warning, `angular.json` not in the diff.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`:
      maintainability 93.6 "good", dead files 0.0%, **dead exports 0.0%** — this panel is REC-01's
      first consumer, so its temporary `unused-export` suppression was removed with this ticket as
      its own comment promised — 0 duplication, no CRITICAL function. `conventions-reviewer` raised
      nine findings, all applied: display facts moved off the template into
      `feature-explore/recurring-payments-row-vm.ts` (`expandIcon`, `toggleAriaLabel`,
      `summaryLabel`), `CHART_NO_COLOR_FALLBACK` imported instead of a duplicated hex, typography
      utilities dropped from the `mm-button` call site, `mm-empty-state` reused instead of a
      re-authored block, `scope="col"`/`scope="row"` added, `seriesCount` decoupled from row
      expansion, and spec cases added for the new `ariaExpanded` input and the overview placement.)
- [ ] Verified live in the browser: the panel renders on `/explore` with real imported data and a
      known real subscription appears with a plausible cadence and next-expected date. — **not
      done: the user explicitly asked to work this ticket without a browser check.** Left open
      rather than ticked, since nothing here proves how it looks or behaves against a real import.

## Notes

- **Why the Explore page and not a Dashboard panel:** the table needs full width and is
  range-independent, both of which fight the Dashboard's panel grid and shared range; Explore
  already accepts full-width sections with their own rules. If a compact "top 3 subscriptions"
  Dashboard card is ever wanted, it is a separate FR-STAT ticket consuming the same aggregate.
- Row expansion (not navigation) keeps this ticket self-contained:
  `buildTransactionDrilldownParams` ([search-params.ts](../../../src/app/shared/utils/search-params.ts))
  has no counterparty param, so deep-linking a series to the Transactions page would smuggle a
  Transactions-feature change into a panel ticket — same reasoning as the heatmap's weekday
  drill-down limitation recorded in the version overview.
- Needs [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md) and the Explore scaffold
  ([TICKET-EXP-01](./TICKET-EXP-01-explore-page-scaffold.md), shipped). Independent of EXP-02..05.
  Prerequisite for the badges of [TICKET-REC-04](./TICKET-REC-04-recurring-change-flags.md).
