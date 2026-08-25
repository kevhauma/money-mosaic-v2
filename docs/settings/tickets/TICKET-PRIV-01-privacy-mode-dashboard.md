# TICKET-PRIV-01 — Privacy mode: blur amounts on the Dashboard

- **Area:** Privacy Mode
- **Released in:** [v2](../../releases/v2/overview.md)
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
- **Depends on TICKET-SET-05**, not on any other Settings ticket. TICKET-SET-05 introduces the `appSettings` Dexie table, `AppSettingsRepository`, and `AppSettingsStore` this ticket adds a field to. This ticket does not create that table itself, and is independent of TICKET-SET-02/03/04's build order — those also depend only on SET-05, not on this ticket or each other.

## Desired result (to-be)

- `AppSettings` (from TICKET-SET-05) gains an additive `privacyMode?: boolean` field (default `false`) — no Dexie version bump.
- A new shared `shared/ui/privacy-blur/privacy-blur.component.ts` (`mm-privacy-blur`) wraps arbitrary projected content and, when its `blurred` input is `true`, applies a CSS blur filter (`filter: blur(...)`) plus `select-none`/`pointer-events-none`-on-text so blurred figures can't be copy-pasted or read via text selection either. Non-blurred (default) state renders projected content unchanged.
- `mm-stat-card` gains a `blurred = input<boolean>(false)` that wraps its rendered `value` (and `subLabel`, since a YoY delta is also a real figure) in `mm-privacy-blur` internally, so callers just pass a boolean rather than reimplementing masking per card.
- `dashboard-overview.component.ts` injects `AppSettingsStore`, reads `privacyMode()`, and passes it to every `mm-stat-card` instance's `[blurred]` input, and wraps each chart-panel row's content in `mm-privacy-blur` for the row types that render charts (`weekday-weekend`, `category-breakdown-trend`, `category-comparison`, `top-transactions`, `account-balance`).
- A quick-access toggle (an eye/eye-off icon button) is available in two places: the Settings page (alongside the theme/color/currency/locale sections from the other SET tickets) for the persisted default, and the Dashboard's page-header actions (next to the existing "Customize dashboard" button) for fast one-click toggling without leaving the page — both read/write the same `AppSettingsStore.privacyMode()` signal, so they always agree.
- Toggling privacy mode persists through the repository and survives a reload, same as every other `appSettings` field.

## Acceptance criteria

**Implementation note (2026-08-04) — three departures from the to-be above, decided during build:**

1. **Numbers blur; charts stay visible.** The to-be wraps each chart-panel _row's whole content_ in
   `mm-privacy-blur`. On the user's call, the wrapper instead goes around the **numeric text inside**
   each panel — panel titles, category names, bars, and the ngx-echarts canvases stay sharp and fully
   interactive, so a blurred Dashboard still reads as a Dashboard. Every panel already renders its
   real figures as HTML text (`formattedTotal`, `formattedAmount`, `signedAmount`, …), so this needs
   no chart-option changes, exactly as the as-is wanted. **Known residual:** amounts drawn _inside_ a
   canvas — the Trend chart's y-axis ticks and echarts' own hover tooltips — are not maskable without
   touching each chart's option-building logic, and are left visible; masking them is follow-up scope
   alongside the other screens in Notes.
2. **`select-none` only, no `pointer-events-none`.** The to-be asks for both. `select-none` already
   makes the text unselectable and uncopyable, while `pointer-events-none` would additionally break
   the drilldown links that sit inside the blurred figures in _Biggest transactions_, _Category
   breakdown_ and _Accounts_ — which AC 6 requires to keep working. Dropped deliberately.
3. **Panels read the store directly.** The to-be has `dashboard-overview` pass `privacyMode` down.
   Stat cards do take it as `[blurred]` from the parent, but the six panels are `@defer`-loaded
   siblings that already inject their own root stores, so each injects `AppSettingsStore` rather than
   threading an input through a lazy boundary.

