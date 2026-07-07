# TICKET-NG-04 — Finish `withArchivable` (remove dead `setArchived` or fold the flow in)

- **Area:** Angular patterns (shared store feature)
- **Type:** Refactor
- **Traceability:** CR-7.4
- **Source story:** code-review/user-stories.md §7 — *"As a developer, I want `withArchivable` finished — either drop the unused `setArchived` or move the persist-then-patch archive flow into the feature — so the two consuming stores stop duplicating their `archiveX`/`unarchiveX` pairs."*

## Description

The `withArchivable` signal-store feature exposes a `setArchived(id, archived)` method that no store calls; meanwhile `AccountsStore` and `CategoriesStore` each hand-roll their own `archiveX`/`unarchiveX` pair. Resolve the half-finished abstraction: either delete the unused method, or move the persist-then-patch archive flow into the feature so the two stores stop duplicating it.

## Current situation (as-is)

- [with-archivable.ts:31](../../../src/app/shared/utils/with-archivable.ts) exports `setArchived(id, archived)`, which patches `entityMap` **in memory only** (no persistence) and is called by no store.
- Both consumers instead define their own persist-then-reflect pairs:
  - [accounts.store.ts:132](../../../src/app/feature-accounts/accounts.store.ts) — `archiveAccount`/`unarchiveAccount` delegate to `updateAccount(id, { archived })`.
  - [categories.store.ts:86](../../../src/app/feature-categories/categories.store.ts) — `archiveCategory`/`unarchiveCategory` delegate to `updateCategory(id, { archived })`.
- So `withArchivable` currently only earns its keep via `activeEntities`/`archivedEntities`; the `setArchived` method is dead and its purely-in-memory patch would actually be a persistence bug if used.

## Desired result (to-be)

Pick one and finish it (the ticket resolves the ambiguity, not both):
- **Option A (lean, recommended):** delete the unused `setArchived` method from `withArchivable`, leaving it as the pure `activeEntities`/`archivedEntities` filter feature. The two stores keep their own `archiveX`/`unarchiveX` (they persist through the repository, which the generic method can't).
- **Option B (share the flow):** parameterise `withArchivable` with the store's persistence call so it can expose a real `archive`/`unarchive` pair that persists through the repository, and have both stores alias it instead of hand-rolling the pair.

Either way, no dead code and no purely-in-memory `setArchived` that silently skips persistence.

## Acceptance criteria

- [x] A decision between Option A and Option B is recorded in the ticket/PR; the codebase reflects exactly one. — **Option A** chosen: the two stores' `archiveX`/`unarchiveX` pairs are minimal (one-line delegation to their own repository-backed `updateX`) and `withArchivable` is composed before those methods exist, so threading a persist callback into the feature (Option B) would add complexity for no real duplication removed.
- [x] `setArchived` no longer exists in its current form: either removed (Option A) or replaced by a persistence-backed `archive`/`unarchive` (Option B). — removed from [with-archivable.ts](../../../src/app/shared/utils/with-archivable.ts).
- [x] No archive path patches store state without going through the repository (per CLAUDE.md: stores persist via repositories, never raw Dexie) — an in-memory-only archive toggle must not remain reachable. — the only remaining archive paths are `AccountsStore.archiveAccount`/`unarchiveAccount` and `CategoriesStore.archiveCategory`/`unarchiveCategory`, which persist via `updateAccount`/`updateCategory` → repository.
- [x] `activeAccounts`/`archivedAccounts` and `activeCategories`/`archivedCategories` still resolve correctly. — unchanged (still sourced from `withArchivable`'s `activeEntities`/`archivedEntities`); verified by unit tests and live browser check.
- [x] If Option B: `AccountsStore` and `CategoriesStore` drop their duplicated `archiveX`/`unarchiveX` pairs in favour of the shared method; if Option A: the stores are unchanged and only `with-archivable.ts` shrinks. — Option A: stores unchanged, `with-archivable.ts` shrank (dropped `setArchived`, `withMethods`, unused `patchState`/`EntityId` imports).
- [x] Unit tests cover the archive/unarchive round-trip through whichever store keeps it, asserting persistence (repository called) and the active/archived filters updating. Existing store specs still pass. — added to [accounts.store.spec.ts](../../../src/app/feature-accounts/accounts.store.spec.ts) and new [categories.store.spec.ts](../../../src/app/feature-categories/categories.store.spec.ts); full suite (`ng lint` + `ng test` + `ng build --configuration development`) passes, 214 tests green.
- [x] Verified live in the browser: archiving and unarchiving an account and a category still persists across reload. — archived/unarchived "Everyday Checking" (account) and "Shopping" (category) via the UI; confirmed each disappeared/reappeared from the active list across a full page reload (IndexedDB persistence).

## Notes

- Fallow (and the review) flags `setArchived` as unused — this is dead-code cleanup with a correctness angle (the method would skip persistence if wired up), so prefer resolving it rather than leaving it.
- Option A is the smaller change and keeps repository persistence explicit in each store; Option B removes the `archiveX`/`unarchiveX` duplication at the cost of threading a persist callback into the feature.
