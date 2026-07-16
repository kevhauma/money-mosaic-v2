# TICKET-UI-03 — Bento-grid layout primitive

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-3

## User story

As a developer, I want a named Bento-grid layout primitive, so the redesign's "layout foundation" (uneven, card-based grid panels) lives in one reusable component instead of being reinvented with raw `grid`/`grid-cols-*`/`col-span-*` utilities on every page that wants it.

## Description

Prepare.md names "Bento Box Grid" as the redesign's layout foundation and separately flags `grid`/`grid-cols-*`/`col-span-*` as candidate extraction targets. This ticket deliberately does **not** extract every generic flex/grid usage in the app into a component — the coding-conventions skill's styling rule explicitly keeps plain layout/positioning utilities (`flex`, `grid`, `gap`, margin/padding, width/height) inline in feature templates, and two `<div>`s with `flex gap-2` don't need a wrapper. What *does* warrant a primitive is the Bento grid specifically: a named, reusable layout pattern (uneven column spans, responsive breakpoints, a consistent gap scale) that multiple pages will want identically, the same way `stat-card` earned a primitive instead of every page hand-rolling a stat tile.

## Current situation (as-is)

- No grid layout primitive exists in `shared/ui/`; `feature-dashboard/components/dashboard-overview/` currently arranges its panels with whatever plain grid utilities were reached for at the time.
- The dashboard is the first and primary consumer this version targets — see [TICKET-UI-12](./TICKET-UI-12-dashboard-bento-layout.md), which applies this primitive.

## Desired result (to-be)

- New `shared/ui/bento-grid/bento-grid.component.ts` (selector `mm-bento-grid`) rendering a CSS grid container with a fixed column/gap scale (typed `input()`s for `columns`/`gap` if variance is needed, otherwise a single fixed scale — start with the simplest option and only add variance if a second consumer needs it).
- A companion `mm-bento-item` (or a `span`/`rowSpan` `input()` directly, whichever keeps the API smaller) controls how many columns/rows a child panel occupies, so panel authors declare "I'm a 2x1 tile" without writing `col-span-2` by hand.
- Both remain pure layout — no color/border/padding opinions belong here (that's `mm-paper`, [TICKET-UI-04](./TICKET-UI-04-paper-primitive.md)'s job); a bento item wraps its content in a `mm-paper` surface, not the other way round.

## Acceptance criteria

- [ ] `mm-bento-grid` + span-control API defined and unit-tested for at least 2/3/4-column responsive behavior
- [ ] No opinions about color, border, or padding leak into this component — verified it composes with, not duplicates, `mm-paper`
- [ ] Verified via the fallow and coding-conventions skills

## Notes

**Scope decision:** this ticket does not attempt to migrate every ad-hoc `flex`/`grid` usage across the app into shared components — only the Bento pattern gets one, because it's the one genuinely reusable, named layout concept this redesign introduces. Generic layout utilities stay inline per the existing styling convention; if UI-01's audit surfaces a *second* named, repeated layout pattern beyond Bento, that's a candidate for its own future primitive, not scope creep on this one.
