# TICKET-TXN-08 — Expense/Income switch for the amount filter

- **Area:** Transactions (filters)
- **Traceability:** FR-TXN-3 (filter by amount range), FR-TXN-1 (signed amount convention the filter currently exposes raw)

## User story

As a user filtering the transaction overview by amount, I want a switch to say whether I'm filtering expenses or income, so I can type a plain positive magnitude (e.g. "50") instead of having to remember to enter "-50" to catch expenses.

## Description

Adds an Expense/Income segmented switch next to the filter bar's Min/Max amount fields. The two number inputs become magnitude-only (no sign entry required); the switch decides whether that magnitude is matched against outflows (negative `transaction.amount`) or inflows (positive `transaction.amount`).

## Current situation (as-is)

- [transaction-filters.component.html:31-37](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.html) — the "Min amount"/"Max amount" `mm-fieldset`s bind plain `type="number"` inputs to `amountMin`/`amountMax`, with no `min` attribute, so a negative value is both legal and currently the only way to match an expense.
- [transaction-filters.ts:53-57](../../../src/app/feature-transactions/transaction-filters.ts) — `matchesTransactionFilters` compares `filters.amountMin`/`amountMax` directly against the transaction's raw signed `amount` (FR-TXN-1: negative = outflow, positive = inflow), so filtering "expenses between €10 and €50" today requires entering `-50` in Min and `-10` in Max — both the sign and the min/max order are inverted from how a user thinks about the range.
- [transaction-filters.component.ts:85-93](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.ts) — the reactive `filterForm` group has no field for a sign/direction; [transaction-filters.ts:5-13](../../../src/app/feature-transactions/transaction-filters.ts)'s `TransactionFilters` type has no equivalent axis either.
- [transaction-filters.component.ts:156-166](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.ts) `clearFilters()` and [:142-145](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.ts) `hasActiveFilters` would both need to account for a new field.

## Desired result (to-be)

- A small segmented control (two `mm-button` toggles, matching the existing `mm-range-grouping-switcher` pattern) reading "Expenses" / "Income" sits alongside the Min/Max amount fieldsets, defaulting to "Expenses".
- The Min/Max amount inputs only accept non-negative magnitudes: `min="0"` on the inputs, plus the conversion function normalizes with `Math.abs()` as a second line of defence against a pasted/typed negative value.
- `TransactionFilters` gains `amountDirection: 'expense' | 'income'`, defaulting to `'expense'`.
- `matchesTransactionFilters` translates magnitude + direction into the existing signed comparison:
  - `'expense'` — the transaction must be negative (`amount < 0`); its magnitude (`Math.abs(amount)`) is compared against `amountMin`/`amountMax`.
  - `'income'` — the transaction must be non-negative (`amount >= 0`); `amount` itself is compared against `amountMin`/`amountMax`.
  - If both `amountMin` and `amountMax` are empty, `amountDirection` has no filtering effect (mirrors today's "empty means unfiltered" behaviour) — a lone direction toggle never excludes transactions by itself.
- `hasActiveFiltersSignal`'s generic "any field non-empty" check would otherwise treat the always-populated `amountDirection` as a permanently active filter — the transaction filter bar's `hasActiveFilters`/hasn't-changed check is adjusted so `amountDirection` only counts as active together with a non-empty `amountMin` or `amountMax` (either a component-local override of the shared helper, or excluding `amountDirection` from the generic scan and folding it into the amount check explicitly).
- `clearFilters()` resets `amountDirection` back to `'expense'` along with the other fields.

## Acceptance criteria

- [x] Segmented Expense/Income switch renders next to the Min/Max amount fields, defaults to "Expenses", and is keyboard-operable (matches existing `mm-button`/segmented-control a11y patterns already in the codebase).
- [x] Min/Max amount inputs reject negative values at the input level (`min="0"`) and `matchesTransactionFilters` normalizes with `Math.abs()` regardless.
- [x] `TransactionFilters.amountDirection: 'expense' | 'income'` added; `matchesTransactionFilters` correctly matches expense-direction magnitudes against negative transactions and income-direction magnitudes against non-negative transactions.
- [x] A magnitude-only Min/Max with the "Expenses" switch active correctly finds transactions equivalent to today's manually-signed `-max` / `-min` inputs (regression check against the old behaviour).
- [x] Toggling the switch alone (no Min/Max entered) does not mark the filter bar's "Clear" button as enabled; entering a Min or Max value does.
- [x] `clearFilters()` resets `amountDirection` to `'expense'`.
- [x] Unit tests cover: `matchesTransactionFilters` for expense-direction (in-range, below-min, above-max, boundary-equal) and income-direction (same four cases), empty-min/max with a direction set (no filtering effect), and the `hasActiveFilters` interaction between `amountDirection` and empty vs. non-empty min/max.
- [x] Verified via the fallow skill and coding-conventions skill, plus a live browser check (ask the user first per this repo's verification rule; continue without it if declined).

## Notes

- This is a QoL/interaction ticket, not part of the v1.5 styling rework — filed under `docs/v1.5_redesign`'s "QoL addendum" section at the user's request, same as [TICKET-IMP-07](./TICKET-IMP-07-guided-mapper-feedback.md) and [TICKET-CAT-07](./TICKET-CAT-07-make-rule-from-filter.md). Independent of any `TICKET-UI-*` ticket.
- Does **not** change the stored `Transaction.amount` sign convention (FR-TXN-1) or any Dexie data — this is filter-UI/predicate logic only, no schema change.
- **Coordinate with TICKET-CAT-07**, which converts `amountMin`/`amountMax` into a `RuleCondition` (`amount` field, raw signed value) for its "make rule from filter" action. Whichever of the two tickets lands second must update its amount handling to read the other's shape: if this ticket lands first, CAT-07's conversion needs to re-sign the magnitude using `amountDirection` before building the `RuleCondition`; if CAT-07 lands first, this ticket's implementer updates that conversion function accordingly. Neither ticket blocks the other from starting.
