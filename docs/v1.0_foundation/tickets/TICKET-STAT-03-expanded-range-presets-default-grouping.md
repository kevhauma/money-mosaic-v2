# TICKET-STAT-03 — Expanded date-range presets with linked default grouping

- **Area:** Statistics & Dashboard
- **Type:** Feature (folds in a bug fix)
- **Traceability:** extends FR-STAT-7
- **Source story:** user-stories.md §6 — *"As a user, I want more date-range presets, each with a sensible default grouping, plus a working 'Custom' option, so I can view my finances at whatever timeframe I actually want without manually fixing the grouping every time."*
- **Supersedes:** [TICKET-STAT-01](./TICKET-STAT-01-custom-range-enable.md) — its custom-range bug fix is folded into this ticket's acceptance criteria (see AC below); implement this ticket instead of STAT-01 in isolation.

## Description

Today the topbar range picker only offers four presets (`this-month`, `last-month`, `this-quarter`, `this-year`) plus a broken `custom`, and the grouping granularity (day/week/month/quarter) is fully decoupled from the chosen range — picking "This year" leaves whatever granularity was last clicked, which can mean 365 daily buckets on a year-wide chart. This ticket adds more presets and makes each preset (and custom range) apply a sensible default grouping automatically, while still letting the user override it manually.

## Current situation (as-is)

- [date-buckets.ts](../../../src/app/core/stats/date-buckets.ts) `RangePreset` is `'this-month' | 'last-month' | 'this-quarter' | 'this-year'`; `resolvePresetRange()` computes `[from, to]` for exactly those four, all relative to an injected `todayIso`.
- [range-state.store.ts](../../../src/app/core/stats/range-state.store.ts) `RangeStore.setPreset()` only patches `preset`/`from`/`to` — it never touches `groupBy`, so grouping is completely independent of which range is selected.
- [range-grouping-switcher.component.ts](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.ts) `onPresetChange()` **returns early** on `'custom'` (`if (raw === 'custom') return;`), and its `presetChange` output is typed `Exclude<RangeGroupingPreset, 'custom'>` — so selecting "Custom" never propagates.
- In the template ([range-grouping-switcher.component.html](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.html)) the from/to `<input type="date">` are `[disabled]="value().preset !== 'custom'"`. Since `value().preset` can never become `'custom'`, the inputs stay permanently disabled (the STAT-01 bug).
- The dropdown template hardcodes exactly the four presets + Custom as `<option>`s; there's no lookup from preset → default granularity anywhere in the codebase.
- [app.ts](../../../src/app/app.ts) wires `RangeStore` to `from`/`to`/`groupBy` query params and forwards `onPresetChange`/`onCustomRangeChange`/`onGroupByChange` to the store 1:1, with no additional logic.

## Desired result (to-be)

- The preset dropdown offers a richer set of ranges. Proposed set (finalise in the Open Questions below): `this-week`, `this-month`, `last-month`, `last-31-days`, `this-quarter`, `last-quarter`, `this-year`, `last-year`, `last-365-days`, `year-to-date`, `all-time`, `custom`.
- Each non-custom preset resolves to a default `Granularity` the moment it's selected — e.g. week-wide/month-wide presets default to `day`, quarter-wide presets default to `week`, year-wide presets default to `month`, `all-time` defaults to `quarter`. `RangeStore.setPreset()` applies both the resolved range **and** its default `groupBy` in one patch.
- Selecting `custom` behaves like any other preset selection: it sets `value().preset = 'custom'`, which releases the `[disabled]` binding on the from/to inputs (fixing the STAT-01 bug) — and once a custom `[from, to]` is picked, the default `groupBy` is auto-picked from the span length (e.g. ≤~6 weeks → `day`, ≤~1 year → `week`/`month`, longer → `quarter`) via a shared pure helper.
- The user can still manually click a granularity button to override the auto-picked default at any time; the auto-default only re-fires when the preset or the custom range itself changes, so it never fights a mid-session manual choice.
- `all-time` resolves `from` to the earliest date across the user's **active (non-archived)** accounts only (opening-balance dates / first transactions), read through the existing accounts/transactions repositories — never a hardcoded date. Archived accounts are treated as if they never existed for this and every other stat, consistent with the existing `activeEntities`/`activeAccounts` filtering in [with-archivable.ts](../../../src/app/shared/utils/with-archivable.ts) and [accounts.store.ts](../../../src/app/feature-accounts/accounts.store.ts) — this is not a new policy, just applying the established convention to the new preset.