- [x] `AppSettings.privacyMode` added as an additive optional field, defaulting to `false`; no Dexie version bump. (`privacyMode: boolean | undefined` on `AppSettings` in [app-db.ts](../../../src/app/core/data-access/app-db.ts), `undefined` in `DEFAULT_APP_SETTINGS`, `AppSettingsStore.privacyModeEnabled` resolves the `?? false` once. Last `.version()` block untouched — still 12. `data-management.repository.spec.ts`'s "non-indexed appSettings fields round-trips through export → import intact" now asserts `privacyMode` survives the round trip.)
- [x] `mm-privacy-blur` shared component exists in `shared/ui/`, blurs projected content when `blurred` is `true`, and prevents the blurred text from being read via selection/copy. ([privacy-blur.component.ts](../../../src/app/shared/ui/privacy-blur/privacy-blur.component.ts) emits `mm-privacy-blurred select-none`; the `.mm-privacy-blurred { filter: var(--mm-privacy-blur, blur(0.3rem)) }` rule sits beside `.mm-squish`/`.mm-glow` in `styles.css`. `privacy-blur.component.spec.ts` covers all four states, incl. "renders projected content untouched when blurred is false".)
- [x] `mm-stat-card` gains a `blurred` input that masks both `value` and `subLabel` via `mm-privacy-blur`, defaulting to `false` (no behavior change for any existing caller that doesn't pass it). (`blurred = input(false)`; both figures wrapped in [stat-card.component.html](../../../src/app/shared/ui/stat-card/stat-card.component.html). Spec "leaves value and subLabel unblurred by default" pins the default; the five pre-existing stat-card cases still pass unchanged.)
- [x] Every stat card and ~~chart-panel row~~ **figure rendered in a chart panel** on the Dashboard responds to `AppSettingsStore.privacyMode()` — verified for at least one stat card and one chart panel, with the pattern applying identically to the rest since they share the same wrapping mechanism. (All 5 stat cards take `[blurred]="privacyMode()"`; figures wrapped in weekday-weekend, category-breakdown, category-comparison→comparison-category-card, top-transactions and account-balance-strip. Spec "blurs every stat card figure … leaving the labels readable" + "blurs a chart panel's figures while leaving the chart itself unblurred". Live: 34 `.mm-privacy-blurred` nodes with privacy on, 0 with it off.)
- [x] A privacy-mode toggle is reachable from both the Settings page and the Dashboard page header, and both control the same persisted state. ("Hide amounts"/"Show amounts" in the Dashboard header's `actions-end`; new [settings-privacy-section](../../../src/app/feature-settings/components/settings-privacy-section/settings-privacy-section.component.ts) composed by `settings-overview`. Live: flipping it off in Settings left the Dashboard header reading "Hide amounts" with 0 blurred nodes.)
- [x] Toggling privacy mode does not affect row order/visibility/interactivity from TICKET-STAT-14's customize mode — blur is purely visual, drilldown links and customize mode continue to work underneath. (Spec "leaves row visibility and customize mode untouched — blur is purely visual". Live with privacy on: "Dashboard settings" opened the full customize panel unblurred, and clicking the blurred Income card — `.mm-privacy-blurred` confirmed inside its `<a>` — navigated to `/transactions?from=2026-08-01&to=2026-08-31`.)
- [x] Toggling privacy mode persists through `AppSettingsStore`/`AppSettingsRepository` and survives a reload. (`setPrivacyMode` awaits `AppSettingsRepository.setPrivacyMode`'s read-merge-put before patching state. Live: enabled from the header → `appSettings` row read back `privacyMode: true` → hard reload → still "Show amounts" with 34 blurred nodes.)
- [x] Unit tests cover: `mm-privacy-blur` applying/removing its blur class based on the input; `mm-stat-card`'s `blurred` input masking `value`/`subLabel`; the Dashboard header toggle and Settings-page toggle both writing the same store signal. (4 cases in `privacy-blur.component.spec.ts`, 3 in `stat-card.component.spec.ts`, 6 in `dashboard-overview.component.spec.ts`'s "privacy mode (TICKET-PRIV-01)" block, 4 in `settings-privacy-section.component.spec.ts` — the last including a hydration case proving `linkControlToSetting`'s pull half. Suite: 2308 passed / 229 files.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` over 32 changed files: verdict **pass**, 0 dead-code / 0 duplication / 0 complexity findings introduced. `conventions-reviewer` raised four items, three fixed here — Prettier/CRLF normalised, `MM_PRIVACY_BLURRED_CLASS` moved to `shared/utils/theme-hooks.ts` beside `MM_SQUISH_CLASS`, and the header toggle given a visible label per TICKET-STAT-25 instead of a bare eye icon. The fourth, a raw `class="toggle"` in the settings template, is left as-is: it is the 7th such call site and an `mm-toggle` primitive is its own ticket.)
- [x] Verified live in the browser: enable privacy mode from the Dashboard header, confirm every stat card and chart panel blurs while labels/nav/customize-mode remain usable; reload and confirm the blur persists; disable it from the Settings page and confirm the Dashboard header toggle reflects the change too. (Walked end to end on `ng serve` @ 4210 with screenshots at each step. Card labels, panel titles, category names, bars, donuts and both nav rails stayed sharp throughout; no app console errors.)

## Notes

- **Dashboard-only for this ticket, deliberately** (per scoping decision) — Transactions list, Accounts list/detail, and any other screen showing real figures are explicit follow-up scope once this pattern (the `mm-privacy-blur` wrapper + `AppSettingsStore.privacyMode()` signal) has proven out on the highest-visibility screen. Extending coverage to those screens later is expected to mostly be "wrap the existing amount displays," not new infrastructure.
- Blur (not full hide / not skeleton loaders) is the chosen visual treatment for this first ticket, matching the v9999 idea's "blurred... or gone entirely" options — full-hide and skeleton-loader alternatives are reasonable variations but blur alone is the smallest, least-disruptive first cut (layout doesn't reflow, and a quick hover/mouse-move-away glance still communicates "there's a number here").
- Depends only on TICKET-SET-05 (settings-store foundation); independent of SET-02/03/04 — any of the four can be built in any order relative to the others.
