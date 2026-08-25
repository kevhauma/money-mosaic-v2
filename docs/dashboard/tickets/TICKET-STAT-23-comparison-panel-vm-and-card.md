# TICKET-STAT-23 — Finish the comparison panel's VM and extract the category card

- **Area:** Dashboard
- **Released in:** [v2 Code review (CR4)](../../releases/v2_code_review/overview.md)
- **Type:** Refactor
- **Traceability:** CR4-1 §2 Options A+B ([solution doc](../../releases/v2_code_review/solutions/CR4-01-template-complexity.md))

## User story

As a developer maintaining the dashboard, I want `CategoryComparisonVm` to carry the exact fields the template binds and the per-category card to be its own component, so the app's highest-cognitive-complexity template (48) stops re-deriving display facts the VM already half-computed.

## Description

The clearest unfinished-view-model case in the app: the VM exposes `deltaTone`/`deltaDirection` and the template re-maps both through nested ternaries. Finish the VM, then extract the per-category `mm-paper` as a presentational card taking one VM row.

## Current situation (as-is)

- [category-comparison-panel.component.html](../../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.html): lines ~53–59 map `deltaTone` onto itself via nested ternary; lines ~62–66 map `deltaDirection` to an icon name — both display mappings the VM should own.
- The per-category card (header + delta badge + bar row + avg/high/low footer, lines ~38–99) lives inline, so the panel's branch count is the sum of all its units'.

## Desired result (to-be)

- VM carries `deltaColor` and `deltaIcon` directly; the two ternaries are deleted.
- A `comparison-category-card` presentational component takes one `CategoryComparisonVm` row; the panel template drops to header, exclude-dropdown, a grid of cards, empty state.

## Acceptance criteria

- [x] No nested ternaries or display-fact derivation remain in the panel or card templates; the VM spec extends to cover `deltaColor`/`deltaIcon` per tone/direction.
- [ ] Panel renders identically (live browser check, including drill-down params and the exclude dropdown) — **skipped**: the user explicitly asked to skip live browser verification for this whole ticket batch. Automated coverage (panel + card specs) confirms the delta color/icon resolution and card rendering, but this was never exercised in a real browser.
- [x] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Land after TICKET-NG-10 (its `PERCENT_FORMATTER` in this file is replaced there — don't "fix" it locally here).
- If the class-side `categories` computed grows again, splitting bar-VM assembly into a module function is the natural next seam (noted, not in scope).
- **Fallow finding (recorded, not chased further):** the panel's component-rollup complexity (class + template combined) shows as cognitive 28/cyclomatic 16, "high" severity — the template's own remaining branching (exclude-dropdown `@if`/`@for`, `hasEnoughData` `@if`/`@else`, the categories `@for`) is legitimate page-level orchestration, the same kind CR4-1 already accepted for `accounts-detail.component.html`. This ticket's scope was specifically VM completion + card extraction (CR4-1 §2 Options A+B), not a deeper page rewrite; the fallow-noise calibration itself is TICKET-CLEANUP-06's job.
- **Incidental fix:** `src/app/shared/echarts/tooltip-formatter.spec.ts` had a pre-existing test-isolation gap (introduced by TICKET-NG-10's format-settings consolidation, surfaced here only because this ticket's new spec files shifted Vitest's file-run order) — it never reset the shared locale/currency-symbol signals itself, so it could inherit stale state from whichever spec ran before it. Fixed with a `beforeEach` resetting to `DEFAULT_LOCALE`, matching the pattern other specs already use.
