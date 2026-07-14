# TICKET-SET-02 — Primary color setting

- **Area:** App Settings
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — app settings, primary color, marked "maybe"); no existing FR-* covers this

## User story

As a user, I want to pick my own accent color for the app, so the UI feels a little more mine instead of a fixed brand color I didn't choose.

## Description

Extends the Settings page from TICKET-SET-01 with a second control: a small palette of accent-color choices that recolor daisyUI's `primary` token app-wide (buttons, active nav state, links, chart accents that key off `--color-primary`).

## Current situation (as-is)

- Before this ticket, [TICKET-SET-01](./TICKET-SET-01-theme-settings.md) has introduced the `appSettings` table, `AppSettingsRepository`/`Store`, and the `/settings` page — this ticket only adds to that existing surface, it does not create a new table or route.
- daisyUI 5 themes are CSS-variable-driven; `--color-primary` (and related `--color-primary-content`) is set per theme in `styles.css`'s `@plugin 'daisyui' { themes: ... }` block. There is currently exactly one accent value per theme (whatever daisyUI's `light`/`dark` base themes default to), with no user override.
- daisyUI-wrapped primitives already consume the `primary` token throughout — e.g. [button.component.ts](../../../src/app/shared/ui/button/button.component.ts)'s `primary` `ButtonColor` variant, active nav state in [app.html](../../../src/app/app.html)'s `menu-active` class — so a single CSS-variable override cascades everywhere without per-component changes, the same reasoning TICKET-SET-01 relied on for dark mode.

## Desired result (to-be)

- `AppSettings` gains an additive, non-indexed `primaryColor?: string` field (a hex value or a fixed palette key — see Notes) on the existing `appSettings` table — no Dexie version bump needed, same pattern as `Category.smoothAnnually`.
- The Settings page gains a "Primary color" section: a small fixed palette of preset swatches (5-8 curated options that read well against both the light and dark theme's `base-100`/`base-content`, not a full color picker — see Notes) that the user picks from.
- Selecting a swatch updates `--color-primary` (and a correspondingly-computed `--color-primary-content` for contrast) at the document-root level via an `effect()` in `AppSettingsStore`, and persists through the repository.
- The override applies on top of whichever theme (light/dark/system) TICKET-SET-01 has active — picking an accent color is independent of the light/dark choice, not a per-theme setting.

## Acceptance criteria

- [ ] `AppSettings.primaryColor` added as an additive optional field; no Dexie version bump.
- [ ] Settings page renders a fixed palette of accent-color swatches; the currently-selected one is visually indicated.
- [ ] Selecting a swatch updates the app's `--color-primary` CSS variable immediately, persists through `AppSettingsStore`/`AppSettingsRepository`, and survives a reload.
- [ ] The chosen accent color remains legible (adequate contrast against `base-100`) in both Light and Dark theme, verified for every preset swatch — not just the default.
- [ ] Leaving `primaryColor` unset falls back to each theme's original daisyUI default accent, with no visual change from pre-ticket behavior.
- [ ] Unit tests cover: the setter persists through the repository; the CSS-variable-application logic for a selected swatch; the unset/default fallback case.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: pick a non-default swatch, confirm buttons/active-nav/links recolor app-wide immediately in both Light and Dark theme; reload and confirm the choice persisted.

## Notes

- A fixed preset palette (not a freeform color picker) is the deliberate choice here — an arbitrary user-picked hex can't be guaranteed to have a legible `primary-content` contrast pair, and computing accessible contrast on the fly for an arbitrary color is a meaningfully bigger feature (WCAG contrast math, live preview, fallback logic) than this ticket's "public ready, nice-to-have" scope justifies. If freeform color becomes a real ask later, that's a follow-up ticket, not a revision of this one.
- Depends on TICKET-SET-01 for the `appSettings` table, repository, store, and `/settings` page shell — build after it, not in parallel.
