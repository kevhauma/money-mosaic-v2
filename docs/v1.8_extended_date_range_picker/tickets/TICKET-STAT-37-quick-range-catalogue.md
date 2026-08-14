# TICKET-STAT-37 — The quick-range catalogue: 21 grouped ranges, expressed as expression pairs

- **Area:** Statistics & Dashboard / shared utils
- **Type:** Feature
- **Traceability:** revises **FR-STAT-7**'s preset list (last set by
  [TICKET-STAT-03](../../v1.0_foundation/tickets/TICKET-STAT-03-expanded-range-presets-default-grouping.md)).
  Needs [STAT-35](./TICKET-STAT-35-relative-range-expressions.md) and
  [SET-09](./TICKET-SET-09-fiscal-year-start-setting.md).

## User story

As someone comparing periods, I want the ranges I actually think in — "last 90 days", "previous
quarter", "this month so far", "previous fiscal year" — offered directly, so I stop hand-picking two
dates for windows the app could name.

## Description

Replaces the hardcoded eleven-option preset list with a data catalogue: each entry an id, a label, a
group, and a pair of range expressions. Grows the offering to 21 ranges including the two fiscal ones
[SET-09](./TICKET-SET-09-fiscal-year-start-setting.md)'s setting makes possible, and renames six
existing ids whose names no longer match their group.

## Current situation (as-is)

- The preset list exists in **three** places that must be edited together: the `RangePreset` union
  ([date-buckets.ts:6-17](../../../src/app/shared/utils/date-buckets.ts)), a near-duplicate
  `RangeGroupingPreset` adding `'custom'`
  ([range-grouping-switcher.component.ts:11-23](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.ts)),
  and the human labels, which live **only** as `<option>` text in
  [range-grouping-switcher.component.html:19-30](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.html).
  There is no single place to add a range.
- `resolvePresetRange` (date-buckets.ts:147) hand-computes each preset in a twelve-branch `switch`,
  and `CALENDAR_UNIT_BY_PRESET`
  ([range-state.store.ts:32](../../../src/app/core/state/range-state.store.ts)) separately records
  which of them step by a whole calendar unit — a fourth list to keep in sync.
- The eleven presets are: `this-week`, `this-month`, `last-month`, `last-31-days`, `this-quarter`,
  `last-quarter`, `this-year`, `last-year`, `last-365-days`, `year-to-date`, `all-time`. Names mix two
  conventions ("last-month" is the *previous* month; "last-31-days" is a *rolling* window), which is
  exactly the confusion the sketch's grouped list resolves.
- Quarters and years are calendar-based throughout (lines 176–197); no fiscal notion exists until
  [SET-09](./TICKET-SET-09-fiscal-year-start-setting.md).
- `all-time` is resolved outside this file, via `computeFullHistoryRange`
  ([full-history-range.ts](../../../src/app/core/stats/full-history-range.ts)), because its start
  depends on imported data rather than today.

## Desired result (to-be)

- New `shared/utils/quick-ranges.ts`: a single exported `QUICK_RANGES` array of
  `{ id, label, group, fromExpr, toExpr }`, plus `quickRangeById(id)`. Adding a range is one entry.
- **Four groups**, in the order the picker lists them:

  | Group | Entries |
  |---|---|
  | Relative | Last 7 days · Last 30 days · Last 90 days · Last 6 months · Last 1 year · Last 2 years · Last 5 years |
  | Previous period | Previous week · Previous month · Previous quarter · Previous fiscal quarter · Previous year · Previous fiscal year |
  | Current period | This week · This week so far · This month · This month so far · This quarter · This year · This year so far |
  | Everything | All time |

- **Six existing ids are renamed**, since they now sit in a group whose convention they contradicted.
  The rename is safe because `RangeStore` is ephemeral and the URL carries expressions, not ids
  (STAT-36) — no stored value anywhere holds an old id:

  | Old id | New id | Why |
  |---|---|---|
  | `last-month` | `previous-month` | it is the previous calendar month, not a rolling window |
  | `last-quarter` | `previous-quarter` | same |
  | `last-year` | `previous-year` | same |
  | `last-31-days` | `last-30-days` | 31 was an artefact of month-length hedging; the sketch's list and every comparable tool use 30 |
  | `last-365-days` | `last-1-year` | identical window, named the way users say it |
  | `year-to-date` | `this-year-so-far` | it *is* the "so far" variant, and the group now makes that legible |

