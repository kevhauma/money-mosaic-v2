# TICKET-STAT-36 — `RangeStore` holds expressions and re-resolves them on read, URL included

- **Area:** Statistics & Dashboard / core state
- **Type:** Refactor
- **Traceability:** revises **FR-STAT-7**'s notion of a stored range. Builds on
  [TICKET-STAT-35](./TICKET-STAT-35-relative-range-expressions.md); changes the store
  [TICKET-UI-23](../../v1.6.2_interface_polish/tickets/TICKET-UI-23-per-page-date-range.md) made
  per-page and [TICKET-SOLID-07](../../v2_code_review/tickets/TICKET-SOLID-07-range-state-store-to-core-state.md)
  moved to `core/state`.

## User story

As someone who bookmarks the Dashboard on a rolling window, I want a relative range to stay relative
when I come back to it, so a link I saved as "the last 30 days" doesn't quietly freeze into a fixed
month-old window.

## Description

Turns the stored range from two frozen ISO dates into two expressions that resolve on every read.
Consumers keep reading `from()`/`to()` as `YYYY-MM-DD` strings and need no edit; the URL carries the
expression so a bookmarked relative range survives a reload as a relative range.

## Current situation (as-is)

- [`range-state.store.ts`](../../../src/app/core/state/range-state.store.ts) holds
  `RangeState = { preset: RangePreset | 'custom'; from: string; to: string }` (lines 19–23), keyed
  per page (line 15). `from`/`to` are resolved **once**, at the moment a preset is picked
  (`setPreset`, line 93), and never re-derived — so a store seeded with `this-month` on 31 July still
  reports July's boundaries on 1 August until something re-triggers `setPreset`.
- The store is explicitly ephemeral and resets to the current-month default on reload (lines 66–69),
  which is what has kept the staleness invisible so far.
- [`page-range-control.ts`](../../../src/app/core/state/page-range-control.ts) mirrors the range into
  `?from=&to=` as resolved dates (lines 58–75) and reads them back on entry (lines 45–56), demoting
  the range to `'custom'`. The **preset id is never in the URL** — so today a shared link always
  arrives as a custom absolute range, whatever the sender had selected.
- Both directions carry a hand-rolled skip guard (`differsFromCurrent` line 52, `alreadyMirrored`
  line 67) whose comments record exactly why: without them, the mirror's own write demotes a named
  preset to Custom on every re-entry.
- `shiftRange` (line 131) flips `preset` to `'custom'` on every step, deliberately
  ([STAT-16](../../v1.3_dashboard_insights/tickets/TICKET-STAT-16-date-range-prev-next-navigation.md)),
  and picks its unit from `alignedCalendarUnit` once the preset is gone (lines 137–141).
- Consumers read only the resolved strings — `stats.store.ts` (lines 47–102), the dashboard/explore/
  accounts panels, `balance-trend-signals.ts` — so none of them is coupled to how the range is stored.

## Desired result (to-be)

