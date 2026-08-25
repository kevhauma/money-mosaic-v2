# TICKET-STAT-25 — Dashboard header: a named "Dashboard settings" button, its own date range, net worth stays

- **Area:** Dashboard
- **Released in:** [v1.6.2 Interface polish](../../releases/v1.6.2_interface_polish/overview.md)
- **Type:** Refactor
- **Traceability:** extends FR-STAT-7 / TICKET-STAT-21 (dashboard customize mode), needs [TICKET-UI-22](../../design-system/tickets/TICKET-UI-22-page-header-contract.md) + [TICKET-UI-23](../../design-system/tickets/TICKET-UI-23-per-page-date-range.md)

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
  page-scoped range from [TICKET-UI-23](../../design-system/tickets/TICKET-UI-23-per-page-date-range.md). Changing it re-scopes
  every dashboard panel exactly as the topbar switcher does today, and nothing else in the app.
- **Net worth stays in the header** — `<app-net-worth-header />` keeps its `[actions]` slot, first in
  reading order, since it is the page's headline figure rather than a control.
- **Header order, left to right:** title · net worth · date range · Dashboard settings. Controls before
  the settings button, figure before the controls.
- **The subtitle rule from TICKET-UI-22 costs nothing here** — the Dashboard never had one.
- Customize mode still stays unreachable while the empty state renders (TICKET-STAT-22), and still loads
  its panel lazily off the `customizeMode()` signal.

## Acceptance criteria

- [x] The header renders a button reading **"Dashboard settings"** with the pencil icon; component spec
      asserts the visible text, not just an aria label. (`dashboard-overview.component.spec.ts` →
      "page header (TICKET-STAT-25)" → "names the settings button in visible text, not just an aria
      label", which also asserts the `ariaLabel` is gone so the two can no longer drift.)
- [x] In customize mode the same button reads **"Done"** with the check icon, and clicking it exits;
      component spec asserts both states and the round trip. ("reads 'Done' with a different icon in
      customize mode, and clicking it exits" — clicks in, asserts label + a changed glyph, clicks out,
      asserts the original label and glyph are back. The icon is asserted through the inline svg
      `ng-icon` draws, since this build emits no `ng-reflect-*` attributes.)
- [x] The button is absent while `hasNoTransactions()` is true; existing TICKET-STAT-22 spec still passes.
      (Renamed to "hides the dashboard-settings toggle while the empty state is showing" — it matched on
      the now-deleted `[aria-label="Customize dashboard"]`, so it would have passed vacuously.)
- [x] `mm-range-grouping-switcher` renders inside the Dashboard's `[actions]`, and changing its preset
      re-scopes the page's stats; component spec asserts a preset change reaches the dashboard's range
      state and the stat figures recompute. ("renders the range switcher in the header, and a preset
      change re-scopes the page" drives the real `select`; the existing periodized-sub-label cases
      cover the figures recomputing off `RangeStore`.)
- [x] Changing the Dashboard's range leaves the Accounts page's range untouched — covered by
      TICKET-UI-23's isolation test; assert it here from the Dashboard's side too. (Same spec asserts
      `rangeStore.preset('accounts')` is still `this-month` after the Dashboard moves to `last-year`.)
- [x] ~~`<app-net-worth-header />` is still rendered in the header; component spec asserts it
      survives.~~ **Superseded 2026-08-03 by
      [TICKET-STAT-28](./TICKET-STAT-28-net-worth-stat-card.md)** — net worth is now the first card of
      the stats row and the component is deleted. Was true when ticked; the spec case that proved it
      is now "holds no figures at all — net worth moved into the stats row".
- [x] ~~Header children render in the order title · net worth · range · settings~~ → now **title ·
      range · settings** (TICKET-UI-24 sectioned it, TICKET-STAT-28 removed the figure). The DOM-order
      spec case was updated rather than deleted: "orders the header title · range · settings".
- [x] No persistence changes, no Dexie version bump — customize-mode state and row order are untouched
      (`dashboardLayoutSettings` is not part of this ticket). (Diff is the header template, one
      `computed()` on the component, and its spec.)
- [x] `angular.json` bundle budgets not raised — the customize panel stays behind its `@defer`.
      (`@defer (when customizeMode())` unchanged; dev build reports no budget warnings.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (Both pre-commit gate
      commands exit 0; label/icon resolved on a `computed()` view-model rather than a template
      ternary, per the "templates branch on state, never derive it" convention.)
- [x] Verified live in the browser: the header reads "Dashboard settings" with a working range picker
      beside it; on a narrow screen the action row wraps instead of overflowing. (Dev server on :4210 —
      header reads `h1` · `app-net-worth-header` · `mm-range-grouping-switcher` ·
      `button[Dashboard settings]`; at 375px the bar wraps to three rows with no horizontal overflow.)

## Notes

- Naming: **"Dashboard settings"**, the user's own words, not "Customize" — the panel it opens already
  calls itself the customize panel internally, and the component/file names are deliberately left alone
  so this stays a label change rather than a rename sweep.
- The button label is the only affordance change; the customize panel's contents (drag-to-reorder,
  hide/show rows) are untouched.
- ~~Keeping net worth in the header is a **deliberate exception** to "the header holds controls": it is one
  read-only figure the page is named for, and moving it into the body would push the first stat row below
  the fold on a laptop.~~ **Superseded (2026-08-02) by
  [TICKET-STAT-28](./TICKET-STAT-28-net-worth-stat-card.md)**, on the user's instruction: net worth
  becomes a card *inside* the stats row rather than a block above it, which is what makes the reversal
  safe — the row doesn't move down, it gains a fifth card. This ticket's header-order criterion becomes
  title · date range · Dashboard settings once STAT-28 lands.
