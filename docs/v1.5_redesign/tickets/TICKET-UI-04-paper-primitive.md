# TICKET-UI-04 — Paper/surface primitive

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-4

## User story

As a developer, I want a shared "Paper" surface component (border, padding, background, optional elevation), so every panel/card across the app gets the redesign's "Dimensional Layering" look for free instead of each feature template re-authoring its own border/padding combination.

## Description

Prepare.md flags "a 'paper' component consisting of border and padding styling" as a manual extraction candidate. Dashboard panels, form sections, and list containers throughout the app currently each apply their own `border border-base-300 rounded-box p-4`-style combination directly in feature templates — exactly the "re-authoring the same daisyUI pattern twice" the styling convention warns against.

## Current situation (as-is)

- No `mm-paper`/surface component exists in `shared/ui/`.
- Dashboard panels (`net-worth-header`, `category-breakdown-panel`, `trend-chart-panel`, etc.) and various feature list/detail pages each apply their own border+padding container styling inline.

## Desired result (to-be)

- New `shared/ui/paper/paper.component.ts` (selector `mm-paper`) wrapping a `<div>` with the app's standard surface treatment: border, background (`bg-base-100`), corner radius, and padding, plus an `elevation` input (`'flat' | 'raised' | 'floating'`, a small closed set) that maps to shadow/depth tokens for "Dimensional Layering" once [TICKET-UI-11](./TICKET-UI-11-design-tokens-theme.md)'s tokens exist — before that ticket lands, `elevation` can default to a plain border-only look.
- Dashboard panels identified by [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit migrate their container styling to `<mm-paper>`.
- `mm-bento-item` ([TICKET-UI-03](./TICKET-UI-03-bento-grid-primitive.md)) wraps its content in `mm-paper` rather than duplicating the surface styling itself.

## Acceptance criteria

- [ ] `mm-paper` component with `elevation` typed input, `class` passthrough per the existing primitive convention
- [ ] Dashboard panel templates named above migrated to use `mm-paper` instead of inline border/padding classes
- [ ] Unit test covering each `elevation` value renders its expected class string
- [ ] Verified via the fallow and coding-conventions skills

## Notes

Ship this ahead of or alongside [TICKET-UI-03](./TICKET-UI-03-bento-grid-primitive.md) since the grid primitive composes with it — either build order works, but both should land before [TICKET-UI-12](./TICKET-UI-12-dashboard-bento-layout.md) (dashboard adoption) starts.
