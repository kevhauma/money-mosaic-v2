# TICKET-REC-04 — Flag what changed: price increases, missed payments, stopped series

- **Area:** Recurring
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Feature
- **Traceability:** extends **FR-REC-1** (detection grows change analysis) and **FR-REC-2** (the
  panel shows it). The "management, not just detection" half of gap #3 in
  [competitive-analysis.md](../../v9999_ideas/competitive-analysis.md) (the Rocket Money lesson —
  what a mass audience actually wants from recurring detection is being told when something
  changed).

## User story

As someone whose subscriptions creep up in price and whose bills occasionally fail silently, I
want the app to flag when a recurring payment got more expensive, is overdue, or has stopped
entirely, so changes in my commitments announce themselves instead of hiding in the noise.

## Description

Adds a change layer on top of the recurring series: each detected series gains flags for a price
step (the typical amount settled at a new level), an overdue expected occurrence, and a stopped
rhythm — computed in the same pure aggregate, and surfaced as badges in the recurring payments
panel and on the bills calendar.

## Current situation (as-is)

- After [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md)/[REC-02](./TICKET-REC-02-recurring-payments-panel.md)
  the panel shows each series' current state but nothing about *change*: a €9.99 → €12.99 step
  just nudges the median, an overdue bill just has a `nextExpectedDate` in the past, and a
  cancelled subscription silently drops out of the list once its rhythm breaks — disappearing is
  the opposite of announcing.
