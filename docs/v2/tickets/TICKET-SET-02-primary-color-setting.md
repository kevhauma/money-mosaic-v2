# TICKET-SET-02 — Primary color setting

- **Area:** App Settings
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — app settings, primary color, marked "maybe"); no existing FR-* covers this

## User story

As a user, I want to pick my own accent color for the app, so the UI feels a little more mine instead of a fixed brand color I didn't choose.

## Description

Extends the Settings page from TICKET-SET-05 (the shared settings-store foundation) with a control: a small palette of accent-color choices that recolor daisyUI's `primary` token app-wide (buttons, active nav state, links, chart accents that key off `--color-primary`).

## Current situation (as-is)

- **Depends on TICKET-SET-05**, not on any other Settings ticket. TICKET-SET-05 introduces the `appSettings` Dexie table, `AppSettingsRepository`, and `AppSettingsStore` this ticket adds a field to. This ticket does not create that table itself, and does not depend on TICKET-SET-03/SET-04/PRIV-01 or their build order — those three also depend only on SET-05, not on this ticket or each other.
- daisyUI 5 themes are CSS-variable-driven; `--color-primary` (and related `--color-primary-content`) is set per theme in `styles.css`'s `@plugin 'daisyui' { themes: ... }` block. There is currently exactly one accent value per theme (whatever the active `ThemeService` style defaults to), with no user override.
- daisyUI-wrapped primitives already consume the `primary` token throughout — e.g. [button.component.ts](../../../src/app/shared/ui/button/button.component.ts)'s `primary` `ButtonColor` variant, active nav state in [app.html](../../../src/app/app.html)'s `menu-active` class — so a single CSS-variable override cascades everywhere without per-component changes.

## Desired result (to-be)

- `AppSettings` (from TICKET-SET-05) gains an additive, non-indexed `primaryColor?: string` field (a hex value or a fixed palette key — see Notes) — no Dexie version bump needed, same pattern as `Category.smoothAnnually`.
- The existing `/settings` page (`feature-settings/`) gains a "Primary color" section alongside its theme picker: a small fixed palette of preset swatches (5-8 curated options that read well against both the light and dark theme's `base-100`/`base-content`, not a full color picker — see Notes) that the user picks from.
- Selecting a swatch updates `--color-primary` (and a correspondingly-computed `--color-primary-content` for contrast) at the document-root level via an `effect()` in `AppSettingsStore`, and persists through the repository.
- The override applies on top of whichever theme style `ThemeService` currently has active — picking an accent color is independent of the theme choice, not a per-theme setting.

## Acceptance criteria

- [ ] `AppSettings.primaryColor` added as an additive optional field on the TICKET-SET-05 table; no Dexie version bump.
- [ ] Settings page renders a fixed palette of accent-color swatches; the currently-selected one is visually indicated.
- [ ] Selecting a swatch updates the app's `--color-primary` CSS variable immediately, persists through `AppSettingsStore`/`AppSettingsRepository`, and survives a reload.
- [ ] The chosen accent color remains legible (adequate contrast against `base-100`) in both Light and Dark theme, verified for every preset swatch — not just the default.
- [ ] Leaving `primaryColor` unset falls back to each theme's original daisyUI default accent, with no visual change from pre-ticket behavior.
- [ ] Unit tests cover: the setter persists through the repository; the CSS-variable-application logic for a selected swatch; the unset/default fallback case.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: pick a non-default swatch, confirm buttons/active-nav/links recolor app-wide immediately in both Light and Dark theme; reload and confirm the choice persisted.

## Notes

- A fixed preset palette (not a freeform color picker) is the deliberate choice here — an arbitrary user-picked hex can't be guaranteed to have a legible `primary-content` contrast pair, and computing accessible contrast on the fly for an arbitrary color is a meaningfully bigger feature (WCAG contrast math, live preview, fallback logic) than this ticket's "public ready, nice-to-have" scope justifies. If freeform color becomes a real ask later, that's a follow-up ticket, not a revision of this one.
- Depends only on TICKET-SET-05 (settings-store foundation); independent of SET-03, SET-04, and PRIV-01 — any of the four can be built in any order relative to the others.
