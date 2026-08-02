# TICKET-ACC-08 — Accounts header: show archived, add account, and the page's own date range

- **Area:** Accounts
- **Type:** Refactor
- **Traceability:** extends FR-ACC-1 (account management), needs [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md) + [TICKET-UI-23](./TICKET-UI-23-per-page-date-range.md)

## User story

As a user, I want the Accounts page's controls — show archived, add account, and the range its chart is
scoped to — all in the page header, so every page-level option is in the one place I've learned to look.

## Description

Brings `/accounts` onto the header contract: the two controls it already has stay and lose the subtitle
above them, and the date range that used to live in the shell topbar joins them.

## Current situation (as-is)

- [accounts-overview.component.html:1](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.html)
  already renders both controls in `mm-page-header`'s `[actions]` slot: a "Show archived" toggle
  (`showArchived` signal, feeding `visibleAccounts`) and a primary "Add account" button
  (`openAddForm()`).
- It also carries the subtitle `"Every account you track, in one place."`, which
  [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md) removes app-wide.
- **The date range is not on the page**, but the page's chart depends on it: the topbar's `RangeStore`
  drives `computeZoomWindow` in
  [balance-trend-signals.ts](../../../src/app/feature-accounts/balance-trend-signals.ts), which sets the
  balance-history chart's initial zoom window. So the control that scopes this page's only chart lives
  above the page and is shared with the Dashboard.
- The account detail page's own header
  ([accounts-detail.component.html](../../../src/app/feature-accounts/components/accounts-detail/accounts-detail.component.html))
  already holds its five record-level actions (back, edit, archive, clear, delete) and needs only the
  subtitle removal from TICKET-UI-22.

## Desired result (to-be)

- **The header holds three things, left to right:** the "Show archived" toggle, the Accounts page's own
  `mm-range-grouping-switcher` (from [TICKET-UI-23](./TICKET-UI-23-per-page-date-range.md)), and the
  primary "Add account" button — primary action last, matching the Dashboard's settings-last ordering.
- **The subtitle is gone**, per the header contract.
- **The range is this page's**: changing it re-scrubs the balance-history chart's zoom window and nothing
  on any other page.
- **"Show archived" keeps its current scope** — it filters the account *list* only, not the chart. The
  chart plots `activeAccounts()` by design (archived accounts never appear); that behaviour is unchanged
  and is worth a line of comment where the two diverge, since the header now puts the toggle right next
  to the chart's range.
- **Account detail is unchanged apart from the subtitle**, which TICKET-UI-22 removes; the type is
  already visible in the page's balance block. No range control there — its chart plots full history and
  scrubs from the range only via the zoom window, which this ticket does not extend to the detail route.

## Acceptance criteria

- [ ] The Accounts header renders exactly three controls in the stated order; component spec asserts DOM
      order and that no control was left in the page body.
- [ ] No subtitle renders on `/accounts` or `/accounts/:id`; component specs assert absence.
- [ ] "Show archived" still toggles archived accounts into `visibleAccounts()`, and the chart still shows
      only active accounts with the toggle on; component spec asserts both halves.
- [ ] Changing the range from the Accounts header updates the balance-history chart's zoom window;
      component spec asserts the recomputed window reaches `chartOption()`.
- [ ] Changing the range from the Accounts header leaves the Dashboard's range untouched (TICKET-UI-23's
      isolation, asserted here from the Accounts side).
- [ ] "Add account" still opens the account form with no account bound (create mode); existing spec
      passes.
- [ ] The action row wraps rather than overflowing at 375px; component spec asserts the wrap binding.
- [ ] No persistence changes, no Dexie version bump.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: all three controls sit in the header, the range picker moves the
      chart, and the archived toggle still reveals archived cards.

## Notes

- Both existing controls are already in `[actions]`, so most of this ticket is the range control and the
  subtitle. Kept as its own ticket anyway so each page's header lands and is verified independently
  rather than as one sprawling cross-feature diff.
- Interacts with [TICKET-ACC-09](./TICKET-ACC-09-accounts-list-matches-stack-order.md) (the list below the
  header) and [TICKET-ACC-10](./TICKET-ACC-10-day-only-balance-buckets.md) (which removes the chart's
  bucket picker) — three separate changes to the same page, deliberately not merged, since only this one
  touches the header.
