# TICKET-UI-08 — Dropdown/menu primitive

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-8

## User story

As a developer, I want a shared Dropdown/Menu component wrapping daisyUI's `dropdown-content`/`menu` classes, so open/close behavior and menu-item styling are consistent across every context menu, kebab action list, and select-style popover in the app.

## Description

Prepare.md flags `dropdown-content` and `menu` as an extraction candidate. Action menus (row-level kebab menus, account/category context actions) currently apply these daisyUI classes directly per usage site.

## Current situation (as-is)

- No `mm-dropdown`/`mm-menu` component exists in `shared/ui/`; daisyUI's `dropdown`/`dropdown-content`/`menu` classes are applied directly wherever a popover action list is needed.

## Desired result (to-be)

- New `shared/ui/dropdown/dropdown.component.ts` (selector `mm-dropdown`) providing the trigger + `dropdown-content`/`menu` shell, with content projection for menu items (each item still a plain `<li><a>`/`<button>` the caller authors, consistent with the Table primitive's approach of owning chrome, not content) and an `align`/`placement` input (`'start' | 'end'`, mirroring daisyUI's dropdown placement modifiers).
- Existing kebab/context menus identified by [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit migrate to `<mm-dropdown>`.

## Acceptance criteria

- [ ] `mm-dropdown` component with `align`/`placement` typed input, `class` passthrough per the existing primitive convention
- [ ] Existing dropdown/menu usages migrated to the new primitive
- [ ] Unit test covering open/close toggling and placement class output
- [ ] Verified via the fallow and coding-conventions skills

## Notes

Keep this distinct from `mm-select` ([select.component.ts](../../../src/app/shared/ui/select/select.component.ts)), which already handles form-bound single-value selection via `ControlValueAccessor` — this primitive is for action menus and popovers, not form controls.
