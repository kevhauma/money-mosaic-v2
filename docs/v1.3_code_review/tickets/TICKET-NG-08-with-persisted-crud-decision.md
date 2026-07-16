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

- [x] Decision + rationale recorded here and in the coding-conventions skill.
- [x] If adopted: `withPersistedCrud` has a spec (add/update/remove persist through the repository and patch entity state; a repository failure does not patch state), and the migrated stores' existing specs pass unchanged.
- [x] If adopted: persistence still goes exclusively through repositories — the feature takes a repository, never a Dexie table.
- [x] Verified via the fallow skill and coding-conventions skill (if code changed).

## Notes

- Divergences to check before deciding: `AccountsStore.removeAccount` cascades via `AccountDeletionService` (not a plain repo call); `CategoriesStore.removeCategory` clears `categoryId`/`categoryManual` on referencing transactions; `MappingProfilesStore` upserts. If most "CRUD" methods turn out to be orchestrations, that's the "no" answer.

## Decision
- Go ahead with a `withPersistedCrud` signal-store feature (`src/app/shared/utils/with-persisted-crud.ts`), same custom-`signalStoreFeature` shape as `withArchivable` (TICKET-NG-04). Adoption is **per-method, not all-or-nothing**: a store applies the feature and adopts whichever of its own `add`/`update`/`remove` are genuinely plain CRUD, aliasing the feature's generic method to its own public name (`addRule: (rule) => store.add(rule)`); a divergent operation (a cascade, a referencing-row cleanup, an upsert) stays hand-rolled right alongside the adopted ones on the same store.
- Migrated two stores to prove the shape: `RulesStore` (fully plain — all three of `addRule`/`updateRule`/`removeRule` adopted) and `AccountsStore` (partially — `addAccount`/`updateAccount` adopted, `removeAccount` stays hand-rolled since it cascades through `AccountDeletionService`). `CategoriesStore` and `MappingProfilesStore` are left as documented "no" cases per the divergences above; nothing stops them adopting the feature for their own plain-CRUD methods later, opportunistically.