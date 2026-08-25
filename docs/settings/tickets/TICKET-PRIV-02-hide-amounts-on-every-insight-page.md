# TICKET-PRIV-02 — "Hide amounts" on every insight page, not just the Dashboard

- **Area:** Privacy Mode
- **Released in:** [v2.3 Navigation](../../releases/v2.3_navigation/overview.md)
- **Type:** Feature
- **Traceability:** extends
  [TICKET-PRIV-01](./TICKET-PRIV-01-privacy-mode-dashboard.md) — which shipped the
  `privacyMode` setting, the `mm-privacy-blur` wrapper and a Dashboard-only toggle, and named the
  other screens explicit follow-up scope. Header placement follows
  [TICKET-UI-24](../../design-system/tickets/TICKET-UI-24-header-start-and-end-action-sections.md)'s
  slot rule. No new FR.

## User story

As a user, I want the same one-click "Hide amounts" on every page that shows me my figures, so I can
blank the screen wherever I happen to be instead of navigating back to the Dashboard first.

## Description

Puts the existing privacy toggle in the header of every insight page — Dashboard, Income, Explore
(and Future once it exists) — and makes sure the pages that gain the toggle actually respond to it.
One shared toggle component replaces the Dashboard's hand-rolled one, so the label, icon and wording
can't drift between pages.

## Current situation (as-is)

- The toggle exists in exactly one page header. `privacyToggle`/`togglePrivacyMode` are private
  members of
  [`dashboard-overview.component.ts`](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts):
  a `computed()` returning `{ label: 'Show amounts', icon: 'tablerEyeOff' }` / `{ label: 'Hide
  amounts', icon: 'tablerEye' }`, and a click handler calling `appSettingsStore.setPrivacyMode()`.
  Nothing about it is shared, so a second page would copy all of it.
- The setting itself is already global and persisted — `AppSettingsStore.privacyModeEnabled`
  ([app-settings.store.ts](../../../src/app/core/state/app-settings.store.ts)) resolves the stored
  `privacyMode ?? false` once, and every consumer reads that signal.
- **Explore already honours privacy mode but offers no way to turn it on from there.**
  [`explore-overview.component.html`](../../../src/app/feature-explore/components/explore-overview/explore-overview.component.html)
  projects only a range switcher into its header, while the bills calendar
  ([bills-calendar](../../../src/app/feature-explore/components/bills-calendar/bills-calendar.component.ts),
  `bills-day-list`, `bills-month-grid`) and the money-flow Sankey
  ([money-flow-panel](../../../src/app/feature-explore/components/money-flow-panel/money-flow-panel.component.ts))
  all read `privacyModeEnabled` and mask their figures. So the page blurs — but only if you went to
  the Dashboard to say so.
- **Income honours privacy mode nowhere.** No file under
  [`feature-income/`](../../../src/app/feature-income) references `privacyMode` or `mm-privacy-blur`;
  its gross/net section, growth panel and yearly panel render real currency figures unmasked with
  privacy mode on. Its header
  ([income-overview.component.html](../../../src/app/feature-income/components/income-overview/income-overview.component.html))
  projects two link buttons into `actions-end`.
- The Settings copy
  ([settings-privacy-section.component.html](../../../src/app/feature-settings/components/settings-privacy-section/settings-privacy-section.component.html))
  says "Blurs every amount on the Dashboard" and "The Dashboard's own header has the same toggle" —
  both become wrong once this ships.
- `mm-page-header` ([page-header.component.ts](../../../src/app/shared/ui/page-header/page-header.component.ts))
  already gives every page the `actions-end` slot this needs; no header change is required.

## Desired result (to-be)

- A shared `shared/ui/privacy-toggle/privacy-toggle.component.ts` (`mm-privacy-toggle`) owns the
  whole control: it injects `AppSettingsStore`, renders the `mm-button` with the state-appropriate
  label + `tablerEye`/`tablerEyeOff` icon, and writes `setPrivacyMode()` on click. Registering its
  own icons, it is drop-in — a page adds `<mm-privacy-toggle actions-end />` and nothing else.
- `dashboard-overview` **replaces** its local `privacyToggle`/`togglePrivacyMode` with that
  component; the two eye icons come out of its `provideIcons` list. The rendered result is
  unchanged, including the fact that it stays reachable in the empty state.