## Acceptance criteria

- [ ] `RangePreset` in [date-buckets.ts](../../../src/app/core/stats/date-buckets.ts) is expanded with the new presets (final list per Open Question 1), and `resolvePresetRange()` computes `[from, to]` for each, staying pure and `todayIso`-injected like the existing cases.
- [ ] A new pure lookup (e.g. `defaultGranularityForPreset(preset): Granularity`) maps every preset to its default granularity per the to-be mapping above; covered by a table-driven unit test.
- [ ] A pure helper picks a default granularity from a `[from, to]` span length (reusable for `custom` ranges), with thresholds documented in the code, e.g. via a short comment.
- [ ] `RangeStore.setPreset()` patches `groupBy` to the preset's default alongside `preset`/`from`/`to`. `RangeStore.setCustomRange()` patches `groupBy` to the span-based default whenever the custom range changes.
- [ ] `RangeStore.setGroupBy()` (manual override) continues to work unchanged and is not immediately clobbered by the auto-default.
- [ ] `RangeGroupingSwitcherComponent.onPresetChange()` no longer early-returns on `'custom'` — selecting "Custom" propagates through `presetChange` (widened to include `'custom'`, or an equivalent dedicated path) so `value().preset` becomes `'custom'` and the from/to inputs become enabled and editable.
- [ ] Switching from `custom` back to any other preset re-disables the from/to inputs and applies that preset's range + default grouping, as today.
- [ ] The dropdown template lists every new preset with a clear, user-facing label (e.g. "Year to date", "All time").
- [ ] `all-time`'s `from` is computed via the existing account/transaction repositories (`core/data-access`), not a direct Dexie query, consistent with the repository-pattern hard rule, and considers **active accounts only** — an archived account's history never extends the `all-time` range or feeds into any stat.
- [ ] All stats (FR-STAT-5) recompute reactively off the new presets exactly as they do for the existing ones — no special-casing needed downstream since `RangeStore` stays the single source of truth.
- [ ] Unit tests cover: `resolvePresetRange` for every new preset, `defaultGranularityForPreset`'s full mapping table, the span-based helper at its threshold boundaries, `RangeStore.setPreset`/`setCustomRange` applying both range and groupBy, manual `setGroupBy` surviving until the next range change, and the custom-enable behaviour (inputs enable/disable, propagation) — update [range-grouping-switcher.component.spec.ts](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.spec.ts) and add/extend a `range-state.store.spec.ts` / `date-buckets.spec.ts` as appropriate.
- [ ] Verified live in the browser: cycle through every preset and confirm both the range and the grouping buttons update sensibly (e.g. "This year" lands on Month); select Custom, confirm the pickers enable and a chosen range applies a sensible default grouping; manually override grouping and confirm it sticks until the range changes again.

## Notes

- This ticket intentionally subsumes [TICKET-STAT-01](./TICKET-STAT-01-custom-range-enable.md) rather than being layered on top of it — implementing STAT-03 makes STAT-01 redundant, since the same `onPresetChange` fix is required either way.
- The span-based default-granularity helper for `custom` ranges is deliberately generic; if [TICKET-STAT-02](./TICKET-STAT-02-per-account-networth.md)'s "auto-pick granularity from span" lands first, reuse that helper here instead of writing a second one.
