# TICKET-STAT-35 — Relative range expressions: parse, resolve and re-serialise `now-30d`, `now/M`

- **Area:** Statistics & Dashboard / shared utils
- **Type:** Feature
- **Traceability:** extends **FR-STAT-7**; the foundation every other ticket in
  [v1.8](../overview.md) resolves a range through. Successor to
  [TICKET-STAT-16](../../v1.3_dashboard_insights/tickets/TICKET-STAT-16-date-range-prev-next-navigation.md),
  which named this version.

## User story

As someone who checks the same window every week, I want to say "the last 30 days" once and have it
still mean the last 30 days next month, so I stop re-picking two dates every time I open the app.

## Description

A pure parser/resolver for the relative date grammar the picker will accept — `now`, `now-30d`,
`now/M`, `now-1M/M` — plus the absolute `YYYY-MM-DD` form, so both input modes share one code path.
No UI, no state: functions and types only, mirroring how `resolvePresetRange` is already built.

## Current situation (as-is)

- [`resolvePresetRange`](../../../src/app/shared/utils/date-buckets.ts) (line 147) maps a fixed
  11-value `RangePreset` union (lines 6–17) to concrete `{from, to}` ISO dates, relative to an
  **injected** `todayIso` rather than `Date.now()` — deliberately pure and testable, and the pattern
  this ticket follows.
- Anything outside that union collapses to `'custom'` plus two frozen ISO strings
  ([`range-state.store.ts:19-23`](../../../src/app/core/state/range-state.store.ts)). There is no
  way to express a window that is defined relative to today.
- No text-parsing of dates exists anywhere in the app. The only free-form date entry is Cally's
  calendar inside [`mm-date-range-input`](../../../src/app/shared/ui/date-range-input/date-range-input.component.ts),
  which emits `YYYY-MM-DD` strings only (line 41).
- `parseIsoDate`/`formatIsoDate`/`MS_PER_DAY` (date-buckets.ts lines 19–29) are already the shared
  UTC-safe date trio; the resolver must use them rather than introduce a fourth copy.

## Desired result (to-be)

- New `shared/utils/range-expression.ts`, exported through the `shared/utils` barrel, with no
  Angular dependency (plain functions, like `date-buckets.ts`).
- **Grammar** (date-only), case-sensitive on units:
  - `now` — today.
  - `now±<n><unit>` where unit is `d` (day), `w` (week), `M` (month), `y` (year) — e.g. `now-30d`,
    `now-6M`, `now+1y`.
  - A `/​<unit>` **snap** suffix — `now/M`, `now-1M/M`, `now/y` — snapping to that unit's boundary.
  - A bare `YYYY-MM-DD`, which parses to an absolute expression resolving to itself.
- **Snap is edge-aware**: `resolveRangeExpression(expr, todayIso, edge)` takes `'from' | 'to'` and
  snaps to the unit's **start** for `from` and its **end** for `to`. This is what makes the pair
  `now/M … now/M` mean "the whole current month" rather than a single day, and it is why resolution
  cannot be a one-argument function.
- **Rejected with a reason, not silently coerced**: time units (`h`, `m`, `s`), the datetime form
  (`2025-07-10 15:00`), unknown units, and malformed input. `parseRangeExpression` returns
  `{ ok: false, reason }` so the UI in
  [STAT-39](./TICKET-STAT-39-absolute-panel-apply-staging.md) can show *why*. Time units get their
  own reason naming the cause ("this app works in whole days") rather than a generic parse error.
- `formatRangeExpression(expr)` re-serialises to canonical text, so a parsed-then-formatted
  expression round-trips unchanged — the URL and the persisted recents both store the canonical form.
