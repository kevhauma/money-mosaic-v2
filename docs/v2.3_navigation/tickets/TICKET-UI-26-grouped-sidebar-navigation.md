# TICKET-UI-26 — Sidebar nav grouped into "Insights" and "Data", both groups always visible

- **Area:** UI / App shell
- **Type:** Refactor
- **Traceability:** extends the app-shell navigation of
  [ui-layout-spec.md](../../v1.0_foundation/ui-layout-spec.md) §Navigation; continues the shell
  work of [TICKET-UI-14](../../v1.5_redesign/tickets/TICKET-UI-14-app-shell-visual-pass.md) and the
  nav trim of [TICKET-SET-06](../../v2/tickets/TICKET-SET-06-move-data-nav-into-settings.md). No new
  FR — no route is added, removed or renamed.

## User story

As a user, I want the sidebar to show at a glance which pages *show me* my money and which pages
*feed it*, so I stop scanning eight equal-looking links to find the one I want.

## Description

Splits the sidebar's single flat list of eight links into two labelled groups — the pages you go to
in order to look at something ("Insights": Dashboard, Income, Explore) and the pages you go to in
order to put data in or shape it ("Data": Accounts, Transactions, Categories, Learning, Import).
Both groups are **permanently expanded** — this is grouping with headings, not collapsible submenus:
nothing is ever a click away that isn't a click away today.

## Current situation (as-is)

- [`app-shell.component.html`](../../../src/app/core/layout/app-shell/app-shell.component.html)
  renders all eight feature links as sibling `<li>`s in one `<ul class="menu-vertical gap-1">`, with
  no heading, separator or visual distinction between them. Reading order today is Dashboard,
  Income, Explore, Accounts, Transactions, Categories, Learning, Import — which is **already** the
  two groups back to back, just unmarked.
- A second `<ul class="menu-vertical mt-auto gap-1 pt-4">` below it pins the meta links (How-to's,
  FAQ, Changelog, Settings) to the bottom of the sidebar via `mt-auto`. That list is a group in
  everything but name and is not what this ticket is about.
- Every item is the same shape — `routerLink` + `routerLinkActive="menu-active"` +
  `[class]="navItemClass"` + `ng-icon` + `mm-text` — with `NAV_ITEM_CLASS` defined once in
  [`app-shell.component.ts`](../../../src/app/core/layout/app-shell/app-shell.component.ts) and
  bound identically to each `<a>`, and every icon registered there via `provideIcons`.
- The Transactions item carries a `badge badge-warning` fed by `transactionsStore.uncategorisedCount()`.
- daisyUI 5's `menu` already ships both group shapes this needs: a flat `<li class="menu-title">`
  heading, and a nested `<li><h2 class="menu-title">…</h2><ul>…</ul></li>` submenu that renders
  expanded unless it is explicitly made collapsible. No new CSS or component is required.
- [`app-shell.component.spec.ts`](../../../src/app/core/layout/app-shell/app-shell.component.spec.ts)
  asserts what the shell must *not* render (no `/data` item, no range switcher) but nothing about
  the nav's structure, so the grouping is currently untested either way.

## Desired result (to-be)

- The eight feature links render as two always-expanded groups inside the existing sidebar `menu`:
  - **Insights** — Dashboard, Income, Explore (and `/future` once
    [TICKET-FUT-03](../../v2.2_goals_and_forecast/tickets/TICKET-FUT-03-future-page-scaffold.md)
    lands — see Notes).
  - **Data** — Accounts, Transactions, Categories, Learning, Import.
- Each group is a nested `<ul>` under an `<h2 class="menu-title">` heading, using daisyUI's
  always-visible submenu shape. **No `<details>`, no toggle, no collapse state** — a group can never
  be closed, so no nav target is ever more than one click away and there is no state to persist.
- The two headings are the only new text; item labels, icons, order, `routerLink`s, the
  Transactions badge and `NAV_ITEM_CLASS` are all unchanged. The relative order of the eight items
  does not change, because it already matches the grouping.
