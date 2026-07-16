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

**Phase 1 — build + pilot consumers:**
- [x] `mm-paper` component with `elevation` typed input, `class` passthrough per the existing primitive convention
- [x] Dashboard panel templates named above migrated to use `mm-paper` instead of inline border/padding classes (`category-breakdown-panel`, `trend-chart-panel`, `category-comparison-panel`, `top-transactions-panel`, `account-balance-strip`, `weekday-weekend-split-panel`, plus `dashboard-overview`'s matching `@defer` placeholders; `action-queue-panel`'s tinted callout cards and `dashboard-customize-panel`'s distinct border style deferred to Phase 2's full audit-driven sweep)
- [x] Unit test covering each `elevation` value renders its expected class string
- [x] Pilot phase verified via `ng lint`/`ng test`/`ng build`, the fallow and coding-conventions skills, and a live browser check

**Phase 2 — full rollout (all remaining consumers):**
- [x] Every remaining "paper" surface (border+padding combo) identified by [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit migrated to `<mm-paper>` — accounts (`account-balance-chart`, `accounts-detail` x2, `accounts-overview`'s per-account card, `net-worth-history-chart`), categories (`rule-filters`), transactions (`transaction-filters`, `transaction-bulk-bar`, `transfer-review` x2), learning (`model-status`, `rule-proposals`), import (`import-wizard` x2, `import-select-step`'s queue rows), data management (all 4 cards), and the remaining dashboard occurrences (`category-comparison-panel`'s mini boxes, `account-balance-strip`'s tiles, `action-queue-panel`'s tinted callouts, `dashboard-customize-panel`'s outer box)
- [x] Full rollout re-verified via `ng lint`/`ng test`/`ng build`, the fallow and coding-conventions skills, and a live browser check

## Notes

Ship this ahead of or alongside [TICKET-UI-03](./TICKET-UI-03-bento-grid-primitive.md) since the grid primitive composes with it — either build order works, but both should land before [TICKET-UI-12](./TICKET-UI-12-dashboard-bento-layout.md) (dashboard adoption) starts. Follows the same **pilot consumers → verify → full rollout** shape as [TICKET-UI-02](./TICKET-UI-02-typography-primitive.md): Phase 1 migrates the named dashboard panels only; Phase 2 sweeps every remaining occurrence the audit found.

**API grew during Phase 2** beyond the Phase 1 shape: `background`/`borderColor`/`linkHover` string inputs (escape hatches for the two style pieces `class` can't safely override, since Tailwind's cascade order isn't usage order — a passthrough `class="bg-warning/10"` isn't guaranteed to beat this component's own `bg-base-100`), a `bodyClass` override for the inner wrapper (compact surfaces like a filter bar or list row don't want daisyUI's `card-body` padding), and a `style` passthrough (mirroring `badge.component.ts`'s existing precedent, for a per-instance accent color bar). All default to Phase 1's exact original values, so this was a zero-diff, backward-compatible extension — confirmed by the original Phase 1 spec assertions passing unchanged.

**Deliberately excluded from Phase 2** (not "paper" surfaces in this ticket's sense, or structurally incompatible with a wrapping component):
- Table/list scroll-containers (`overflow-x-auto`/`overflow-auto` + `rounded-box border` wrapping a `<table>`): `categories-overview`, `rules-overview`, `transactions-overview`, `suggestions-table`, `import-map-step`, `import-preview-step`, `transaction-edit-form` — this is [TICKET-UI-07](./TICKET-UI-07-table-primitive.md)'s pattern (a table wrapper needs edge-to-edge borders and a scroll container, not a padded content card), not this ticket's.
- `rounded-field` on inputs/form-rows (`account-form`, `category-form`) — already called out as too small to justify its own primitive in [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit; not "paper" either way.
- The `.stats` component's `border` variant (`import-summary-step`) — a daisyUI `stats`/`mm-stat-card` pattern, not a generic surface.
- `border-t`/`border-l` section dividers (`import-wizard` x2, `rule-proposals`'s nested-item indent) — [TICKET-UI-10](./TICKET-UI-10-divider-primitive.md)'s pattern, not a padded surface.
- The dashed CSV dropzone (`import-select-step`) — a distinct interaction affordance (`border-2 border-dashed`), not a generic bordered content box.
- `dashboard-customize-panel`'s per-row `cdkDrag` div — Angular CDK's drag directive must attach directly to the actual draggable DOM element; `mm-paper` can't expose its internally-rendered element for a caller's structural directive to attach to.
