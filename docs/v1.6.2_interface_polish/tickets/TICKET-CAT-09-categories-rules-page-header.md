# TICKET-CAT-09 — Categories/Rules header: the switch, the create button, and each tab's own control

- **Area:** Categories
- **Type:** Refactor
- **Traceability:** extends FR-CAT-1 / FR-CAT-4, needs [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md)

## User story

As a user, I want the Categories/Rules switch to sit in the page header alongside the create button and
whichever extra control that tab needs, so switching between the two views and acting on them happens in
one row instead of two stacked strips.

## Description

`/categories` and `/rules` are two views of one page, but their shared tab switch renders *below* the
header while their controls render *inside* it — two rows of chrome before any content. This ticket puts
the switch in the header with the rest.

## Current situation (as-is)

- **Both pages render the same route-driven switch below the header**:
  `<mm-tabs [tabs]="categoriesTabs" variant="box" class="mb-4 w-fit" />` at
  [categories-overview.component.html:19](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.html)
  and [rules-overview.component.html:21](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.html),
  both bound to the shared `CATEGORIES_TABS`. `mm-tabs` supports a route-driven mode where each tab is a
  `routerLink` owning its own active state
  ([tabs.component.ts](../../../src/app/shared/ui/tabs/tabs.component.ts)) — which is what both use.
- **Categories header** already holds "Show archived" (the `showArchived` signal feeding
  `visibleCategories`) and a primary "Add category", plus the subtitle
  `"Manage the categories transactions get sorted into."`.
- **Rules header** already holds "Re-run rules" (`runRules()`, with its `running()` loading state) and a
  primary "Add rule", plus the subtitle `"Automatically categorise transactions as they come in."`.
- **On Rules there is a third strip**: `<app-rule-share-bar>` renders *between* the header and the tabs,
  so the page is header → share bar → tabs → success alert → filters → table before a single rule shows.

## Desired result (to-be)

- **The switch moves into the header**, as the leftmost item of `[actions]` on both routes, so it reads
  title · switch · that tab's control · create. It keeps its route-driven mode and its `variant="box"`
  look, and loses the `mb-4` that only made sense below the header.
- **Each tab keeps its own extra control** in the header, as today: "Show archived" on Categories,
  "Re-run rules" on Rules.
- **"Create new" stays the primary, last action on both** — "Add category" and "Add rule" respectively.
- **Both subtitles are removed**, per [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md).
- **The rules success alert stays in the body**, under the header — it's a result, not a control.
- **`app-rule-share-bar` moves below the tabs' old position** so the Rules page reads header → alert →
  share bar → filters → table, with nothing between the header and the page's own content but page
  state.
- **`mm-tabs` itself is unchanged** — this is a placement change, not a primitive change.
- The header's action group still wraps, so on a narrow screen the switch, the control and the create
  button fall onto two rows rather than overflowing.

## Acceptance criteria

- [ ] Both routes render `mm-tabs` inside `mm-page-header`'s `[actions]` slot and nowhere else;
      component specs assert one `mm-tabs` in the header and none in the body.
- [ ] Header order on both routes is switch · tab-specific control · create; component specs assert DOM
      order.
- [ ] The switch still highlights the active route and still navigates between `/categories` and
      `/rules`; existing tabs routing specs pass unchanged.
- [ ] "Show archived" still reveals archived categories, and "Re-run rules" still runs the rules engine
      and shows its loading state; existing specs pass unchanged.
- [ ] Neither route renders a subtitle; component specs assert absence.
- [ ] The rules success alert (`rulesStore.lastRunCount()`) still renders in the body after a run;
      existing spec passes.
- [ ] `app-rule-share-bar` renders below the header and above the filters; component spec asserts the
      order.
- [ ] `mm-tabs` and `CATEGORIES_TABS` are unchanged; `git diff` touches no file under `shared/ui/tabs/`.
- [ ] The header wraps rather than overflowing at 375px; component spec asserts the wrap binding.
- [ ] No persistence changes, no Dexie version bump — `categoryManual` and every rule/category write
      still goes through its store.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: both routes open with one header row, switching tabs keeps the switch
      in place, and re-running rules still reports its count.

## Notes

- The switch is a **view switch**, which is page-level by the TICKET-UI-22 rule — it reconfigures the
  whole page. That's why it belongs in the header rather than staying a body-level tab strip.
- Deliberately keeps two route components rather than merging them behind one route with a tab: the two
  views have different stores, different tables and different actions, and merging them is a much larger
  change than the report asks for.
- The share bar's move is included because it currently sits between the header and the tabs; once the
  tabs leave, leaving it there would just make it the new second strip.
