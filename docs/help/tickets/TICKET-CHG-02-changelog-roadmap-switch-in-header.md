# TICKET-CHG-02 — The Changelog/Roadmap switch moves into the header

- **Area:** Changelog
- **Released in:** [v1.6.2 Interface polish](../../releases/v1.6.2_interface_polish/overview.md)
- **Type:** Refactor
- **Traceability:** extends TICKET-CHG-01 (changelog page) / TICKET-PUB-05 (roadmap tab), needs [TICKET-UI-24](../../design-system/tickets/TICKET-UI-24-header-start-and-end-action-sections.md)

## User story

As a user, I want the Changelog/Roadmap switch to sit in the page header next to the title, the same
way the Categories/Rules switch does, so switching between what shipped and what's planned works the
same everywhere in the app.

## Description

Brings `/changelog` onto the header contract: its two-view switch moves from a strip below the header
into `[actions-start]`, matching what [TICKET-CAT-09](../../categories/tickets/TICKET-CAT-09-categories-rules-page-header.md)
did for Categories/Rules.

## Current situation (as-is)

- [changelog-page.component.html](../../../src/app/feature-changelog/components/changelog-page/changelog-page.component.html)
  renders a bare `<mm-page-header title="Changelog & Roadmap" />` with **no actions at all**, then an
  `<mm-tabs [tabs]="tabs" [selected]="selectedTab()" (selectedChange)="onTabChange($event)" class="mb-4" />`
  strip immediately below it, then the grouped entry list.
- So the page is title · switch · content — two rows of chrome before anything, which is exactly the
  shape TICKET-CAT-09 removed from `/categories` and `/rules`.
- **This switch is not the route-driven one.** `/categories`↔`/rules` are two routes and their tabs
  are `routerLink`s owning their own active state; `/changelog` is a single route whose tabs are the
  **selection-driven** mode of the same primitive
  ([tabs.component.ts](../../../src/app/shared/ui/tabs/tabs.component.ts)) — `[selected]` in,
  `(selectedChange)` out, with the component holding the state. Both modes exist; only the binding
  differs.
- The page title itself, `"Changelog & Roadmap"`, names both views because neither is in the header —
  it is doing the switch's job in prose.

## Desired result (to-be)

- **The switch moves into `[actions-start]`**, leftmost after the title, keeping its
  selection-driven binding and its current `variant` exactly as-is, and losing the `mb-4` that only
  made sense below the header.
- **The title becomes just `"Changelog"`** — with the switch beside it naming both views, the
  `"& Roadmap"` half is the switch's job. The active tab tells the user which view they are in.
- **`mm-tabs` is unchanged** — a placement and binding-site change, not a primitive change. In
  particular the selection-driven mode is not converted to routes: `/changelog` staying one route is
  what keeps the tab state ephemeral and the deep link simple.
- **Nothing else on the page moves.** The empty-message line and the grouped entry list stay in the
  body, under the header.
- **The header still wraps** at 375px, dropping the switch under the title rather than overflowing.

## Acceptance criteria

- [x] `changelog-page.component.html` renders exactly one `mm-tabs`, inside `mm-page-header`'s
      `[actions-start]` slot and nowhere in the body; component spec asserts both halves.
      (Spec case "renders exactly one mm-tabs, in the header's start group and nowhere in the body"
      asserts the count, that `.mm-page-actions-start` contains it, and that `.mm-page-actions` does
      not.)
- [x] The page title reads `"Changelog"`; component spec asserts the `h1` text.
      (Spec case 'titles the page "Changelog" — the switch beside it names both views now'. The
      ticket's Notes asked for a call on this: kept as `"Changelog"`. The switch sits beside the
      title with "Roadmap" as a visible tab, so the view is never hidden — the same reading
      `/categories` has had since TICKET-CAT-09.)
- [x] Switching tabs still swaps the rendered list between shipped entries and roadmap entries, and
      the active tab still reflects `selectedTab()`; existing changelog-page specs pass unchanged.
      (The four pre-existing cases are untouched and green; live on :4210, clicking "Roadmap" moves
      `tab-active` to it and swaps the first group heading from `2026-08-03` to `Interface Polish`.)
- [x] The empty message still renders in the body for a view with no entries; existing spec passes.
      (Both `shows an empty-state message when there are no …` cases untouched and passing.)
- [x] `mm-tabs` is unchanged; `git diff` touches no file under `shared/ui/tabs/`.
      (`git diff --name-only src/app/shared/ui/tabs/` → 0 files.)
- [x] The header wraps rather than overflowing at 375px; component spec asserts the wrap binding.
      (Spec case "keeps the header wrapping at 375px" asserts `flex-wrap` on both groups; live at
      375px the bar's `scrollWidth - clientWidth` is 0.)
- [x] No persistence changes, no Dexie version bump — `CHANGELOG_ENTRIES` and `ROADMAP_ENTRIES` are
      hand-maintained data files and are not touched.
      (The refactor itself touches neither; the separate `work-ticket` Step 6.5 bookkeeping does —
      one new `CHANGELOG_ENTRIES` row for this ticket and the removal of its own `ROADMAP_ENTRIES`
      row, which is the shipping ritual rather than a change this refactor needed.)
- [x] `angular.json` bundle budgets not raised.
      (Untouched; dev build reported no budget warnings.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill.
      (`fallow audit --base HEAD` → verdict `pass`, 0 introduced findings; `ng lint` + `ng test`
      (2178 tests) + dev build all green.)
- [x] Verified live in the browser: the page opens with one header row, and switching to Roadmap keeps
      the switch in place and swaps the list.
      (:4210 at 1280px — `h1` "Changelog" at x=272/y=17 and the switch at x=396/y=12, one row, one
      `mm-tabs` on the page. After clicking "Roadmap" the switch is at the same x/y and still inside
      `.mm-page-actions-start`, and the list becomes the roadmap groups. No console errors.)

## Notes

- **Same shape as TICKET-CAT-09, different mechanism.** Read that ticket's implementation before
  starting: the placement, the `mb-4` removal and the "one `mm-tabs`, in the header" assertions carry
  over directly; the binding does not, since this switch is selection-driven rather than route-driven.
- The title change is the part worth a second look — if "Changelog" alone reads as though the Roadmap
  has been removed, keeping `"Changelog & Roadmap"` is a reasonable call to make while building. Say
  so on the ticket rather than leaving both options open.
