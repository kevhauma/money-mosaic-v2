# TICKET-CAT-09 — Categories/Rules header: the switch, the create button, and each tab's own control

- **Area:** Categories
- **Released in:** [v1.6.2 Interface polish](../../releases/v1.6.2_interface_polish/overview.md)
- **Type:** Refactor
- **Traceability:** extends FR-CAT-1 / FR-CAT-4, needs [TICKET-UI-22](../../design-system/tickets/TICKET-UI-22-page-header-contract.md)

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
- **Both subtitles are removed**, per [TICKET-UI-22](../../design-system/tickets/TICKET-UI-22-page-header-contract.md).
- **The rules success alert stays in the body**, under the header — it's a result, not a control.
- **`app-rule-share-bar` moves below the tabs' old position** so the Rules page reads header → alert →
  share bar → filters → table, with nothing between the header and the page's own content but page
  state.
- **`mm-tabs` itself is unchanged** — this is a placement change, not a primitive change.
- The header's action group still wraps, so on a narrow screen the switch, the control and the create
  button fall onto two rows rather than overflowing.

## Acceptance criteria

**Implementation note (2026-08-02):** the as-is section says both pages are "bound to the shared
`CATEGORIES_TABS`" — they are not. `CATEGORIES_TABS` is declared **twice**, once as a private
module constant in each of
[categories-overview.component.ts:38](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.ts)
and [rules-overview.component.ts:34](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.ts),
with identical contents. Left as-is deliberately: this ticket's own criterion is that
`CATEGORIES_TABS` is *unchanged*, and hoisting it into a shared module is a different change from
moving the switch. Worth its own cleanup ticket — the two copies will drift the first time a third
view is added.

- [x] Both routes render `mm-tabs` inside `mm-page-header`'s `[actions]` slot and nowhere else;
      component specs assert one `mm-tabs` in the header and none in the body. ("renders the view
      switch inside the header and nowhere in the body" on both `categories-overview.component.spec.ts`
      and `rules-overview.component.spec.ts` — each counts every `mm-tabs` on the page, asserts exactly
      one, and asserts the header contains it.)
- [x] Header order on both routes is switch · tab-specific control · create; component specs assert DOM
      order. ("orders the header switch · show-archived · create" → `['mm-tabs', 'input',
      'button[Add category]']`; "orders the header switch · re-run rules · create" →
      `['mm-tabs', 'button[Re-run rules]', 'button[Add rule]']`.)
- [x] The switch still highlights the active route and still navigates between `/categories` and
      `/rules`; existing tabs routing specs pass unchanged. ("keeps the switch routing between
      /categories and /rules" asserts the rendered `href`s are `/categories` and `/categories/rules`;
      live, the active tab reads "Categories" on one route and "Rules" on the other. Note the second
      route is `/categories/rules`, not `/rules` as the ticket title has it.)
- [x] "Show archived" still reveals archived categories, and "Re-run rules" still runs the rules engine
      and shows its loading state; existing specs pass unchanged. (Neither control's markup or binding
      changed — only its position within `[actions]`.)
- [x] Neither route renders a subtitle; component specs assert absence. ("renders no subtitle and no
      range control" on both.)
- [x] The rules success alert (`rulesStore.lastRunCount()`) still renders in the body after a run;
      existing spec passes. (The `@if (rulesStore.lastRunCount(); as count)` block is untouched and now
      sits directly under the header.)
- [x] `app-rule-share-bar` renders below the header and above the filters; component spec asserts the
      order. ("renders the share bar below the header and above the filters" — asserts `mm-page-header`
      then `app-rule-share-bar`, and that `app-rule-filters` is not between them. The filters only
      mount once at least one rule exists, hence the relative rather than absolute assertion.)
- [x] `mm-tabs` and `CATEGORIES_TABS` are unchanged; `git diff` touches no file under `shared/ui/tabs/`.
      (`git diff --stat src/app/shared/ui/tabs/` is empty; both `CATEGORIES_TABS` constants are
      byte-identical to before — see the implementation note above.)
- [x] The header wraps rather than overflowing at 375px; component spec asserts the wrap binding.
      ("keeps the action row wrapping at 375px" on both, asserting `flex-wrap` on `div.mm-page-actions`.)
- [x] No persistence changes, no Dexie version bump — `categoryManual` and every rule/category write
      still goes through its store. (Diff is two templates and two specs.)
- [x] `angular.json` bundle budgets not raised. (Untouched; dev build clean.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (Both pre-commit gate commands
      exit 0.)
- [x] Verified live in the browser: both routes open with one header row, switching tabs keeps the switch
      in place, and re-running rules still reports its count. (Dev server on :4210 — `/categories` reads
      `mm-tabs` · toggle · "Add category" with the "Categories" tab active; `/categories/rules` reads
      `mm-tabs` · "Re-run rules" · "Add rule" with "Rules" active; exactly one `mm-tabs` per page, and
      the share bar sits immediately below the header. **The re-run count itself was not re-observed
      live** — the seeded dataset has no rules, so there was nothing to re-run; its existing spec
      covers it and neither its markup nor its handler changed.)

## Notes

- The switch is a **view switch**, which is page-level by the TICKET-UI-22 rule — it reconfigures the
  whole page. That's why it belongs in the header rather than staying a body-level tab strip.
- Deliberately keeps two route components rather than merging them behind one route with a tab: the two
  views have different stores, different tables and different actions, and merging them is a much larger
  change than the report asks for.
- The share bar's move is included because it currently sits between the header and the tabs; once the
  tabs leave, leaving it there would just make it the new second strip.
