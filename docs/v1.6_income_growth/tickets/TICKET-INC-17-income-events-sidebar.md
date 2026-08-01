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

- [ ] `collectIncomeEvents()` merges all three sources into one list sorted newest-first, with a
      deterministic tie-break for two events in the same month; unit test over a fixture carrying a raise,
      a pay cut, a stopped stream and a bonus, two of them in the same month.
- [ ] A recorded `SalaryMetadata.bonus` produces a `bonus` event carrying its amount; a `SalaryMetadata` row
      with a `grossWage` but no `bonus` produces none; unit test both.
- [ ] `groupIncomeEventsByYear()` returns years descending with events descending inside each, and omits
      years with no events; unit test across a three-year fixture including an empty year.
- [ ] Step changes are read from the smoothed series and gaps from the raw one — a regression test asserting
      a flagged annual-lump-sum category still can't produce a raise event, and smoothing still can't erase
      a gap event.
- [ ] The sidebar renders one section per year with a visible year heading and one row per event, each row
      naming the category, the change and its month; component spec asserts the rendered order.
- [ ] No dismiss control exists anywhere on the Income page, and no dismissal state is held — component spec
      asserts the button is gone; `IncomeStepChangesComponent`/`IncomeGapWarningsComponent` no longer exist
      in the component tree or the barrel.
- [ ] Empty state renders when there are no events, and the sidebar still occupies its layout slot.
- [ ] Amounts go through `formatCurrency()` and dates through `formatDate()` (settings-driven since
      TICKET-SET-03/04) — no hardcoded `€` or `en-US` month name; unit test under a non-default locale.
- [ ] The sidebar is keyboard-reachable and announced as a landmark/list (an `<ol>` inside a labelled
      region), and the timeline's decorative icons are `aria-hidden`.
- [ ] Responsive: two columns from `lg:`, stacked below the charts under it; the charts are not pushed down
      by events on wide screens.
- [ ] No persistence changes — every event is re-derived on read, no new `AppSettings` field, no Dexie
      version bump.
- [ ] `angular.json` bundle budgets not raised (net negative: two components removed, one added).
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: the sidebar lists real raises/bonuses under their year headings, scrolls
      independently of the charts, and stacks sensibly on a narrow window.

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
