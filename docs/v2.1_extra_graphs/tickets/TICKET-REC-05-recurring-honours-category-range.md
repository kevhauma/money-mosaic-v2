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

- [ ] A rent-shaped fixture (regular monthly series, category `activeUntil` last year) produces
      no series entry, no flags, no calendar occurrences, and `concludedSeriesCount: 1`.
- [ ] A series whose category window closes in the future stays listed, and both
      `nextExpectedDate` and the calendar projection clip at `activeUntil`.
- [ ] Series in windowless categories and uncategorised series are byte-for-byte unaffected
      (existing REC-01..04 specs still pass unchanged).
- [ ] The panel caption renders exactly when `concludedSeriesCount > 0`.
- [ ] The aggregate stays pure and clock-free; the window comparison reuses CAT-10/11's shared
      helper rather than reimplementing it.
- [ ] Unit tests cover: the concluded-rent case end to end; the future-window clipping in both
      detection and projection; the windowless no-op; the caption's presence/absence.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: give a detected series' category a past `activeUntil` and
      watch it leave the `/explore` recurring list and calendar.

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
