# TICKET-CAT-07 — Make rule from filter

- **Area:** Categories (rules)
- **Traceability:** FR-CAT-2 (rules engine conditions/operators), FR-CAT-4 (existing "create rule from X" precedent), FR-TXN-3 (filter axes being converted)

## User story

As a user who has just filtered the transaction overview down to the transactions I want to categorise a certain way (e.g. all transactions from one account containing "Netflix" over €10), I want to turn that active filter directly into a categorisation rule, so I don't have to re-enter the same conditions by hand in the Rules screen.

## Description

Adds a "Make rule from filter" action to the transaction overview's filter bar, enabled whenever at least one filter axis is active. It opens the existing rule form pre-populated with `RuleCondition`s derived from the current filter, so the user only has to pick a target category (and optionally adjust/name the rule) before saving.

## Current situation (as-is)

- [transaction-filters.component.ts:85-93](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.ts) — the filter bar's reactive form exposes `accountId, dateFrom, dateTo, categoryId, text, amountMin, amountMax`; [transaction-filters.component.ts:142-145](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.ts) exposes `hasActiveFilters` and [:156](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.ts) a `clearFilters()` already wired to a "Clear filters" affordance — there's no equivalent "make rule" action anywhere near it.
- [transaction-filters.ts:5-13](../../../src/app/feature-transactions/transaction-filters.ts) defines `TransactionFilters` and [:20-60](../../../src/app/feature-transactions/transaction-filters.ts) the pure `matchesTransactionFilters` predicate the overview applies — this is the only place the "current filter" concept exists today, and it has no conversion to a `RuleCondition[]`.
- [transactions-overview.component.ts:113-127](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) — the overview owns the `filters` signal and `filteredTransactions` computed, and holds a `viewChild` reference to `TransactionFiltersComponent`, but has no path into `feature-categories`' rules UI at all today (the two features don't currently talk to each other).
- [app-db.ts:142-146](../../../src/app/core/data-access/app-db.ts) — `RuleCondition.field` only supports `'description' | 'counterpartyName' | 'counterpartyIban' | 'amount' | 'accountId'`; there is no date-range or category condition, so `dateFrom`/`dateTo`/`categoryId` in `TransactionFilters` have no direct rule equivalent.
- [rules.store.ts:104-124](../../../src/app/feature-categories/rules.store.ts) — the only existing "create rule from X" shortcut is `createRuleFromCounterparty` (FR-CAT-4, invoked from the transaction edit form's "always categorise this merchant as X" checkbox), which builds a single `counterpartyName equals <name>` condition directly in the store with no review step.
- [rule-form.component.ts:79-83](../../../src/app/feature-categories/components/rule-form/rule-form.component.ts) — `RuleFormComponent` already accepts an `input<Rule | null>()` and opens as a modal (`model(false) open`), emitting `saved` with the finished `RuleFormValue` — this is the natural reuse point instead of building a second rule-editing surface.

## Desired result (to-be)

- The transaction overview's filter bar gains a "Make rule from filter" button, disabled/hidden when `hasActiveFilters` is false (mirrors `clearFilters`'s existing enablement).
- Clicking it converts the current `TransactionFilters` into a starting `RuleCondition[]`:
  - `text` → `{ field: 'description', operator: 'contains', value: text }`
  - `accountId` → `{ field: 'accountId', operator: 'equals', value: accountId }`
  - `amountMin` + `amountMax` both set → `{ field: 'amount', operator: 'between', value: [amountMin, amountMax] }`; only one set → `operator: '>' \| '<'` against that single value
  - `dateFrom`/`dateTo` and `categoryId` are **not** convertible (no matching `RuleCondition.field` exists) — they're simply left out of the generated conditions, and the rule-form UI shows a short inline note (e.g. "Date and category filters aren't included — rules can't match on those yet") so the omission isn't silent.
- The generated `Rule` (no `id`, `conditionMatch: 'all'`, empty `action.setCategoryId`, a default name like `Rule from filter (<date>)`) opens in the existing `RuleFormComponent` modal, reused as-is from `feature-categories` — the user reviews/edits the pre-filled conditions, picks the target category, names it, and saves through the form's existing `saved` flow (same persistence path `createRuleFromCounterparty` already uses, including the post-save backfill run).
- If every convertible axis is empty (e.g. only `dateFrom`/`dateTo`/`categoryId` are set) the button is disabled with a tooltip explaining there's nothing to convert, rather than opening an empty rule.

## Acceptance criteria

- [x] A pure function (alongside `matchesTransactionFilters` in `transaction-filters.ts`, or a sibling file) converts `TransactionFilters` → `RuleCondition[]`, covering: text→description-contains, accountId→accountId-equals, amount min/max→amount between/`>`/`<`, and omitting date/category axes entirely.
- [x] "Make rule from filter" button appears in the transaction overview's filter bar, enabled only when at least one *convertible* axis (`text`, `accountId`, `amountMin`, `amountMax`) is set — not merely when `hasActiveFilters` is true, since a date-only or category-only filter has nothing to convert.
- [x] Clicking it opens the existing `RuleFormComponent` modal pre-populated with the generated conditions, `conditionMatch: 'all'`, and an empty target category left for the user to choose — no new rule-editing UI is built.
- [x] A visible note in the opened form names any active filter axes that were excluded from conversion (date range and/or category).
- [x] Saving goes through `RuleFormComponent`'s existing `saved` output into `RulesStore` (same persistence + backfill path as `createRuleFromCounterparty`) — no direct Dexie table writes from the transaction-overview feature.
- [x] Unit tests cover: the filter→conditions conversion function for each axis individually and in combination; the button's enabled/disabled state across filter combinations (text-only, account-only, amount-only, date/category-only, none); the modal receives the expected pre-filled `Rule` shape when opened.
- [x] Verified via the fallow skill and coding-conventions skill, plus a live browser check (ask the user first per this repo's verification rule; continue without it if declined).

## Notes

- This is a QoL/interaction ticket, not part of the v1.5 styling rework — filed under `docs/v1.5_redesign`'s "QoL addendum" section at the user's request, same as [TICKET-IMP-07](./TICKET-IMP-07-guided-mapper-feedback.md). Independent of any `TICKET-UI-*` ticket and of TICKET-IMP-07.
- Deliberately reuses `RuleFormComponent` rather than adding a second "quick rule" surface — keeps validation (regex length cap, required fields), operator/field labels, and the save/backfill path in one place.
- Scope is the transaction-overview → rule-form direction only; it does not add a reverse "apply this existing rule as a filter" affordance, and does not touch `createRuleFromCounterparty`'s existing counterparty shortcut.
- If a future ticket adds date-range or category conditions to the rules engine itself, this ticket's conversion function should be revisited to include them — noted here so it isn't forgotten, not scoped into this ticket.