- `describeRangeExpression(expr)` returns a plain-language label ("Last 30 days", "Start of this
  month") for the picker trigger and the recents list to show instead of raw syntax.

## Acceptance criteria

- [x] `parseRangeExpression` accepts `now`, `now-30d`, `now+1w`, `now-6M`, `now-2y`, `now/M`,
      `now-1M/M`, `now/w`, `now/y`, and a bare `YYYY-MM-DD`. (`ACCEPTED_FORMS` parametrized spec,
      [range-expression.spec.ts:9-20,42-45](../../../src/app/shared/utils/range-expression.spec.ts))
- [x] `parseRangeExpression` rejects `now-6h`, `now-15m`, `now-30s`, `2025-07-10 15:00`, `now/h`,
      `now-`, `now-xd`, `tomorrow` and the empty string — each with a non-empty `reason`, and the
      time-unit rejections with a reason that names whole-day granularity specifically.
      (`REJECTED_FORMS` spec + the dedicated "whole days" reason spec,
      [range-expression.spec.ts:22-32,47-64,90-96](../../../src/app/shared/utils/range-expression.spec.ts))
- [x] `resolveRangeExpression` snaps to the unit **start** for `edge: 'from'` and the unit **end**
      for `edge: 'to'`, so `now/M … now/M` resolves to the first and last day of the current month.
      (`'snaps "now/M" to the month start...'` and `'resolves "now/M" … as the whole current month'`,
      [range-expression.spec.ts:127-139](../../../src/app/shared/utils/range-expression.spec.ts))
- [x] `now-1M/M` resolves to the previous month's true boundaries at both edges, including across a
      year boundary (December from January) and into a 28/29-day February. (three specs covering
      Dec/Jan, 28-day Feb 2026, and 29-day leap Feb 2028,
      [range-expression.spec.ts:141-157](../../../src/app/shared/utils/range-expression.spec.ts))
- [x] Week snapping is Monday-start, matching `isoWeekOf`/`isoWeekStart` in `date-buckets.ts` — a
      `now/w` from on a Sunday resolves to the Monday six days earlier, not the next day.
      (`'snaps "now/w" to Monday-start weeks...'` on Sunday 2026-07-19 → Monday 2026-07-13,
      [range-expression.spec.ts:159-164](../../../src/app/shared/utils/range-expression.spec.ts))
- [x] Resolution takes an injected `todayIso` and never reads `Date.now()`, matching
      `resolvePresetRange`. (`resolveRangeExpression`'s signature takes `todayIso` as a parameter and
      the module contains no `Date.now()`/argless `new Date()` call,
      [range-expression.ts](../../../src/app/shared/utils/range-expression.ts); regression spec
      at [range-expression.spec.ts:172-175](../../../src/app/shared/utils/range-expression.spec.ts))
- [x] `formatRangeExpression(parseRangeExpression(text))` round-trips every accepted form above to
      identical canonical text. (`formatRangeExpression` describe block, parametrized over
      `ACCEPTED_FORMS`, [range-expression.spec.ts:178-183](../../../src/app/shared/utils/range-expression.spec.ts))
- [x] `describeRangeExpression` returns a human label for each accepted form, with no raw `now-`
      syntax leaking into it. (parametrized non-empty/no-`now[-+/]` spec plus specific-label specs,
      [range-expression.spec.ts:185-207](../../../src/app/shared/utils/range-expression.spec.ts))
- [x] No new dependency; `angular.json` budgets untouched. (only imports from
      `./date-buckets`; `angular.json` not touched by this change — `git diff --stat` confirms)
- [x] Unit tests cover: every accepted form's parse and resolution; every rejected form's reason;
      both snap edges; the year-boundary and February month snaps; Monday-start week snapping;
      round-tripping; and the plain-language labels.
      ([range-expression.spec.ts](../../../src/app/shared/utils/range-expression.spec.ts), 33 tests)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (verifier subagent run:
      lint clean, 265 spec files / 3031 tests passing, dev build succeeded)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`: 0
      duplication, real complexity within thresholds after refactor — `parseRangeExpression`
      cyclomatic 10/cognitive 12, `describeRangeExpression` cyclomatic 6/cognitive 5, both under the
      20/15 thresholds; the 4 unused-export flags are the ticket's own documented intent — "ships as
      unreferenced utility code... STAT-36 is the first consumer" — not a defect; coding-conventions
      skill consulted for file placement, barrel export, `type` over `interface`, and the
      `parseIsoDate`/`formatIsoDate`/`MS_PER_DAY` reuse rule)

## Notes

- **Why edge-aware snapping instead of a `now/M` → "whole month" special case.** Grafana's own
  semantics, and the only way `now-1M/M … now/M` ("from the start of last month to the end of this
  one") can be expressed as two independent expressions. A whole-range special case would need the
  parser to know about pairs, which would make every consumer pass both halves everywhere.
- **Why `M` for month and no `m` at all.** `m` is minutes in the source grammar, and this app has no
  minutes — accepting `m` as a month alias would make `now-6m` silently mean six months to a user
  who typed it meaning six minutes. It is rejected with the whole-days reason instead.
- **No UI, no state, on purpose.** This ships as unreferenced utility code plus its spec; STAT-36 is
  the first consumer. Splitting it out keeps the grammar's edge cases testable without mounting a
  component, and keeps the state change in STAT-36 reviewable on its own.
- Independent of [SET-09](./TICKET-SET-09-fiscal-year-start-setting.md) — fiscal snapping is not part
  of this grammar; the two fiscal quick ranges in
  [STAT-37](./TICKET-STAT-37-quick-range-catalogue.md) resolve through the setting rather than
  through a `now/fQ` expression, since a fiscal boundary is user-configured, not calendrical.
