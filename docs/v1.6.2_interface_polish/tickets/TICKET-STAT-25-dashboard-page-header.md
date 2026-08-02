# TICKET-STAT-25 — Dashboard header: a named "Dashboard settings" button, its own date range, net worth stays

- **Area:** Dashboard
- **Type:** Refactor
- **Traceability:** extends FR-STAT-7 / TICKET-STAT-21 (dashboard customize mode), needs [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md) + [TICKET-UI-23](./TICKET-UI-23-per-page-date-range.md)

## User story

As a user, I want the Dashboard's header to hold a clearly labelled "Dashboard settings" button and the
Dashboard's own date range, so I can tell what the pencil icon does without clicking it, and so the range
I pick here belongs to this page.

## Description

Fills in the Dashboard's half of the per-page header contract: the bare pencil icon becomes a labelled
button, the date range moves in from the shell topbar (and stops following the user to other pages), and
the net-worth figure stays where it is.

## Current situation (as-is)

- [dashboard-overview.component.html](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html)
  renders `<mm-page-header title="Dashboard">` with two things in it:
  - a **`title-adornment` icon-only button** — `shape="circle"`, `variant="ghost"`, no visible label,
    toggling between `tablerPencil` and `tablerCheck`. Its only naming is the `ariaLabel`
    (`"Customize dashboard"` / `"Done customizing dashboard"`), so a sighted user gets a bare pencil.
  - an `actions` div holding `<app-net-worth-header />`.
- Clicking it flips `customizeMode()`, which swaps the whole row list for
  `<app-dashboard-customize-panel />` (lazily `@defer (when customizeMode())`). It is hidden entirely
  while the empty state shows (TICKET-STAT-22).
- **The date range is not on the page at all** — it lives in the shell topbar
  ([app-shell.component.html](../../../src/app/core/layout/app-shell/app-shell.component.html)) and is
  shared with every other page via the root `RangeStore`.

## Desired result (to-be)

- **The pencil becomes a labelled control: "Dashboard settings"** — an `[actions]` button with icon +
  text, not a bare `title-adornment` circle. In customize mode it reads "Done" and keeps the check icon,
  so the toggle is still obvious. The `ariaLabel` is dropped in favour of the visible label being the
  accessible name.
- **The Dashboard's own `mm-range-grouping-switcher` renders in `[actions]`**, bound to the Dashboard's
  page-scoped range from [TICKET-UI-23](./TICKET-UI-23-per-page-date-range.md). Changing it re-scopes
  every dashboard panel exactly as the topbar switcher does today, and nothing else in the app.
- **Net worth stays in the header** — `<app-net-worth-header />` keeps its `[actions]` slot, first in
  reading order, since it is the page's headline figure rather than a control.
- **Header order, left to right:** title · net worth · date range · Dashboard settings. Controls before
  the settings button, figure before the controls.
- **The subtitle rule from TICKET-UI-22 costs nothing here** — the Dashboard never had one.
- Customize mode still stays unreachable while the empty state renders (TICKET-STAT-22), and still loads
  its panel lazily off the `customizeMode()` signal.

## Acceptance criteria

- [ ] The header renders a button reading **"Dashboard settings"** with the pencil icon; component spec
      asserts the visible text, not just an aria label.
- [ ] In customize mode the same button reads **"Done"** with the check icon, and clicking it exits;
      component spec asserts both states and the round trip.
- [ ] The button is absent while `hasNoTransactions()` is true; existing TICKET-STAT-22 spec still passes.
- [ ] `mm-range-grouping-switcher` renders inside the Dashboard's `[actions]`, and changing its preset
      re-scopes the page's stats; component spec asserts a preset change reaches the dashboard's range
      state and the stat figures recompute.
- [ ] Changing the Dashboard's range leaves the Accounts page's range untouched — covered by
      TICKET-UI-23's isolation test; assert it here from the Dashboard's side too.
- [ ] `<app-net-worth-header />` is still rendered in the header; component spec asserts it survives.
- [ ] Header children render in the order title · net worth · range · settings; component spec asserts
      the DOM order.
- [ ] No persistence changes, no Dexie version bump — customize-mode state and row order are untouched
      (`dashboardLayoutSettings` is not part of this ticket).
- [ ] `angular.json` bundle budgets not raised — the customize panel stays behind its `@defer`.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: the header reads "Dashboard settings" with a working range picker
      beside it; on a narrow screen the action row wraps instead of overflowing.

## Notes

- Naming: **"Dashboard settings"**, the user's own words, not "Customize" — the panel it opens already
  calls itself the customize panel internally, and the component/file names are deliberately left alone
  so this stays a label change rather than a rename sweep.
- The button label is the only affordance change; the customize panel's contents (drag-to-reorder,
  hide/show rows) are untouched.
- Keeping net worth in the header is a **deliberate exception** to "the header holds controls": it is one
  read-only figure the page is named for, and moving it into the body would push the first stat row below
  the fold on a laptop.
