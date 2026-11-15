# TICKET-NG-19 — `AccountsStore` exposes no `remove()` that skips the delete cascade

- **Area:** Entity stores (core/state) + shared/utils `withPersistedCrud`
- **Released in:** _unreleased_
- **Type:** Refactor
- **Traceability:** CR6-20 (raw `remove()` part); guards the account-delete cascade of CR-1.1 / TICKET-SRV-04 and the store feature of TICKET-NG-08

## User story

As a developer calling the accounts store, I want only the delete that also clears the account's transactions and transfers from the other stores, so I can't pick the wrong one and leave orphaned rows skewing stats.

## Description

`withPersistedCrud` adds a public `remove(id)` to every store that uses it. On `AccountsStore` that method deletes the account on the server (which cascades there) but only removes the account row client-side, leaving its transactions and transfer links in `TransactionsStore`/`TransfersStore`. Nothing calls it today; it sits next to the correct `removeAccount` as a trap.

## Current situation (as-is)

- [with-persisted-crud.ts:62-65](../../../src/app/shared/utils/with-persisted-crud.ts) — `remove: async (id) => { await repository.remove(id); patchState(store, removeEntity(id)); }`, always added.
- [accounts.store.ts:47-49](../../../src/app/core/state/accounts.store.ts) — the comment says `removeAccount` "stays hand-rolled", but `withPersistedCrud(AccountsRepository, accountConfig)` still exposes `remove`.
- [accounts.store.ts:209-226](../../../src/app/core/state/accounts.store.ts) — `removeAccount` goes through `AccountDeletionService` and mirrors `removedTransactionIds`, cleared `transferId`s and `unlinkedTransferIds` into the other stores.
- [accounts.ts:76-90](../../../server/src/routes/accounts.ts) — the server's `DELETE /accounts/:id` cascades either way; the gap is only the client mirror.
- `grep "accountsStore.remove("` finds no caller.

## Desired result (to-be)

- `AccountsStore` has no public `remove`. Either `withPersistedCrud` lets a store opt out of a method (e.g. an options argument naming the methods to add), or the generic methods are exposed under `_`-prefixed private names that each store aliases — whichever is smaller; apply it the same way to every store using the feature.
- Stores that do use the generic `remove` (rules, etc.) keep their public alias unchanged.

## Acceptance criteria

- [ ] `inject(AccountsStore)` has no `remove` member (a spec asserts `'remove' in store` is false, and the type has no `remove`).
- [ ] `RulesStore.removeRule` and other existing aliases work unchanged; their specs pass.
- [ ] `removeAccount` still mirrors the cascade into `TransactionsStore`/`TransfersStore` (existing spec).
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- No behaviour change, so no browser check.
- Siblings from CR6-20: [TICKET-NG-17](./TICKET-NG-17-reorder-ties-renumbered.md), [TICKET-NG-18](./TICKET-NG-18-reorder-within-visible-list.md), [TICKET-NG-20](./TICKET-NG-20-atomic-reorder.md).
