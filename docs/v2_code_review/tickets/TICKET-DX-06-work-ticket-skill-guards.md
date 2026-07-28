# TICKET-DX-06 — Add doc-freshness and AC-honesty guards to the `work-ticket` skill

- **Area:** Process / Docs
- **Type:** Refactor
- **Traceability:** CR4-11 Option B, CR4-12 Option C, CR4-13 Part 2 Options A+B+C ([CR4-11 doc](../solutions/CR4-11-project-map-skill.md), [CR4-13 doc](../solutions/CR4-13-ticket-bookkeeping.md))

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

- [ ] All three guards present in the skill, phrased as workflow steps (not advice), in the skill's existing step format.
- [ ] The CR5 drift-audit sentence recorded where the next review will find it (e.g. a note in this folder's README or the review checklist location the team uses).
- [ ] Docs-only change: no lint/test/build impact.
- [ ] A dry read-through of the amended skill against a recent shipped ticket confirms the steps are executable as written.

## Notes

- One checklist edit covers both CR4-11's and CR4-12's process hooks — implement once.
- Limitation accepted: guards cover skill-driven ticket work; ad-hoc sessions can still skip them. Most structural change flows through tickets.
