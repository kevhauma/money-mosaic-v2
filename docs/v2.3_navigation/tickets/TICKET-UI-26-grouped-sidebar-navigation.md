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

- [ ] The sidebar renders exactly two labelled feature groups, "Insights" (Dashboard, Income,
      Explore) and "Data" (Accounts, Transactions, Categories, Learning, Import), in that order.
- [ ] Both groups are always expanded: no `<details>`, no collapse toggle, no open/closed state
      stored anywhere — every one of the eight links is reachable in a single click from any route.
- [ ] Every existing `routerLink`, label, icon, active-state (`menu-active`) and the Transactions
      uncategorised badge behave exactly as before the change; no route is added, removed or renamed.
- [ ] `NAV_ITEM_CLASS` is still defined once and bound to every nav `<a>` — the group headings do
      not get it, and no per-item utility strings are reintroduced.
- [ ] The group headings are `<h2 class="menu-title">` elements: not focusable, not links, and each
      is the accessible group label for the `<ul>` that follows it.
- [ ] The bottom meta list (How-to's, FAQ, Changelog, Settings) is untouched — still `mt-auto`-pinned
      and still without a heading.
- [ ] The same grouped markup renders in the mobile drawer (viewport below `lg`) — one template, no
      mobile-only nav variant.
- [ ] Unit tests in `app-shell.component.spec.ts` cover: both group headings render with the expected
      text; each group contains exactly its expected `href`s and no others; no `<details>` element
      exists in the nav; the Transactions badge still renders from `uncategorisedCount()`.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json` budgets
      untouched (this adds markup only — no new component, dependency or icon).
- [ ] Verified live in the browser: both groups visible at `lg` and in the mobile drawer, active
      highlighting still follows the route, and no console error. *(Ask the user first; if declined,
      note it here rather than ticking.)*
- [ ] Verified via the fallow skill and coding-conventions skill.

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
- This ticket deliberately changes nothing about the routes themselves. The classification it
  introduces is reused — by name, not by shared code — by
  [TICKET-PRIV-02](./TICKET-PRIV-02-hide-amounts-on-every-insight-page.md), which puts the
  hide-amounts toggle on exactly the pages in the Insights group.
