# TICKET-CAT-02 — "Neutral" category kind for partner/external contributions

- **Area:** Categorisation
- **Type:** Feature
- **Traceability:** extends FR-CAT-1; changes FR-STAT-2 / FR-STAT-3 aggregation; consumed by [STAT-03](./TICKET-STAT-03-contribution-net-worth.md)
- **Source story:** user-stories.md §4 — *"As someone with a shared account, I want money paid into a joint account by my partner or another person marked as a non-income 'contribution' that still affects the balance but never counts as my income."*

## Description

Add a third `Category.kind` — `'neutral'` — meaning "affects account balance and net worth, but is excluded from income, expense, savings-rate, and category-breakdown aggregates." This is the same treatment linked transfers already get, but expressed as a **category** so it works for a **one-sided** inflow whose counterpart never lands in the app (a partner's salary or top-up into a joint account, a reimbursement, settling-up, a returned deposit). Ship a seeded system category **"Partner contribution"** of this kind and let rules auto-assign it.

## Current situation (as-is)

- `Category.kind` in [app-db.ts](../../../src/app/core/data-access/app-db.ts) is `'expense' | 'income'` only. `DEFAULT_CATEGORIES` seeds ~10 expense/income categories; `this.on('populate')` seeds them first-run only (existing users get nothing new without an `.upgrade()`).
- Income/expense are decided **by amount sign**, not by category kind, in the stats layer:
  - [period-stats.ts](../../../src/app/core/stats/period-stats.ts) `computePeriodStats()` skips `transferId != null`, then buckets purely on `amount > 0` (income) / `amount < 0` (expense). A partner's positive deposit is therefore counted as **income**.
  - [category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts) `computeCategoryBreakdown()` uses `category ? category.kind === 'expense' : amount < 0` — so with no category it falls back to sign, and there is no way for a category to say "count me in neither bucket."
- Rules ([rule-matching.ts](../../../src/app/core/categorisation/rule-matching.ts) + [rules-engine.service.ts](../../../src/app/core/categorisation/rules-engine.service.ts)) already match on `counterpartyIban` / `counterpartyName` and set a `categoryId`, and already respect `categoryManual` (FR-CAT-3) — so a "if counterparty = partner's IBAN → Partner contribution" rule needs no rules-engine change once the category exists.

## Desired result (to-be)

- `Category.kind` becomes `'expense' | 'income' | 'neutral'`.
- A `neutral` transaction:
  - **still counts toward account balance and net worth** (balances are derived from raw `amount`, unaffected),
  - is **excluded from income, expense, net, savings-rate** ([period-stats.ts](../../../src/app/core/stats/period-stats.ts)),
  - is **excluded from `expenseByCategory` / `incomeBySource`** ([category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts)) — it never shows up as an (uncategorised) income or expense slice.
- A seeded system category **"Partner contribution"** (`kind: 'neutral'`, `isSystem: true`) exists for both fresh installs (`populate`) and existing users (additive `.upgrade()`). One shared neutral category is used for **all** co-owners — the *specific* contributor is resolved on the fly from `counterpartyIban` against [ACC-03](./TICKET-ACC-03-multi-owner-coowner-ibans.md)'s co-owner registry, not by minting a category per person.
- Auto-assignment is driven by the **co-owner IBAN registry** (ACC-03), not a hand-written single-partner rule: any joint-account inflow whose `counterpartyIban` matches a registered co-owner IBAN is tagged neutral automatically. Users/rules can still assign it manually, and `categoryManual` protection is preserved.
- This distinguishes a co-owner's deposit (neutral, attributed to that person) from *my own* salary paid into a joint account (still `income`, counted fully) and from an unregistered external inflow (falls back to sign until tagged).

## Acceptance criteria

- [ ] `Category.kind` widened to `'expense' | 'income' | 'neutral'` in [app-db.ts](../../../src/app/core/data-access/app-db.ts) with a doc comment defining `neutral` = "in balance/net worth, out of income/expense/savings-rate/breakdown." (Enum widening on an already-indexed field needs **no index change**.)
- [ ] `computePeriodStats()` excludes transactions whose assigned category kind is `neutral` from `income`/`expense` (and therefore from `net`/`savingsRate`) — it must look up the category kind, not just the amount sign; the exclusion sits alongside the existing `transferId != null` skip.
- [ ] `computeCategoryBreakdown()` excludes `neutral`-kind transactions from both `expenseByCategory` and `incomeBySource`, so a neutral inflow never appears as an income source or an uncategorised slice.
- [ ] A seeded **"Partner contribution"** category (`kind: 'neutral'`, `isSystem: true`, sensible colour/icon) is added to `DEFAULT_CATEGORIES` (first-run) **and** backfilled for existing users via an additive `.version(6)` `.upgrade()` block that is **idempotent** (does not duplicate the category if run/re-run, and does not clobber a user who already made one).
- [ ] The `.version(6)` `.stores({...})` call repeats the **complete** table map (per the versioning rule), and no shipped version block (1–5) is edited.
- [ ] The categorisation UI (category picker / manager surfaces, wherever kind is shown or chosen) renders `neutral` sensibly and does not assume kind is binary (audit for `kind === 'income' ? ... : ...` ternaries that would mis-handle a third value).
- [ ] A joint-account inflow whose `counterpartyIban` matches a registered co-owner IBAN ([ACC-03](./TICKET-ACC-03-multi-owner-coowner-ibans.md)) is auto-tagged "Partner contribution" (neutral) on import, via the rules engine or an equivalent registry-driven step, and respects `categoryManual` (FR-CAT-3) — a manually-set category is never overwritten. Assigning it manually sets `categoryManual`.
- [ ] The specific contributing co-owner is resolvable for any neutral joint-account inflow (via the ACC-03 `iban → co-owner` helper) without needing a separate category per person — this is what lets STAT-03 report per-contributor totals.
- [ ] Persistence of the seeded category and any assignment goes through the repository/stores, never a direct `appDb.categories` / `appDb.transactions` write.
- [ ] Unit tests cover: a `neutral` transaction is absent from `income`/`expense`/`savingsRate` while still present for balance math; absent from `expenseByCategory`/`incomeBySource`; a same-account positive `income` transaction still counts as income (so the kind, not the sign, drives it); the `.version(6)` upgrade adds exactly one "Partner contribution" and is a no-op on a second run.
- [ ] Verified live in the browser: a joint-account inflow tagged "Partner contribution" leaves the dashboard income and savings-rate unchanged but the account balance reflects it; a rule on the partner's IBAN auto-tags future imports.

## Notes

- **Naming:** `neutral` is the storage value; the UI label can be friendlier ("Contribution / excluded"). Keep the stored kind stable.
- This is the classification substrate [STAT-03](./TICKET-STAT-03-contribution-net-worth.md) reads to know which joint-account inflows are the partner's (0% to my stake) versus mine (100%). Build this before STAT-03.
- Reuse for adjacent cases beyond joint accounts: reimbursements, settling-up transfers from a person not in the app, returned deposits — anything that is "money arriving that isn't my earnings." The kind is general even though the story frames it around joint accounts.
- Watch [TICKET-TRF-03](./TICKET-TRF-03-guard-partner-inflow-matching.md): a neutral inflow should also be kept out of transfer amount/date matching, so the two tickets share the "is this a partner/external inflow" signal.
