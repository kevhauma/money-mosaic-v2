# TICKET-TXN-04 — Nullify a transaction (neither income nor expense)

- **Area:** Transactions
- **Type:** Feature
- **Traceability:** extends FR-TXN-1; changes FR-STAT-2 / FR-STAT-3 aggregation; sibling to [CAT-02](./TICKET-CAT-02-neutral-category-kind.md) and [TXN-03](./TICKET-TXN-03-manual-attribution-override.md)

## User story

As a user, I want to mark any transaction as neither income nor expense, so a situation the app's categorisation or joint-account model doesn't support doesn't distort my stats, without forcing me to invent a category or an ownership split for it.

## Description

CAT-02's `neutral` category kind and TXN-03's `attributionOverride` both solve "this transaction doesn't fit the model" problems, but each requires picking a specific category or a specific joint account/share. Sometimes neither applies — a one-off correction, a reversed charge, a data quirk, or any transaction the user simply doesn't want counted as income or expense, joint account or not. This ticket adds a direct, **category- and account-independent** toggle: `nullified`. A nullified transaction still moves money (balance and net worth are unaffected — it's real cash) but is excluded from income, expense, savings rate, and category breakdown, exactly like a linked transfer is today (FR-TRF-1), without requiring an actual transfer counterpart.

## Current situation (as-is)

- `Transaction` in [app-db.ts](../../../src/app/core/data-access/app-db.ts) (lines 19–37) has no field for "exclude this from income/expense." The only existing ways to get that effect are: link it as a transfer ([TransferLinkingService](../../../src/app/core/transfers/transfer-linking.service.ts), which requires a real counterpart transaction and clears the category), or (once [CAT-02](./TICKET-CAT-02-neutral-category-kind.md) lands) assign a `neutral`-kind category, which requires a category to exist and fit.
- [period-stats.ts](../../../src/app/core/stats/period-stats.ts) `computePeriodStats()` buckets every non-transfer transaction into income/expense by amount sign (or, after CAT-02, also skips `neutral`-kind categories) — there is no third, category-independent exclusion path.
- [category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts) `computeCategoryBreakdown()` has the same gap.
- The transaction edit UI ([transaction-edit-form.component.ts](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.ts)) has no control for this and isn't gated on joint accounts existing (unlike TXN-03's attribution control) — this feature is not joint-account-specific.

## Desired result (to-be)

- `Transaction` gains `nullified?: boolean` (default/undefined = `false`). Available on **any** transaction, regardless of account type, category, or whether any joint account exists.
- A `nullified` transaction:
  - **still counts toward account balance and net worth** at its full raw amount (unweighted) — nothing about `nullified` changes what the money actually did,
  - is **excluded from income, expense, net cash flow, savings rate** ([period-stats.ts](../../../src/app/core/stats/period-stats.ts)),
  - is **excluded from `expenseByCategory` / `incomeBySource`** ([category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts)),
  - **keeps its category** (if any) — nullifying doesn't clear `categoryId`/`categoryManual`; the category still labels the transaction for search/filtering, it just doesn't feed the income/expense aggregates.
- `nullified` is **independent of and composes with** [TXN-03](./TICKET-TXN-03-manual-attribution-override.md)'s `attributionOverride`: `attributionOverride` decides *how much weight* a transaction contributes (0% / share / 100%) to both net worth and income/expense; `nullified` separately zeroes out *only* the income/expense side, regardless of weight. A transaction can be `shared` **and** `nullified` at once (its share-weighted amount still hits net worth, but never appears as income or expense).
- The transaction edit UI gains a **"Nullify"** toggle (e.g. "Exclude from income/expense"), always available (not gated on joint accounts), next to the existing category/notes controls.
- A transaction that already has a `transferId` cannot be nullified — a linked transfer leg is already excluded from income/expense by FR-TRF-1, and already has no category ([TICKET-TRF-01](../../v1.0_foundation/tickets/TICKET-TRF-01-clear-category-on-link.md)); allowing `nullified` there would be redundant and confusing. The toggle is hidden/disabled for transfer legs.
- Rules ([rules-engine.service.ts](../../../src/app/core/categorisation/rules-engine.service.ts)) never set or clear `nullified` — it is a manual-only flag, same spirit as `categoryManual`.

## Acceptance criteria