- **The two fiscal entries** resolve against `AppSettings.fiscalYearStartMonth` rather than a
  calendar constant: a fiscal year starting in April makes fiscal Q1 April–June, so "Previous fiscal
  quarter" in May 2026 is January–March 2026 and "Previous fiscal year" is April 2025 – March 2026.
  With the setting unset (January), both are identical to their calendar twins.
- Every non-fiscal entry is defined **as a pair of STAT-35 expressions** (`Last 30 days` is
  `now-30d … now`; `This month` is `now/M … now/M`; `Previous month` is `now-1M/M … now-1M/M`), so
  `resolvePresetRange`'s hand-written `switch` is replaced by expression resolution. The two fiscal
  entries and `all-time` are the exceptions — they resolve through a setting and through imported
  data respectively, and carry a resolver function instead of an expression pair.
- `CALENDAR_UNIT_BY_PRESET` is derived from the catalogue rather than maintained beside it, so
  prev/next stepping keeps working per
  [STAT-16](../../v1.3_dashboard_insights/tickets/TICKET-STAT-16-date-range-prev-next-navigation.md)
  for every new entry without a second edit.
- `resolvePresetRange` and the `RangePreset` union are removed once their callers move to the
  catalogue; no compatibility shim is left behind.

## Acceptance criteria

- [ ] `QUICK_RANGES` holds all 21 entries in the four groups above, each with a unique id, a label,
      and either an expression pair or a resolver.
- [ ] Every non-fiscal, non-`all-time` entry resolves through
      [STAT-35](./TICKET-STAT-35-relative-range-expressions.md)'s resolver — asserted by a
      table-driven spec covering all of them against a fixed "today".
- [ ] Each renamed range resolves to exactly the same window its old id did, except `last-30-days`,
      whose one-day difference from `last-31-days` is asserted deliberately.
- [ ] "This month so far" ends today while "This month" ends on the month's last day — the pair that
      proves the "so far" variants are not duplicates.
- [ ] With `fiscalYearStartMonth` unset, "Previous fiscal quarter" and "Previous fiscal year" resolve
      identically to "Previous quarter" and "Previous year".
- [ ] With `fiscalYearStartMonth = 4` (April), "Previous fiscal year" evaluated in May 2026 resolves
      to 2025-04-01 – 2026-03-31, and "Previous fiscal quarter" to 2026-01-01 – 2026-03-31.
- [ ] Fiscal resolution reads the setting through `AppSettingsStore`; `quick-ranges.ts` itself stays
      a pure module taking the start month as a parameter.
- [ ] `all-time` still resolves via `computeFullHistoryRange` and is unaffected by the fiscal setting.
- [ ] Prev/next stepping works for every entry that had it before and for each new calendar-aligned
      entry, with the unit derived from the catalogue rather than a second hand-maintained map.
- [ ] `resolvePresetRange`, the `RangePreset` union and `RangeGroupingPreset` are deleted, not
      deprecated in place, and nothing imports them.
- [ ] Unit tests cover: every entry's resolution against a fixed today; the six renames producing
      identical windows; the deliberate 30-vs-31 difference; both "so far" pairs; fiscal resolution
      unset and at April, including the quarter case; catalogue-derived stepping units.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why 21 and not the sketch's 17.** The sketch's list overlaps today's under different names —
  "Previous month" is `last-month`, "This year so far" is `year-to-date`, "Last 1 year" is
  `last-365-days`, "Previous year" is `last-year`. Shipping both spellings would put four
  near-duplicate rows in a list whose whole point is scannability. The union, deduped, is 21.
- **Why renaming is safe.** Nothing persists a preset id: `RangeStore` resets on reload by design,
  and after [STAT-36](./TICKET-STAT-36-expression-backed-range-state.md) the URL carries expressions.
  Doing the rename in the same version that introduces the groups is the cheapest moment it will ever
  be.
- **Why fiscal entries don't get a `now/fQ` expression.** A fiscal boundary is a user setting, not a
  property of the calendar, so putting it in the grammar would make expression resolution depend on
  application state — and make a shared `?from=now/fQ` link mean different windows for two people.
  Resolver functions keep that dependency explicit and local.
- **`last-31-days` → `last-30-days` is a behaviour change, not just a rename**, and the only one in
  this table. Called out separately in its own acceptance criterion so it is reviewed as such.
- Needs STAT-35 and SET-09. [STAT-38](./TICKET-STAT-38-two-panel-range-picker.md) is the first
  consumer; until it ships the catalogue is reachable only through the existing `<select>`, which
  this ticket repoints at `QUICK_RANGES` as an interim step rather than leaving dead.
