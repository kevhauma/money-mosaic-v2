# TICKET-REC-04 — Flag what changed: price increases, missed payments, stopped series

- **Area:** Recurring
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

- [ ] A series whose amount steps to a sustained new level carries `priceChange` with the right
      `from`/`to`; a single within-tolerance outlier does not trigger it; a price *decrease* is
      flagged too.
- [ ] A series past its expected date plus grace carries `overdue`; within grace it carries
      nothing.
- [ ] A series silent for two expected intervals carries `stopped`, remains in the result, and is
      never simultaneously `overdue`.
- [ ] All three thresholds are named, doc-commented constants; the aggregate stays pure and
      clock-free (`todayIso` parameter only).
- [ ] The panel shows the three badges (with amounts formatted via `formatCurrency()` and masked
      under privacy mode), groups stopped series separately, and excludes them from the summary
      total.
- [ ] The calendar marks an overdue expected occurrence on its past day.
- [ ] Unit tests cover: price step up and down; the within-tolerance outlier non-flag; overdue
      inside vs. outside grace; the two-interval stop; a stopped series staying listed; badge
      rendering and the stopped-group split in the panel.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: badges render in the panel on `/explore` with real data (or a
      crafted import exercising each flag).

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
