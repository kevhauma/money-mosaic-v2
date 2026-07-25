# TICKET-SET-02 — Primary color setting

- **Area:** App Settings
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — app settings, primary color, marked "maybe"); no existing FR-* covers this

## User story

As a user, I want to pick my own accent color for the app, so the UI feels a little more mine instead of a fixed brand color I didn't choose.

## Description

Extends the Settings page from TICKET-SET-05 (the shared settings-store foundation) with a control: a small palette of accent-color choices that recolor daisyUI's `primary` token (buttons, active nav state, links, chart accents that key off `--color-primary`).

**Scope narrowed during implementation (explicit user instruction):** the override only applies while a **Default Light/Dark** theme is active — every other catalogue theme (Textbook, Party, Nuclear, Clay, Clay Dark, Disco, Tech, Leather) keeps its own baked-in accent untouched, with no picker shown for them. The original text below described an all-themes override; see Notes for why this was deliberately narrowed.

## Current situation (as-is)

- **Depends on TICKET-SET-05**, not on any other Settings ticket. TICKET-SET-05 introduces the `appSettings` Dexie table, `AppSettingsRepository`, and `AppSettingsStore` this ticket adds a field to. This ticket does not create that table itself, and does not depend on TICKET-SET-03/SET-04/PRIV-01 or their build order — those three also depend only on SET-05, not on this ticket or each other.
- daisyUI 5 themes are CSS-variable-driven; `--color-primary` (and related `--color-primary-content`) is set per theme in `styles.css`'s `@plugin 'daisyui' { themes: ... }` block. There is currently exactly one accent value per theme (whatever the active `ThemeService` style defaults to), with no user override.
- daisyUI-wrapped primitives already consume the `primary` token throughout — e.g. [button.component.ts](../../../src/app/shared/ui/button/button.component.ts)'s `primary` `ButtonColor` variant, active nav state in [app.html](../../../src/app/app.html)'s `menu-active` class — so a single CSS-variable override cascades everywhere without per-component changes.

## Desired result (to-be)

- `AppSettings` (from TICKET-SET-05) gains an additive `primaryColor: AccentColorId | undefined` field — a fixed palette key, not a freeform hex (required-but-possibly-`undefined` rather than optional, to sidestep an `@ngrx/signals withState` typing quirk; see `AppSettings.id`'s own note in `app-db.ts`) — no Dexie version bump needed, same pattern as `Category.smoothAnnually`.
- The existing `/settings` page (`feature-settings/`) gets an "Accent color" row inserted directly under the Default Light/Default Dark theme cards (not a separate page section, and not a popover — a plain inline row of swatches, `flex flex-wrap`, per user direction): 6 curated preset swatches plus a "Default" option, each with its own OKLCH light/dark pair (`core/theme/accent-colors.ts`), verified by script for WCAG contrast rather than picked by eye.
- Selecting a swatch updates `--color-primary`/`--color-primary-content` as inline styles on `<html>` via an `effect()` in `AppSettingsStore` (injecting `ThemeService`), and persists through `AppSettingsRepository`.
- The override applies **only** while a Default Light/Dark theme is active (`DEFAULT_THEME_STYLE_IDS` in `core/theme/theme-styles.ts`) — every other theme keeps its own accent regardless of the stored `primaryColor`, per the scope narrowed during implementation (see Description).

## Acceptance criteria

- [x] `AppSettings.primaryColor` added as an additive field on the TICKET-SET-05 table; no Dexie version bump.
- [x] Settings page renders a fixed palette of accent-color swatches; the currently-selected one is visually indicated.
- [x] Selecting a swatch updates the app's `--color-primary` CSS variable immediately, persists through `AppSettingsStore`/`AppSettingsRepository`, and survives a reload.
- [x] The chosen accent color remains legible (adequate contrast against `base-100`) in both Light and Dark theme, verified for every preset swatch — not just the default. (Verified by script: every preset clears >=3.2:1 swatch-vs-`base-100` and >=4.3:1 `primaryContent`-vs-`primary`, both comfortably above the shipped theme's own primary/secondary/accent tokens' contrast, used as the calibration floor.)
- [x] Leaving `primaryColor` unset falls back to each theme's original daisyUI default accent, with no visual change from pre-ticket behavior.
- [x] Unit tests cover: the setter persists through the repository; the CSS-variable-application logic for a selected swatch; the unset/default fallback case.
- [x] Verified via the fallow skill and coding-conventions skill.
- [x] Verified live in the browser: pick a non-default swatch, confirm buttons/active-nav/links recolor app-wide immediately in both Light and Dark theme; reload and confirm the choice persisted. 

## Notes

- A fixed preset palette (not a freeform color picker) is the deliberate choice here — an arbitrary user-picked hex can't be guaranteed to have a legible `primary-content` contrast pair, and computing accessible contrast on the fly for an arbitrary color is a meaningfully bigger feature (WCAG contrast math, live preview, fallback logic) than this ticket's "public ready, nice-to-have" scope justifies. If freeform color becomes a real ask later, that's a follow-up ticket, not a revision of this one.
- Depends only on TICKET-SET-05 (settings-store foundation); independent of SET-03, SET-04, and PRIV-01 — any of the four can be built in any order relative to the others.
- **Scope narrowed during implementation, by explicit user instruction:** rather than an all-themes override, the accent picker only affects the two Default Light/Dark themes; every other theme keeps its own accent, and no picker is shown for them. The control is a plain inline swatch row (`flex flex-wrap`) directly under the Default Light/Dark cards, not a separate page section or popover — an earlier popover-based (`mm-dropdown`) implementation was replaced per user feedback ("replace the dropdown with just the options in a row").
- **Bonus fix, in scope for this session but not this ticket's original text:** while building the popover version, discovered `mm-dropdown`'s content wrapper (`DropdownComponent`) had no background by design gap — daisyUI's `dropdown-content`/`menu` classes are layout-only — so every popover in the app (date-range picker, category-comparison panel filter, categories/accounts overview action menus) was rendering see-through. Fixed at the shared component level (`bg-base-100 rounded-box border border-base-300 shadow-lg` baked into `DropdownComponent`'s content classes) so every consumer gets it for free; one consumer's now-redundant duplicate classes were trimmed.