- The repo already has two step/silence detectors to model on, both income-side:
  [wage-change-detection.ts](../../../src/app/core/stats/wage-change-detection.ts) (a move to a
  new sustained level, with a threshold that separates change from noise) and
  [income-gap-detection.ts](../../../src/app/core/stats/income-gap-detection.ts) (gone-quiet
  detection, with the trailing-exclusion lesson: don't let the silence you're detecting hide
  itself, and don't flag the in-progress period).

## Desired result (to-be)

- `RecurringPaymentSeries` grows a `flags` field computed inside
  [recurring-payments.ts](./TICKET-REC-01-recurring-payment-detection.md)'s aggregate (still pure,
  still clock-free via `todayIso`):
  - **`priceChange`** — the recent occurrences sit at a sustained new level relative to the
    earlier ones (both directions; a decrease is good news worth the same badge). Carries
    `{ from, to, atDate }`. Threshold is a named constant separating a real step from ordinary
    jitter, the `wage-change-detection` precedent — one odd amount inside the band tolerance is
    not a price change.
  - **`overdue`** — `todayIso` is past `nextExpectedDate` plus a grace allowance (a named
    constant, generous enough that date jitter and weekends don't cry wolf). Carries the expected
    date.
  - **`stopped`** — at least two whole expected intervals have passed with nothing. A stopped
    series **stays in the result** with this flag instead of un-detecting itself; `overdue` is the
    early warning, `stopped` the conclusion, and a series is never both.
- [REC-02](./TICKET-REC-02-recurring-payments-panel.md)'s panel renders the flags as badges on
  their rows (daisyUI badge, semantic colours, text not colour-only): "Price ↑ €9.99 → €12.99",
  "Expected *date*", "Stopped". Stopped series group at the bottom under a "Stopped" divider
  rather than mixing with active commitments, and leave the summary's monthly-equivalent total.
- [REC-03](./TICKET-REC-03-upcoming-bills-calendar.md)'s calendar marks an overdue expected
  occurrence on its past day (distinct, non-alarmist styling) — the "was expected, didn't arrive"
  cell its Notes deferred to this ticket.

## Acceptance criteria

> ⚠️ **Partly superseded, 2026-08-09.** The Status column and its badges were removed from the panel
> on request. The boxes below were true when this shipped and are left ticked as the record of that,
> but **the badge criteria no longer describe the UI**: `Price ↑ …`, `Overdue — expected …` and the
> per-row `Stopped` badge render nowhere in the table.
>
> Two of the three flags still reach the user by another route, so only one is genuinely lost:
> **stopped** — the series leaves the live list for the collapsed "Stopped (n)" group
> ([TICKET-REC-06](./TICKET-REC-06-stopped-series-collapsed.md)) and counts toward nothing in the
> monthly total; **overdue** — still outlined on the bills calendar and announced in its day list
> and `sr-only` text (this ticket's calendar criteria are unaffected); **priceChange** — now shown
> **nowhere**. The aggregate is untouched: all three are still computed on every series and covered
> by `recurring-payments.spec.ts`, so restoring the price flag is a template change, not a detection
> one.

**Implementation note, 2026-08-08 — how `priceChange` is actually detected.** Not by scanning a
series' amounts for a jump, but by **merging two bands back together**. REC-01's `bandByAmount`
already splits €9.99 from €12.99 (they are more than `AMOUNT_BAND_TOLERANCE` apart), so a sustained
new level *necessarily* arrives as its own detected series — which is precisely the signal wanted:
a level that gathered `MIN_OCCURRENCES` payments is one that sustained. `mergePriceChanges` folds
two same-counterparty, same-cadence series that run back to back into one carrying the step. This
resolves consequence (2) recorded in REC-01's Notes ("a price change can make a series disappear"),
and it makes the within-tolerance-outlier criterion true by construction rather than by threshold.
Two named constants bound it: `PRICE_CHANGE_MAX_GAP_INTERVALS` (how long a hole may be) and
`MAX_PRICE_CHANGE_RATIO` (how large a step may be before "two commitments" is the better
explanation). The stated trade-off: a price change only becomes visible once the new level has three
payments behind it — before that the series reads as overdue, then stopped.

- [x] A series whose amount steps to a sustained new level carries `priceChange` with the right
      `from`/`to`; a single within-tolerance outlier does not trigger it; a price *decrease* is
      flagged too. (Specs: *"folds a sustained price rise back into one series carrying the step"*,
      *"flags a price cut the same way — a decrease is news too"*, *"does not read a single
      within-tolerance outlier as a price change"*, and *"does not merge two commitments that are
      simply too far apart to be one repricing"* — €10 → €40 stays two series.)
- [x] A series past its expected date plus grace carries `overdue`; within grace it carries
      nothing. (Spec: *"leaves a series unflagged inside the grace allowance, and overdue outside
      it"* — day 5 past expected is silent, day 15 is flagged.)
- [x] A series silent for two expected intervals carries `stopped`, remains in the result, and is
      never simultaneously `overdue`. (Specs: *"calls a series stopped after two whole intervals of
      silence, and keeps it listed"* and *"measures lateness in the rhythm's own intervals, not in
      days"* — 24 days is three weekly intervals but nothing at all to a monthly rhythm.)
- [x] All three thresholds are named, doc-commented constants; the aggregate stays pure and
      clock-free (`todayIso` parameter only). (`OVERDUE_GRACE_DAYS`, `STOPPED_INTERVALS`,
      `PRICE_CHANGE_MAX_GAP_INTERVALS`, plus `MAX_PRICE_CHANGE_RATIO` added in review. Confirmed by
      `conventions-reviewer`: "core/stats stays pure and clock-free … all three thresholds are
      named, doc-commented constants".)
- [x] The panel shows the three badges (with amounts formatted via `formatCurrency()` and masked
      under privacy mode), groups stopped series separately, and excludes them from the summary
      total. (Specs: *"badges a stopped series, in words rather than by colour alone"*, *"badges a
      price step with both levels, and withholds them under privacy mode"* — a badge's amounts are
      baked into its text, so `mm-privacy-blur` cannot reach them and they are withheld as `•••`
      instead — *"lists stopped series under their own heading, not among live commitments"*, and
      *"leaves stopped series out of the count and the monthly total"*.)
- [x] The calendar marks an overdue expected occurrence on its past day. (Spec: *"marks an overdue
      expected occurrence on its past day, in words as well as styling"*. `ProjectedOccurrence`
      gained `overdue`, true only for the one date the flag names; the grid outlines that entry and
      the `sr-only` mirror and day tooltip both say "not yet arrived", since colour is never the only
      signal. The list view says the same thing as a badge — *"says the same thing in list view,
      where there is no cell to outline"*.)
- [x] Unit tests cover: price step up and down; the within-tolerance outlier non-flag; overdue
      inside vs. outside grace; the two-interval stop; a stopped series staying listed; badge
      rendering and the stopped-group split in the panel. (7 aggregate cases + 4 panel cases + 3
      calendar cases + 1 projection case.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (2026-08-08: "All
      files pass linting"; 241 spec files / 2530 tests passed; "Application bundle generation
      complete", no budget warning. One run hit the **pre-existing** `app-settings.repository.spec.ts`
      flake diagnosed during REC-01 — a cross-spec `fake-indexeddb` leak, unrelated to this change —
      which did not reproduce on re-run.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`:
      maintainability 92.3 "good", dead files/exports 0.0%, no duplicate clone groups, no CRITICAL.
      `conventions-reviewer` raised twelve findings; the significant one was a **contradiction
      between the two panels** — the bills calendar kept projecting stopped series onto future days,
      directly below a panel saying "no longer counted in the monthly total". `RecurringSeriesStore`
      now exposes `activeSeries` and both sections read it, so the rule lives in one place. Also
      applied: the overdue badge says "Overdue —" rather than only a date the row already shows;
      badges moved out of `<th scope="row">` into their own Status column, since a row header is
      re-announced before every cell; `scope="rowgroup"` on the stopped-group heading; the list view
      gained the overdue badge it was missing; `MAX_PRICE_CHANGE_RATIO` added so "same commitment
      repriced" is as tight as its comment claims; `mergePriceChanges` split into three named
      helpers, clearing fallow's HIGH on it; `MASKED_AMOUNT` renamed apart from the calendar's
      `HIDDEN_AMOUNT`; and both component specs switched from real-clock arithmetic to the repo's
      `vi.useFakeTimers({ toFake: ['Date'] })` pattern with literal fixture dates.)
- [ ] Verified live in the browser: badges render in the panel on `/explore` with real data (or a
      crafted import exercising each flag). — **not done: the user asked for this track to be worked
      without browser checks.** Left open rather than ticked.

## Notes

- **Flags are computed, not stored** — rerunning detection after a new import naturally updates or
  clears them. "Dismiss this flag" needs persistence and is out of scope for the same no-schema
  reason as REC-01's overrides (see the version overview's "Considered, not ticketed yet").
- The in-app notification/inbox angle ("what changed since last visit", competitive analysis gap
  #9) would *consume* these flags but needs a last-seen marker (persistence again) — explicitly
  not this ticket.
- Needs [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md) and
  [TICKET-REC-02](./TICKET-REC-02-recurring-payments-panel.md); the calendar marker extends
  [TICKET-REC-03](./TICKET-REC-03-upcoming-bills-calendar.md) if it has shipped, and that clause
  moves with REC-03 if it hasn't.
