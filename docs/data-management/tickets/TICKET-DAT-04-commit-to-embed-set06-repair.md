# TICKET-DAT-04 — Commit to the settings embed: delete dead route wiring, repair the SET-06 record

- **Area:** Data management
- **Released in:** [v2 Code review (CR4)](../../releases/v2_code_review/overview.md)
- **Type:** Refactor
- **Traceability:** CR4-8 Option A + CR4-13 Part 1 Option A ([route doc](../../releases/v2_code_review/solutions/CR4-08-data-management-route-remnants.md), [bookkeeping doc](../../releases/v2_code_review/solutions/CR4-13-ticket-bookkeeping.md))

## User story

As a developer (or agent) reading the data-management feature, I want the code and the SET-06 ticket record to both say the same true thing — data management is an embedded Settings section — so nobody plans work on top of a route that doesn't exist.

## Description

Ends the half-state left by the SET-06 migration in the decided direction: **embed**. Delete the dead route wiring, and amend TICKET-SET-06's record to document the divergence honestly, including the still-outstanding browser verification done against the embed.

## Current situation (as-is)

- [data-management.routes.ts](../../../src/app/feature-data-management/data-management.routes.ts) exports `DATA_MANAGEMENT_ROUTES` that no route table references; the feature [barrel](../../../src/app/feature-data-management/index.ts) re-exports it.
- [TICKET-SET-06](../../settings/tickets/TICKET-SET-06-move-data-nav-into-settings.md): implementation criteria are checked for a `/settings/data` child route that doesn't exist; the shipped code embeds `DataManagementOverviewComponent` in the Settings page; the v2 overview line is still unchecked.

## Desired result (to-be)

- `data-management.routes.ts` and its barrel export deleted; the feature folder hosts the embedded component + repository without pretending to be routed.
- TICKET-SET-06 carries a dated implementation note ("shipped as an embedded section, superseding the route-based criteria"), route/link criteria re-marked to describe what shipped, the browser-verification criterion honestly completed against the embed, and the v2 `overview.md` line ticked.

## Acceptance criteria

- [x] `DATA_MANAGEMENT_ROUTES` no longer exists anywhere (grep clean); `ng build --configuration development` passes. (`data-management.routes.ts` deleted; the feature barrel is now just `export * from './components';`. `grep -rn "DATA_MANAGEMENT_ROUTES" src/` returns nothing — remaining hits are in `docs/` prose describing the history, which is intentional. Dev build clean. Fallow's clean-tree dead-code report no longer lists it.)
- [x] `feature-help` content grepped for deep links to a data-management route ("go to Data Management"-style instructions) — none point at a dead URL, or they're updated to point at Settings. (Grepped `feature-help/data/faq.ts` and `guides.ts` for "data management", "/data", "/settings/data", "export", "backup": the only two "data" hits are incidental prose — "leaves your existing data untouched" in the import guide and "not enough data" in the learning guide. No deep links exist, so nothing needed updating.)
- [x] Navigating to `/data` manually lands on sane unmatched-route behavior (verify what the router actually does — the route table has no wildcard today; record the observed behavior). (**Observed and pinned in a new `src/app/app.routes.spec.ts`**: with no wildcard route, `router.navigateByUrl('/data')` *rejects* with Angular's `NG04002: Cannot match any routes` and resolves `false` — the navigation fails outright rather than redirecting anywhere, identical to any other unmatched URL. The spec asserts all three: `/data` rejects, an arbitrary unknown URL rejects the same way, and `/settings` still resolves.)
- [x] SET-06 record amended as described, with one sentence reconstructing from commit history whether the pivot was deliberate or the tick premature. (SET-06 now carries a dated "Implementation note (added 2026-07-29 by TICKET-DAT-04)", its two route/link criteria are struck through and re-marked to describe the embed, the unit-test criterion is corrected, and the browser criterion records why it is still open. The reconstruction: the single implementation commit `e142f88` (2026-07-22) never touched `settings.routes.ts` at all while ticking the route/link criteria in that same commit — so the pivot to embedding was decided during implementation and the ticks were premature, not a later drift.)
- [ ] Export/import/delete-all still work from the Settings embed (live browser check) — **skipped**: the user explicitly asked to skip live browser verification for this whole ticket batch. Nothing in this ticket touches `DataManagementOverviewComponent` or `DataManagementRepository`; the only production change is deleting an unreferenced route file.
- [x] `ng lint`, `ng test` pass ([app-shell.component.spec.ts](../../../src/app/core/layout/app-shell/app-shell.component.spec.ts)'s "no `/data` nav link" assertion stays valid). (Lint clean; app-shell's 6 tests pass unchanged. Full suite 1521/1522 — the one failure is the pre-existing TF.js training-timeout flake in `category-model.worker.spec.ts`.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit` verdict **pass**: 0 dead-code issues, 0 complexity findings, 0 clone groups.)

## Notes

- This removes one of Fallow's three real clean-tree findings — prerequisite for TICKET-CLEANUP-06's zero-noise gate.
- CR4-8 Option B (implement the route) rejected with CR4-5's decision: settings stays a single page with section components (TICKET-SET-07).
