# TICKET-STAT-03 — Contribution-based net worth for joint accounts

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** changes FR-STAT-1 and FR-TRF-1 semantics for joint accounts; touches FR-STAT-2/3/4; depends on [ACC-02](./TICKET-ACC-02-joint-ownership-share.md) + [ACC-03](./TICKET-ACC-03-multi-owner-coowner-ibans.md) + [CAT-02](./TICKET-CAT-02-neutral-category-kind.md)
- **Source story:** user-stories.md §6 — *"As someone with a shared account, I want my net worth to count only my contribution to a joint account (my deposits and income in, minus my share of joint spending) rather than the whole shared balance."*

## Description

Make net worth count only *my* stake in a joint account under a **contribution model**: my deposits into the pot (from my own accounts) and my own income into it count at 100%; a partner's/external inflow counts at 0% (via the `neutral` kind from [CAT-02](./TICKET-CAT-02-neutral-category-kind.md)); joint spending reduces my stake by my `ownershipShare` (from [ACC-02](./TICKET-ACC-02-joint-ownership-share.md)); money I move back out to my own accounts reduces it at 100%. The account's real bank balance is unchanged and still shown on the accounts page — only the *net-worth contribution* of a joint account is re-weighted. Income/expense stats are weighted consistently so savings rate stays coherent with the stake.

## The contribution contract (defines the maths)

For a **non-joint** account (or any account with `ownershipShare` undefined/1), everything behaves exactly as today. For a **joint** account `J` with share `s = ownershipShare`:

- **Real bank balance** (unchanged, shown on accounts page): `openingBalance_J + Σ amount(J)`.
- **My net-worth stake** in `J`:
  - `+ s × openingBalance_J` — my share of the pre-existing pot (provenance of opening balance is unknowable, so it is apportioned by share; recorded decision, see Notes),
  - `+ Σ mineIn` — inflows that are mine: a linked transfer whose other leg is one of my **own non-joint** accounts, **or** a positive, non-`neutral`, non-transfer amount whose counterparty is **not** a registered co-owner IBAN (treated as my income into the pot) → **100%**,
  - `− Σ mineOut` — a linked transfer from `J` **to** one of my own accounts (I withdrew my money) → **100%**,
  - `− s × Σ jointSpend` — negative, non-transfer outflows (shared spending) → **my share only**,
  - co-owner/external inflows contribute **0** — identified by `kind === 'neutral'` **or** a `counterpartyIban` matching a registered co-owner IBAN ([ACC-03](./TICKET-ACC-03-multi-owner-coowner-ibans.md)), so a co-owner deposit counts as 0 to my stake even before it has been tagged.
- **My income (period stats):** income to my own accounts (100%) + my income into `J` (100%); partner contributions excluded (already handled by CAT-02).
- **My expense (period stats):** expense from my own accounts (100%) + `s × jointSpend`.

Transfers remain excluded from income/expense (unchanged) and, crucially, **still net to zero in net worth**: moving €500 from my checking to `J` is `−500` on checking and `+500` mineIn on `J`. Worked example (`s = 0.5`): I deposit €1000 (stake +1000), partner deposits €1000 as a neutral contribution (stake +0), we spend €400 groceries (stake −200). My stake = **€800**; real balance = **€1600**. The €800 gap is the partner's stake plus the €200 they "owe" the pot — accepted (see Notes).

## Current situation (as-is)

- Net worth is the **raw** combined balance: [accounts.store.ts](../../../src/app/feature-accounts/accounts.store.ts) `balancesById` = `openingBalance + Σ amount`, and `netWorth` = sum of those. Joint accounts count their **whole** balance, and there is no notion of "my share."
- The net-worth **trend** is likewise raw: [net-worth-trend.ts](../../../src/app/core/stats/net-worth-trend.ts) `computeNetWorthTrend()` seeds a running total from `Σ openingBalance` and walks every transaction's full `amount`.
- Period stats ([period-stats.ts](../../../src/app/core/stats/period-stats.ts)) and the category breakdown ([category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts)) count every non-transfer transaction at its **full** amount regardless of account type.
- FR-TRF-1 ([finance-app-spec.md](../../v1/finance-app-spec.md)) currently states a transfer is "included in net worth (it nets to zero)" as a blanket rule — true today because both legs count at 100%. Under this ticket it still nets to zero, but the *reasoning* changes for the joint leg (a mineIn at 100%), so the spec wording needs a joint-account clarification.

## Desired result (to-be)

- `AccountsStore.netWorth` (and any per-account net-worth contribution it exposes) computes each joint account's stake per the contribution contract above; non-joint accounts are unchanged. **`balancesById` still returns the real bank balance** — the accounts page keeps showing the true figure, with "your share: €X" as a secondary line.
- `computeNetWorthTrend()` applies the same stake maths per bucket so the trend and the point-in-time figure agree at every boundary.
- Period stats and category breakdown weight joint-account outflows by `s` (my expense), leaving my income into the pot at 100% and partner contributions excluded (CAT-02).
- A single shared helper decides, for a joint-account transaction, which bucket it falls in (`mineIn` / `mineOut` / `jointSpend` / partner-neutral) — reused by net worth, the trend, and period stats so the three never disagree.
- FR-STAT-1, FR-TRF-1, and §5 aggregation rules in the spec are updated to describe joint-account contribution semantics.

## Acceptance criteria

