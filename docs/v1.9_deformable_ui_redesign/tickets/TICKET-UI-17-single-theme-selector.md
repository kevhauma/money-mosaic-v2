# TICKET-UI-17 — Collapse to a single theme selector (remove the light/dark toggle)

- **Area:** Design System
- **Type:** Refactor / UX fix
- **Traceability:** FR-UI-17

## User story

As a user, I want to pick one theme from a single list, so choosing a theme sets my appearance
outright — instead of maintaining two separate picks ("my light style" and "my dark style") plus a
navbar sun/moon toggle that flips between whichever two I last chose, which is confusing when every
theme already has its own fixed light or dark identity.

## Description

The current theme model has two axes: `ThemeService.mode` (light/dark, flipped by a navbar
sun/moon button) and, per mode, a selected `ThemeStyleId` (`lightStyle` / `darkStyle`), combined
into `activeStyle`. The settings page mirrors this with two picker sections ("Light mode styles" /
"Dark mode styles"). Given only 1 of the 8 catalog themes (`deformable`) spans both modes — the
other 7 are hard-locked to one mode each (`dataTheme` only has a `light` or only a `dark` key,
never both, per `theme-styles.ts`) — the two-axis model adds a control (the toggle) that mostly
does nothing (7 of 8 themes have no counterpart to toggle to) and forces users to think about "mode"
and "style" as separate decisions when in practice they're picking one look.

This ticket flattens the model to one axis: the settings page becomes a single flat list of all 8
themes (no light/dark section split), picking one applies it immediately, and the navbar sun/moon
toggle is removed entirely.

## Current situation (as-is)

- `core/theme/theme.service.ts`: `_mode` signal + `toggle()`, `_lightStyle`/`_darkStyle` signals,
  `activeStyle` computed from `mode`, `selectStyle(mode, style)` requiring a mode argument,
  `localStorage` keys `mm-theme` (mode) + `mm-style-light`/`mm-style-dark`.
- `settings-overview.component.html`: two `<section>`s ("Light mode styles" / "Dark mode styles"),
  each iterating `themeStylesForMode(mode)`.
- Navbar/app shell has a sun/moon icon button wired to `ThemeService.toggle()` (per
  `theme.service.ts`'s doc comment: "the navbar sun/moon quick-toggle").
- `theme-styles.ts`'s `dataTheme: Partial<Record<ThemeMode, string>>` shape and
  `themeStylesForMode`/`DEFAULT_STYLE` (per-mode default) helpers all exist to serve the two-axis
  model.

## Desired result (to-be)

- `ThemeService` exposes a single active theme (`ThemeStyleId`) and a single `select(style)`
  method. No `mode` toggle concept, no separate light/dark picks — a chosen theme's own
  `color-scheme` (light or dark, as already declared per-theme in its CSS block) is what determines
  how it renders; the app no longer tracks "mode" as independent user state.
- `localStorage` collapses to a single `mm-theme-style` key (migrate/ignore the old
  `mm-theme`/`mm-style-light`/`mm-style-dark` keys per the existing "ignore unknown/removed" pattern
  already used in `readStoredStyle`).
- Settings page renders one flat grid of all 8 themes, no section split.
- The navbar sun/moon toggle button is removed from `app.html`/`app.ts`.
- `deformable`'s light/dark pair becomes two distinct catalog entries (e.g. "Default Light" /
  "Default Dark") rather than one entry that silently spans both — every entry in the flat list
  maps to exactly one `data-theme` value, consistent with how the other 7 already work.

## Acceptance criteria

- [x] `ThemeService` has one active-theme signal and one `select()` method; `mode`/`toggle()`/
      `lightStyle`/`darkStyle`/`selectStyle(mode, style)` are removed, not just deprecated
- [x] Navbar sun/moon toggle button is removed from the app shell
- [x] Settings page shows one flat, unsectioned list of all themes (deformable split into its own
      light and dark entries, so the list has 9 tiles total — 10 once UI-20 adds `neumorphism-dark`)
- [x] Selecting any tile applies that theme immediately and persists across reload
- [x] Old `localStorage` keys (`mm-theme`, `mm-style-light`, `mm-style-dark`) are read once for
      best-effort migration to the new single key, then ignored — no crash on stale values
- [x] Verified via `ng lint`/`ng test`/`ng build --configuration development`; a live browser check
      was skipped per explicit instruction for this work session

## Notes

This depends on/interacts with [TICKET-UI-18](./TICKET-UI-18-full-tile-theme-preview.md) (tile
rendering) and [TICKET-UI-20](./TICKET-UI-20-neumorphism-light-variant.md) (adds a 9th/10th theme
entry) — reasonable to sequence this one first since it changes the picker's list shape that the
other two build on.
