# TICKET-SET-07 — Split the Settings page into section components

- **Area:** Settings
- **Released in:** [v2 Code review (CR4)](../../releases/v2_code_review/overview.md)
- **Type:** Refactor
- **Traceability:** CR4-5 Option A ([solution doc](../../releases/v2_code_review/solutions/CR4-05-settings-page.md))

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

- [x] `settings-overview`'s class shrinks to composition-only (no control sync, no accent logic); each section has its own focused spec (no more mount-the-whole-page fixtures for per-concern behavior). (**171 → 29 lines, with an empty class body** — `export class SettingsOverviewComponent {}`. Its template is 10 lines: header, four sections, welcome link. Four new specs own their concerns — `settings-theme-section` (5 accent tests + the accent row's position in the grid), `settings-currency-locale-section` (8 symbol/position/locale/preview tests), `settings-data-section` (the embed), `settings-about-section` (the GitHub link) — and the page's own spec is down to two composition assertions.)
- [x] The sync helper is the only place the `emitEvent: false` write-back pattern exists (grep proves no copies). (`grep -rn "emitEvent: false" src/app --include=*.ts` returns only `shared/utils/link-control-to-setting.ts` — the implementation line plus its doc comment. `valueChanges.subscribe` no longer appears anywhere in `src/app`.)
- [ ] All settings still function: theme + accent, currency symbol/position, locale, data export/import, links (live browser check) — **skipped**: the user explicitly asked to skip live browser verification for this whole ticket batch. Every behaviour assertion from the old page spec was carried across into the section specs rather than dropped (accent select/press state, symbol presets, custom symbol, position, locale select + hydration, currency preview, GitHub link target/rel, the data embed), so the automated coverage is the same set of behaviours, just re-homed.
- [x] Settings persistence still flows through `AppSettingsStore`/repositories. (Each section injects `AppSettingsStore` and calls the same setters; `linkControlToSetting` only moves the subscribe/effect plumbing, not the write path. `DataManagementOverviewComponent` and its repository are untouched.)
- [x] `ng lint`, `ng test`, `ng build --configuration development` pass. (Lint clean, dev build clean, 1528/1529 tests pass — the one failure is the pre-existing TF.js training-timeout flake in `category-model.worker.spec.ts`.)
- [x] Verified via the fallow skill and coding-conventions skill. (0 duplication. Two findings, neither a regression from this work: the pre-existing unused `PercentVariant` re-export in `shared/utils/index.ts` — fallow marks it `introduced: false`; it surfaces only because this ticket added a line to that barrel, and it belongs to [TICKET-CLEANUP-06](../../engineering/tickets/TICKET-CLEANUP-06-fallow-zero-noise-gate.md) — and one moderate CRAP finding on the extracted theme-section template, cyclomatic 5 / cognitive 8 over 88 lines, on markup moved across verbatim. That finding is coverage-driven (`coverage_tier: "none"` — fallow has no coverage data for this repo, so it estimates zero and CRAP is mostly that estimate), and a like-for-like "before" number for the old combined template isn't obtainable, since fallow's audit only measures files in the git changed set. What is measurable: the page template went 187 → 10 lines, and the biggest template left is that 88-line theme section.)

## Notes

- Needs TICKET-DAT-04 first (the embed decision this structure builds on).
- CR4-5 Options B (child routes) and C (convention-only) rejected; the "new settings ship as section components" convention gets written down in TICKET-DX-05.

## Implementation notes

- **Accent-swatch logic went to `core/theme`, not the section component.** `accentSwatchColor(color, styleId)` and `defaultAccentSwatchColor(styleId)` now live beside `ACCENT_COLORS`/`DEFAULT_THEME_ACCENT` in `core/theme/accent-colors.ts` as pure functions, with the `'deformable-dark'` literal as a named constant there. The ticket allowed either home; the theme module is where the data they read already lives, and it keeps the section component free of theme-catalogue knowledge.
- **`linkControlToSetting` adds `takeUntilDestroyed()`**, which the two hand-rolled copies it replaces did not have — those subscriptions outlived nothing in practice (the page is a route component), but the helper is shared now, so it tears down with the injector. This is why it must be called from an injection context.
- The four sections are **not** added to the `feature-settings` barrel: only `SettingsOverviewComponent` is routed/consumed from outside, and exporting the rest would be dead public surface for fallow to flag. Same call as TICKET-TXN-09's row components.
- Section spacing moved from `<mm-paper class="mt-6">` to `class="mt-6 block"` on each section host, since the host element sits between the page and the paper.
