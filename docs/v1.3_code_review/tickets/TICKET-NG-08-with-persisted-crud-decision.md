# TICKET-NG-08 — Decide (and if yes, build) a `withPersistedCrud` signal-store feature

- **Area:** Angular patterns (signal stores)
- **Type:** Refactor (decision ticket)
- **Traceability:** CR2-4.4 (carried over, still open); unblocked since TICKET-NG-04 (`withArchivable`) proved the custom store-feature pattern

## User story

As a developer, I want one decision on whether the persist-then-patch CRUD stores share a `withPersistedCrud` store feature, so the five near-identical store implementations either converge on one tested abstraction or the duplication is explicitly accepted and stops resurfacing in reviews.

## Description

Five entity stores (`AccountsStore`, `CategoriesStore`, `RulesStore`, `MappingProfilesStore`, and siblings) each hand-roll the same add/update/remove methods: call the repository, then `patchState` with the matching entity operation. TICKET-NG-04 established the custom `signalStoreFeature` pattern (`withArchivable`), so the groundwork exists. This ticket is the yes/no — with the outcome recorded either way.

## Current situation (as-is)

- Example of the repeated shape: [rules.store.ts:37-48](../../../src/app/feature-categories/rules.store.ts) (`add` → `rulesRepository.add` + `addEntity`; `update` → repo + `updateEntity`; `remove` → repo + `removeEntity`); the same triple exists in [categories.store.ts](../../../src/app/feature-categories/categories.store.ts), [accounts.store.ts](../../../src/app/feature-accounts/accounts.store.ts), [mapping-profiles.store.ts](../../../src/app/feature-import/mapping-profiles.store.ts).
- The repositories already share a uniform surface (`getAll`/`add`/`update`/`remove`), which is what makes a generic feature plausible.

## Desired result (to-be)

- **Decision recorded** in this ticket's Notes (and reflected in the `coding-conventions` skill): adopt `withPersistedCrud(repository, entityConfig)` or explicitly keep the hand-rolled methods.
- If **yes**: the feature is implemented once with its own spec, and at least two stores are migrated to prove the shape (remaining stores may follow opportunistically).
- If **no**: the rationale (e.g. per-store divergence like `AccountsStore`'s cascade delete makes the abstraction leaky) is written down so CR4 doesn't re-raise it.

## Acceptance criteria

- [ ] Decision + rationale recorded here and in the coding-conventions skill.
- [ ] If adopted: `withPersistedCrud` has a spec (add/update/remove persist through the repository and patch entity state; a repository failure does not patch state), and the migrated stores' existing specs pass unchanged.
- [ ] If adopted: persistence still goes exclusively through repositories — the feature takes a repository, never a Dexie table.
- [ ] Verified via the fallow skill and coding-conventions skill (if code changed).

## Notes

- Divergences to check before deciding: `AccountsStore.removeAccount` cascades via `AccountDeletionService` (not a plain repo call); `CategoriesStore.removeCategory` clears `categoryId`/`categoryManual` on referencing transactions; `MappingProfilesStore` upserts. If most "CRUD" methods turn out to be orchestrations, that's the "no" answer.

## Decision
- go ahead with the withPersistedCrud feature store