- `explore-overview` and `income-overview` project the same component into `actions-end`.
- Income gains the blur it never had: every user-facing amount in the gross/net section, growth
  panel, yearly panel and salary-month modal is wrapped in `mm-privacy-blur` (or passed as
  `[blurred]` to `mm-stat-card`), following PRIV-01's rule — **numbers blur, charts and labels stay
  sharp and interactive**.
- The definition of "insight page" is the Insights nav group from
  [TICKET-UI-26](../../design-system/tickets/TICKET-UI-26-grouped-sidebar-navigation.md): Dashboard, Income, Explore, plus
  `/future` once [TICKET-FUT-03](../../future/tickets/TICKET-FUT-03-future-page-scaffold.md)
  ships. Data pages (Accounts, Transactions, Categories, Learning, Import) get **no** toggle in this
  ticket — see Notes.
- The Settings section's copy is rewritten to describe the real scope ("every page that shows you
  figures") and to stop naming the Dashboard as the only page carrying the toggle.

## Acceptance criteria

> **Implementation note (2026-08-10).** Three departures from the criteria below, each recorded
> inline where it applies:
>
> 1. **Four insight pages, not three.** `/recurring` was split out of Explore (commit `32bdd84`,
>    "refactor: move recurring to own page" — no ticket of its own) *after* this ticket was written,
>    and now sits in the Insights nav group alongside Dashboard, Income and Explore. Its two
>    sections have masked their figures since PRIV-01 but its header had no toggle — the exact gap
>    this ticket names for Explore. Adding it follows the ticket's own definition of scope ("the
>    Insights nav group"); leaving it out would have shipped the bug the ticket exists to fix.
> 2. **The salary-month modal has nothing to blur** — see AC 5.
> 3. **The gross/net section has no *visible* amount either** — see AC 5. Both are honoured through
>    their `sr-only` companion tables instead, per the coding-conventions rule from TICKET-STAT-29.

- [x] `mm-privacy-toggle` exists in `shared/ui/`, is standalone + `OnPush`, exported from the
      `shared/ui` barrel, reads `AppSettingsStore.privacyModeEnabled`, and writes through
      `setPrivacyMode()` — no component reimplements the label/icon/click logic.
      *(New `shared/ui/privacy-toggle/privacy-toggle.component.ts` + `.html`, exported from
      `shared/ui/index.ts`. `privacy-toggle.component.spec.ts` covers both states, both click
      directions and hydration. It is the one `shared/ui` primitive that injects a store — the class
      doc states why, and `mm-privacy-blur` deliberately stays input-driven. No other file defines a
      privacy label/icon: `grep -rn "Hide amounts|Show amounts" src/app` returns only this component,
      plus prose in comments and shipped changelog entries.)*