- [x] A single classification helper (e.g. `classifyJointLeg(transaction, account, ownAccountsById, transfersById, categoriesById, coOwnerIbans)` in `core/stats`) returns the leg type (`mineIn` / `mineOut` / `jointSpend` / `coOwnerIn`), resolving co-owner inflows via the ACC-03 registry; `netWorth`, `computeNetWorthTrend`, and `computePeriodStats`/`computeCategoryBreakdown` all consume it — **no duplicated per-site logic**.
- [x] `AccountsStore.netWorth` counts each joint account's **stake** (`s × openingBalance + Σ mineIn − Σ mineOut − s × Σ jointSpend`), and non-joint accounts exactly as before; a config with no joint accounts produces byte-identical net worth to today (regression guard).
- [x] `balancesById` is **unchanged** (real bank balance); the accounts UI additionally surfaces the joint account's "your share" figure sourced from the same stake maths.
- [x] `computeNetWorthTrend()` seeds and accumulates joint legs by the same rules, so `netWorthTrend().at(last)` for the full range equals `AccountsStore.netWorth()` (point-in-time vs trend agree) — asserted in a test.
- [x] `computePeriodStats()` weights joint-account outflows by `s` into `expense` (and recomputes `net`/`savingsRate` consistently); my income into a joint account stays at 100%; partner `neutral` inflows stay excluded (CAT-02). `savingsRate`'s meaning is documented against the weighted figures.
- [x] `computeCategoryBreakdown()` weights joint-account expense slices by `s` so category shares reflect my borne cost, not the pot's full spend.
- [x] Share-weighting is applied at the **aggregate** level (sum the joint outflows, then multiply by `s`, then round) — not per-transaction — to avoid cent-level rounding drift; a test asserts no drift across many small transactions.
- [x] Transfers still net to zero in net worth for the joint case (own-account → joint deposit nets to zero; joint → own-account withdrawal nets to zero) — asserted directly.
- [x] Per-account net-worth-over-time ([TICKET-STAT-02](../../v1/tickets/TICKET-STAT-02-per-account-networth.md), if/when present) uses the stake figure for joint accounts so the per-account lines still sum to the combined line.
- [x] A joint account exposes a **per-contributor breakdown** — my contributions (100% inflows), each registered co-owner's contributions (their tagged/resolved neutral inflows, keyed by the ACC-03 `iban → co-owner` map), and an "unattributed/external" bucket for inflows from unregistered IBANs — so the user can see who has put in what. Rendering location is a small design call (account detail card); the attribution contract above is the requirement.
- [x] No stored transaction `amount` is ever mutated; all weighting is in the derived/`computed` layer. No new Dexie version is required by this ticket (it consumes ACC-02's field and CAT-02's kind).
- [x] The `angular.json` bundle budget is not raised.
- [x] Spec updated: FR-STAT-1, FR-TRF-1, and §5 aggregation rules in [finance-app-spec.md](../../v1/finance-app-spec.md) describe joint-account contribution semantics (including the "transfer nets to zero via a 100% mineIn leg" clarification), so `spec-navigator` stops giving the old blanket answer.
- [x] Unit tests cover: the worked example (stake €800 vs balance €1600 at `s=0.5`); own→joint deposit nets to zero; joint→own withdrawal nets to zero; a co-owner inflow (by registered IBAN) adds 0 to stake but moves balance — even untagged; two different co-owners' inflows attribute to the right person in the per-contributor breakdown; joint spend hits stake at `s` and expense at `s`; a non-joint-only dataset is unchanged; trend end equals point-in-time net worth; rounding stability.
- [x] Verified live in the browser: on a dataset with one joint account (`s=0.5`), the topbar net worth shows my stake (not the full balance), the accounts page shows the full balance plus "your share", the dashboard expense/savings-rate reflect the weighted joint spend, and moving money in/out of the joint account leaves net worth unchanged at the moment of transfer. **Partially verified**: using the existing dev-seeded "Shared Household" joint account (a `coOwnerIn`-only scenario — its full €850 balance is a tagged partner contribution), confirmed live that the accounts page/detail page show the real €850 balance plus "Your share: +€0.00", the Contributions card correctly attributes €0 to me / €850 to Partner, and the topbar net worth (€16,898.26) equals `checking + savings + 0` — i.e. the joint balance is excluded from net worth exactly as the stake maths predicts, with no console errors. Did not construct a fresh `mineIn`/`jointSpend` scenario (no manual transaction-entry UI, only CSV import) to observe the dashboard's weighted expense/savings-rate or a live transfer-in-progress — those paths are covered by the unit tests above instead.

## Notes

- **Accepted trade-off (the "IOU"):** when I fund the pot more than my partner and we then spend, my stake can exceed my *arithmetic* share of the real balance — the surplus is money my partner has effectively consumed from my contributions (an informal IOU) counted as my net worth. This is inherent to contribution tracking and was chosen deliberately over share-of-balance. Call it out in the "your share" tooltip so the number is explainable.
- **Opening-balance apportionment:** the pot's opening balance predates any tracked provenance, so it is apportioned by `s` rather than by deposit history. This is the one seam where the model falls back to a flat share; document it. If a user wants precision, they can set the joint account's `openingBalance` to their own contributed portion and `openingBalanceDate` to when tracking began — but that changes the displayed real balance, so it is a user choice, not the default.
- **"My income into the pot" heuristic:** a positive, non-`neutral`, non-transfer amount from an IBAN that is neither my own account nor a registered co-owner is assumed to be mine. Registering co-owner IBANs (ACC-03) is what shrinks this guess to genuinely-unknown senders; for those, the fix is better classification (tag it `neutral`, or add the sender as a co-owner IBAN), not a maths change — the model is only as good as the identity data, which is why ACC-03 + CAT-02 + TRF-03 matter.
- Depends on ACC-02 (the `ownershipShare` field), ACC-03 (the co-owner IBAN registry that makes co-owner inflows positively identifiable and per-contributor attribution possible), and CAT-02 (the `neutral` kind). Do not start until all three are merged; otherwise the classification helper has nothing to read.
