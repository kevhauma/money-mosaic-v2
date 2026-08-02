# TICKET-TXN-10 — Amount type sits with min/max, gains an "All", and filters on its own

- **Area:** Transactions
- **Type:** Bug fix
- **Traceability:** revises TICKET-TXN-08 (amount-direction filter) / FR-TXN-3 — `matchesTransactionFilters` only applies `amountDirection` inside the `if (amountMin !== null || amountMax !== null)` branch, so picking "Income" with no bounds set filters nothing

## User story

As a user, I want to pick Income or Expenses and immediately see only those transactions, with the choice
sitting next to the min and max fields it applies to, so the filter does what its label says instead of
waiting for me to also type an amount.

## Description

The amount-direction toggle is separated from the min/max fields by the Category select, has no "off"
position, and — the actual bug — has no effect at all unless a bound is also entered. This ticket makes it
a three-way All / Income / Expenses control that filters on its own, placed with the fields it belongs to.

## Current situation (as-is)

- **Placement.** The filter bar
  ([transaction-filters.component.html](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.html))
  is a `lg:grid-cols-6` grid laid out Account · Date range · Category · **Amount type** · Min amount ·
  Max amount. Amount type does sit before Min on a wide screen, but on the 2- and 3-column breakpoints
  the wrap puts Category between them, and the three amount controls never read as one group.
- **No "off" position.** The control is two `join` buttons, Expenses and Income, driven by
  `setAmountDirection()`. The form control is `nonNullable` with `'expense'` as its initial value
  ([transaction-filters.component.ts](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.ts)),
  so "Expenses" is *always* visually selected from first paint, and there is no way to deselect it.
- **It doesn't filter on its own — the bug.** In
  [transaction-filters.ts](../../../src/app/feature-transactions/transaction-filters.ts),
  `matchesTransactionFilters` reads:

  ```ts
  if (amountMin !== null || amountMax !== null) {
    const isExpense = filters.amountDirection !== 'income';
    if (isExpense ? transaction.amount >= 0 : transaction.amount < 0) return false;
    …
  }
  ```

  The direction check lives **inside** the bounds check. Click "Income" with both amount fields empty and
  nothing happens — expenses stay in the table, while the button says Income is selected.
- **`hasActiveFilters` already works around the same design flaw**, with a component-local override
  excluding `amountDirection` from the "any field non-empty" scan, because it is "always populated
  ('expense' by default)" (TICKET-TXN-08). That comment is a description of the bug.
- **`filtersToRuleConditions`** re-signs the magnitude bounds by direction via `toSignedAmountBounds` when
  converting a filter into a rule (TICKET-CAT-07) — so the direction has real meaning downstream and must
  keep it.

## Desired result (to-be)

- **`amountDirection` becomes `'all' | 'income' | 'expense'`, defaulting to `'all'`.** The control renders
  three joined buttons, All selected on load, so "no amount filter" is a state the UI can express.
- **The direction filters independently of the bounds.** `matchesTransactionFilters` applies the
  direction *before*, and outside of, the min/max branch:
  - `'income'` keeps `amount >= 0`, `'expense'` keeps `amount < 0`, `'all'` keeps everything;
  - the min/max magnitude comparison then runs on whatever survived, for any direction including `'all'`
    (a magnitude bound with no direction filters both signs by size).
- **Placement:** Amount type, Min amount and Max amount render adjacent at every breakpoint — grouped so
  the wrap can't put another field between them. Category moves ahead of the amount group.
- **`hasActiveFilters` loses its workaround.** With `'all'` as the default, `amountDirection` is
  non-empty only when the user has actually chosen a direction, so the shared "any field set" scan can
  treat it like every other axis; the component-local override and its comment are deleted.
- **"Clear" resets the direction to `'all'`**, along with everything else.
- **Rule conversion handles `'all'`**: `toSignedAmountBounds` gains the case, and with `'all'` plus a
  bound the produced condition must not silently assume a sign — emit magnitude bounds that match both
  signs, or omit the amount condition and surface it through `excludedFilterAxisLabels` as an axis that
  couldn't be converted. Pick one while building and pin it with a test; do not leave it defaulting into
  the expense branch.

## Acceptance criteria

- [ ] `TransactionFilters['amountDirection']` is `'all' | 'income' | 'expense'` and the form control
      defaults to `'all'`; component spec asserts All is selected on first paint.
- [ ] Selecting "Income" with both amount fields empty hides every expense; unit test on
      `matchesTransactionFilters` over a mixed set, plus the mirror case for "Expenses".
- [ ] "All" with both amount fields empty keeps every transaction; unit test.
- [ ] "All" with a min/max set filters by magnitude across both signs; unit test with one income and one
      expense of the same magnitude, both kept.
- [ ] "Income" with a min/max set behaves exactly as today; every existing TICKET-TXN-08 spec passes
      unchanged.
- [ ] `hasActiveFilters` uses the shared scan with no `amountDirection` special case, and reports active
      when a direction is chosen with no other field set; unit test, and the component-local override is
      gone from the diff.
- [ ] "Clear" resets the direction to `'all'`; component spec.
- [ ] `filtersToRuleConditions` handles `'all'` by the chosen rule, with a unit test pinning it — and if
      the amount axis is dropped, `excludedFilterAxisLabels` names it and `describeExcludedFilterAxes`
      says so in the rule form's note.
- [ ] Amount type, Min and Max render adjacent at the 2-, 3- and 6-column breakpoints; component spec
      asserts they share a group container rather than relying on grid order.
- [ ] A drill-down that arrives with `?from=&to=&categoryId=` still leaves the direction at `'all'` — the
      re-seeding effect must not reset it to a direction; component spec.
- [ ] No persistence changes, no Dexie version bump.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: clicking Income with empty amount fields immediately shrinks the
      table to income only, and Clear puts it back.

## Notes

- **The default flip is the load-bearing change.** `'expense'` as a default is what forced the direction
  check inside the bounds branch (otherwise every fresh page load would hide all income) and what forced
  `hasActiveFilters`' override. `'all'` removes the reason for both.
- The savings/transfer classification is untouched: `matchesTransactionFilters` still delegates
  uncategorised detection to `isSavingsMovement`, and this ticket changes only the amount axis.
- Worth checking while building whether any caller constructs a `TransactionFilters` literal with
  `amountDirection: 'expense'` outside the form (specs, drill-down helpers) — the union widening will
  surface them at compile time, but the *intent* of each needs a look, not a mechanical swap.
