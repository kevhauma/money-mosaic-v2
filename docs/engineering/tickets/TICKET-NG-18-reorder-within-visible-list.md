# TICKET-NG-18 — Reorder swaps within the visible list, not with hidden archived rows

- **Area:** Entity stores (core/state) + accounts/categories pages
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-20 (hidden-neighbour part); fixes the reorder controls of TICKET-ACC-04 / TICKET-ACC-09 and TICKET-CAT-03

## User story

As a user with "show archived" off, I want the up/down arrows to swap the account or category with the one I can see next to it, so a click never seems to do nothing because it swapped with something hidden.

## Description

The stores swap with the neighbour in the full list, archived rows included, while the pages show only active rows by default. When the neighbour is archived, the click moves the item past an invisible row and the visible order doesn't change.

## Current situation (as-is)

- [accounts.store.ts:255-260](../../../src/app/core/state/accounts.store.ts) — `moveAccount` runs `computeReorderUpdates(store.accounts(), …)` over every account. The page lists `activeAccounts()` unless "show archived" is on ([accounts-overview.component.ts:68-74](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.ts), [account-list-order.ts](../../../src/app/feature-accounts/account-list-order.ts)).
- [categories.store.ts:114-119](../../../src/app/core/state/categories.store.ts) — `moveCategory` uses `store.categories()`. [categories-overview.component.ts:102-122](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.ts) shows `activeCategories()` by default and documents that `isFirst`/`isLast` are measured against the full list "so the reorder arrows still refer to the order actually being edited" — so the first visible row can show an enabled up arrow that swaps with a hidden archived row.
- Example: categories Food (active), Old (archived), Fuel (active); archived hidden. Up on Fuel swaps Fuel with Old; the page still shows Food, Fuel.
- Rules are not affected: they have no archived state, and reordering is disabled while a filter hides rows ([rules-overview.component.ts:102-107](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.ts)).

## Desired result (to-be)

- `moveAccount`/`moveCategory` take the list the user is looking at (or a "visible only" flag) and swap with the nearest _visible_ neighbour; hidden rows keep their positions relative to each other.
- `isFirst`/`isLast` (and the accounts page's equivalent) are measured against the visible list, so an arrow is disabled exactly when the item is first/last on screen.

## Acceptance criteria

- [ ] Food, Old (archived), Fuel with archived hidden: up on Fuel shows Fuel, Food; Old keeps its place between them in the full order.
- [ ] With "show archived" on, the same click swaps Fuel with Old, as today.
- [ ] The first visible row's up arrow and the last visible row's down arrow are disabled, with archived rows hidden or shown.
- [ ] Same behaviour on the accounts page (whose visual order is the reverse of the stored order, TICKET-ACC-09).
- [ ] Writes go through the stores' repositories; no component calls the API.
- [ ] Store and component specs cover the cases above.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: archive a middle category, hide archived, move the row below it up; it visibly moves.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Siblings from CR6-20: [TICKET-NG-17](./TICKET-NG-17-reorder-ties-renumbered.md) (ties), [TICKET-NG-20](./TICKET-NG-20-atomic-reorder.md) (atomic writes).