- [x] `Transaction.nullified?: boolean` is added to [app-db.ts](../../../src/app/core/data-access/app-db.ts) with a doc comment: "excluded from income/expense/savings-rate/category-breakdown; still counts toward balance and net worth; independent of category and of `attributionOverride`'s weight." Optional, non-indexed ⇒ **no Dexie version bump**.
- [x] `computePeriodStats()` excludes `nullified` transactions from `income`/`expense` (and therefore `net`/`savingsRate`), applied **after** any `attributionOverride` weighting (so a `shared` + `nullified` transaction's weighted amount still hits net worth but never income/expense) — sits alongside the existing `transferId != null` and (post-CAT-02) `neutral`-kind skips as a third, independent exclusion condition.
- [x] `computeCategoryBreakdown()` excludes `nullified` transactions from both `expenseByCategory` and `incomeBySource`, even when a category is assigned.
- [x] Net worth (`AccountsStore.netWorth`, `computeNetWorthTrend()`) is **unaffected** by `nullified` — a nullified transaction's full raw amount (or its `attributionOverride`-weighted amount, if also overridden) counts exactly as it would if `nullified` were unset. Asserted directly: toggling `nullified` on a transaction changes income/expense but never net worth.
- [x] Nullifying or un-nullifying a transaction never touches `categoryId`, `categoryManual`, or `attributionOverride` — all fields are set/cleared independently via their own controls.
- [x] A transaction with a `transferId` set cannot have `nullified` set (rejected with a clear error if attempted, e.g. via direct repository call); the edit UI hides/disables the toggle for transfer legs. Un-linking a transfer does not auto-nullify either leg.
- [x] The transaction edit UI ([transaction-edit-form.component.ts](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.ts) + template) exposes the toggle unconditionally (no joint-account gating, unlike TXN-03's attribution control), and a nullified transaction is visually indicated in the transactions list/table (e.g. a small badge), so it isn't mistaken for an uncategorised or ordinary transaction.
- [x] Persistence goes through `TransactionsStore` → `TransactionsRepository` (repository-backed), never a direct `appDb.transactions` write; `nullified` round-trips on save/reload.
- [x] The rules engine ([rules-engine.service.ts](../../../src/app/core/categorisation/rules-engine.service.ts)) never sets or clears `nullified` on any transaction, on import or re-run.
- [x] Unit tests cover: a nullified transaction is absent from `income`/`expense`/`savingsRate` and from `expenseByCategory`/`incomeBySource` while still present in balance/net worth math (byte-identical net worth with the flag on vs. off); a `shared`-overridden **and** nullified transaction still hits net worth at its weighted amount but never appears in income/expense; toggling `nullified` doesn't touch `categoryId`/`categoryManual`/`attributionOverride`; setting `nullified` on a `transferId`-bearing transaction is rejected; a plain (non-joint, non-transfer) transaction can be nullified with no other feature involved.
- [x] Verified live in the browser: nullifying an ordinary personal-account transaction removes it from the dashboard's income/expense and category breakdown while the account balance and net worth stay unchanged; the transactions list shows a clear "nullified" indicator; the toggle is unavailable on a linked transfer leg.

## Notes

- **Why not just require a `neutral` category everywhere?** CAT-02's neutral category is purpose-built for partner/co-owner contributions and needs a category to exist and semantically fit. This ticket is the general fallback for "none of the above" — no category needs to be invented, no joint account needs to exist, and it works identically for a solo user with no joint accounts at all. That's also why this ticket doesn't gate its UI on joint accounts existing, unlike TXN-03.
- **Composability, not a fourth `attributionOverride` mode:** it was tempting to add `nullified` as a fourth mode alongside `personal`/`shared`/`notMine`, but that would force a choice between "exclude from income/expense" and "reweight for net worth," when in practice a transaction can need both independently (e.g. a share-weighted joint expense that the user *also* doesn't want counted as an expense this period, for whatever reason). Keeping it a separate boolean lets the two compose instead of forcing an either/or.
- Naming: `nullified` is the storage value; consider a friendlier UI label ("Exclude from income/expense") similar to CAT-02's naming note.
- Not a substitute for the general "split transaction across multiple categories" feature parked in the v2 backlog ([../v2/requirements.md](../../v2/requirements.md)) — this only ever fully in-or-out excludes a transaction, it never partially categorises it.
