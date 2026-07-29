# TICKET-CLEANUP-05 — Delete the unrendered `bento-grid`/`bento-item` components

- **Area:** Cleanup
- **Type:** Refactor
- **Traceability:** CR4-9 Option A ([solution doc](../solutions/CR4-09-bento-grid.md))

## User story

As a developer browsing the `shared/ui` barrel (the app's sanctioned-primitives list), I want it to contain only components the app actually renders, so autocomplete and Fallow both tell the truth about what exists.

## Description

Two shipped, specced, barrel-exported components rendered by no template — a redesign leftover with no recorded status. Decision: delete. Git history keeps them recoverable; resurrecting two presentational components against a then-current design language is cheaper than adapting stale ones.

## Current situation (as-is)

- [src/app/shared/ui/bento-grid/](../../../src/app/shared/ui/bento-grid/) contains both components + specs; two export lines in [shared/ui/index.ts](../../../src/app/shared/ui/index.ts); no template renders either (main-branch grep, per the review).

## Desired result (to-be)

- Folder and barrel lines gone; Fallow's unrendered-component findings for them disappear.

## Acceptance criteria

- [x] Pre-flight: sweep the `design/*` branches for bento usage (`git grep bento <branch>` across `git branch --format='%(refname:short)'`) — record the result in this ticket; if a branch renders them, stop and re-decide. (**Swept all 18 local branches** — the 15 `design/*` ones plus `main`, `tmp`, and a stale `claude/*` worktree branch. Zero of them reference `bento` anywhere outside `shared/ui/bento-grid/` itself and the two `shared/ui/index.ts` barrel lines. No branch renders them; deletion proceeds as decided.)
- [x] `shared/ui/bento-grid/` deleted; barrel exports removed; grep for `bento` in `src/` comes back empty. (One deliberate exception remains: `changelog-entries.ts` line 141, a shipped-history entry whose text mentions "a Bento-grid dashboard layout". The changelog is append-only history, so it stays — see the note below.)
- [x] `ng lint`, `ng test`, `ng build --configuration development` pass. (Lint clean, dev build clean, 1515/1516 tests pass — the failures are the pre-existing TF.js training-timeout flakes in `category-model.worker.spec.ts`. The four deleted spec cases were the components' own.)
- [x] Verified via the fallow skill (the two unrendered-component findings are gone) and coding-conventions skill. (Confirmed: a clean-tree `fallow dead-code` run is down from **6 findings to 4** — both `unrendered-component` findings for bento are gone, as is `DATA_MANAGEMENT_ROUTES` from TICKET-DAT-04. What remains is the three known-false ones the review catalogued — `scripts/update-dependency-graphs.mjs` and the two `import-map-step` inputs — plus one real `unused-type` (`PercentVariant`, re-exported from `shared/utils/index.ts`) that TICKET-CLEANUP-06 will need to resolve.)

## Notes

- Option C (park outside the barrel) explicitly rejected — preserves bytes nobody can use and satisfies neither goal.
- Removes two of Fallow's three real clean-tree findings — pairs with TICKET-DAT-04 as the prerequisite for TICKET-CLEANUP-06's zero-noise gate.
- **Surfaced while sweeping (2026-07-29):** the v1.5 redesign changelog entry advertises "a Bento-grid dashboard layout" to users, but no template has ever rendered these components on any branch — so either the layout shipped built from other primitives, or that part of the entry was aspirational. The entry is left untouched (the changelog is append-only shipped history, not a spec), but it is the likeliest explanation for how two specced, barrel-exported components ended up rendered nowhere.
