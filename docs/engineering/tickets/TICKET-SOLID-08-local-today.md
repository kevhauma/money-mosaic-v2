# TICKET-SOLID-08 — One local-date "today" helper replaces the ~25 UTC copies

- **Area:** Shared utilities (shared/utils/date-buckets.ts)
- **Released in:** _unreleased_
- **Type:** Bug fix + Refactor
- **Traceability:** CR5-11, CR6-A1 (the "today" part); FR-STAT-7 (ranges resolve against today); the shared-helper rule `date-buckets.ts` already states

## User story

As a user in Belgium opening the app just after midnight, I want "today" to be my local date, so "This month" on 1 November shows November and not October.

## Description

"Today" is `new Date().toISOString().slice(0, 10)` — the UTC date — copied into 24 places. Between 00:00 and 01:00/02:00 local time in Belgium (UTC+1/+2) that is still yesterday, so month, year and fiscal boundaries, the forecast's last complete month and the loan what-if start date are a day behind. One exported `todayIso()` built from local date parts replaces every copy.

## Current situation (as-is)

UTC "today" copies (grep `toISOString().slice(0, 10)` on `new Date()`, non-spec):

- `core/state`: [range-state.store.ts:46](../../../src/app/core/state/range-state.store.ts), [page-range-control.ts:11](../../../src/app/core/state/page-range-control.ts)
- Dashboard / future / income: [stats.store.ts:26](../../../src/app/feature-dashboard/stats.store.ts), [forecast.store.ts:22](../../../src/app/feature-future/forecast.store.ts), [goals-panel.component.ts:136](../../../src/app/feature-future/components/goals-panel/goals-panel.component.ts) (`createdAt`), [income.store.ts:28](../../../src/app/feature-income/income.store.ts)
- Accounts: [balance-trend-signals.ts:15](../../../src/app/feature-accounts/balance-trend-signals.ts), [account-form.component.ts:47](../../../src/app/feature-accounts/components/account-form/account-form.component.ts)
- Categories: [categories-overview.component.ts:41](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.ts), [rule-form.component.ts:77](../../../src/app/feature-categories/components/rule-form/rule-form.component.ts), [rule-share-bar.component.ts:9](../../../src/app/feature-categories/components/rule-share-bar/rule-share-bar.component.ts)
- Data management / import: [data-management-overview.component.ts:19](../../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.ts), [import-wizard-session.ts:58](../../../src/app/feature-import/import-wizard-session.ts)
- Loans: [loan-form.component.ts:36](../../../src/app/feature-loans/components/loan-form/loan-form.component.ts), [loan-what-if.component.ts:170](../../../src/app/feature-loans/components/loan-what-if/loan-what-if.component.ts)
- Recurring: [recurring-series.store.ts:17](../../../src/app/feature-recurring/recurring-series.store.ts), [bills-calendar.component.ts:127](../../../src/app/feature-recurring/components/bills-calendar/bills-calendar.component.ts)
- Settings: [settings-reporting-section.component.ts:14](../../../src/app/feature-settings/components/settings-reporting-section/settings-reporting-section.component.ts)
- Transactions: [transaction-edit-form.component.ts:34](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.ts), [transaction-filters.component.ts:45](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.ts), [transactions-overview.component.ts:59 and :303](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts)
- `shared/ui`: [absolute-range-panel.component.ts:31](../../../src/app/shared/ui/absolute-range-panel/absolute-range-panel.component.ts), [date-range-input.component.ts:28](../../../src/app/shared/ui/date-range-input/date-range-input.component.ts)

Not "today" copies and out of scope: `formatIsoDate` in [date-buckets.ts:16](../../../src/app/shared/utils/date-buckets.ts) (formats a UTC-midnight `Date`, correct as is) and its private copies in `period-window.ts:12` / `recurring-payments.ts:217` (removed by TICKET-SOLID-11); full ISO timestamps (`createdAt`, `linkedAt`). [training-window.ts:6-15](../../../src/app/core/ml/training-window.ts) already builds a local date and is the pattern to follow.

## Desired result (to-be)

- `export const todayIso = (now: Date = new Date()): string` in [date-buckets.ts](../../../src/app/shared/utils/date-buckets.ts), built from `getFullYear()/getMonth()/getDate()`, exported through the `@/shared/utils` barrel. The `now` parameter keeps it testable without fake timers.
- Every copy above calls it; no `new Date().toISOString().slice(0, 10)` remains in `src/app`.
- An ESLint `no-restricted-syntax` rule (or a grep spec) flags `toISOString().slice(0, 10)` on `new Date()` so a copy can't come back.

## Acceptance criteria

- [ ] `todayIso(new Date(2026, 10, 1, 0, 30))` (local 1 Nov 00:30) is `2026-11-01` with `TZ=Europe/Brussels`; the old UTC form gives `2026-10-31`. Spec runs under a fixed `TZ`.
- [ ] `todayIso(new Date(2026, 9, 31, 23, 30))` is `2026-10-31` in any timezone.
- [ ] `grep -rn "new Date().toISOString().slice(0, 10)" src/app` returns nothing outside specs.
- [ ] The guard (lint rule or spec) fails on a scratch copy and passes on the tree.
- [ ] `range-state.store.spec.ts` gains a case: "this month" at local 2026-11-01 00:30 (Brussels) resolves to 2026-11-01..2026-11-30.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: with the OS clock at 00:30 local on the 1st (or `TZ` changed and the dev server restarted), the dashboard's "This month" shows the new month.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Where it lives:** `src/app/shared/utils/date-buckets.ts`, not root `shared/`. Root `shared/` holds logic both the app and the server run; no server or MCP code reads "today" (grep of `server/src` finds none), and "local today" on the server would mean the _server's_ timezone, which is a different answer. Putting it client-side keeps that mistake from being one import away. If a server tool ever needs "today", it should take the date from the caller.
- **Start of the date-module work:** this is the first of three tickets splitting CR6-A1. [TICKET-SOLID-10](./TICKET-SOLID-10-one-month-step-rule.md) (one month-step rule) and [TICKET-SOLID-11](./TICKET-SOLID-11-drop-private-date-helpers.md) (private helper copies) follow. LOAN-17, REC-13 and FUT-11 build on the date module through SOLID-10; STAT-49 edits the same `date-buckets.ts` but needs none of them. This ticket is independent and can ship first.
- [recurring-series.store.ts:59](../../../src/app/feature-recurring/recurring-series.store.ts) captures `today` once at construction, so a tab left open for days keeps old overdue/stopped flags (CR5-11). Using `todayIso()` there fixes the timezone, not the staleness; making it tick needs a clock signal and is not part of this ticket.
