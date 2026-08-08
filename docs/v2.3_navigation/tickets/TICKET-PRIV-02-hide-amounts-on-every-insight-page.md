# TICKET-PRIV-02 — "Hide amounts" on every insight page, not just the Dashboard

- **Area:** Privacy Mode
- **Type:** Feature
- **Traceability:** extends
  [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md) — which shipped the
  `privacyMode` setting, the `mm-privacy-blur` wrapper and a Dashboard-only toggle, and named the
  other screens explicit follow-up scope. Header placement follows
  [TICKET-UI-24](../../v1.6.2_interface_polish/tickets/TICKET-UI-24-header-start-and-end-action-sections.md)'s
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
  [TICKET-UI-26](./TICKET-UI-26-grouped-sidebar-navigation.md): Dashboard, Income, Explore, plus
  `/future` once [TICKET-FUT-03](../../v2.2_goals_and_forecast/tickets/TICKET-FUT-03-future-page-scaffold.md)
  ships. Data pages (Accounts, Transactions, Categories, Learning, Import) get **no** toggle in this
  ticket — see Notes.
- The Settings section's copy is rewritten to describe the real scope ("every page that shows you
  figures") and to stop naming the Dashboard as the only page carrying the toggle.

## Acceptance criteria

- [ ] `mm-privacy-toggle` exists in `shared/ui/`, is standalone + `OnPush`, exported from the
      `shared/ui` barrel, reads `AppSettingsStore.privacyModeEnabled`, and writes through
      `setPrivacyMode()` — no component reimplements the label/icon/click logic.
- [ ] The toggle renders in the `actions-end` slot of the Dashboard, Income and Explore page headers,
      with identical wording and icon on all three ("Hide amounts" when figures are visible, "Show
      amounts" when they are hidden).
- [ ] `dashboard-overview` no longer defines its own `privacyToggle`/`togglePrivacyMode`, and its
      `provideIcons` no longer registers `tablerEye`/`tablerEyeOff`; the header still shows the
      toggle in the empty state, exactly as PRIV-01 requires.
- [ ] Toggling from any of the three pages flips the same persisted setting — turn it on from
      Explore, navigate to the Dashboard, and the Dashboard is already blurred (and vice versa).
- [ ] Every user-facing amount on the Income page blurs with the setting on — gross/net section,
      growth panel, yearly panel and the salary-month modal — while panel titles, axis labels,
      chart canvases and links stay sharp and clickable.
- [ ] Explore's already-blurring figures are unchanged by this ticket; only its header gains the
      toggle.
- [ ] The Settings privacy section's copy describes the actual scope (every insight page) and no
      longer claims the Dashboard is the only page with the toggle; the Settings checkbox and all
      three page toggles continue to agree at all times.
- [ ] No blur or toggle is added to Accounts, Transactions, Categories, Learning, Import or the
      `/income/salary` and `/income/settings` sub-pages.
- [ ] Persistence goes through `AppSettingsStore`/`AppSettingsRepository` — no component touches the
      `appSettings` table directly, and no new Dexie version is added (the field already exists).
- [ ] Unit tests cover: `mm-privacy-toggle` rendering both label/icon states and calling
      `setPrivacyMode` with the negated value; the toggle being present in each of the three page
      headers; at least one Income figure blurring when `privacyModeEnabled` is `true` and rendering
      plainly when `false`; the Dashboard's existing privacy specs still passing against the shared
      component.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json` budgets
      untouched.
- [ ] Verified live in the browser: toggle from Explore, confirm Income and Dashboard are blurred on
      arrival, reload and confirm it survives, then switch it off from Settings and confirm all three
      headers read "Hide amounts" again. *(Ask the user first; if declined, note it here rather than
      ticking.)*
- [ ] Verified via the fallow skill and coding-conventions skill.

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
  this ticket and [TICKET-FUT-07](../../v2.2_goals_and_forecast/tickets/TICKET-FUT-07-projected-net-worth-chart.md)
  ships second adds `<mm-privacy-toggle actions-end />` to the Future header — v2.2's Definition of
  Done already requires privacy-mode compliance there, so this only supplies the control.
- The residual PRIV-01 named still stands: amounts drawn *inside* an ECharts canvas (axis ticks,
  echarts' own tooltips) are not masked by `mm-privacy-blur`, and Income's charts inherit that limit.
  Masking canvas-internal text is a separate ticket across every chart, not something to solve twice
  here.
