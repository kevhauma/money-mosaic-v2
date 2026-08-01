# TICKET-INC-17 — Income events sidebar, grouped by year

- **Area:** Income
- **Type:** Refactor
- **Traceability:** revises FR-INC-8 / FR-INC-9 presentation, adds FR-INC-14 (new)

## User story

As a user, I want the Income page's dismissable alerts replaced by a chronological "Events" sidebar —
grouped by year, listing the raises, pay cuts, bonuses and streams that went quiet — so my income history
reads as a story I can scroll back through instead of a stack of notices I clear away and never see again.

## Description

Turns the two banner-style notice strips at the top of the Income page into one persistent vertical
timeline beside the charts. Same detections, but nothing is dismissable and nothing is limited to what is
recent: every notable change is listed under its year, newest first, and a recorded bonus month joins the
raises and lost streams as an event in its own right.

## Current situation (as-is)

- [income-step-changes.component.ts](../../../src/app/feature-income/components/income-step-changes/income-step-changes.component.ts)
  renders `detectIncomeStepChanges()` (FR-INC-8) as a stack of `mm-alert` banners above the trend chart,
  each with a dismiss button. Dismissal is a per-visit `signal<ReadonlySet<string>>` — the component's own
  doc calls it out as deliberately unpersisted, so a raise the user clears is simply gone until reload.
- [income-gap-warnings.component.ts](../../../src/app/feature-income/components/income-gap-warnings/income-gap-warnings.component.ts)
  renders `detectIncomeGaps()` (FR-INC-9) as a second, non-dismissable banner stack directly beneath it.
- Both are mounted at the top of
  [income-overview.component.html](../../../src/app/feature-income/components/income-overview/income-overview.component.html),
  above "Income by month", pushing the charts down whenever there's anything to say.
- `SalaryMetadata.bonus` (FR-INC-10) is recorded per month but never surfaced as a *moment* anywhere — only
  as an adjustment inside the take-home ratio.
- Both detections already carry the bucket they happened in (`changedAtBucketKey`, `lastSeenBucketKey`), so
  the chronological ordering this needs is already in the data.
- The salary-details table established this page's ordering convention: months newest-first within
  year sections that are themselves newest-first.

## Desired result (to-be)

- New pure helper `collectIncomeEvents(...)` in `core/stats/income-events.ts`, returning a single sorted
  `IncomeEvent[]`, each `{ kind, bucketKey, categoryId?, message-bearing fields… }`, from three sources:
  1. `detectIncomeStepChanges()` → `kind: 'raise' | 'pay-cut'` (the existing `direction` split).
  2. `detectIncomeGaps()` → `kind: 'stream-stopped'`.
  3. Months with a recorded `SalaryMetadata.bonus` → `kind: 'bonus'`, carrying the amount.
  Sorted by `bucketKey` descending, ties broken by a fixed `kind` order so the list is deterministic.
- New `groupIncomeEventsByYear(events)` → `{ year: string; events: IncomeEvent[] }[]`, years descending,
  events within a year descending — matching the salary-details table's ordering exactly.
- New `IncomeEventsSidebarComponent`: a vertical timeline rendering each year as a section heading with its
  events beneath, each event an icon + one line of copy + its month. Copy comes from the existing pure
  builders (`buildStepChangeCallout`, `buildGapWarning`) moved/adapted into the sidebar's own view-model
  builder, so all amounts keep going through `formatCurrency()` and all dates through `formatDate()`.
- **Nothing is dismissable.** The `dismissed` signal and the dismiss button are deleted — an event log the
  user can delete entries from is not a log. `IncomeStepChangesComponent` and `IncomeGapWarningsComponent`
  and their folders are removed; their specs' assertions move onto the sidebar's spec.
