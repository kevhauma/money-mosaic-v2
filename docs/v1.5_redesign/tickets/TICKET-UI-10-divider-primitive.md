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

- [ ] `mm-divider` component with `orientation` typed input and optional label projection, `class` passthrough per the existing primitive convention
- [ ] Existing `divider` usages migrated to the new primitive
- [ ] Verified via the fallow and coding-conventions skills

## Notes

Smallest ticket in the set — a reasonable one to batch alongside another extraction ticket if picked up by the same PR, rather than shipping entirely alone.
