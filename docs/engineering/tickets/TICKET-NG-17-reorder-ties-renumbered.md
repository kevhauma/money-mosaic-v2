# TICKET-NG-17 — Reorder renumbers tied or missing sort orders, and new accounts/categories get one

- **Area:** Shared utilities (shared/utils) + entity stores (core/state, feature-categories)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-20 (ties / missing `sortOrder` part); fixes the reorder controls of TICKET-ACC-04 (accounts), TICKET-CAT-03 (categories) and FR-CAT-2 (rule priority)

## User story

As a user pressing the up arrow on an account, category or rule, I want it to move every time, so an arrow never silently does nothing.

## Description

A move swaps the item's order value with its neighbour's. When the two values are equal the swap writes the same number to both and nothing moves — forever. Equal values arise because a missing `sortOrder` is backfilled with the item's list _index_, which after a delete can equal a neighbour's stored value; because new accounts and categories are created without a `sortOrder`; and because rule priorities are typed by hand.

## Current situation (as-is)

- [sortable.ts:29-48](../../../src/app/shared/utils/sortable.ts) — `computeReorderUpdates` backfills `item.sortOrder ?? i` (line 39) and swaps the two resolved values (lines 45-46). Example: A=0, C=1, B=2; delete A → C=1, B=2; add D (no `sortOrder`, sorts last at index 2) → up on D writes B=2, D=2, and D never moves again.
- [accounts.store.ts:205](../../../src/app/core/state/accounts.store.ts) — `addAccount` is `store.add(account)`, no `sortOrder`; [categories.store.ts:75-80](../../../src/app/core/state/categories.store.ts) — `addCategory` likewise. Goals and loans already assign `highest + 1` ([goals.store.ts:80-83](../../../src/app/core/state/goals.store.ts)).
- [rules.store.ts:78-88](../../../src/app/feature-categories/rules.store.ts) — `moveRule` swaps `priority` with the neighbour; two rules both at priority 10 swap 10 for 10.

## Desired result (to-be)

- When the moving item and its neighbour resolve to the same order value, or any backfill would collide, `computeReorderUpdates` renumbers the whole list in its displayed order (0, 1, 2, …) with the move applied, and returns those writes. Otherwise it stays a two-row swap.
- `addAccount` and `addCategory` assign `sortOrder = highest + 1` (across active and archived), as goals and loans do.
- `moveRule` renumbers priorities in steps of 10 in `rulesByPriority()` order when the two priorities are equal, then moves; distinct priorities keep the plain swap.

## Acceptance criteria

- [ ] C=1, B=2, D=undefined (D last): moving D up yields an order of C, D, B, and moving D up again yields D, C, B.
- [ ] Two accounts both at `sortOrder` 3: moving the lower one up puts it first.
- [ ] A new account added after A=0, B=1 gets `sortOrder` 2; same for a new category.
- [ ] Two rules at priority 10: moving the second up puts it first in `rulesByPriority()`, and the evaluation order matches.
- [ ] Distinct values still produce exactly two writes (no needless renumbering).
- [ ] Writes go through the stores' repositories; no component calls the API.
- [ ] `sortable.spec.ts`, `accounts.store.spec.ts`, `categories.store.spec.ts` and `rules.store.spec.ts` cover the cases above.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: delete the first category, add a new one, move it up twice; it moves both times.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Related CR6-20 parts, each its own ticket: swapping with hidden archived rows [TICKET-NG-18](./TICKET-NG-18-reorder-within-visible-list.md), the raw `remove()` on `AccountsStore` [TICKET-NG-19](./TICKET-NG-19-accounts-store-no-raw-remove.md), atomic writes [TICKET-NG-20](./TICKET-NG-20-atomic-reorder.md). A renumber writes many rows, so it is safest after NG-20; it doesn't depend on it.
- Rule priority also decides "first match wins" ([rule-matching.ts:106](../../../shared/rule-matching.ts)); renumbering in displayed order keeps evaluation order identical.
