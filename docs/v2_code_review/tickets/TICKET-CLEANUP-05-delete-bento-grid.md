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

- [ ] Pre-flight: sweep the `design/*` branches for bento usage (`git grep bento <branch>` across `git branch --format='%(refname:short)'`) — record the result in this ticket; if a branch renders them, stop and re-decide.
- [ ] `shared/ui/bento-grid/` deleted; barrel exports removed; grep for `bento` in `src/` comes back empty.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill (the two unrendered-component findings are gone) and coding-conventions skill.

## Notes

- Option C (park outside the barrel) explicitly rejected — preserves bytes nobody can use and satisfies neither goal.
- Removes two of Fallow's three real clean-tree findings — pairs with TICKET-DAT-04 as the prerequisite for TICKET-CLEANUP-06's zero-noise gate.