- Layout: the Income page becomes two columns from `lg:` — charts in the main column, the sidebar beside
  them (its own scroll region, so a long history doesn't stretch the page) — and stacks below the charts on
  narrower screens. Above the fold on wide screens; never pushing the charts down.
- Empty state: a short "No notable changes detected yet" line rather than an empty rail — the sidebar always
  occupies its slot so the layout doesn't reflow when data arrives.
- Sources keep their existing series discipline: step changes off `IncomeStore.incomeTrend()` (smoothed),
  gaps off `rawIncomeTrend()` (unsmoothed — display smoothing must not paint over a genuine silence), and
  bonuses straight off `salaryMetadataByMonth()`.

## Acceptance criteria

> **Implementation note, 2026-08-01.** `collectIncomeEvents()` takes the already-**detected**
> `IncomeStepChange[]`/`IncomeGap[]` rather than the series, so each source keeps the series
> discipline its own requirement demands (smoothed for step changes, raw for gaps) at the call site
> where that choice is documented, and `core/stats/income-events.ts` stays a pure merge with no
> opinion about detection. The copy builders moved to `feature-income/income-event-vm.ts` — a
> feature-root module, per the convention that vocabulary a component doesn't solely own doesn't
> live in a component file.

- [x] `collectIncomeEvents()` merges all three sources into one list sorted newest-first, with a
      deterministic tie-break for two events in the same month; unit test over a fixture carrying a raise,
      a pay cut, a stopped stream and a bonus, two of them in the same month. (`core/stats/income-events.ts`;
      `income-events.spec.ts` → "merges all three sources into one list, newest first" and "breaks a tie
      between two events in the same month deterministically" — three events in one month, ordered
      raise → stream-stopped → bonus by `KIND_ORDER`.)
- [x] A recorded `SalaryMetadata.bonus` produces a `bonus` event carrying its amount; a `SalaryMetadata` row
      with a `grossWage` but no `bonus` produces none; unit test both. (Specs "turns a recorded bonus into
      an event carrying its amount", "makes no event from a salary row that records a gross wage but no
      bonus", "makes no event from a bonus of zero — a recorded nothing is not a moment"; plus the
      component-level "makes no event from a salary row with a gross wage but no bonus".)
- [x] `groupIncomeEventsByYear()` returns years descending with events descending inside each, and omits
      years with no events; unit test across a three-year fixture including an empty year. (Specs "returns
      years descending, with events descending inside each" and "omits a year with no events rather than
      rendering an empty heading" — 2025 sits between two populated years and contributes nothing.)
- [x] Step changes are read from the smoothed series and gaps from the raw one — a regression test asserting
      a flagged annual-lump-sum category still can't produce a raise event, and smoothing still can't erase
      a gap event. (Sidebar specs "reads step changes from the smoothed series, so a flagged lump sum is not
      a raise (FR-INC-4)" and "reads gaps from the raw series, so smoothing cannot paint over a real silence
      (FR-INC-4)" — the latter asserting exactly one event survives: the silence, not the pay cut.)
- [x] The sidebar renders one section per year with a visible year heading and one row per event, each row
      naming the category, the change and its month; component spec asserts the rendered order. (Specs
      "groups events under a heading per year, newest first" (`['2026', '2025']`), "names the category, the
      size of the move and the month it happened", "states a decrease as a drop rather than an increase",
      "lists a stream that has gone quiet, with how long it has been missing".)
- [x] No dismiss control exists anywhere on the Income page, and no dismissal state is held — component spec
      asserts the button is gone; `IncomeStepChangesComponent`/`IncomeGapWarningsComponent` no longer exist
      in the component tree or the barrel. (Both folders deleted via `git rm`; `components/index.ts` and
      `income-overview.component.ts`'s `imports` no longer name them, and `grep` over `src/` finds no
      remaining reference. Spec "has no dismiss control anywhere — an event log you can clear is not a log"
      asserts no `<button>` and no "Dismiss" text while events are rendered.)
- [x] Empty state renders when there are no events, and the sidebar still occupies its layout slot. (Spec
      "says so, and still occupies its slot, when there is nothing to report" — asserts the `mm-paper` is
      still present alongside the empty-state copy.)
- [x] Amounts go through `formatCurrency()` and dates through `formatDate()` (settings-driven since
      TICKET-SET-03/04) — no hardcoded `€` or `en-US` month name; unit test under a non-default locale.
      (`income-event-vm.spec.ts` → "follows the currency and locale settings rather than printing a euro
      sign", asserting `$2,500.00` and an `en-GB` date of `01/03/2026` where `en-US` would print
      `03/01/2026`.)
- [x] The sidebar is keyboard-reachable and announced as a landmark/list (an `<ol>` inside a labelled
      region), and the timeline's decorative icons are `aria-hidden`. (Specs "is announced as a labelled
      region holding an ordered list" — resolving `aria-labelledby` to the "Events" heading — and "hides
      its decorative icons from assistive tech". Nothing in the rail is focusable, so there is no keyboard
      trap and no tab stop to manage; the region is reachable via landmark/heading navigation.)
- [x] Responsive: two columns from `lg:`, stacked below the charts under it; the charts are not pushed down
      by events on wide screens. (`income-overview.component.html`'s
      `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]`, with the rail second in the DOM so it stacks
      *below* the charts on narrow screens; spec "scrolls independently of the charts rather than
      stretching the page" covers the rail's own `overflow-y-auto` region.)
- [x] No persistence changes — every event is re-derived on read, no new `AppSettings` field, no Dexie
      version bump. (`git diff` touches no `app-db.ts` and no repository; the sidebar holds no state at all
      — the `dismissed` signal is gone with the component that had it.)
- [x] `angular.json` bundle budgets not raised (net negative: two components removed, one added).
      (`git diff` touches no `angular.json`; `ng build --configuration development` completes with no
      budget warning.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD` →
      `verdict: pass`, every `*_introduced` counter at 0 and no unused exports left behind by the two
      deleted components. Conventions: pure merge in `core/stats`, view-model builders in a feature-root
      `.ts` module, one folder per component, all amounts/dates through the settings-driven formatters.)
- [x] **Added while building** — the "Net vs gross" 2×2 grid still breathes beside the rail, per this
      ticket's own last Note: its grid became a **container** query (`@container` + `@2xl:grid-cols-2`)
      rather than a viewport one, so it drops to a single column whenever the charts column is narrow
      instead of guessing from the window width. (`income-gross-net-section.component.html`; section spec
      "is one column when its column is narrow and two when it is wide".)
- [ ] Verified live in the browser: the sidebar lists real raises/bonuses under their year headings, scrolls
      independently of the charts, and stacks sensibly on a narrow window. — **skipped at the user's
      request** ("skip the browser check"), not verified.

## Notes

- Dropping dismissal is the point of the ticket, not a side effect: the current design assumes these are
  notifications to clear, but the user reads them as history. An event that can be cleared is one the user
  can't go back to when they're trying to remember when a raise landed.
- Deliberately still **derived**, never stored: no `dismissed` table, no event log written at detection
  time. Re-deriving means correcting a mis-categorised transaction corrects the timeline too, which a
  stored log would not.
- Extensible by design — career start (FR-INC-12) and a stream *resuming* are natural fourth and fifth
  `kind`s, but out of scope here; the union and the icon map are the only places they'd need adding.
- Interacts with TICKET-INC-16: both add page real estate. If both land, the charts column holds the trend
  chart and the "Net vs gross" 2×2 section, with the events rail beside all of them — worth checking that
  a 2×2 grid inside a two-column page still breathes at `lg:`, and dropping the grid to one column there if
  it doesn't.
