# TICKET-DX-05 — Correct the coding-conventions skill and land the CR4 rules in one pass

- **Area:** Process / Docs
- **Type:** Refactor
- **Traceability:** CR4-12 Options A+B ([solution doc](../solutions/CR4-12-coding-conventions-skill.md)); carries CR4-1 Option G2, CR4-7's rule, CR4-10's sentence, CR4-5's convention, CR4-4 Option E's cap

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

- [ ] The contradiction is gone: grep the skill for `effect`-mirroring/bootstrap-hydration phrasing — no match presents it as current.
- [ ] Exemplar links point at files that exist (each link resolves in the working tree).
- [ ] All five rules present, each ≤2 sentences, placed in their matching sections.
- [ ] Docs-only change: no lint/test/build impact.
- [ ] Reviewed alongside TICKET-DX-04 in the same session for cross-consistency.

## Notes

- The recurrence guard (work-ticket process hook covering both skills) is TICKET-DX-06 — implement once, cover both files.
