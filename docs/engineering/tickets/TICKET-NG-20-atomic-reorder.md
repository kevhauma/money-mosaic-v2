# TICKET-NG-20 — Moving an account or category saves both positions atomically

- **Area:** Entity stores (core/state) + data access + server routes
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-20 (non-atomic write part); fixes TICKET-ACC-04 / TICKET-CAT-03 reorders the way `PATCH /goals/sort-order` already makes goal reorders atomic

## User story

As a user reordering accounts or categories on a flaky connection, I want a move to either happen completely or not at all, so two rows never end up claiming the same position.

## Description

A move writes two `sortOrder`s (and the first time, a backfill for every row without one) as independent PATCH requests via `Promise.all`. If one fails, the other has already landed and two rows share a value, which then breaks later swaps (see TICKET-NG-17). Goals already solve this with one bulk request applied in one server transaction.

## Current situation (as-is)

- [accounts.store.ts:255-260](../../../src/app/core/state/accounts.store.ts) — `moveAccount`: `Promise.all(updates.map((u) => store.updateAccount(u.id, { sortOrder: u.sortOrder })))`.
- [categories.store.ts:114-119](../../../src/app/core/state/categories.store.ts) — `moveCategory`: the same.
- Reference: [goals.repository.ts:28-31](../../../src/app/core/data-access/goals.repository.ts) `bulkUpdateSortOrder` → `PATCH /goals/sort-order`, handled in [goals.ts:21-55](../../../server/src/routes/goals.ts) inside one `db.transaction`, 404-ing the whole batch on any id the user doesn't own; [goals.store.ts:59-67](../../../src/app/core/state/goals.store.ts) patches the store after it resolves.

## Desired result (to-be)

- `PATCH /accounts/sort-order` and `PATCH /categories/sort-order`, applied in one transaction and scoped to the session's user like the goals route. The validation and transaction body move into one helper shared by the three routes, not copied.
- `AccountsRepository.bulkUpdateSortOrder` / `CategoriesRepository.bulkUpdateSortOrder` (no-op on an empty list), and `moveAccount`/`moveCategory` send one request and patch the store only after it succeeds.

## Acceptance criteria

- [ ] Moving an account sends exactly one request (`PATCH /api/accounts/sort-order`) carrying every update; same for categories.
- [ ] Server: a batch containing another user's id answers 404 and changes no row (spec for accounts and categories).
- [ ] Server: a non-integer `sortOrder` answers 400 and changes no row.
- [ ] A rejected request leaves the client store unchanged.
- [ ] The goals route behaves as before (existing `goals.spec.ts` passes) after moving to the shared helper.
- [ ] Writes go through repositories; no component calls the API.
- [ ] `npm --prefix server run lint`, `npm --prefix server run typecheck`, `npm run test:server` pass.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] `server/README.md` endpoint list gains the two routes.
- [ ] Live browser check: reorder accounts and categories; the order survives a reload.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- `moveRule` ([rules.store.ts:78-88](../../../src/app/feature-categories/rules.store.ts)) has the same two-PATCH pattern on `priority`; not in this ticket's scope, but the shared helper should not preclude a `PATCH /rules/priority` later.
- No schema change; no migration.
- Siblings from CR6-20: [TICKET-NG-17](./TICKET-NG-17-reorder-ties-renumbered.md), [TICKET-NG-18](./TICKET-NG-18-reorder-within-visible-list.md), [TICKET-NG-19](./TICKET-NG-19-accounts-store-no-raw-remove.md).
