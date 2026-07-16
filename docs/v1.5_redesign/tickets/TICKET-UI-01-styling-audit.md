# TICKET-UI-01 — Styling audit & extraction punch list

- **Area:** Design System
- **Type:** Chore
- **Traceability:** FR-UI-1

## User story

As a developer preparing the app for a visual redesign, I want a complete, current inventory of every place styling decisions are made outside `shared/ui/`, so the extraction tickets that follow (UI-02..UI-10) are scoped from an accurate list instead of a manual first pass.

## Description

[prepare.md](../prepare.md) — this version's seed notes — already hand-found the biggest offenders (tabs, label, table, dropdown/menu, icon buttons, grid/flex, fieldset, divider, a "paper" surface pattern) by reading through templates, but a manual read-through is inherently incomplete. Before implementation starts, run a real sweep (fallow's duplication detection plus targeted greps) across every template to close that gap and turn the hand-written list into a verified one.

## Current situation (as-is)

- `shared/ui/` currently has 15 primitives: `alert`, `badge`, `button`, `confirm-dialog`, `date-range-input`, `empty-state`, `granularity-picker`, `input`, `loading-skeleton`, `modal`, `page-header`, `paginator`, `range-grouping-switcher`, `select`, `stat-card`. None of them cover the 13 patterns prepare.md flagged.
- No fallow duplication pass or exhaustive grep has been run against these specific patterns yet — prepare.md's list is a manual read-through, not a verified audit.
- The coding-conventions skill's styling rule 4 ("Shared visual primitives... live in `shared/ui/`... feature templates should reuse these rather than re-authoring the same daisyUI pattern twice") is the standard this audit measures the codebase against.

## Desired result (to-be)

- Run fallow's duplication/pattern detection scoped to `src/app/**/*.component.html`, plus a grep sweep for each of prepare.md's 13 candidate patterns (`tabs`/`tab`, bare `<span>` text styling, `label`, `flex`, `table`/`th`/`tr`/`td`, a border+padding "paper" pattern, `dropdown-content`/`menu`, icon-only buttons, `grid`/`grid-cols-*`/`col-span-*`, `fieldset`/`fieldset-legend`, `rounded-field`, `divider`, non-list skeleton usage).
- Results committed as `docs/v1.5_redesign/audit-results.md`: a table of pattern → matching files/line counts → the ticket (UI-02..UI-10) it feeds, so each extraction ticket's acceptance criteria can reference a real file list rather than "however many prepare.md happened to notice."
- Any pattern found with no existing target ticket gets folded into the closest-matching ticket's scope, or added to this overview's "Considered, not ticketed yet" section if it's too small to justify its own primitive (e.g. a single `rounded-field` usage on a color input).

## Acceptance criteria

- [x] Fallow run across `src/app/**/*.component.html` targeting duplicated Tailwind/daisyUI class strings, results recorded
- [x] Grep sweep completed for each of the 13 prepare.md patterns, with file:line matches recorded
- [x] `docs/v1.5_redesign/audit-results.md` committed, grouping every match by the primitive ticket it belongs to
- [x] Any newly discovered pattern without an existing target ticket is either added to an existing ticket's AC or logged under "Considered, not ticketed yet" in the overview
- [x] Verified via the fallow skill

## Notes

This ticket produces no application code — it's a research step that de-risks UI-02..UI-10's scope. It does not block starting those tickets (prepare.md's manual list is a reasonable starting scope), but each of them should re-check its own AC against `audit-results.md` once this lands, and extend coverage if the audit found more instances than prepare.md did.
