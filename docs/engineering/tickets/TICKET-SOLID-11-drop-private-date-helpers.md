# TICKET-SOLID-11 — Private date-helper copies use the canonical `date-buckets` helpers

- **Area:** Shared utilities (shared/utils/date-buckets.ts) + core/stats, core/loans, core/transactions, core/transfers, features
- **Released in:** _unreleased_
- **Type:** Refactor
- **Traceability:** CR5-23 (date helpers), CR6-A1 (private-copy part); the "no private copies" rule in `date-buckets.ts`'s own doc

## User story

As a developer changing how dates are parsed or counted, I want one set of date helpers, so a fix lands everywhere at once instead of in one of a dozen look-alike copies.

## Description

`date-buckets.ts` exports `MS_PER_DAY`, `parseIsoDate`, `formatIsoDate` and `shiftRangeByDayCount`, and its doc warns against private copies. Eleven files still define or inline their own, plus three copies of `daysBetween`, which `date-buckets` doesn't export yet. They agree today; nothing keeps them agreeing.

## Current situation (as-is)

- `MS_PER_DAY` copies: [period-window.ts:10](../../../src/app/core/stats/period-window.ts), [recurring-payments.ts:213](../../../src/app/core/stats/recurring-payments.ts), [granularity-for-span.ts:3](../../../src/app/core/stats/granularity-for-span.ts), [loan-progress.ts:23](../../../src/app/core/loans/loan-progress.ts), [attribution-override.ts:5](../../../src/app/core/transactions/attribution-override.ts), [transfer-matching.ts:20](../../../src/app/core/transfers/transfer-matching.ts), [calendar-cycles.ts:99](../../../src/app/shared/utils/calendar-cycles.ts), [last-import-status.ts:14](../../../src/app/feature-accounts/last-import-status.ts), [bills-calendar.component.ts:39](../../../src/app/feature-recurring/components/bills-calendar/bills-calendar.component.ts).
- `parseIsoDate` copies or inline `` `${iso}T00:00:00Z` `` parses: [period-window.ts:11](../../../src/app/core/stats/period-window.ts), [recurring-payments.ts:215](../../../src/app/core/stats/recurring-payments.ts) (returns epoch ms), [date-format.ts:4](../../../src/app/shared/utils/date-format.ts), [weekday-weekend-split.ts:21](../../../src/app/core/stats/weekday-weekend-split.ts), [granularity-for-span.ts:7](../../../src/app/core/stats/granularity-for-span.ts), [calendar-cycles.ts:94, 116](../../../src/app/shared/utils/calendar-cycles.ts), [bills-calendar.component.ts:63](../../../src/app/feature-recurring/components/bills-calendar/bills-calendar.component.ts).
- `formatIsoDate` copies: [period-window.ts:12](../../../src/app/core/stats/period-window.ts), [recurring-payments.ts:217](../../../src/app/core/stats/recurring-payments.ts) (takes epoch ms).
- `daysBetween` copies: [attribution-override.ts:7](../../../src/app/core/transactions/attribution-override.ts), [transfer-matching.ts:22](../../../src/app/core/transfers/transfer-matching.ts); a third in [recurring-payments.ts:219](../../../src/app/core/stats/recurring-payments.ts).
- `shiftRangeByDayCount` twice: [period-window.ts:14-25](../../../src/app/core/stats/period-window.ts) (takes a precomputed span) and [date-buckets.ts:179-191](../../../src/app/shared/utils/date-buckets.ts).
- Canonical: [date-buckets.ts:6-16](../../../src/app/shared/utils/date-buckets.ts).

## Desired result (to-be)

- `date-buckets.ts` additionally exports `daysBetween(fromIso, toIso)` (signed whole days); every copy above is deleted and its file imports the canonical helper (`@/shared/utils`, or `./date-buckets` inside `shared/utils`).
- `period-window.ts` uses the exported `shiftRangeByDayCount`; `recurring-payments.ts` converts its epoch-ms call sites rather than keeping a variant.
- `date-format.ts` imports `parseIsoDate` from `./date-buckets` (no cycle: `date-buckets` doesn't import `date-format`).
- A grep spec (or lint rule) fails on a new `const MS_PER_DAY =` / `T00:00:00Z` parse outside `date-buckets.ts`.

## Acceptance criteria

- [ ] `grep -rn "MS_PER_DAY = \|T00:00:00Z" src/app --include=*.ts` outside specs matches only `date-buckets.ts`.
- [ ] Exactly one `daysBetween` and one `shiftRangeByDayCount` definition remain.
- [ ] `daysBetween('2026-02-27', '2026-03-01')` is 2; `('2026-03-01', '2026-02-27')` is −2; across the 2026-03-29 DST change it is still a whole number.
- [ ] All existing specs of the touched modules pass unchanged — this is a pure refactor.
- [ ] The guard fails on a scratch copy and passes on the tree.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **After [TICKET-SOLID-10](./TICKET-SOLID-10-one-month-step-rule.md)**, which removes the month-step and month-end copies; this ticket covers the rest of CR5-23's date list. [TICKET-SOLID-08](./TICKET-SOLID-08-local-today.md) covers "today".
- CR5-23 placed `calendar-cycles.ts` in `core/stats`; it is in `shared/utils`. `last-import-status.ts` and `bills-calendar.component.ts` were not in CR5-23's list and were found while confirming.
- No behaviour change, so no browser check.