- The bottom meta list (How-to's, FAQ, Changelog, Settings) stays exactly as it is: pinned by
  `mt-auto`, no heading. Its position at the foot of the sidebar is already the grouping signal.
- Headings are non-interactive, are not announced as links, and don't sit in the tab order — they
  are `<h2>`s, and each group's `<ul>` is their content, so a screen reader reads "Insights, list of
  3 items".
- The mobile drawer gets the identical markup — one template, one nav, no separate mobile variant.

## Acceptance criteria

- [x] The sidebar renders exactly two labelled feature groups, "Insights" (Dashboard, Income,
      Explore) and "Data" (Accounts, Transactions, Categories, Learning, Import), in that order.
      (`app-shell.component.html` — two group `<li>`s inside the existing `ul.menu-vertical`; specs
      *"renders exactly two feature group headings"*, *"puts Dashboard, Income and Explore in
      Insights — and nothing else"*, *"puts Accounts, Transactions, Categories, Learning and Import
      in Data — and nothing else"*, each asserting the full `href` list with `toEqual`, so an extra
      or missing item fails.)
- [x] Both groups are always expanded: no `<details>`, no collapse toggle, no open/closed state
      stored anywhere — every one of the eight links is reachable in a single click from any route.
      (Spec *"keeps both groups permanently expanded — no `<details>`"* asserts no `details` and no
      `summary` anywhere in the shell; the component class gained no field — its only signal is still
      `drawerOpen`.)
- [x] Every existing `routerLink`, label, icon, active-state (`menu-active`) and the Transactions
      uncategorised badge behave exactly as before the change; no route is added, removed or renamed.
      (Item markup moved verbatim — `git diff` shows re-indentation only. Live at 1200×3000: clicking
      the sidebar's Accounts navigated to `/accounts` and `a.menu-active` moved to
      `a[href="/accounts"]` inside the Data group. The active *styling* is unchanged too, proven by
      comparison rather than assumption: temporarily adding `menu-active` to the un-nested
      `/settings` link in the meta list produced computed styles identical to the nested active item
      — so nesting changes nothing about how `.menu-active` resolves.)
- [x] `NAV_ITEM_CLASS` is still defined once and bound to every nav `<a>` — the group headings do
      not get it, and no per-item utility strings are reintroduced. (`app-shell.component.ts` is
      unchanged by this ticket; live DOM shows the active anchor's `className` as the same
      `NAV_ITEM_CLASS` string, and spec *"leaves the group headings out of the tab order"* checks the
      headings carry only `menu-title`.)
- [x] The group headings are `<h2 class="menu-title">` elements: not focusable, not links, and each
      is the accessible group label for the `<ul>` that follows it. **Implementation note
      (2026-08-09):** they ship as `<h2 class="menu-title text-base-content/60">` — one added colour
      utility, because daisyUI 5.6.7's stock `.menu-title` is `base-content/40`, which measured
      **3.49:1** against this sidebar on the default dark theme and so failed the 4.5:1 AA floor for
      text this ticket newly introduces. `/60` is the app's own label tier
      (`typography.component.ts`) and measures **6.28:1**. Everything else about the criterion is as
      written. (Each heading carries an `id` and
      its group `<ul>` an `aria-labelledby` pointing at it — the specs resolve the group *through*
      that attribute, so the link assertions above would fail if the label link broke. Live:
      `tabIndex === -1`, `matches('a,button,[tabindex]:not([tabindex="-1"])') === false`, and daisyUI
      renders it muted at `base-content/40`.)
- [x] The bottom meta list (How-to's, FAQ, Changelog, Settings) is untouched — still `mt-auto`-pinned
      and still without a heading. (Untouched in the diff; spec *"leaves the meta list unheaded and
      pinned to the foot of the sidebar"* asserts `ul.mt-auto` exists, contains no `.menu-title`, and
      holds exactly those four hrefs. Live at 375×812 its links sit at x=16 — un-indented, i.e.
      outside both groups — and at y=634–758, pinned to the foot.)
- [x] The same grouped markup renders in the mobile drawer (viewport below `lg`) — one template, no
      mobile-only nav variant. (Screenshot at 375×812 with the drawer open shows both headings and
      all eight items; the document contains exactly one nav — the same `.drawer-side .menu` the
      desktop layout uses — so there is nothing that *could* diverge.)
- [x] Unit tests in `app-shell.component.spec.ts` cover: both group headings render with the expected
      text; each group contains exactly its expected `href`s and no others; no `<details>` element
      exists in the nav; the Transactions badge still renders from `uncategorisedCount()`.
      (8 new cases in `describe('AppShellComponent: grouped sidebar navigation (TICKET-UI-26)')`; the
      badge case drives the real store via a mocked `TransactionsRepository` returning three
      uncategorised rows and asserts the badge reads "3" *inside the Data group*, plus a companion
      case asserting no badge when nothing is uncategorised. 11 passed.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json` budgets
      untouched (this adds markup only — no new component, dependency or icon). (Lint: *"All files
      pass linting."* Build: initial total 2.16 MB, no budget warnings, both workers emitted;
      `angular.json` is not in the diff. Tests: 243 files / 2657 tests green. Two earlier full runs
      each failed in a *different* ECharts dashboard spec — `spending-heatmap-panel` on a zrender
      `requestAnimationFrame` teardown race, `trend-chart-panel` on a 5s timeout — both green in
      isolation and both unrelated to the app shell; the third full run was clean end to end, which
      is the run recorded here.)
- [x] Verified live in the browser: both groups visible at `lg` and in the mobile drawer, active
      highlighting still follows the route, and no console error. (Dev server on :4210. Desktop
      1280×900 screenshot: "Insights" over Dashboard/Income/Explore, "Data" over the five data pages,
      each group indented under daisyUI's hairline rule, Dashboard tinted as the active route.
      Mobile 375×812 screenshot with the drawer open: identical. `read_console_messages` returned no
      errors at either width, and the sidebar's `scrollWidth === clientWidth` at both, so the 1.5rem
      group indent introduces no horizontal overflow. Both screenshots predate the heading-contrast
      bump noted three criteria above; that change was verified live afterwards by measurement —
      `className` `"menu-title text-base-content/60"`, contrast 6.28:1, group indent still 24px.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`:
      verdict **pass**, 0 dead-code / complexity / duplication findings introduced, styling health A
      (94.5) with token erosion unchanged by the added utility class — re-run after the contrast fix,
      same result. `conventions-reviewer` on the diff: no hard-rule breach — `NAV_ITEM_CLASS` still
      single-source and off the headings, no component CSS or hex colours, native `@if` kept,
      standalone/OnPush/`inject()` intact, barrel imports correct, and the spec's mock-then-
      `hydrate({ force: true })` order matches the prescribed cached-hydration pattern. Two of its
      four advisories were acted on: the contrast finding (above) and a spec case that could pass
      vacuously — the heading loop now counts 2 headings first and asserts `className` exactly,
      instead of a tautological `tagName` check inside a possibly-empty `for`. The remaining two are
      recorded in Notes.)

## Notes

- **Why headings and not collapsible submenus.** "Submenus, but always visible" is the ask, and it
  is also the right call: with eight items the sidebar has no height problem to solve, so collapsing
  would trade a real cost (a second click, plus a persisted open/closed state to get wrong) for no
  gain. The grouping is here to make the list *scannable*, not shorter.
- **Group names.** "Insights" over "Graphs" because Dashboard's stat cards and Explore's bill list
  aren't graphs; "Data" over "Input" because Categories and Learning shape data rather than enter it.
  Both are one word and neither collides with an existing page title.
- **Interaction with [TICKET-FUT-03](../../v2.2_goals_and_forecast/tickets/TICKET-FUT-03-future-page-scaffold.md).**
  FUT-03 specs its nav item as sitting "between Explore and Accounts" — which is the boundary this
  ticket draws a heading across. Whichever ships second places "Future" as the **last item of the
  Insights group**, which is the same slot FUT-03 described, now on the correct side of the line.
  Neither ticket blocks the other.
- **Two review advisories left undone, on purpose (2026-08-09).** The `conventions-reviewer` also
  suggested (a) giving the headings a theme-hook marker class like `mm-nav-group-title`, since no
  theme in `src/themes/` styles `.menu-title` while four of them restyle the `.mm-text-label` hook —
  so under those themes the headings stay stock daisyUI while every other label-tier string changes
  face; and (b) rendering them as `mm-text as="h2" variant="label"` instead. Both were declined here:
  (a) adds a hook no stylesheet uses yet, which is exactly the kind of speculative surface that rots,
  and (b) would put a non-`.menu-title` `<mm-text>` host between the `<li>` and the heading, which
  daisyUI's `li:not(.menu-title) > :not(ul, menu, details, .menu-title, .btn)` selector would then
  style as a menu *item*. Whoever restyles the sidebar for a theme next should pick (a) up then, when
  there is a stylesheet that actually wants it.
- This ticket deliberately changes nothing about the routes themselves. The classification it
  introduces is reused — by name, not by shared code — by
  [TICKET-PRIV-02](./TICKET-PRIV-02-hide-amounts-on-every-insight-page.md), which puts the
  hide-amounts toggle on exactly the pages in the Insights group.
