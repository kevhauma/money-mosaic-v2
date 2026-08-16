# TICKET-STAT-41 — Quick year navigation on the standalone date-range calendar

- **Area:** Shared UI / Statistics & Dashboard
- **Type:** Feature
- **Traceability:** extends FR-STAT-7; follows from
  [overview.md](../overview.md)'s scope decision 4, which keeps
  [`mm-date-range-input`](../../../src/app/shared/ui/date-range-input/date-range-input.component.ts)
  out of [TICKET-STAT-38](./TICKET-STAT-38-two-panel-range-picker.md)'s two-panel rebuild

## User story

As someone picking a date range far from today (e.g. a transaction from three years ago), I want
to jump the standalone calendar by year, so that I don't have to click "previous" a dozen times to
page back one month at a time.

## Description

Adds year-stepping controls to `mm-date-range-input`'s Cally popover, closing the "far away dates"
gap that overview.md's "Considered, not ticketed" section left open when it decided the Transactions
filter would keep this simpler control instead of adopting the full Grafana-style picker. The
control stays a single calendar popover — no second panel, no quick-range catalogue, no relative
expressions.

## Current situation (as-is)

- [`date-range-input.component.html`](../../../src/app/shared/ui/date-range-input/date-range-input.component.html)
  renders `<calendar-range>` + `<calendar-month>` with no navigation controls of its own beyond
  Cally's built-in month-only previous/next arrows — reaching a date years away means many month
  clicks.
- Cally's `calendar-month`/`calendar-range` elements expose a `focusedDate` attribute that controls
  which month is currently displayed and can be set imperatively
  (`node_modules/cally/dist/cally.d.ts`), but
  [`date-range-input.component.ts`](../../../src/app/shared/ui/date-range-input/date-range-input.component.ts)
  never reads or writes it today.
- `mm-date-range-input` is used standalone in
  [`transaction-filters.component.html:13-18`](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.html)
  (the Transactions page filter) and, disabled-until-`custom`, inside
  [`range-grouping-switcher.component.html`](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.html).
  [TICKET-STAT-38](./TICKET-STAT-38-two-panel-range-picker.md) retires the switcher usage on
  Dashboard/Explore/Accounts, but per scope decision 4 the Transactions filter keeps this component
  as its standalone reactive-form field — this ticket is the one that revisits it.

## Desired result (to-be)

- The popover gains an explicit "previous year" / "next year" control alongside Cally's own month
  chevrons (e.g. `«` / `»` icon buttons flanking or below the month header).
- Clicking it moves the displayed month back/forward exactly 12 months by updating the calendar's
  `focusedDate`, without changing the already-selected `from`/`to` value or discarding an
  in-progress range selection (one end picked, waiting on the other).
- No change to the `DateRangeValue`/`valueChange` output contract — this is calendar navigation
  only, not a new emitted value.
- Available everywhere `mm-date-range-input` is used today (Transactions filter; the disabled
  `custom` slot inside the switcher until STAT-38 removes that usage).

## Acceptance criteria

- [ ] `mm-date-range-input` renders a "previous year"/"next year" control in its popover, visually
      distinct from Cally's month-stepping chevrons.
- [ ] Clicking it shifts the calendar's displayed month by exactly 12 months (via `focusedDate`)
      without changing the component's `value`.
- [ ] The control is reachable by keyboard (`tabindex`, `Enter`/`Space` activation) and carries an
      accessible name (e.g. `aria-label="Previous year"` / `"Next year"`).
- [ ] Clicking previous/next year while one end of a range is already picked (mid-selection) does
      not clear or alter that in-progress pick.
- [ ] Unit tests cover: `date-range-input.component.spec.ts` — clicking previous/next year updates
      the calendar's focused month by one year in each direction, and leaves an existing `value`
      untouched.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: opening the Transactions page's date-range filter, clicking
      "previous year" repeatedly reaches a date roughly three years back in a handful of clicks
      instead of ~36 month-clicks, with the from/to selection behaving normally afterward.

## Notes

- Deliberately excluded from the STAT-38 two-panel picker rebuild — scope decision 4 keeps this
  component in the Transactions filter as a plain reactive-form field, and full adoption of the
  Grafana-style picker there remains a non-goal unless the two `from`/`to` URL contracts are
  unified (see overview.md's "Considered, not ticketed"). This ticket only closes the far-away-date
  navigation gap, without that larger unification.
- Cally has no built-in year-jump; implementation reads/writes the `focusedDate` attribute on
  `<calendar-range>`/`<calendar-month>` to reposition the visible month programmatically — no new
  dependency needed.
- Independent of the STAT-35..40 chain above (no `RangeStore`, no relative expressions, no
  fiscal-year setting involved) — can ship any time, before or after the rest of this version.