- [x] The toggle renders in the `actions-end` slot of the Dashboard, Income and Explore page headers,
      with identical wording and icon on all three ("Hide amounts" when figures are visible, "Show
      amounts" when they are hidden). *(And Recurring — see note 1. All four project the same
      `<mm-privacy-toggle actions-end />`, so the wording is one source. Slot placement asserted in
      `explore-overview.component.spec.ts` ("carries the shared privacy toggle in the header's end
      slot"), `recurring-overview.component.spec.ts` (same case) and
      `income-overview.component.spec.ts` → "privacy mode (TICKET-PRIV-02)", which also pins the end
      group's order as `Income settings · Salary details · Guide · Hide amounts`. The Dashboard's own
      order case — `orders the header title · range · privacy · settings` — still passes unchanged.)*
- [x] `dashboard-overview` no longer defines its own `privacyToggle`/`togglePrivacyMode`, and its
      `provideIcons` no longer registers `tablerEye`/`tablerEyeOff`; the header still shows the
      toggle in the empty state, exactly as PRIV-01 requires. *(Both members deleted from
      `dashboard-overview.component.ts`; `provideIcons` is now `{ tablerCheck, tablerFileImport,
      tablerPencil }`. Its `privacyMode` field stays — the stat cards' `[blurred]` reads it. The
      whole PRIV-01 spec block passes untouched, including "keeps the header toggle reachable in the
      empty state, where the settings button is not".)*
- [x] Toggling from any of the three pages flips the same persisted setting — turn it on from
      Explore, navigate to the Dashboard, and the Dashboard is already blurred (and vice versa).
      *(Structural rather than observed, since the live check was declined: all four pages render the
      same component, which writes `AppSettingsStore.setPrivacyMode()` — one root store over one
      `appSettings` row, so there is no second path for the pages to disagree through.
      `privacy-toggle.component.spec.ts` pins both the write ("writes the negated setting through
      AppSettingsStore on click", "writes `false` when clicked while privacy mode is already on") and
      the read-back after persistence ("opens on the persisted setting rather than the default, once
      the store hydrates").)*
- [x] Every user-facing amount on the Income page blurs with the setting on — growth panel, yearly
      panel ~~gross/net section~~ ~~and the salary-month modal~~ — while panel titles, axis labels,
      chart canvases and links stay sharp and clickable.
      **Amended 2026-08-10.** Two of the four named surfaces have no visible amount to wrap:
      - **The salary-month modal** is two `<mm-input type="number">` fields and a link — there is no
        rendered figure, only values the user types. Blurring an input while it is being filled is
        exactly what this ticket's own Notes reject for `/income/salary`, so it is left alone.
      - **The gross/net section** draws every figure inside an echarts canvas, which
        `mm-privacy-blur` cannot reach and which this ticket's Notes put out of scope.
      Both, plus the two chart panels, are instead honoured through their `sr-only` companion tables
      (see the criterion below). *Evidence for what does blur:* growth-panel cards and caption figure
      (`income-growth-panel.component.spec.ts` → "blurs every card and the caption's figure with
      privacy mode on"), the yearly headline (`income-yearly-panel.component.spec.ts` → "blurs the
      headline card while leaving its label and the span picker alone"), and — beyond the ticket's
      list — the **"Notable changes" events rail**, the densest run of figures on the page
      (`income-events-sidebar.component.spec.ts` → "blurs a wage row's two amounts and its
      percentage, not `Net` or the month" / "blurs a sentence event whole"). `mm-stat-card` also
      gained tooltip blurring (`stat-card.component.spec.ts` → "masks the tooltip too, so a hover
      cannot hand back the figure") — without it, hovering a blurred Income card handed the amount
      straight back, since the tooltip is the only place those percentage cards spell it out.
      Titles/charts stay sharp: `income-overview.component.spec.ts` asserts no `[echarts]` or
      `canvas` ever sits inside a `.mm-privacy-blurred` box and that "Income growth"/"Income by year"
      stay readable.
- [x] **Added 2026-08-10.** Income's `sr-only` companion tables *withhold* their amounts instead of
      blurring them, per the coding-conventions rule established by TICKET-STAT-29: an `sr-only`
      table is clipped to a 1px box, so a CSS filter paints nothing over it and a screen reader reads
      the real figure straight out of an ostensibly hidden page. *(New shared
      `HIDDEN_AMOUNT_TEXT` in `shared/utils/hidden-amount.ts` — the Dashboard heatmap's local copy of
      the same string now imports it — applied to the monthly trend table
      (`income-overview.component.ts`), the yearly table (`income-yearly-panel.component.ts`) and all
      four gross/net cells (`income-gross-net-section.component.ts`). Months, years and percentages
      stay: they are labels, not amounts. Asserted in all three specs, including "still tells a 'not
      entered' month apart from a withheld figure".)*
- [x] Explore's already-blurring figures are unchanged by this ticket; only its header gains the
      toggle. *(`explore-overview.component.html` gained one line; no file under
      `feature-explore/` other than the overview's `.ts`/`.html`/`.spec.ts` is in the diff, and
      `money-flow-panel.component.spec.ts` passes untouched.)*
- [x] The Settings privacy section's copy describes the actual scope (every insight page) and no
      longer claims the Dashboard is the only page with the toggle; the Settings checkbox and all
      three page toggles continue to agree at all times.
      *(`settings-privacy-section.component.html` now names Dashboard, Income, Recurring and Explore,
      says every one of them carries the toggle, and states why the data pages are excluded; the
      checkbox label reads "Blur amounts on my insight pages". Agreement is structural — the checkbox
      and all four toggles read and write the same `AppSettingsStore` signal — and
      `settings-privacy-section.component.spec.ts` still passes.)*
- [x] No blur or toggle is added to Accounts, Transactions, Categories, Learning, Import or the
      `/income/salary` and `/income/settings` sub-pages. *(No file under `feature-accounts`,
      `feature-transactions`, `feature-categories`, `feature-learning`, `feature-import`,
      `salary-details-page/` or `income-settings-page/` appears in `git status`. Recurring is the one
      addition, and it is an insight page — see note 1.)*
- [x] Persistence goes through `AppSettingsStore`/`AppSettingsRepository` — no component touches the
      `appSettings` table directly, and no new Dexie version is added (the field already exists).
      *(`privacy-toggle.component.ts` injects `AppSettingsStore` and calls `setPrivacyMode()`;
      `privacy-toggle.component.spec.ts` → "persists through the store, never touching the
      appSettings table itself" spies on `appDb.appSettings.put` and asserts it is never called.
      `app-db.ts` is not in the diff.)*
- [x] Unit tests cover: `mm-privacy-toggle` rendering both label/icon states and calling
      `setPrivacyMode` with the negated value; the toggle being present in each of the three page
      headers; at least one Income figure blurring when `privacyModeEnabled` is `true` and rendering
      plainly when `false`; the Dashboard's existing privacy specs still passing against the shared
      component. *(6 cases in `privacy-toggle.component.spec.ts`; header cases in the Explore,
      Recurring and Income overview specs; on/off pairs in the growth, yearly, gross/net, events-rail
      and Income-overview specs; the Dashboard's `privacy mode (TICKET-PRIV-01)` block passes
      unmodified against the shared component. 2,692 tests, 245 files, all green.)*
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json` budgets
      untouched. *(2026-08-10: lint "All files pass linting"; `ng test` 2692/2692 passed across 245
      files; dev build "Application bundle generation complete". `angular.json` is not in the diff.
      One run in four surfaced an unrelated zrender/jsdom teardown race in
      `spending-heatmap-panel.component.spec.ts` — a canvas paint after fixture destroy, with no
      failing assertion; that file's only change here is a constant rename, and three other full runs
      were clean.)*
- [ ] Verified live in the browser: toggle from Explore, confirm Income and Dashboard are blurred on
      arrival, reload and confirm it survives, then switch it off from Settings and confirm all three
      headers read "Hide amounts" again. **Not done — the user declined the live check when asked on
      2026-08-10.** Deliberately left open rather than ticked: nothing here was seen in a browser.
- [x] Verified via the fallow skill and coding-conventions skill. *(`fallow audit --base HEAD`:
      verdict **pass**, `complexity_introduced: 0`, `dead_code_introduced: 0`,
      `duplication_introduced: 0`. Its one introduced finding — a CRAP-estimate trip on
      `income-growth-panel.component.html` from an added `@if` — was removed rather than suppressed,
      by making `caption()` return empty strings instead of `null` so the template needs no second
      branch inside the one that already guarantees it. Conventions checked against
      `.claude/skills/coding-conventions/SKILL.md`: one-folder-per-component, `mm-` prefix, `input()`
      signals, native control flow, `actions-end` slot rule, view-models resolved in the class, and
      the TICKET-STAT-29 sr-only rule quoted above.)*

## Notes

- **Why insight pages only.** The data pages are where you *work on* your figures — a blurred
  Transactions list can't be reconciled and a blurred Accounts balance can't be checked against the
  bank. PRIV-01 chose the highest-visibility screen; this ticket extends to the screens with the same
  purpose (looking) rather than to every screen with a number on it. Covering the data pages is a
  real follow-up, and it needs its own answer to "what does blur mean while you're editing".
- **`/income/salary` is excluded on the same grounds**, even though it hangs off an insight page: it
  is the one place in Income where you type figures in, and blurring an input you are filling is
  actively hostile.
- **`/future` isn't listed in the acceptance criteria** because it doesn't exist yet. Whichever of
  this ticket and [TICKET-FUT-07](../../future/tickets/TICKET-FUT-07-projected-net-worth-chart.md)
  ships second adds `<mm-privacy-toggle actions-end />` to the Future header — v2.2's Definition of
  Done already requires privacy-mode compliance there, so this only supplies the control.
- The residual PRIV-01 named still stands: amounts drawn *inside* an ECharts canvas (axis ticks,
  echarts' own tooltips) are not masked by `mm-privacy-blur`, and Income's charts inherit that limit.
  Masking canvas-internal text is a separate ticket across every chart, not something to solve twice
  here.
