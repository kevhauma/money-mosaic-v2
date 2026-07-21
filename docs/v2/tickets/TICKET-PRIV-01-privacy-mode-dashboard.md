# TICKET-PRIV-01 — Privacy mode: blur amounts on the Dashboard

- **Area:** Privacy Mode
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — privacy mode, blurred/skeleton/hidden numbers); no existing FR-* covers this. Distinct from NFR-PRIV-1 (no network transmission of financial data), which this ticket doesn't change.

## User story

As a user, I want to hide the actual numbers on my Dashboard with one click, so I can screen-share or have someone glance at my screen without exposing my real financial figures.

## Description

Adds a "Privacy mode" toggle that blurs every amount on the Dashboard — stat cards and chart panels — while leaving layout, labels, and navigation fully visible and interactive. Scoped to the Dashboard only for this first ticket; Transactions, Accounts, and other screens are explicit follow-up scope (see Notes), not part of this ticket's acceptance criteria.

## Current situation (as-is)

- No privacy/blur mechanism exists anywhere in the codebase.
- [dashboard-overview.component.html](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html) renders its rows (`stats`, `weekday-weekend`, `category-breakdown-trend`, `category-comparison`, `top-transactions`, `action-queue`, `account-balance`) via the `visibleRows()`/`@switch` structure TICKET-STAT-14 introduced — this ticket's blur toggle composes with that existing row visibility, it doesn't replace it.
- [stat-card.component.ts](../../../src/app/shared/ui/stat-card/stat-card.component.ts) (`mm-stat-card`) receives `value` as an already-formatted string `input.required<string>()` from the parent — there's no existing mechanism to mask that text.
- Chart panels (category breakdown, trend chart, weekday/weekend split, category comparison, top transactions, account balance strip) render via ngx-echarts canvases — chart values can't be selectively masked per-data-point without touching every chart's option-building logic, so masking a whole chart means visually obscuring its rendered output, not altering its data.
- **Status update:** there is no TICKET-SET-01 — it was dropped, not built (see "Considered, not ticketed yet" in `overview.md`); its dark/light/system scope was superseded by the separately-shipped, `localStorage`-only `ThemeService`. No `appSettings` table/repository/store exists yet. If this ticket is picked up before SET-02/03/04, it must introduce that table/repository/store itself (additive `.version(12).stores(...)`, schema currently runs through `.version(11)`) rather than assume it's already there; if picked up after, extend whichever of those already created it.

## Desired result (to-be)

- `AppSettings` gains an additive `privacyMode?: boolean` field (default `false`) on the existing table — no Dexie version bump.
- A new shared `shared/ui/privacy-blur/privacy-blur.component.ts` (`mm-privacy-blur`) wraps arbitrary projected content and, when its `blurred` input is `true`, applies a CSS blur filter (`filter: blur(...)`) plus `select-none`/`pointer-events-none`-on-text so blurred figures can't be copy-pasted or read via text selection either. Non-blurred (default) state renders projected content unchanged.
- `mm-stat-card` gains a `blurred = input<boolean>(false)` that wraps its rendered `value` (and `subLabel`, since a YoY delta is also a real figure) in `mm-privacy-blur` internally, so callers just pass a boolean rather than reimplementing masking per card.
- `dashboard-overview.component.ts` injects `AppSettingsStore`, reads `privacyMode()`, and passes it to every `mm-stat-card` instance's `[blurred]` input, and wraps each chart-panel row's content in `mm-privacy-blur` for the row types that render charts (`weekday-weekend`, `category-breakdown-trend`, `category-comparison`, `top-transactions`, `account-balance`).
- A quick-access toggle (an eye/eye-off icon button) is available in two places: the Settings page (alongside the theme/color/currency/locale sections from the other SET tickets) for the persisted default, and the Dashboard's page-header actions (next to the existing "Customize dashboard" button) for fast one-click toggling without leaving the page — both read/write the same `AppSettingsStore.privacyMode()` signal, so they always agree.
- Toggling privacy mode persists through the repository and survives a reload, same as every other `appSettings` field.

## Acceptance criteria

- [ ] `AppSettings.privacyMode` added as an additive optional field, defaulting to `false`; no Dexie version bump.
- [ ] `mm-privacy-blur` shared component exists in `shared/ui/`, blurs projected content when `blurred` is `true`, and prevents the blurred text from being read via selection/copy.
- [ ] `mm-stat-card` gains a `blurred` input that masks both `value` and `subLabel` via `mm-privacy-blur`, defaulting to `false` (no behavior change for any existing caller that doesn't pass it).
- [ ] Every stat card and chart-panel row on the Dashboard responds to `AppSettingsStore.privacyMode()` — verified for at least one stat card and one chart panel, with the pattern applying identically to the rest since they share the same wrapping mechanism.
- [ ] A privacy-mode toggle is reachable from both the Settings page and the Dashboard page header, and both control the same persisted state.
- [ ] Toggling privacy mode does not affect row order/visibility/interactivity from TICKET-STAT-14's customize mode — blur is purely visual, drilldown links and customize mode continue to work underneath.
- [ ] Toggling privacy mode persists through `AppSettingsStore`/`AppSettingsRepository` and survives a reload.
- [ ] Unit tests cover: `mm-privacy-blur` applying/removing its blur class based on the input; `mm-stat-card`'s `blurred` input masking `value`/`subLabel`; the Dashboard header toggle and Settings-page toggle both writing the same store signal.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: enable privacy mode from the Dashboard header, confirm every stat card and chart panel blurs while labels/nav/customize-mode remain usable; reload and confirm the blur persists; disable it from the Settings page and confirm the Dashboard header toggle reflects the change too.

## Notes

- **Dashboard-only for this ticket, deliberately** (per scoping decision) — Transactions list, Accounts list/detail, and any other screen showing real figures are explicit follow-up scope once this pattern (the `mm-privacy-blur` wrapper + `AppSettingsStore.privacyMode()` signal) has proven out on the highest-visibility screen. Extending coverage to those screens later is expected to mostly be "wrap the existing amount displays," not new infrastructure.
- Blur (not full hide / not skeleton loaders) is the chosen visual treatment for this first ticket, matching the v9999 idea's "blurred... or gone entirely" options — full-hide and skeleton-loader alternatives are reasonable variations but blur alone is the smallest, least-disruptive first cut (layout doesn't reflow, and a quick hover/mouse-move-away glance still communicates "there's a number here").
- No longer depends on a prior TICKET-SET-01 (dropped, see `overview.md`); independent of SET-02/03/04, but shares the same `appSettings` table/store foundation with whichever of them builds it first.
