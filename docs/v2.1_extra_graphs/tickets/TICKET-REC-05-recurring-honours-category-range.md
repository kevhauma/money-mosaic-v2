# TICKET-REC-05 — The recurring list honours a category's applicability range

- **Area:** Recurring
- **Type:** Feature
- **Traceability:** extends **FR-REC-1/2/3** with **FR-CAT-9**'s window
  ([TICKET-CAT-10](./TICKET-CAT-10-category-applicability-range.md)). This is the ticket the
  range feature was asked for: "rent that's not applicable anymore shouldn't be in the list."

## User story

As someone whose rent ended when they bought a house, I want the recurring payments list to treat
that series as concluded — gone from the list and the calendar, not flagged as a scary "Stopped"
— so the recurring view describes my current commitments, not my biography.

## Description

Teaches the recurring aggregate about category applicability: a detected series whose category
window has closed is *concluded by declaration* and leaves the results entirely — no panel row,
no calendar projection, no stopped/overdue flag — and a window closing in the future clips the
projection at its end date.

## Current situation (as-is)

- After [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md)..[04](./TICKET-REC-04-recurring-change-flags.md),
  an ended rent is exactly what REC-04's `stopped` flag catches: two silent intervals →
  flagged "Stopped", listed forever under the stopped divider. Correct for a payment that failed;
  wrong for one the user *knows* ended — there is no way to tell the detector "this conclusion is
  expected".
- After [TICKET-CAT-10](./TICKET-CAT-10-category-applicability-range.md) the category carries
  `activeFrom`/`activeUntil`, but `detectRecurringPayments` (which already receives
  `categoriesById`) ignores them.
- `projectRecurringOccurrences` ([TICKET-REC-03](./TICKET-REC-03-upcoming-bills-calendar.md))
  projects every series through the whole window it is asked about.

## Desired result (to-be)

- In `detectRecurringPayments`: a series whose category's `activeUntil` is before `todayIso` is
  excluded from `series` and counted in a new `concludedSeriesCount` on the result — dropped
  honestly, the `nettedOutLinkCount` precedent from the money-flow aggregate. Excluded means
  excluded everywhere downstream for free: panel, calendar, flags.
- A window closing in the *future* keeps the series active but bounds it: `nextExpectedDate`
  never exceeds `activeUntil`, and `projectRecurringOccurrences` stops projecting past it — a
  gym membership cancelled per end-of-year drops off the calendar exactly at year end.
- A concluded series is never `overdue` or `stopped` (it is simply absent, which is stronger);
  categories with no window change nothing.
