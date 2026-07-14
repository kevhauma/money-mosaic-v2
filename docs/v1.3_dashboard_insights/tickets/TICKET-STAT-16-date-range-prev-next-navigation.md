# TICKET-STAT-16 — Previous/next navigation buttons on the global date-range picker

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** extends FR-STAT-7; precursor to [../v1.8_extended_date_range_picker/requirements.md](../../v1.8_extended_date_range_picker/requirements.md)

## User story

As a user, I want previous/next buttons next to the date-range picker, so that I can step through consecutive periods (e.g. month by month) without reopening the preset dropdown or retyping dates each time.

## Description

Adds a "◀ / ▶" control flanking the preset dropdown in the global topbar switcher. Clicking it shifts the currently active range backward/forward by its own length. Because the shifted range generally no longer matches the semantics of a named preset (e.g. "This month" no longer means the calendar month containing today once you've stepped back), the preset selection switches to **Custom** whenever prev/next is used from a preset.

## Current situation (as-is)

- The global switcher ([range-grouping-switcher.component.html](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.html)) renders only a preset `<select>` (lines 2–20) and a `mm-date-range-input` (lines 22–27, disabled unless `preset === 'custom'`). There is no prev/next control anywhere in this component.
- `RangeStore` ([range-state.store.ts](../../../src/app/core/stats/range-state.store.ts)) exposes `setPreset`, `setCustomRange`, and `selectCustomPreset` (lines 32–52), but no method to shift the current `from`/`to` by one unit forward or back.
- `date-buckets.ts` already has `shiftRangeByCalendarUnit(from, to, unit, count)` ([date-buckets.ts:201-234](../../../src/app/core/stats/date-buckets.ts)) — shifts a **calendar-aligned** range (week/month/quarter/year) by whole units, correctly recomputing each unit's real boundaries (e.g. 31-day → 28/29-day February). It was built for TICKET-STAT-04's rolling-window comparison and is a pure, already-tested building block, but nothing currently calls it from the topbar.
- There is no equivalent day-count shift helper for **non-calendar-aligned** ranges: `last-31-days` and `last-365-days` are rolling windows ending "today" ([date-buckets.ts:154-157](../../../src/app/core/stats/date-buckets.ts), [180-183](../../../src/app/core/stats/date-buckets.ts)), and a `custom` range can be any arbitrary span — both need a plain "shift by N days" shift, not a calendar-unit shift.
- `app.ts` wires `presetChange`/`customRangeChange` from the switcher to `rangeStore.setPreset`/`setCustomRange`/`selectCustomPreset` (`app.ts` lines ~78, 109, 118–125) — this is the pattern a new `previous`/`next` output would follow.

## Desired result (to-be)

- `mm-range-grouping-switcher` renders a "previous" and "next" button immediately next to the preset dropdown (icon buttons, e.g. chevron-left / chevron-right, `btn btn-sm btn-ghost` per [coding-conventions](../../../.claude/skills/coding-conventions/SKILL.md)).
- Clicking **previous**/**next** shifts the active range back/forward by its own length and emits a new output (e.g. `rangeShift`) that the caller (`app.ts`) handles by calling a new `RangeStore` method (e.g. `shiftRange(direction: -1 | 1)`).
- Shift amount depends on how the current range is shaped, not on a single fixed unit:
  - Calendar-aligned presets (`this-week`, `this-month`, `last-month`, `this-quarter`, `last-quarter`, `this-year`, `last-year`) shift by the matching `CalendarUnit` via the existing `shiftRangeByCalendarUnit`.
  - Rolling-window presets (`last-31-days`, `last-365-days`) and `custom` shift by a plain day-count equal to the current span's length (`to - from` in days), via a new day-count shift helper in `date-buckets.ts`.
  - `year-to-date` and `all-time` have no fixed, repeatable length (`year-to-date`'s end is always "today"; `all-time`'s start depends on transaction history) — the previous/next buttons are disabled while either is selected.
- After any successful shift, `RangeStore.preset` becomes `'custom'` — matching the "switch to Custom when the date changes off a preset" behaviour already established by `selectCustomPreset`/`setCustomRange`. This applies even when the user was already on `custom` (it just stays `custom`).
- The `mm-date-range-input` becomes enabled immediately after a shift (it already enables whenever `preset === 'custom'`), so the user can see and fine-tune the exact shifted dates.

## Acceptance criteria

- [x] Previous/next buttons render in `mm-range-grouping-switcher`, next to the preset dropdown, both `disabled` when the current preset is `year-to-date` or `all-time`.
- [x] Clicking next/previous while a calendar-aligned preset (`this-month`, `this-quarter`, `this-year`, `this-week`, `last-month`, `last-quarter`, `last-year`) is selected shifts `from`/`to` by that preset's calendar unit (via `shiftRangeByCalendarUnit`) and flips `preset` to `custom`.
- [x] Clicking next/previous while `last-31-days`, `last-365-days`, or `custom` is selected shifts `from`/`to` by the current span's day-count (new helper in `date-buckets.ts`) and sets/keeps `preset` as `custom`.
- [x] `RangeStore` gains a `shiftRange(direction: -1 | 1): void` method that performs the shift described above using the store's current `preset`/`from`/`to`, and patches state via `patchState` like the existing methods.
- [x] Shifting never touches `appDb` — this is pure `RangeStore`/`date-buckets.ts` state, no repository involved.
- [x] Unit tests cover: new day-count shift helper in `date-buckets.spec.ts` (forward and backward, span length preserved); `RangeStore.shiftRange` in `range-state.store.spec.ts` for a calendar-aligned preset, a rolling-window preset, and an already-custom range, each asserting `preset` becomes `'custom'`; `range-grouping-switcher.component.spec.ts` asserts the buttons are disabled for `year-to-date`/`all-time` and emit the new output otherwise.
- [x] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: with "This month" selected, clicking next moves the range to next calendar month and the dropdown shows "Custom"; with "Last 31 days" selected, clicking previous moves the 31-day window back by 31 days; with "Year to date" or "All time" selected, both buttons are disabled.

## Notes

- This ticket intentionally does not touch `all-time`'s or `year-to-date`'s shiftability — both are flagged as out-of-scope edge cases (buttons disabled) rather than given an invented "length." A future ticket can revisit if there's a real need to step through years for `year-to-date`.
- [../v1.8_extended_date_range_picker/requirements.md](../../v1.8_extended_date_range_picker/requirements.md) describes a larger Grafana-style rebuild of this picker (two-panel popover, relative expressions, recently-used ranges) that has not been scoped into tickets yet. Previous/next navigation is called out there as an expected capability of that future picker — this ticket delivers it now, against the current lightweight switcher, without waiting on that larger rebuild.
