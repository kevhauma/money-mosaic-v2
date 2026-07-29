# TICKET-DX-04 — Rewrite the project-map skill against current reality, with a smaller claim surface

- **Area:** Process / Docs
- **Type:** Refactor
- **Traceability:** CR4-11 Options A + C-lite, CR4-10 Option C ([solution doc](../solutions/CR4-11-project-map-skill.md), [CR4-10 doc](../solutions/CR4-10-store-placement-rule.md))

## User story

As an agent or developer told to "read the project-map skill instead of exploring," I want that map to be correct and to make fewer falsifiable claims, so it directs me instead of misdirecting me (this review lost time to its reversed hydration claim).

## Description

Full correction pass over `.claude/skills/project-map/SKILL.md` (the skill predates ~half the app), combined with C-lite claim-surface shrinking: drop the exhaustive per-folder file inventories and the shared/ui component list in favor of pointers to the actual registries.

## Current situation (as-is)

- [.claude/skills/project-map/SKILL.md](../../../.claude/skills/project-map/SKILL.md): missing 4 of 11 routed features; describes bootstrap-time hydration (reversed by PERF-07 — stores self-hydrate on first injection); omits `AppSettingsStore` from the state inventory; stale `/data` and `docs/v2` claims; half the `shared/ui` inventory absent; misplaced file claims (`date-buckets.ts` etc.); missing `core/` modules (`theme`, `onboarding`, `links`, `storage`, `layout`).

## Desired result (to-be)

- Features table lists all 11 routed features plus the data-management embed (noting it is *not* routed, per TICKET-DAT-04).
- Hydration described as self-hydrate-on-first-injection; `app.config.ts` = `appDb.open()` + dev-seed only.
- A **complete store registry**: every store, its location, and rationale — including `AppSettingsStore` and `range-state.store.ts`'s new `core/state/` home, with the CR4-10 placement sentence.
- File placements corrected; missing `core/` modules added; docs section defers to `docs/README.md` instead of re-listing versions.
- Claim-surface shrunk: no exhaustive `core/stats` file list ("one file per statistic — `ls` it"), no shared/ui component list (point at `shared/ui/index.ts`).

## Acceptance criteria

- [x] Every remaining factual claim in the skill spot-checked against the working tree (routes, store list, file placements) — no stale claims survive. (Checked against `app.routes.ts`, `app.config.ts`, `ls src/app/core`, `ls src/app/feature-*`, `ls src/app/shared/*`, and `git ls-files '*.store.ts'`. Corrections made: the reversed hydration claim (bootstrap → self-hydrate on first injection, with the spec consequence spelled out); four missing routed features added (`/help`, `/changelog`, `/settings`, and `feature-home`'s `/` + `/home`); the `/data` route row replaced by an explicit "not routed, embedded in Settings" note; `date-buckets.ts` moved from the `core/stats` claim to `shared/utils`, where it lives; the stale `core/stats` file list (which still named a `spending-rate.ts` that is now `periodized-rate.ts`, and omitted `classify-for-stats.ts` and `net-margin.ts`) dropped entirely; five missing `core/` modules documented (`theme`, `onboarding`, `layout`, `storage`, `links`); component lists per feature refreshed for the components this backlog added.)
- [x] The two exhaustive inventories are gone, replaced by pointers. (`shared/ui` → "the list is `shared/ui/index.ts` — read it rather than a copy here"; `core/stats` → "roughly one file per statistic — `ls` it", keeping only `classify-for-stats.ts` called out as the entry point worth knowing. `shared/utils` got the same treatment, keeping a named shortlist of the load-bearing ones. The docs section now defers to `docs/README.md` instead of re-listing every version folder.)
- [x] Store registry includes all stores (`git ls-files '**/*.store.ts'` cross-check) with placement rationale. (All **14** stores in one table with location + why, cross-checked against `git ls-files '*.store.ts'`. Includes `AppSettingsStore` (previously absent) and `RangeStore` at its new `core/state/` home, headed by the CR4-10 placement sentence, and a closing note that `ImportWizardSession` is deliberately *not* a store.)
- [x] Docs-only change: no lint/test/build impact. (Only `.claude/skills/project-map/SKILL.md` changed; nothing under `src/`.)
- [x] Verified via the coding-conventions skill for consistency with TICKET-DX-05's edits (fallow not applicable — no code). (Same session, cross-checked both ways: the two files now tell one hydration story, project-map defers to conventions for the `*Session` rule and store-shape conventions, and conventions defers to project-map for the store registry rather than repeating a list that went stale before. Every `../../../src/...` exemplar link in both skills was resolved against the working tree — 6 links, all present.)

## Notes

- Sequence after TICKET-DAT-04 and TICKET-SOLID-07 so the map records final placements (or annotate pending outcomes explicitly).
- Same documentation session as TICKET-DX-05 — one review-and-verify motion. The recurrence guard (process hook) is TICKET-DX-06.
- Optional generator for the volatile sections (routes/stores tables via the existing `GENERATED:` marker convention) noted as follow-up, not in scope.
