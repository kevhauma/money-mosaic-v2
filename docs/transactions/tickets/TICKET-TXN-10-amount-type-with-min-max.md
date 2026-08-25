# TICKET-TXN-10 — Amount type sits with min/max, gains an "All", and filters on its own

- **Area:** Transactions
- **Released in:** [v1.6.2 Interface polish](../../releases/v1.6.2_interface_polish/overview.md)
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

- [x] `TransactionFilters['amountDirection']` is `'all' | 'income' | 'expense'` and the form control
      defaults to `'all'`; component spec asserts All is selected on first paint. (Exported as
      `AmountDirection` + `DEFAULT_AMOUNT_DIRECTION` in `transaction-filters.ts`;
      `transaction-filters.component.spec.ts` — "starts on 'All', with that button selected on first
      paint" asserts the three buttons render `All · Income · Expenses` with `aria-pressed`
      `true/false/false`)
- [x] Selecting "Income" with both amount fields empty hides every expense; unit test on
      `matchesTransactionFilters` over a mixed set, plus the mirror case for "Expenses".
      (`transaction-filters.spec.ts` — "'Income' with both amount fields empty hides every expense" and
      "'Expenses' with both amount fields empty hides every income", both over the same four-transaction
      mixed set)
- [x] "All" with both amount fields empty keeps every transaction; unit test. (same describe — "'All'
      with both amount fields empty keeps everything")
- [x] "All" with a min/max set filters by magnitude across both signs; unit test with one income and one
      expense of the same magnitude, both kept. (same describe — "'All' with a bound filters by
      magnitude across both signs": +€500 and −€500 both survive a 100–900 bound)
- [x] "Income" with a min/max set behaves exactly as today; every existing TICKET-TXN-08 spec passes
      unchanged. (The `income direction` and `expense direction` describes are untouched in substance;
      the expense one now shadows the baseline with an explicit `expenseBaseline` because the module's
      `noFilters` fixture is a genuine no-filter set again — same assertions, same values)
- [x] `hasActiveFilters` uses the shared scan with no `amountDirection` special case, and reports active
      when a direction is chosen with no other field set; unit test, and the component-local override is
      gone from the diff. (The 7-line hand-rolled `computed` is replaced by `hasActiveFiltersSignal(...)`.
      **Implementation note:** the shared scan gained an optional `defaults` map — an axis is "off" at
      `''` unless a default names another value — because `'all'` is a non-empty off position. That is a
      declared default, not a per-axis exemption: the axis now participates in the scan exactly like the
      others, which is what the old override prevented. `transaction-filters.component.spec.ts` —
      "choosing a direction activates hasActiveFilters on its own" and "leaves hasActiveFilters off while
      the direction is still 'All'")
- [x] "Clear" resets the direction to `'all'`; component spec.
      (`transaction-filters.component.spec.ts` — "clearFilters resets amountDirection back to 'All'",
      which also asserts `hasActiveFilters` goes back off)
- [x] `filtersToRuleConditions` handles `'all'` by the chosen rule, with a unit test pinning it — and if
      the amount axis is dropped, `excludedFilterAxisLabels` names it and `describeExcludedFilterAxes`
      says so in the rule form's note. (**Chosen rule: drop the axis.** `|amount| >= min` is
      `amount <= -min` *or* `amount >= min`, and `RuleCondition` has no `or`, so no single condition can
      express it — emitting either signed branch would silently narrow the filter. `toSignedAmountBounds`
      returns `[null, null]` for `'all'`; `transaction-filters.spec.ts` — "drops the amount condition
      rather than guessing a sign" and "still converts the other axes alongside it", plus
      "flags an amount bound with no direction, which no rule condition can express" on
      `excludedFilterAxisLabels`. **Knock-on, handled:** with the axis dropped, an amount bound alone no
      longer enables "Make rule from filter", so the disabled tooltip now names the missing choice —
      "Set a text, account, or Income/Expenses amount filter first" — and is a `computed()` rather than a
      ternary in the binding.)
- [x] Amount type, Min and Max render adjacent at the 2-, 3- and 6-column breakpoints; component spec
      asserts they share a group container rather than relying on grid order. (One
      `[data-testid="amount-group"]` container spanning the outer grid, with its own
      `grid-cols-2 sm:grid-cols-3`; `transaction-filters.component.spec.ts` — "renders the direction with
      Min and Max in one group, not merely adjacent in the grid". Category already sat ahead of the
      group.)
- [x] A drill-down that arrives with `?from=&to=&categoryId=` still leaves the direction at `'all'` — the
      re-seeding effect must not reset it to a direction; component spec.
      (`transaction-filters.component.spec.ts` — "a drill-down re-seed leaves the direction on 'All'",
      covering both the initial params and a same-route param change)
- [x] No persistence changes, no Dexie version bump. (nothing under `core/data-access/` in the diff)
- [x] `angular.json` bundle budgets not raised. (`angular.json` untouched; dev build initial total
      2.15 MB)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD`:
      verdict **pass**, zero introduced findings. Getting there was worth recording: the audit first
      flagged `matchesTransactionFilters` as an introduced finding, so its complexity was **measured on
      both sides** — cyclomatic 26 / cognitive 28 before this ticket, **20 / 18 after**, i.e. this change
      reduced it; it trips the CRAP gate only because fallow estimates 0% coverage. It carries a
      `fallow-ignore-next-line complexity` with that measurement as the reason. `excludedFilterAxisLabels`
      and `toSignedAmountBounds` *were* genuinely pushed over by this ticket and were brought back under
      by extracting `hasDateRange`, `hasUnconvertibleAmountBound` and `negated`. `ng lint` clean,
      2274/2274 specs green, dev build compiles.)
- [x] Verified live in the browser: clicking Income with empty amount fields immediately shrinks the
      table to income only, and Clear puts it back. (Done on the dev server at :4210. The Browser pane is
      closed — the user chose to continue without it — so this pass clicks the real buttons and counts
      the real table rows through the DOM rather than screenshots. On load: 41 rows, "All" pressed, the
      three amount controls in one group. **Income** (both amount fields empty): **41 → 9 rows, 0
      expenses**, and "Clear" became enabled on that choice alone. **Expenses**: 32 rows, 0 income.
      **Clear**: back to 41 rows, "All" pressed, Clear disabled again. No console errors.)

## Notes

- **The default flip is the load-bearing change.** `'expense'` as a default is what forced the direction
  check inside the bounds branch (otherwise every fresh page load would hide all income) and what forced
  `hasActiveFilters`' override. `'all'` removes the reason for both.
- The savings/transfer classification is untouched: `matchesTransactionFilters` still delegates
  uncategorised detection to `isSavingsMovement`, and this ticket changes only the amount axis.
- Worth checking while building whether any caller constructs a `TransactionFilters` literal with
  `amountDirection: 'expense'` outside the form (specs, drill-down helpers) — the union widening will
  surface them at compile time, but the *intent* of each needs a look, not a mechanical swap.