- `RangeState` becomes `{ quickRangeId: string | null; fromExpr: string; toExpr: string }`, where the
  expressions are canonical `range-expression` text (STAT-35) and `quickRangeId` is the catalogue
  entry that produced them, or `null` for a hand-built range (today's `'custom'`).
- `from(page)`/`to(page)` stay **`Signal`-backed accessors returning `YYYY-MM-DD`**, now `computed`
  over the expressions plus today's date — every existing consumer keeps working untouched. Nothing
  outside `core/state` learns what an expression is.
- Resolution happens against a single injected/today source, so a store seeded on 31 July reports
  August's boundaries on 1 August without a re-trigger.
- **URL contract**: `?from=&to=` carry the *expression* text (`now-30d`) when the range is relative
  and the ISO date when it is absolute. Absolute values keep parsing exactly as today, so every
  existing drill-down link built by
  [`buildTransactionDrilldownParams`](../../../src/app/shared/utils/search-params.ts) — which emits
  concrete dates — keeps working with no change.
- Both skip guards are preserved in behaviour and re-expressed over expressions; the entry-side read
  no longer demotes a relative range to a hand-built one, since `now-30d` in the URL *is* the
  relative range.
- `shiftRange` **resolves before shifting**: stepping a relative range writes back absolute
  expressions and clears `quickRangeId`, which is STAT-16's existing flip-to-Custom rule stated in
  the new vocabulary. Stepping stays disabled where it is today.
- `all-time` keeps its current shape — its `from` depends on imported data, not on today, so
  `pageRangeControl` still resolves it via `computeFullHistoryRange` and writes absolute expressions.

## Acceptance criteria

- [ ] `RangeStore` stores expressions; `from(page)`/`to(page)` return resolved `YYYY-MM-DD` strings
      with the same signature as today, and no consumer outside `core/state` is edited to keep
      compiling.
- [ ] A store holding `now-30d` reports a window ending today when read on two different days —
      asserted by resolving against two injected "today" values, not by waiting.
- [ ] A range set from a quick range keeps its `quickRangeId`; a hand-built range has
      `quickRangeId: null`.
- [ ] `?from=now-30d&to=now` round-trips: entering the page adopts it as a relative range, and the
      mirror writes the expression back rather than a resolved date.
- [ ] `?from=2026-01-01&to=2026-06-30` still round-trips as an absolute range, and an existing
      drill-down link from a stat panel lands on the same window it does today.
- [ ] Re-entering a page (refresh, back navigation, bookmark) does not demote a relative range to a
      hand-built one — the entry-side guard's regression, asserted directly.
- [ ] The mirror does not navigate when the URL already matches, preserving today's
      `alreadyMirrored` behaviour.
- [ ] `shiftRange` on a relative range resolves it to absolute, clears `quickRangeId`, and produces
      the same dates today's implementation produces for the equivalent preset — asserted against
      the existing calendar-unit and day-count cases so STAT-16's behaviour is provably unchanged.
- [ ] Stepping stays disabled for `all-time` and for the year-to-date entry, as it is today.
- [ ] Per-page isolation is unchanged: setting the Dashboard's range does not move Accounts' or
      Explore's.
- [ ] No Dexie change — the store stays ephemeral; persistence arrives only in
      [STAT-40](./TICKET-STAT-40-recently-used-ranges.md), and only for recents.
- [ ] Unit tests cover: relative re-resolution across two "today" values; quick-range id retention
      and clearing; both URL round-trips; the re-entry non-demotion guard; the no-redundant-navigate
      guard; shift-resolves-then-clears for a calendar-aligned and a rolling range; per-page
      isolation. Existing `range-state.store.spec.ts` and `page-range-control.spec.ts` cases are
      migrated, not deleted.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified live in the browser: a Dashboard URL carrying `?from=now-30d` reloads as a relative
      range whose end is today, and prev/next still steps it.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why `quickRangeId: string | null` and not the `RangePreset` union.** The catalogue in
  [STAT-37](./TICKET-STAT-37-quick-range-catalogue.md) is data, not a type — it grows by adding an
  entry, and two of its entries depend on a user setting. Keeping the store's field a plain id means
  the catalogue can change without touching state code. The union survives inside `date-buckets.ts`
  for `resolvePresetRange`'s existing callers until STAT-37 retires them.
- **Why the URL carries expressions rather than gaining a third `preset` param.** Two params already
  describe the range completely once they can be relative, and a third would need its own precedence
  rule against the other two on every entry. `now-30d` is both the value and the intent.
- **Migration risk is low because the store is ephemeral.** There is no persisted range to migrate —
  the only place an old-format range can survive is a bookmarked URL, and those carry absolute dates,
  which stay valid input.
- Needs [STAT-35](./TICKET-STAT-35-relative-range-expressions.md). Independent of
  [SET-09](./TICKET-SET-09-fiscal-year-start-setting.md).
