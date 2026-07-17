# TICKET-UI-12 — Dashboard Bento-grid layout adoption

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-12

## User story

As a user, I want the Dashboard to read as an at-a-glance, visually prioritized overview (the redesign's "Dashboard-first UX" and "Visual Hierarchy" terms), so the most important insight — not just the first panel in DOM order — is immediately obvious.

## Description

This ticket applies [TICKET-UI-03](./TICKET-UI-03-bento-grid-primitive.md)'s `mm-bento-grid` primitive and [TICKET-UI-11](./TICKET-UI-11-design-tokens-theme.md)'s tokens to the Dashboard's actual panel arrangement — the one page this version gives a bespoke layout redesign, per prepare.md's "Dashboard-first UX" and "make the charts the hero" terms.

[design-language.md](../design-language.md) §5 has a suggested `colSpan`/`rowSpan` per panel to start from.

## Current situation (as-is)

- `feature-dashboard/components/dashboard-overview/` currently arranges `net-worth-header`, `account-balance-strip`, `action-queue-panel`, `category-breakdown-panel`, `category-comparison-panel`, `trend-chart-panel`, `top-transactions-panel`, and `weekday-weekend-split-panel` in whatever order/sizing the existing layout uses, with no deliberate visual-hierarchy pass.
- `dashboard-customize-panel` already lets users reorder/toggle panels — this ticket's layout change must remain compatible with that existing customization mechanism, not replace it.

## Desired result (to-be)

- The panel container migrates to `mm-bento-grid`, with each panel wrapped as a bento item sized by importance: the trend chart and net-worth header get larger spans (the "hero" treatment), smaller stat-style panels (account balance strip, weekday/weekend split) get compact spans.
- Panel sizing/order remains driven by `dashboard-customize-panel`'s existing user preference where it already controls order — this ticket changes *how* a panel of a given size renders (bento span, `mm-paper` surface), not whether the user's saved customization is respected.
- Every panel body still renders inside `mm-paper` ([TICKET-UI-04](./TICKET-UI-04-paper-primitive.md)) for the "Dimensional Layering" surface treatment, and any panel text migrates to `mm-text` ([TICKET-UI-02](./TICKET-UI-02-typography-primitive.md)) if it hasn't already during that ticket's pass.

## Acceptance criteria

- [ ] Dashboard panel container uses `mm-bento-grid`, with hero panels (trend chart, net-worth header) visually larger than compact stat panels
- [ ] Existing panel reorder/toggle behavior from `dashboard-customize-panel` continues to work unchanged
- [ ] All panel surfaces render via `mm-paper`
- [ ] Responsive check: layout collapses sensibly on narrow viewports (single column, no overflow)
- [ ] Verified via the fallow and coding-conventions skills, and live in the browser at desktop and mobile widths

## Notes

This is the only page in v1.5 that gets a bespoke layout rework — every other routed feature (Accounts, Transactions, Categories, Import, Data) inherits the new tokens and primitives automatically through `shared/ui/` without its own layout ticket, per this version's scope decision (see the overview's "Considered, not ticketed yet").
