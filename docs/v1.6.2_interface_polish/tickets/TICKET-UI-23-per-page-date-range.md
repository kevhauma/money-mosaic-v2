# TICKET-UI-23 — The date range moves into the page header, and stops following you between pages

- **Area:** Shared UI / App shell
- **Type:** Refactor
- **Traceability:** revises FR-STAT-7 (global date range), needs [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md)

## User story

As a user, I want each page's date range to sit in that page's own header and to stay where I left it for
that page, so narrowing the Dashboard to last month doesn't silently re-scope the Accounts chart I set up
five minutes ago.

## Description

Takes the range switcher out of the shell's topbar and gives it to the pages that actually use a date
range, one instance each, in the header slot [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md)
defines. Each page keeps its own range for the session, so the pages stop overwriting each other.

## Current situation (as-is)

- The switcher lives in the **shell topbar**, above every page:
  [app-shell.component.html](../../../src/app/core/layout/app-shell/app-shell.component.html) renders
  `<mm-range-grouping-switcher>` in the `navbar`, wired in
  [app-shell.component.ts](../../../src/app/core/layout/app-shell/app-shell.component.ts) to a single
  `providedIn: 'root'` [RangeStore](../../../src/app/core/state/range-state.store.ts).
- **One store, one range, every page.** `RangeStore` holds `{ preset, from, to }` for the whole app.
  Its consumers: the dashboard's stats and every dashboard panel, the accounts balance charts (via
  `computeZoomWindow` in [balance-trend-signals.ts](../../../src/app/feature-accounts/balance-trend-signals.ts)),
  and the initial granularity guess (`pickGranularityForSpan`) on each chart. Changing the range on the
  Dashboard therefore re-scrubs the Accounts charts' zoom windows too.
- The shell also **mirrors the range into the URL** (`?from=&to=`, `STAT_QUERY_PARAMS`) with
  `replaceUrl: true`, and reads it back on construction — so the range is also carried across navigations
  through the query string.
- `/income` is the one page that already opts out: it reads `IncomeStore.incomeRange()` (full history
  clamped to the career start) and deliberately ignores the topbar range —
  documented in [income-overview.component.ts](../../../src/app/feature-income/components/income-overview/income-overview.component.ts).
- `/transactions` has its **own** date-range inputs inside its filter bar
  ([transaction-filters.component.html](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.html)),
  seeded from the URL params on drill-down — so the topbar switcher sitting above it is a second,
  unrelated date control on the same screen.

## Desired result (to-be)

- **The topbar loses the switcher.** The shell navbar keeps the mobile menu button and brand only;
  `AppShellComponent` stops injecting `RangeStore` and stops owning the preset/custom/shift handlers.
- **`RangeStore` becomes per-page state, keyed by page.** One store instance per range-owning page,
  each with its own `{ preset, from, to }`, all defaulting to `this-month` exactly as today. Choose
  whichever of these fits the codebase's grain when building, and record the choice in the store's
  doc comment:
  - a `RangeStore` **provided at the route level** (one instance per lazy route), or
  - a single root store holding a `Record<pageKey, RangeState>` with a `pageKey` input.
  Either way, the observable behaviour is the contract: **changing the range on one page never changes
  another page's**.
- **Only the pages that use a range render one**, in their `[actions]` slot: `/dashboard`
  ([TICKET-STAT-25](./TICKET-STAT-25-dashboard-page-header.md)) and `/accounts`
  ([TICKET-ACC-08](./TICKET-ACC-08-accounts-page-header.md)). `/transactions` does **not** — its filter
  bar already owns dates. `/income` does not (it has its own career-start range). Every other page has
  no date-scoped content and renders no range control at all.
- **Ranges are session state, not persisted** — same as today, `RangeStore` is not Dexie-backed and
  resets to `this-month` on reload. Surviving a bucket change or a chart interaction *within* the
  session is [TICKET-STAT-27](./TICKET-STAT-27-session-persistent-chart-options.md)'s job.
- **URL mirroring survives, scoped to the page that owns the range.** Drill-down links
  (`buildTransactionDrilldownParams`, `STAT_QUERY_PARAMS`) keep working unchanged: a page that owns a
  range still reads `?from=&to=` on entry and still mirrors its own range back with `replaceUrl: true`.
  A page with no range neither reads nor writes those params.

## Acceptance criteria

- [ ] `app-shell.component.html` contains no `mm-range-grouping-switcher`, and `AppShellComponent` no
      longer injects `RangeStore` or declares `onPresetChange`/`onCustomRangeChange`/`onRangeShift`;
      component spec asserts the switcher is absent from the shell.
- [ ] Setting a range on `/dashboard` leaves `/accounts`' range untouched and vice versa; unit test over
      the two store instances (or the two page keys) asserting isolation in both directions.
- [ ] Each range-owning page still defaults to `this-month` on first render; unit test.
- [ ] `all-time` still resolves through `computeFullHistoryRange` on each page that offers it — the
      preset needs account/transaction data the store can't reach, exactly as today; unit test.
- [ ] `shiftRange` (previous/next) still shifts by calendar unit or day count per
      `CALENDAR_UNIT_BY_PRESET`/`alignedCalendarUnit`, unchanged; existing `range-state.store.spec.ts`
      cases pass against the new shape.
- [ ] A drill-down link carrying `?from=&to=` still lands on the target page with that range applied;
      component spec on the dashboard asserting the query params are read on entry.
- [ ] `/transactions`, `/settings`, `/import`, `/categories`, `/learning`, `/help`, `/changelog` render
      no range control anywhere; specs assert absence on Transactions and Categories.
- [ ] No persistence changes, no Dexie version bump.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: set Dashboard to "Last year", switch to Accounts — Accounts is still
      on its own range; go back to Dashboard — still "Last year".

## Notes

- This is the ticket that makes the Dashboard's and Accounts' headers worth having; both per-page header
  tickets assume the range control is available to place.
- **Per-page, not per-chart.** A page's charts still share that page's one range (and each chart still
  owns its own bucket size, TICKET-STAT-15). The complaint is cross-*page* bleed, not cross-chart.
- The `RangeStore` doc comment currently claims it is "the single source of truth read by the topbar
  switcher and every range-scoped Dashboard/Accounts stat" — that sentence is the thing this ticket
  invalidates, so rewrite it rather than leaving it to mislead the next reader.
- Deliberately **not** persisted to Dexie. A date range is a "what am I looking at right now" choice;
  restoring last week's custom range on a fresh open would be its own decision, and a separate ticket.
