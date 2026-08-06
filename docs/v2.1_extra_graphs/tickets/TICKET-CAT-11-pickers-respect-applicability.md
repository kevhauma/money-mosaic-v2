# TICKET-CAT-11 — Pickers and filters only offer categories that apply to the date at hand

- **Area:** Categories
- **Type:** Feature
- **Traceability:** extends **FR-CAT-9**
  ([TICKET-CAT-10](./TICKET-CAT-10-category-applicability-range.md) ships the field this
  consumes). Touches the picker sites of FR-TXN-2 (categorising) and the Transactions filters.

## User story

As someone categorising this month's import, I want dropdowns to stop offering categories that no
longer apply — while still offering them when I'm editing a transaction from the years they did —
so the pick lists stay short and honest without rewriting history.

## Description

Makes the category pickers and filters applicability-aware: each site compares the category's
window (`activeFrom`/`activeUntil`, absent = unbounded) against the date it is actually working
with — a single transaction's booking date, the visible rows' date span, or the active filter
range — and hides categories outside it. The currently-assigned value always stays offerable, so
no existing selection ever breaks.

## Current situation (as-is)

Every picker renders `activeCategories()` wholesale, whatever dates are involved:

- Single-transaction edit:
  [transaction-edit-form.component.html:11](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.html)
  — offers every active category to a transaction from any year.
- Inline quick-set on the transactions list:
  [transactions-overview.component.ts:155-161](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts)
  — one shared, memoised option list for all rows (TICKET-TXN-09's deliberate
  once-per-category-change stringification).
- Bulk bar: [transaction-bulk-bar.component.html:16](../../../src/app/feature-transactions/components/transaction-bulk-bar/transaction-bulk-bar.component.html).
- Transactions filter dropdown:
  [transaction-filters.component.html:25](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.html).

## Desired result (to-be)

- A single pure helper (e.g. `categoryAppliesTo(category, dateIso)` /
  `categoryOverlapsRange(category, fromIso, toIso)` in `core/` beside the category model) is the
  one place window semantics live — absent bounds are unbounded, comparisons are inclusive.
- Per site:
  - **Transaction edit form** — offers categories applicable on *that transaction's*
    `bookingDate`. Editing a 2022 transaction still offers rent-until-2023; a new import from
    this month doesn't.
  - **Inline quick-set** — the shared option list covers categories applicable at any point in
    the span of the *currently visible rows'* booking dates, recomputed per data/range change,
    never per row — TICKET-TXN-09's memoisation shape is preserved (a spec asserts the option
    list identity is shared across rows).
  - **Bulk bar** — categories applicable across the span of the *selected* transactions' dates.
  - **Filters dropdown** — categories whose window overlaps the active date filter; with no date
    filter set, all active categories (history is all on the table).
- **The current value never disappears**: a transaction already assigned to an out-of-window
  category keeps that option, labelled with an "(ended)" suffix — same for the filter dropdown's
  current selection. A `<select>` whose value isn't among its options is a broken control.
- Archived stays archived: these rules further filter `activeCategories()`; they never resurface
  an archived category.

## Acceptance criteria

- [ ] The window helper is a pure, unit-tested function used by every touched site — no site
      reimplements the comparison; absent `activeFrom`/`activeUntil` mean unbounded and windowless
      categories appear everywhere, exactly as today.
- [ ] The edit form filters by the transaction's booking date, and shows the assigned
      out-of-window category with the "(ended)" suffix rather than dropping it.
- [ ] The inline quick-set filters by the visible rows' date span with the option list still
      computed once per change (not per row) — asserted by a spec on the shared list.
- [ ] The bulk bar filters by the selected transactions' date span.
- [ ] The filters dropdown filters by overlap with the active date filter, offers everything when
      no date filter is set, and keeps its current selection offerable.
- [ ] Assigning and un-assigning categories behaves as before in every other respect
      (`categoryManual` handling untouched).
- [ ] Unit tests cover: helper bounds (open, closed, inclusive edges); each of the four sites'
      filtering; the kept-current-value rule with suffix; the no-window categories unchanged
      case.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: a category ended last year is absent from a fresh
      transaction's picker, present (suffixed) on an old transaction that uses it.

## Notes

- **The rule form is deliberately not filtered.** A rule runs over whatever dates the next import
  contains, so hiding ended categories there would be wrong; instead the rule form's target
  select gets the same "(ended)" suffix as a nudge. A rule that assigns an ended category to a
  new transaction is the user's call — flagging that combination is inbox/alerts territory, out
  of scope.
- The Dashboard's category-exclusion dropdown and the stat aggregates are untouched by explicit
  scope decision (2026-08-06): historical panels showing rent for ranges where rent applied is
  correct behaviour, not a bug.
- Needs [TICKET-CAT-10](./TICKET-CAT-10-category-applicability-range.md). Independent of the REC
  tickets.
