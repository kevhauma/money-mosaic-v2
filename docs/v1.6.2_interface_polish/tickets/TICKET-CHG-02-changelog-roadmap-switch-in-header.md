# TICKET-CHG-02 — The Changelog/Roadmap switch moves into the header

- **Area:** Changelog
- **Type:** Refactor
- **Traceability:** extends TICKET-CHG-01 (changelog page) / TICKET-PUB-05 (roadmap tab), needs [TICKET-UI-24](./TICKET-UI-24-header-start-and-end-action-sections.md)

## User story

As a user, I want the Changelog/Roadmap switch to sit in the page header next to the title, the same
way the Categories/Rules switch does, so switching between what shipped and what's planned works the
same everywhere in the app.

## Description

Brings `/changelog` onto the header contract: its two-view switch moves from a strip below the header
into `[actions-start]`, matching what [TICKET-CAT-09](./TICKET-CAT-09-categories-rules-page-header.md)
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

- [ ] `changelog-page.component.html` renders exactly one `mm-tabs`, inside `mm-page-header`'s
      `[actions-start]` slot and nowhere in the body; component spec asserts both halves.
- [ ] The page title reads `"Changelog"`; component spec asserts the `h1` text.
- [ ] Switching tabs still swaps the rendered list between shipped entries and roadmap entries, and
      the active tab still reflects `selectedTab()`; existing changelog-page specs pass unchanged.
- [ ] The empty message still renders in the body for a view with no entries; existing spec passes.
- [ ] `mm-tabs` is unchanged; `git diff` touches no file under `shared/ui/tabs/`.
- [ ] The header wraps rather than overflowing at 375px; component spec asserts the wrap binding.
- [ ] No persistence changes, no Dexie version bump — `CHANGELOG_ENTRIES` and `ROADMAP_ENTRIES` are
      hand-maintained data files and are not touched.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: the page opens with one header row, and switching to Roadmap keeps
      the switch in place and swaps the list.

## Notes

- **Same shape as TICKET-CAT-09, different mechanism.** Read that ticket's implementation before
  starting: the placement, the `mb-4` removal and the "one `mm-tabs`, in the header" assertions carry
  over directly; the binding does not, since this switch is selection-driven rather than route-driven.
- The title change is the part worth a second look — if "Changelog" alone reads as though the Roadmap
  has been removed, keeping `"Changelog & Roadmap"` is a reasonable call to make while building. Say
  so on the ticket rather than leaving both options open.
