# TICKET-UI-14 — App shell (nav/drawer) visual pass

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-14

## User story

As a user, I want the app's persistent navigation shell (sidebar, top bar) to reflect the new visual identity, so the redesign feels complete rather than stopping at the Dashboard while every other page is framed by an unstyled shell.

## Description

[app.html](../../../src/app/app.html) is the one piece of chrome present on every routed page — the daisyUI `drawer` shell, top `navbar`, and sidebar `menu`. This ticket gives it a visual pass using the new tokens/primitives, so the redesign reads as consistent app-wide rather than confined to the Dashboard's bespoke layout.

[design-language.md](../design-language.md) §7 specifies the nav active-item accent treatment.

## Current situation (as-is)

- [app.html](../../../src/app/app.html) renders a plain daisyUI `drawer` + `navbar` + `menu-vertical` sidebar with no custom styling beyond base daisyUI classes and hardcoded `border-base-300`/`bg-base-100`/`bg-base-200` tokens.
- The mobile drawer toggle button (`btn btn-square btn-ghost`) bypasses `mm-button` entirely — see [TICKET-UI-09](./TICKET-UI-09-icon-button-variant.md), which this ticket depends on for the fix.
- Nav item active state uses daisyUI's plain `menu-active` class with no accent treatment tied to the new primary-color token.

## Desired result (to-be)

- Sidebar nav items pick up the new type scale (`mm-text` for labels where applicable) and an accent treatment on the active item consistent with [TICKET-UI-11](./TICKET-UI-11-design-tokens-theme.md)'s primary-color token (e.g. a colored left border or background tint on `menu-active`, rather than daisyUI's bare default).
- The mobile drawer-toggle button migrates to `<mm-button shape="square">` per [TICKET-UI-09](./TICKET-UI-09-icon-button-variant.md).
- Any divider between nav sections (if introduced) uses `mm-divider` ([TICKET-UI-10](./TICKET-UI-10-divider-primitive.md)).
- No structural/routing change — this is a visual pass only; the drawer's responsive open/close behavior and the route list are unchanged.

## Acceptance criteria

- [ ] Sidebar active-item state uses the new primary-color accent treatment
- [ ] Mobile drawer toggle uses `mm-button shape="square"`
- [ ] Nav shell renders correctly in both the light and OLED dark theme from TICKET-UI-11
- [ ] No change to routing/drawer open-close behavior — existing behavior spot-checked unchanged
- [ ] Verified via the fallow and coding-conventions skills, and live in the browser at desktop and mobile widths in both themes

## Notes

Depends on [TICKET-UI-09](./TICKET-UI-09-icon-button-variant.md) (icon-button shape) and [TICKET-UI-11](./TICKET-UI-11-design-tokens-theme.md) (tokens) — build last in this version, once both exist.
