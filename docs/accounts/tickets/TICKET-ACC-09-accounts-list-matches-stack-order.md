# TICKET-ACC-09 — Account cards stack in one column, in the chart's stacking order

- **Area:** Accounts
- **Released in:** [v1.6.2 Interface polish](../../releases/v1.6.2_interface_polish/overview.md)
- **Type:** Refactor
- **Traceability:** extends TICKET-STAT-02 (stacked balance history) / FR-ACC-1

## User story

As a user, I want the account cards under the balance chart to read top-to-bottom in the same order as
the chart's bands, so I can look from a band straight down to its account instead of hunting a
three-column grid for the matching name.

## Description

The chart above the list stacks accounts in one order; the list below is a responsive grid that reads in
another. This ticket makes the list a single stacked column whose order matches the chart's bands read
top to bottom.

## Current situation (as-is)

- **The chart** —
  [account-balance-history-chart.component.ts](../../../src/app/feature-accounts/components/account-balance-history-chart/account-balance-history-chart.component.ts)
  builds one `stack: 'account-balance'` area series per entry of `accountsStore.activeAccounts()`, in
  that array's order. In echarts, **the first series is the bottom band** and each subsequent one stacks
  above it — so read top to bottom, the chart's bands are the *reverse* of `activeAccounts()`.
- **The list** —
  [accounts-overview.component.html](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.html)
  renders `accountCards()` into `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`. On a desktop
  that is three across, filled left-to-right, in `visibleAccounts()` order (the store order, or the
  store order including archived when the toggle is on).
- **Result: two different readings of the same set.** The chart's top band is the *last* account in the
  store order; the list's first card is the *first*. Nothing lines up, and the cards' own reorder
  controls (`moveAccount(account, 'up'|'down')`, driving `AccountsStore.moveAccount`) move a card in the
  store order — which the user can't relate to what they see on the chart.

## Desired result (to-be)

- **One column.** The card grid becomes a single stacked column at every breakpoint — the same
  `grid-cols-1` it already uses below `sm:`, applied throughout. Card markup is unchanged; only the
  container's column count and the row order change.
- **Order matches the chart's bands, read top to bottom** — i.e. the reverse of the series order, which
  is the reverse of `activeAccounts()`. This is one `computed()` on the overview component, derived from
  the same account ordering the chart consumes, so the two can't drift.
- **The reorder controls still move an account within the store order**, and their *effect* is now
  legible: moving a card up moves its band up the stack too. The up/down arrows keep their current
  meaning relative to the list the user is looking at — moving "up" moves the card up the screen — so
  their `direction` mapping flips to match the reversed rendering rather than the array order.
- **`isFirst`/`isLast` follow the rendered order**, so the disabled arrow is always the one at the visual
  end of the list. Today they're computed against `accountsStore.accounts()[0]`/`[last]` in
  [accounts-overview.component.ts](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.ts)'s
  `accountCards`.
- **Archived accounts (toggle on) append after the active ones**, since they have no band on the chart
  to align with — a clean break at the bottom of the list rather than interleaved into an order they
  don't participate in.

## Acceptance criteria

- [x] The card container renders one column at every breakpoint; component spec asserts no
      `sm:grid-cols-2` / `lg:grid-cols-3` on the container. (`accounts-overview.component.html` is now
      `grid grid-cols-1 gap-4`; `accounts-overview.component.spec.ts` — "renders one column at every
      breakpoint" asserts `grid-cols-1` present and both responsive classes absent)
- [x] With three active accounts, the first card in the DOM is the account whose band is topmost in the
      chart; unit test on the ordering `computed()` asserting it is the reverse of the series order the
      chart builder receives. (`account-list-order.ts`'s `accountDisplayOrder`, called from the
      overview's `visibleAccounts` computed; TestBed-free `account-list-order.spec.ts` — "reverses the
      chart's series order, so the first card is the topmost band" — plus the component-level
      "puts the topmost band's account in the first card", which reads the real
      `store.activeAccounts()` the chart builder is handed and asserts the cards are its reverse)
- [x] The ordering derives from the same account list the chart uses (not a second query), so a change to
      one changes both; unit test driving a reorder and asserting both outputs move together.
      (`accounts-overview.component.spec.ts` — "moves with the chart: a reorder shifts the series order
      and the card order together": one `moveAccount` call, both `activeAccounts()` and the rendered
      cards asserted afterwards)
- [x] Moving a card "up" moves it up the rendered list **and** up the chart's stack; unit test on the
      direction mapping asserting a visual "up" reaches `AccountsStore.moveAccount` with the direction
      that raises the band. (`storeDirectionFor` in `account-list-order.ts`;
      `account-list-order.spec.ts` — "flips a visual direction into the store direction that moves the
      band the same way", and `accounts-overview.component.spec.ts` — "a card's 'up' arrow raises its
      band as well as its card" spies on the store and asserts
      `moveAccount(savings.id, 'down')`, then drives that same store call and asserts both orders)
- [x] The disabled up arrow is on the first rendered card and the disabled down arrow on the last;
      component spec asserts both. (`isFirst`/`isLast` now come from the rendered index;
      `accounts-overview.component.spec.ts` — "flags only the first and last account, and reflects a
      reorder" (rewritten for the new order) and the archived-split test's `isFirst`/`isLast`
      assertions. Confirmed live: first card's up disabled, last card's down disabled, and neither of
      the other two.)
- [x] With "Show archived" on, archived accounts render after every active account; component spec
      asserts the split. (`accounts-overview.component.spec.ts` — "renders archived accounts after every
      active one when the toggle is on"; `account-list-order.spec.ts` — "appends archived accounts after
      every active one when the toggle is on")
- [x] Persistence still goes through `AccountsStore.moveAccount` — no direct Dexie writes, no schema
      change. (The component still calls `this.accountsStore.moveAccount(...)`; only the `direction`
      argument is translated. Nothing under `core/data-access/` in the diff.)
- [x] `angular.json` bundle budgets not raised. (`angular.json` untouched; dev build initial total
      2.15 MB)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD`:
      verdict **pass**, zero introduced findings; `ng lint` clean, 2262/2262 specs green, dev build
      compiles)
- [x] Verified live in the browser: the chart's topmost band matches the first card, and reordering a
      card visibly moves its band the same way. (Done on the dev server at :4210. The Browser pane had
      been closed — the user chose to continue without it — so this pass reads the live chart's series
      and the real card DOM through Angular's dev-mode `ng.getDirectives` rather than screenshots.
      The container computes to **1** grid column and the cards' bounding rects stack strictly
      downwards; bands read top-to-bottom are `[Rainy Day Savings, Everyday Checking]` and the card
      names are identical. Clicking the **second** card's own up arrow moved it to first *and* moved
      its band to the top of the stack in the same frame; the order was then clicked back to where it
      started, since that write persists. No console errors.)

## Notes

- **One column, not a matched multi-column grid.** A grid can only match a stack order by reading order,
  which nobody does across three columns; a single column makes the alignment literal. The cost is
  scroll length on a many-account setup — accepted, since the chart is the summary and the list is the
  detail.
- The direction-mapping flip is the subtle part: the store order and the rendered order are now opposite,
  so a naive pass-through of `'up'` would move the band the wrong way. Pin it with the unit test above
  rather than by eye.
- Related but separate: [TICKET-ACC-10](./TICKET-ACC-10-day-only-balance-buckets.md) (bucket sizes) and
  [TICKET-ACC-11](./TICKET-ACC-11-accounts-chart-day-hover-transactions.md) (hover contents) change the
  chart itself; this ticket changes only what sits under it.
