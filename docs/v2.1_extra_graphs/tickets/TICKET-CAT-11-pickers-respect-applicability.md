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

**Implementation note (2026-08-09):** the filters dropdown marks *every* ended category it offers
with the "(ended)" suffix, not only a kept-but-out-of-range current selection. The to-be only asked
for the selection, but that dropdown is the one site that offers ended categories on purpose (no
date filter = the whole history is on the table), so suffixing only the current pick would label the
same category two different ways depending on the range — a superset of the criterion below, not a
departure from it.

Vocabulary the pickers now share (`CategorySelectOption`, `BookingDateSpan`, `bookingDateSpan`) moved
out of `category-select-cell.component.ts` into `feature-transactions/category-picker.ts` on the way:
this ticket took that type from two consumers to five, and the coding-conventions skill puts
widely-shared vocabulary in a feature-root module rather than in a sibling component's file.

- [x] The window helper is a pure, unit-tested function used by every touched site — no site
      reimplements the comparison; absent `activeFrom`/`activeUntil` mean unbounded and windowless
      categories appear everywhere, exactly as today.
      (`core/categorisation/category-applicability.ts` — `categoryAppliesOn` /
      `categoryOverlapsRange` / `withEndedSuffix`, imported by all four sites plus the rule form;
      `category-applicability.spec.ts` covers open/closed/inclusive-edge bounds, and each site's
      spec has a "leaves windowless categories …" case.)
- [x] The edit form filters by the transaction's booking date, and shows the assigned
      out-of-window category with the "(ended)" suffix rather than dropping it.
      (`categoryOptions` in `transaction-edit-form.component.ts`; specs "hides a category whose
      window closed before the booking date", "still offers that category to a transaction from
      inside its own window", "keeps the assigned out-of-window category, marked \"(ended)\"" —
      the last also asserts the `<select>`'s value stays `9`.)
- [x] The inline quick-set filters by the visible rows' date span with the option list still
      computed once per change (not per row) — asserted by a spec on the shared list.
      (`visibleDateSpan` + `categoryOptions` in `transactions-overview.component.ts`; spec "hands
      every row the very same option array, not one per row (TICKET-TXN-09)" asserts identity via
      `toBe`, alongside the drop/overlap/kept-suffixed cases.)
- [x] The bulk bar filters by the selected transactions' date span.
      (`selectedDateSpan` input fed from the page's `selectedTransactions()`; bulk-bar specs
      "drops a category whose window misses the selected rows entirely" and "keeps a category whose
      window overlaps any part of the selected span".)
- [x] The filters dropdown filters by overlap with the active date filter, offers everything when
      no date filter is set, and keeps its current selection offerable.
      (`categoryOptions` in `transaction-filters.component.ts`; five specs including "offers every
      active category when no date filter is set" and "keeps the current selection offerable even
      when the range would drop it".)
- [x] Assigning and un-assigning categories behaves as before in every other respect
      (`categoryManual` handling untouched).
      (`onCategoryChange` / `submit` / `applyBulkCategory` are unchanged in the diff — only the
      option lists feeding them moved; the existing assignment specs pass unmodified.)
- [x] Unit tests cover: helper bounds (open, closed, inclusive edges); each of the four sites'
      filtering; the kept-current-value rule with suffix; the no-window categories unchanged
      case. (29 new cases across `category-applicability.spec.ts` and the four component specs.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass.
      (2026-08-09: lint clean, 2582 tests / 243 files passed, dev bundle built.)
- [x] Verified via the fallow skill and coding-conventions skill.
      (Both `.husky/pre-commit` fallow gates exit 0 — `dead-code --baseline` and
      `health --complexity --max-crap 1000`; the two newly-introduced findings are CRAP-only at
      cc 5 under fallow's estimated-zero-coverage model. The conventions pass moved the shared
      picker vocabulary into `category-picker.ts`, see the note above.)
- [x] Verified live in the browser: a category ended last year is absent from a fresh
      transaction's picker, present (suffixed) on an old transaction that uses it.
      (2026-08-09, dev server on :4210, "Housing" given `activeUntil` 2026-06-30 via the category
      form. Edit form on the 08/15 groceries row: no Housing option at all. Edit form on the 08/03
      "Monthly rent" row: `Housing (ended)` present and selected. Edit form on a 06/15 row: plain
      `Housing`, in place. Filter bar over 07/01–08/31: no Housing; over 05/01–06/30:
      `Housing (ended)`. Bulk bar with an 08/15 row selected: no Housing; with a 06/15 row
      selected: `Housing`. The category's window was reverted afterwards.)

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
