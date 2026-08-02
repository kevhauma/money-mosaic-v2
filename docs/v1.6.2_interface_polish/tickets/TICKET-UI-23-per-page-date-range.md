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

**Implementation notes (2026-08-02):**

1. **Chose the keyed root store**, the second of the two options above, and recorded the reasoning in
   `RangeStore`'s doc comment: `StatsStore` is `providedIn: 'root'` and injects `RangeStore`, and a
   root-provided store cannot see a route-level provider — so one instance per lazy route would have
   forced `StatsStore` (and every root consumer after it) to become route-scoped too. State is
   `{ byPage: Record<RangePageKey, RangeState> }` and every accessor/mutator takes the page it acts on.
2. **The page-side wiring is shared, not duplicated per page.** `all-time` resolution needs the
   account/transaction stores and the URL round trip needs a skip-if-already-mirrored guard, so both
   live in one `pageRangeControl(page)` helper ([page-range-control.ts](../../../src/app/core/state/page-range-control.ts))
   that a page calls from a field initializer, in the same shape as `balanceTrendSignals`.
3. **The switcher is placed on both pages here, not deferred.** This ticket's own browser criterion
   ("set Dashboard to Last year, switch to Accounts…") is unverifiable if no page renders the
   control, and shipping the commit in between would leave the range unreachable.
   [TICKET-STAT-25](./TICKET-STAT-25-dashboard-page-header.md) and
   [TICKET-ACC-08](./TICKET-ACC-08-accounts-page-header.md) still own their headers' ordering and
   their other controls.
4. **Found and fixed a bug the shell's version had latent**: reading `?from=&to=` on entry
   unconditionally demoted a named preset to "Custom", because the page mirrors its own range into
   those same params — so every refresh, back-navigation or bookmark returned showing "Custom". The
   entry read now adopts the URL only when it differs from what the page already holds. The shell
   never hit this because it only ever constructed once, at app start.
5. **The shell's navbar is now `lg:hidden`.** With the switcher gone it holds only the mobile
   hamburger and brand, both already `lg:hidden`, so on desktop it would have been an empty bordered
   strip above every page. `mm-page-header` is the top bar there now.

- [x] `app-shell.component.html` contains no `mm-range-grouping-switcher`, and `AppShellComponent` no
      longer injects `RangeStore` or declares `onPresetChange`/`onCustomRangeChange`/`onRangeShift`;
      component spec asserts the switcher is absent from the shell. (Shell is down to nav + drawer +
      `AppSettingsStore`; `app-shell.component.spec.ts` "renders no range switcher — the range lives
      in each page's own header".)
- [x] Setting a range on `/dashboard` leaves `/accounts`' range untouched and vice versa; unit test over
      the two store instances (or the two page keys) asserting isolation in both directions.
      (`range-state.store.spec.ts` → "RangeStore: one range per page" — "setting the Dashboard range
      leaves the Accounts range untouched", "setting the Accounts range leaves the Dashboard range
      untouched", "shifting one page never shifts the other"; plus `page-range-control.spec.ts`
      "scopes every write to its own page, in both directions".)
- [x] Each range-owning page still defaults to `this-month` on first render; unit test.
      (`range-state.store.spec.ts` "every range-owning page starts on this-month" and
      `page-range-control.spec.ts` "covers every declared range-owning page key", which iterates
      `RangePageKey` so a page added without a default entry fails loudly.)
- [x] `all-time` still resolves through `computeFullHistoryRange` on each page that offers it — the
      preset needs account/transaction data the store can't reach, exactly as today; unit test.
      (`page-range-control.spec.ts` "resolves 'all-time' via the earliest active account/transaction
      date, not a hardcoded date"; `range-state.store.spec.ts` "all-time resolves per page from the
      caller-supplied full-history range".)
- [x] `shiftRange` (previous/next) still shifts by calendar unit or day count per
      `CALENDAR_UNIT_BY_PRESET`/`alignedCalendarUnit`, unchanged; existing `range-state.store.spec.ts`
      cases pass against the new shape. (All ten original cases kept verbatim apart from the page
      argument, including both boundary-drift regressions.)
- [x] A drill-down link carrying `?from=&to=` still lands on the target page with that range applied;
      component spec on the dashboard asserting the query params are read on entry.
      (`page-range-control.spec.ts` "reads ?from=&to= on entry so a drill-down link lands on that
      range", which also asserts the *other* page is untouched by the link; plus the new regression
      case in note 4, "keeps the named preset when re-entered with its own mirrored params".)
- [x] `/transactions`, `/settings`, `/import`, `/categories`, `/learning`, `/help`, `/changelog` render
      no range control anywhere; specs assert absence on Transactions and Categories.
      (`transactions-overview.component.spec.ts` "renders no range switcher anywhere — its filter bar
      already owns dates"; `categories-overview.component.spec.ts` "renders no subtitle and no range
      control". Only `dashboard-overview` and `accounts-overview` import
      `RangeGroupingSwitcherComponent`.)
- [x] No persistence changes, no Dexie version bump. (`RangeStore` is still `withState` only, nothing
      under `core/data-access/` touched.)
- [x] `angular.json` bundle budgets not raised. (Untouched; dev build clean. The shell actually got
      lighter — `RangeGroupingSwitcherComponent` and `computeFullHistoryRange` left the eager path.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (Both pre-commit gate
      commands exit 0. `fallow audit --base HEAD` reports 0 introduced dead code; its two other
      "introduced" rows are attribution artifacts of touching the files — `dup:f6d16225` is the
      pre-existing `deleteConfirm`/`deleteMessage` pair shared by accounts- and categories-overview,
      and `pageRangeControl`'s CRAP 30.0 comes from fallow's assumed-zero coverage on a helper that
      `page-range-control.spec.ts` covers with 9 cases — the exact case the gate's `--max-crap 1000`
      calibration exists for.)
- [x] Verified live in the browser: set Dashboard to "Last year", switch to Accounts — Accounts is still
      on its own range; go back to Dashboard — still "Last year". (Dev server on :4210. Dashboard set
      to "Last quarter" → `/dashboard?from=2026-04-01&to=2026-06-30`; `/accounts` still reads
      "This month" with its own `?from=2026-08-01&to=2026-08-31`; back on `/dashboard` still reads
      "Last quarter", not "Custom".)

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
