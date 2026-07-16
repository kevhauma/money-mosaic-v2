# TICKET-UI-09 — Icon-button variant

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-9

## User story

As a developer, I want the existing `mm-button` primitive to support an icon-only shape natively, so buttons whose only child is an icon (row actions, drawer toggles) don't hand-author their own square/circle sizing per usage site.

## Description

Prepare.md flags "button with icon as child (icon button)" as an extraction candidate. `mm-button` ([button.component.ts](../../../src/app/shared/ui/button/button.component.ts)) already exists with typed `ButtonColor`/`ButtonVariant`/`ButtonSize` axes per the coding-conventions skill, but has no dedicated shape for icon-only usage — call sites needing one (e.g. [app.html](../../../src/app/app.html)'s drawer-toggle button) currently reach for raw `btn btn-square btn-ghost` classes directly instead of `mm-button`.

## Current situation (as-is)

- `mm-button` has no `ButtonShape` axis; [app.html](../../../src/app/app.html)'s drawer toggle (`<label class="btn btn-square btn-ghost">`) and any row-level icon-only actions bypass `mm-button` entirely and hand-author daisyUI's square/circle button classes.

## Desired result (to-be)

- Extend `mm-button` with a `shape: ButtonShape` input (`'default' | 'square' | 'circle'`, mirroring daisyUI's `btn-square`/`btn-circle` modifiers), following the same Open/Closed pattern the coding-conventions skill already documents for `ButtonColor`/`ButtonVariant` (add a union member, don't special-case at call sites).
- An `ariaLabel` input becomes effectively required (enforced by a unit test, not a runtime throw) when `shape !== 'default'`, since an icon-only button has no visible text for assistive tech.
- [app.html](../../../src/app/app.html)'s drawer toggle and any other icon-only button usages identified by [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit migrate to `<mm-button shape="square">`.

## Acceptance criteria

- [ ] `mm-button` gains a `shape` typed input (`'default' | 'square' | 'circle'`) computed into the class string alongside the existing color/variant/size axes
- [ ] Icon-only usages across the app migrated to `mm-button` with the new `shape` input
- [ ] Unit test asserts an `aria-label` is present whenever `shape !== 'default'`
- [ ] Verified via the fallow and coding-conventions skills

## Notes

This extends an existing primitive rather than creating a new one — matches the Open/Closed principle already called out in the coding-conventions skill for `mm-button`'s typed axes.