- The panel ([TICKET-REC-02](./TICKET-REC-02-recurring-payments-panel.md)) may show a one-line
  muted caption when `concludedSeriesCount > 0` ("N concluded series hidden — categories with an
  ended applicability range"), so the disappearance is explicable, not spooky.
- Uncategorised series (`categoryId: null`) have no window and are unaffected.

## Acceptance criteria

**Implementation note (2026-08-09):** the future-window bound reaches `projectRecurringOccurrences`
as a new optional `projectUntil` field on the series, not as a category lookup inside the projection.
The to-be said "`projectRecurringOccurrences` stops projecting past it" without saying how; carrying
the date on the series is what keeps that function category-unaware, which is the property that lets
it serve a calendar, a list and a later forecast from one signature.

- [x] A rent-shaped fixture (regular monthly series, category `activeUntil` last year) produces
      no series entry, no flags, no calendar occurrences, and `concludedSeriesCount: 1`.
      (`recurring-payments.spec.ts` → "drops a series whose category window closed, with no flags
      and a conclusion count", which first asserts the *same* fixture reads as REC-04 `stopped`
      without a window, so the difference is the declaration and not the fixture.)
- [x] A series whose category window closes in the future stays listed, and both
      `nextExpectedDate` and the calendar projection clip at `activeUntil`.
      (`recurring-payments.spec.ts` → "leaves a series whose window closes in the future listed,
      clipped at activeUntil" asserts `nextExpectedDate` and `projectUntil` both become the window
      end; `recurring-projection.spec.ts` → "stops projecting past projectUntil even when the caller
      asks about a wider span".)
- [x] Series in windowless categories and uncategorised series are byte-for-byte unaffected
      (existing REC-01..04 specs still pass unchanged).
      (`recurring-payments.spec.ts` → "leaves a windowless category’s series byte-for-byte
      unchanged" compares the whole series object against the no-category run, and "leaves an
      uncategorised series alone". Every REC-01..04 spec passes untouched **except one line**: the
      empty-history case asserted the whole result envelope with `toEqual({ series: [] })`, so it
      gained `concludedSeriesCount: 0`. The series half of that assertion is unchanged.)
- [x] The panel caption renders exactly when `concludedSeriesCount > 0`.
      (`recurring-payments-panel.component.spec.ts` → "renders no caption when nothing was
      concluded" and "drops the series and captions the absence when its category window has
      closed"; `concludedCaption` returns `''` rather than a count, so the template branches on
      emptiness.)
- [x] The aggregate stays pure and clock-free; the window comparison reuses CAT-10/11's shared
      helper rather than reimplementing it.
      (`boundedByCategoryWindow` in `recurring-payments.ts` calls `categoryHasEnded` from
      `@/core/categorisation` and takes `todayIso` as a parameter — no `Date.now()` added; the
      whole spec file drives "today" through `detect`/`detectAt`.)
- [x] Unit tests cover: the concluded-rent case end to end; the future-window clipping in both
      detection and projection; the windowless no-op; the caption's presence/absence.
      (12 new cases across `recurring-payments.spec.ts`, `recurring-projection.spec.ts` and the
      panel spec, including the inclusive-final-day edge that pins this to `categoryHasEnded`.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass.
      (2026-08-09: lint clean, 2599 tests / 243 files passed, dev bundle built. One unrelated
      pre-existing flake, `app-settings.repository.spec` "falls back to the default settings", was
      reproduced on a stashed clean tree — 1 failure in 3 baseline runs — so it is not from this
      change.)
- [x] Verified via the fallow skill and coding-conventions skill.
      (Both `.husky/pre-commit` fallow gates exit 0; the panel keeps its view-model shape and the
      new store computed follows the existing `RecurringSeriesStore` derivation-only pattern.)
- [x] Verified live in the browser: give a detected series' category a past `activeUntil` and
      watch it leave the `/explore` recurring list and calendar.
      (2026-08-09, dev server on :4210, against the local dev data's real "Vesta Rentals" monthly
      rent series. **No window:** 7 series ≈ €1,202.04/month, rent listed, rent on the calendar,
      no caption. **`activeUntil` 2026-06-30 (past):** 6 series ≈ €252.04/month, rent absent from
      both the list and the bills calendar, caption "1 concluded series hidden — categories with an
      ended applicability range". **`activeUntil` 2026-08-31 (future):** rent listed again with no
      flags and "Next expected" showing 08/31/2026 instead of 09/02/2026, and the September
      calendar's accessible table lists no rent — the only Vesta cell in that grid is the leading
      31-August day. The category window and the crafted rows were reverted afterwards; the dev
      database is back to 41 transactions and no category carrying a window.)

## Notes

- **Declaration beats inference.** REC-04's `stopped` flag stays valuable for the *unexpected*
  stop (a failed debit, a silently lapsed insurance); this ticket only removes series the user
  has explicitly dated the end of. The two mechanisms answer different questions and coexist.
- The category window is per-*category*, so it fits costs that end with a life chapter (rent,
  childcare, a car loan's category). A per-*series* dismissal ("hide this one subscription")
  would need persistence keyed by series identity and is recorded as out of scope in the version
  overview.
- Needs [TICKET-CAT-10](./TICKET-CAT-10-category-applicability-range.md) and
  [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md)+[02](./TICKET-REC-02-recurring-payments-panel.md);
  the projection-clipping clause lands with [TICKET-REC-03](./TICKET-REC-03-upcoming-bills-calendar.md)
  and the flag interactions with [TICKET-REC-04](./TICKET-REC-04-recurring-change-flags.md) —
  build it after those, or fold the respective clauses into them if worked together.
