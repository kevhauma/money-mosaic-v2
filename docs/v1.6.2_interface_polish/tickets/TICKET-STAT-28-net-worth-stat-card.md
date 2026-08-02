# TICKET-STAT-28 — Net worth becomes a stat card on the Dashboard itself

- **Area:** Dashboard
- **Type:** Refactor
- **Traceability:** revises [TICKET-STAT-25](./TICKET-STAT-25-dashboard-page-header.md) (net worth in the header) / FR-STAT-1, extends TICKET-STAT-14 (customizable rows)

## User story

As a user, I want net worth to sit with the Dashboard's other headline figures rather than in the page
header, so the numbers I compare against each other are read in one place and the header holds only
controls.

## Description

Moves the net-worth figure out of the Dashboard header and into the stats row as a fifth
`mm-stat-card`, alongside Income, Expense, Net cash flow and Savings rate.

## Current situation (as-is)

- [dashboard-overview.component.html](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html)
  renders `<app-net-worth-header />` in the header's `[actions]` slot, first in reading order
  (TICKET-STAT-25).
- [net-worth-header.component.html](../../../src/app/feature-dashboard/components/net-worth-header/net-worth-header.component.html)
  is a bespoke hero surface — its own `rounded-box border border-primary/30 bg-primary/10` panel, a
  `variant="label"` caption, a `variant="display"` figure and the app's only `mm-blob` decorative
  wash — with a skeleton fallback gated on `accountsStore.dataReady()`. It is a one-off, not an
  `mm-stat-card`.
- **The stats row is four cards**, each a `mm-stat-card` with `label` / `value` / `subLabel`, a
  `link`+`queryParams` drill-down into `/transactions`, and an alternating `tilt`. It renders under
  `@case ('stats')` in the customizable row switch, gated on `statsStore.dataReady()`.
- **The two figures are scoped differently, and that is the point.** Every stat card is range-scoped
  (`RangeStore`, now per page); net worth is point-in-time, deliberately not range-scoped (FR-STAT-1)
  — which is exactly why TICKET-STAT-25 kept it out of the row and in the header.
- **Net worth currently survives the empty state.** The header renders outside the
  `@if (hasNoTransactions())` branch, so a user with no transactions still sees a net-worth figure
  (their opening balances); the stats row does not render at all in that branch.

## Desired result (to-be)

- **Net worth renders as a fifth `mm-stat-card` in the stats row**, first in the row, before Income —
  it is the headline figure the others explain.
- **It is visibly marked as not range-scoped**, since sitting in a row of range-scoped figures is
  otherwise misleading. Use the card's existing `subLabel` (e.g. "today", "all accounts") and/or its
  `tooltip` rather than inventing a new input — a fifth card that silently answers a different
  question than its four neighbours is worse than the header placement it replaces.
- **It drills down to `/accounts`, not `/transactions`.** The other four cards filter a transaction
  list; net worth is a balance across accounts, and `/accounts` is where that breaks down.
- **`<app-net-worth-header />` is removed from the header**, and `NetWorthHeaderComponent` is deleted
  once nothing renders it — its hero styling does not survive the move, since the row's whole point is
  that its cards look alike. **The `mm-blob` wash it carried is the app's only one**; confirm with the
  themes that define `--mm-blob-bg` whether it should move onto the net-worth card or be dropped, and
  record which.
- **The empty state keeps a net-worth figure, or deliberately does not.** Decide while building: today
  a user with only opening balances sees one, and after this move they would not. Either surface it in
  the empty-state branch too or state on this ticket that losing it is intended.
- **The row stays one customizable unit.** Net worth joins the existing `'stats'` row rather than
  becoming a sixth hideable row — `dashboardLayoutSettings` and the row order are untouched.

## Acceptance criteria

- [ ] The stats row renders five `mm-stat-card`s in the order net worth · Income · Expense · Net cash
      flow · Savings rate; component spec asserts the labels in DOM order.
- [ ] The net-worth card shows the same figure `AccountsStore.netWorth()` produced in the header,
      formatted through `formatCurrency`/`signedAmount` as before; component spec asserts the rendered
      text for a seeded set of accounts.
- [ ] The card states that it is not range-scoped; component spec asserts the sub-label or tooltip
      text, and a second case asserts that changing the Dashboard's date range moves the other four
      cards but **not** this one.
- [ ] The card links to `/accounts`; component spec asserts the `href`.
- [ ] `<app-net-worth-header />` no longer renders anywhere, and `NetWorthHeaderComponent` plus its
      spec are deleted; `grep` for `app-net-worth-header` is clean and `fallow` reports no unused file
      left behind.
- [ ] The header's remaining order is title · date range · Dashboard settings; the TICKET-STAT-25
      order spec is updated to match rather than deleted.
- [ ] The `mm-blob` decision is implemented and recorded — either the wash moves onto the net-worth
      card or it is dropped, with the reason in a comment; no theme is left referencing a hook nothing
      renders.
- [ ] The empty-state decision is implemented and recorded on this ticket, either way.
- [ ] The stats row still shows its loading skeleton until `statsStore.dataReady()`, and the net-worth
      card its own until `accountsStore.dataReady()` — the two are separate gates and the card must not
      show a zero while accounts are still loading; component spec covers both.
- [ ] Hiding the `'stats'` row in customize mode still hides all five cards; existing TICKET-STAT-14
      spec passes.
- [ ] No persistence changes, no Dexie version bump — `dashboardLayoutSettings` and the row order are
      untouched.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: net worth reads the same figure it did in the header, sits first in
      the stats row, and does not change when the date range does.

## Notes

- **This reverses TICKET-STAT-25's deliberate exception**, on the user's own instruction. That ticket
  kept net worth in the header because "moving it into the body would push the first stat row below
  the fold on a laptop" — putting it *inside* that row rather than above it is what makes the reversal
  safe, and STAT-25's note should be struck through and pointed here rather than left to contradict
  this ticket.
- **The scoping mismatch is the real design risk**, not the markup. Four range-scoped figures and one
  point-in-time figure in one row invites "why didn't net worth change when I picked last year?" —
  which is why the sub-label/tooltip is an acceptance criterion rather than a nicety.
- Interacts with [TICKET-UI-24](./TICKET-UI-24-header-start-and-end-action-sections.md), which moves
  the Dashboard's date range into `[actions-start]`: after both, the header is title · range ‖
  Dashboard settings. Independent of it — either order works.
