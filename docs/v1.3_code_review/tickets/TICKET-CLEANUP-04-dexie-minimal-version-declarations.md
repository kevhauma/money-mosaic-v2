# TICKET-CLEANUP-04 — Future Dexie versions declare only the tables they change

- **Area:** Cleanup (core/data-access, schema conventions)
- **Type:** Refactor
- **Traceability:** CR-6.4 (carried over from the first review, still open)

## User story

As a developer adding a schema version, I want the convention to be "declare only what changed", so a version block reads as a diff (what this version actually did) instead of a ten-table copy-paste where the one real change is invisible.

## Description

Every version block in `app-db.ts` re-declares the full table list — by `.version(10)` that's ten tables copied forward per bump, and reviewers must diff two near-identical blobs to find the actual change. Dexie's semantics make this unnecessary: `.stores()` in a new version only needs the added/changed tables; unchanged tables carry over. This ticket sets the convention **going forward** — shipped blocks stay untouched per the CLAUDE.md hard rule ("never edit a shipped version block").

## Current situation (as-is)

- [app-db.ts:489-697](../../../src/app/core/data-access/app-db.ts) — versions 1 through 10 each re-declare every table; e.g. `.version(9)` exists solely to add `dashboardLayoutSettings: 'id'` but restates eleven lines.
- The `data-model` skill ([.claude/skills/data-model/SKILL.md](../../../.claude/skills/data-model/SKILL.md)) documents the versioning rules but not the minimal-declaration convention.

## Desired result (to-be)

- Documented convention (in the `data-model` skill and, if present, the header comment above the version blocks in `app-db.ts`): a new `.version(n + 1).stores({...})` lists **only** added or index-changed tables; a comment names what changed and why.
- Shipped version blocks 1–10 are **not** rewritten — the convention applies from `.version(11)` onward. (Rationale recorded: Dexie treats a minimal declaration as equivalent, but the hard rule against editing shipped blocks outweighs the cosmetic win of collapsing history.)

## Acceptance criteria

- [ ] The `data-model` skill's versioning section states the minimal-declaration convention with a worked example.
- [ ] `app-db.ts` carries the convention note where the next author will see it (adjacent to the version chain).
- [ ] `git diff` shows zero changes inside version blocks 1–10.
- [ ] The next real schema bump (e.g. TICKET-PERF-03's `.version(11)`) follows the convention — if that ticket lands first with a full re-declaration, this ticket includes bringing that one *unshipped-or-latest* block in line **only if it has not shipped to any user's browser yet**; otherwise the convention simply starts at the next bump.
- [ ] Verified via the coding-conventions skill (fallow has no schema opinion here — no re-run needed).

## Notes

- Local-first nuance behind the hard rule: every user's browser holds a real database at some historical version; the upgrade path must replay identically forever. Minimal declarations are upgrade-path-equivalent in Dexie, but "never touch shipped blocks" is the cheaper invariant to reason about — hence convention-forward, not retro-collapse.
