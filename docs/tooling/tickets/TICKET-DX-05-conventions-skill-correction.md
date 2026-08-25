# TICKET-DX-05 — Correct the coding-conventions skill and land the CR4 rules in one pass

- **Area:** Process / Docs
- **Released in:** [v2 Code review (CR4)](../../releases/v2_code_review/overview.md)
- **Type:** Refactor
- **Traceability:** CR4-12 Options A+B ([solution doc](../../releases/v2_code_review/solutions/CR4-12-coding-conventions-skill.md)); carries CR4-1 Option G2, CR4-7's rule, CR4-10's sentence, CR4-5's convention, CR4-4 Option E's cap

## User story

As a developer or agent following the conventions skill, I want it to teach exactly one (current) persistence/hydration story and to carry the rules this review decided, so the doc stops teaching a retired pattern with known footguns and the new rules live where conventions are looked up.

## Description

One coherent pass over `.claude/skills/coding-conventions/SKILL.md`: fix the self-contradiction, convert volatile mechanics to exemplar links (prose keeps rules + rationale), and add the one-liners the other CR4 tickets rely on.

## Current situation (as-is)

- [.claude/skills/coding-conventions/SKILL.md](../../../.claude/skills/coding-conventions/SKILL.md): line ~96 describes constructor-`effect()` persistence mirroring and bootstrap-time hydration; line ~99 (and the actual code) describe `withPersistedCrud` explicit-await persistence and hydrate-on-first-injection (PERF-07). Two incompatible patterns presented as current.

## Desired result (to-be)

- Exactly one persistence/hydration story: explicit repository awaits (`withPersistedCrud` for plain CRUD, hand-rolled for divergent ops, per NG-08) + idempotent `hydrate()` on first injection. Effect-mirroring/bootstrap sentences deleted (git history carries the archaeology).
- Volatile store mechanics designated by exemplar ("the canonical store shape is `core/state/accounts.store.ts` — copy it"); the NG-08 rationale paragraph survives in prose.
- New rules added, one line each:
  - **Templates (CR4-1 G2):** templates may branch on state; they may not derive state — no nested ternaries, no method calls inside `@for`, display mappings (colors/icons/labels) belong on the VM.
  - **Exports (CR4-7):** a component file may export its selector class and I/O types consumed only by its direct host; shared vocabulary lives in a plain `.ts` module; formatting helpers live in `shared/utils`, never `shared/ui`.
  - **Store placement (CR4-10 A):** any store consumed across features lives in `core/state/`; only feature-private stores stay in feature folders.
  - **Settings (CR4-5):** each new setting ships as its own section component under `feature-settings/components/`.
  - **Import mapping (CR4-4 E):** new mapping concerns go into `feature-import` modules, not the map-step component class.

## Acceptance criteria

- [x] The contradiction is gone: grep the skill for `effect`-mirroring/bootstrap-hydration phrasing — no match presents it as current. (The old "Persistence via `effect()` … app bootstrap hydrates source signals before the app renders" bullet is deleted. Grepping both skills for `effect()`/`bootstrap` now returns exactly two lines, and each *negates* the retired pattern rather than teaching it: "there is no `effect()` mirroring signal writes into IndexedDB" and "Bootstrap does not hydrate anything.")
- [x] Exemplar links point at files that exist (each link resolves in the working tree). (All 6 `../../../src/...` links in the skill resolved: the 3 pre-existing `shared/ui` ones plus the 3 new ones — `core/state/accounts.store.ts`, `feature-transactions/transaction-row-vm.ts`, `feature-categories/rule-condition-editor.ts`.)
- [x] All five rules present, each ≤2 sentences, placed in their matching sections. (Templates and exports → **Code Style**, beside the control-flow rule they qualify; store placement → **State Management**, replacing the old hardcoded entity-store list; settings and import-mapping → **Feature Folder Structure**, as a short "standing shape" pair under the folder rules.)
- [x] Docs-only change: no lint/test/build impact. (Only `.claude/skills/coding-conventions/SKILL.md` changed; nothing under `src/`.)
- [x] Reviewed alongside TICKET-DX-04 in the same session for cross-consistency. (Same pass. The two now defer to each other instead of duplicating: conventions points at project-map for the store registry, project-map points at conventions for the `*Session` and store-shape rules.)

## Notes

- The recurrence guard (work-ticket process hook covering both skills) is TICKET-DX-06 — implement once, cover both files.
- Two additions beyond the five listed rules, both consequences of correcting the hydration story rather than new policy: the store-shape bullet now designates `core/state/accounts.store.ts` as the exemplar to copy (per the to-be section's "volatile mechanics by exemplar"), and the persistence bullet spells out the spec-level consequence — **mock the repository before creating the component**, because re-mocking afterwards hits the cached `hydrate()`. That footgun cost time in two earlier tickets, so it is written down where it will be read.
