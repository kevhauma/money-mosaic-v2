# TICKET-DAT-04 — Commit to the settings embed: delete dead route wiring, repair the SET-06 record

- **Area:** Data management
- **Type:** Refactor
- **Traceability:** CR4-8 Option A + CR4-13 Part 1 Option A ([route doc](../solutions/CR4-08-data-management-route-remnants.md), [bookkeeping doc](../solutions/CR4-13-ticket-bookkeeping.md))

## User story

As a developer (or agent) reading the data-management feature, I want the code and the SET-06 ticket record to both say the same true thing — data management is an embedded Settings section — so nobody plans work on top of a route that doesn't exist.

## Description

Ends the half-state left by the SET-06 migration in the decided direction: **embed**. Delete the dead route wiring, and amend TICKET-SET-06's record to document the divergence honestly, including the still-outstanding browser verification done against the embed.

## Current situation (as-is)

- [data-management.routes.ts](../../../src/app/feature-data-management/data-management.routes.ts) exports `DATA_MANAGEMENT_ROUTES` that no route table references; the feature [barrel](../../../src/app/feature-data-management/index.ts) re-exports it.
- [TICKET-SET-06](../../v2/tickets/TICKET-SET-06-move-data-nav-into-settings.md): implementation criteria are checked for a `/settings/data` child route that doesn't exist; the shipped code embeds `DataManagementOverviewComponent` in the Settings page; the v2 overview line is still unchecked.

## Desired result (to-be)

- `data-management.routes.ts` and its barrel export deleted; the feature folder hosts the embedded component + repository without pretending to be routed.
- TICKET-SET-06 carries a dated implementation note ("shipped as an embedded section, superseding the route-based criteria"), route/link criteria re-marked to describe what shipped, the browser-verification criterion honestly completed against the embed, and the v2 `overview.md` line ticked.

## Acceptance criteria

- [ ] `DATA_MANAGEMENT_ROUTES` no longer exists anywhere (grep clean); `ng build --configuration development` passes.
- [ ] `feature-help` content grepped for deep links to a data-management route ("go to Data Management"-style instructions) — none point at a dead URL, or they're updated to point at Settings.
- [ ] Navigating to `/data` manually lands on sane unmatched-route behavior (verify what the router actually does — the route table has no wildcard today; record the observed behavior).
- [ ] SET-06 record amended as described, with one sentence reconstructing from commit history whether the pivot was deliberate or the tick premature.
- [ ] Export/import/delete-all still work from the Settings embed (live browser check).
- [ ] `ng lint`, `ng test` pass ([app-shell.component.spec.ts](../../../src/app/core/layout/app-shell/app-shell.component.spec.ts)'s "no `/data` nav link" assertion stays valid).
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- This removes one of Fallow's three real clean-tree findings — prerequisite for TICKET-CLEANUP-06's zero-noise gate.
- CR4-8 Option B (implement the route) rejected with CR4-5's decision: settings stays a single page with section components (TICKET-SET-07).
