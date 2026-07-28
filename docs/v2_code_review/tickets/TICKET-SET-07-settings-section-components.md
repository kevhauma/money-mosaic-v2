# TICKET-SET-07 — Split the Settings page into section components

- **Area:** Settings
- **Type:** Refactor
- **Traceability:** CR4-5 Option A ([solution doc](../solutions/CR4-05-settings-page.md))

## User story

As a developer adding the next setting (PRIV-01 is already open), I want the Settings page composed of per-concern section components with a shared control↔store sync helper, so each new setting lands as a small component instead of another 40 lines on a monolith.

## Description

Extract `settings-theme-section` (theme + accent, which renders inside the theme list positionally), `settings-currency-locale-section`, `settings-data-section` (hosting the data-management embed), and `settings-about-section`; `settings-overview` becomes a page header plus a stack of sections. Add `linkControlToSetting(control, read, write)` in `shared/utils` so the sync dance isn't copy-pasted per section.

## Current situation (as-is)

- [settings-overview.component.ts](../../../src/app/feature-settings/components/settings-overview/settings-overview.component.ts) (171-line class) hosts theme picker, accent row, currency symbol/position, locale, the embedded data-management panel, and GitHub/about links; nothing structural routes the next setting elsewhere.
- The `valueChanges.subscribe` + `effect` write-back with `emitEvent: false` dance exists twice (currency symbol, locale) and would multiply per section without a helper.
- Accent-swatch logic (`accentSwatch`, `defaultAccentSwatch`, `lastDefaultThemeId`) is theme-domain knowledge living in the settings component.

## Desired result (to-be)

- Section components under `feature-settings/components/`, each owning its controls, store wiring, and template slice; `settings-overview` composes them.
- `linkControlToSetting` helper in `shared/utils` used by every form-bearing section.
- Accent-swatch logic moves into the theme section component or `core/theme` — same motion, not a separate pass.

## Acceptance criteria

- [ ] `settings-overview`'s class shrinks to composition-only (no control sync, no accent logic); each section has its own focused spec (no more mount-the-whole-page fixtures for per-concern behavior).
- [ ] The sync helper is the only place the `emitEvent: false` write-back pattern exists (grep proves no copies).
- [ ] All settings still function: theme + accent, currency symbol/position, locale, data export/import, links (live browser check).
- [ ] Settings persistence still flows through `AppSettingsStore`/repositories.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs TICKET-DAT-04 first (the embed decision this structure builds on).
- CR4-5 Options B (child routes) and C (convention-only) rejected; the "new settings ship as section components" convention gets written down in TICKET-DX-05.
