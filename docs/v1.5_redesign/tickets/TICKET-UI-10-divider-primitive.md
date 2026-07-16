# TICKET-UI-10 — Divider primitive

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-10

## User story

As a developer, I want a shared Divider component wrapping daisyUI's `divider` class, so a visual separator (with optional label text and orientation) is applied consistently instead of the raw class being sprinkled directly into templates.

## Description

Prepare.md flags `divider` as an extraction candidate — the smallest of the primitives in this set, but still a repeated raw daisyUI class today.

## Current situation (as-is)

- No `mm-divider` component exists in `shared/ui/`; daisyUI's `divider` class is applied directly wherever a visual separator is needed.

## Desired result (to-be)

- New `shared/ui/divider/divider.component.ts` (selector `mm-divider`) with an optional `label` content input/projection and an `orientation: 'horizontal' | 'vertical'` input mirroring daisyUI's `divider-horizontal` modifier.
- Existing raw `divider` usages identified by [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit migrate to `<mm-divider>`.

## Acceptance criteria

**Phase 1 — build + pilot consumer:**
- [ ] `mm-divider` component with `orientation` typed input and optional label projection, `class` passthrough per the existing primitive convention
- [ ] One existing `divider` usage (per [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit — 3 occurrences / 3 files: `import-map-step`, `rule-form`, `account-form`) migrated to the new primitive as the pilot consumer
- [ ] Pilot phase verified via `ng lint`/`ng test`/`ng build`, the fallow and coding-conventions skills, and a live browser check

**Phase 2 — full rollout (all remaining consumers):**
- [ ] The remaining 2 `divider` usages migrated to `mm-divider`
- [ ] Full rollout re-verified via `ng lint`/`ng test`/`ng build`, the fallow and coding-conventions skills, and a live browser check

## Notes

Smallest ticket in the set — a reasonable one to batch alongside another extraction ticket if picked up by the same PR, rather than shipping entirely alone. Follows the same **pilot consumers → verify → full rollout** shape as [TICKET-UI-02](./TICKET-UI-02-typography-primitive.md), scaled down to 3 files total.
