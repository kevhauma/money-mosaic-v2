# TICKET-DX-06 — Add doc-freshness and AC-honesty guards to the `work-ticket` skill

- **Area:** Process / Docs
- **Released in:** [v2 Code review (CR4)](../../releases/v2_code_review/overview.md)
- **Type:** Refactor
- **Traceability:** CR4-11 Option B, CR4-12 Option C, CR4-13 Part 2 Options A+B+C ([CR4-11 doc](../../releases/v2_code_review/solutions/CR4-11-project-map-skill.md), [CR4-13 doc](../../releases/v2_code_review/solutions/CR4-13-ticket-bookkeeping.md))

## User story

As the maintainer of this repo's ticket workflow, I want the `work-ticket` skill to enforce doc updates and evidence-backed acceptance-criteria ticks, so the project-map can't silently rot again and no future ticket ends up with checked boxes describing code that doesn't exist (the SET-06 failure).

## Description

Extend `.claude/skills/work-ticket/SKILL.md` — the same mechanism that has kept the changelog current — with three guards. This is the recurrence-prevention half of CR4-11/12/13; the content fixes are TICKET-DX-04/05 and TICKET-DAT-04.

## Current situation (as-is)

- [.claude/skills/work-ticket/SKILL.md](../../../.claude/skills/work-ticket/SKILL.md) carries doc side-effects (changelog entry, roadmap removal) but nothing touches the project-map/conventions skills, and nothing requires evidence when ticking an AC — which is how SET-06's route criteria got checked without the route existing.

## Desired result (to-be)

Three additions to the skill:

1. **Doc side-effect step (CR4-11 B + CR4-12 C):** "if the ticket added/moved a route, store, `core/` module, or `shared/` primitive — or changed a pattern the conventions skill describes — update project-map/coding-conventions SKILL.md in the same change."
2. **AC↔diff cross-check (CR4-13 P2 A):** ticking a criterion requires citing the evidence (file/spec/behavior); before closing, a final pass re-reads every `[x]` against the working tree.
3. **Divergence rule (CR4-13 P2 B):** implementations may diverge from AC mid-ticket, but the divergence is recorded at the moment of pivot — AC amended, never silently outgrown.

Plus one sentence in the next review's method/template (CR4-13 P2 C): sample recently-closed tickets' checked ACs against the code.

## Acceptance criteria

- [x] All three guards present in the skill, phrased as workflow steps (not advice), in the skill's existing step format. (**Divergence rule** → end of Step 4, where the pivot actually happens, naming SET-06 as the failure it prevents. **Evidence + cross-check** → Step 5: item 3 now requires appending the proving file/spec/observation in parentheses when ticking, item 4 requires an honest open box with a reason for anything deliberately skipped, and a new item 5 is the final AC↔diff pass before Step 6. **Doc side-effect** → a new Step 6.6, with two explicit trigger lists — one per skill — rather than a general instruction to "keep docs current".)
- [x] The CR5 drift-audit sentence recorded where the next review will find it (e.g. a note in this folder's README or the review checklist location the team uses). (Added as a "When conducting the next review" section in [`docs/README.md`](../../README.md) — the file whose naming rule is consulted whenever a review folder is created, so it's read at exactly the right moment. It quotes the sampling instruction, cites the SET-06 evidence, and notes that the `work-ticket` guards prevent recurrence while only a review detects whether they're holding.)
- [x] Docs-only change: no lint/test/build impact. (Changed: `.claude/skills/work-ticket/SKILL.md` and `docs/README.md`. Nothing under `src/`.)
- [x] A dry read-through of the amended skill against a recent shipped ticket confirms the steps are executable as written. (Read against **TICKET-SOLID-07** and **TICKET-SET-07**, both closed hours earlier in this same batch. SOLID-07 moved a store → Step 6.6's second trigger fires → the project-map store registry needed updating, which is exactly what TICKET-DX-04 then had to do as follow-up work; under the new step it would have landed inside SOLID-07. SET-07 added `shared/utils/link-control-to-setting.ts` and established the "each setting is a section component" convention → both skills' triggers fire. The dry run surfaced one imprecision, fixed in the same pass: the trigger read "a `shared/` primitive", which scans as `shared/ui` only and would have missed SET-07's util — it now names `shared/ui` primitives and reusable `shared/utils` helpers separately. Step 5's evidence requirement is demonstrably executable: every ticket closed in this batch already ticks in that format.)

## Notes

- One checklist edit covers both CR4-11's and CR4-12's process hooks — implement once.
- Limitation accepted: guards cover skill-driven ticket work; ad-hoc sessions can still skip them. Most structural change flows through tickets.
