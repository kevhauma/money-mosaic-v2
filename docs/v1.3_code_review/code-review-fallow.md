# Code Review 3 — Fallow-Grounded Health Review

Full-codebase review (2026-07-14) of `src/app`, anchored on Fallow 3.3.0's static layer (dead code, duplication, complexity, hotspots, circular dependencies, CSS drift, security candidates) with a manual read-through to verify every machine finding before it became an item. Sibling to the [first review](../code-review/code-review-optimizations.md) (correctness/performance, 2026-07-04) and the [second](../coding-review-2/code-review-dx-solid.md) (DX/SOLID, 2026-07-07); items here carry `CR3-*` IDs.

**Headline: the codebase is healthy.** Fallow's vital signs for 232 files / ~16,100 LOC: average cyclomatic complexity 2.1 (p90 = 4), average maintainability index 91.9 (only 0.5% of files score low), zero unused files, zero unused dependencies, zero CSS token-drift/dead-surface findings, and one low-severity security candidate. The real findings cluster around three things: one small correctness bug in the stats layer, one triplicated classification algorithm that is the app's complexity peak *and* an accelerating churn hotspot, and 20 circular import chains that all share a single root cause. A large share of Fallow's raw output (19 "unused exports", 23 "unused class members") turned out to be false positives or test-only surface — §5 documents them so nobody "cleans" working code, and §6 turns that into config so future runs are high-signal.

---

## 1. Correctness

### 1.1 A nullified savings movement still counts toward `savings` and `savingsRate`

In `computePeriodStats` ([period-stats.ts:76-86](../../src/app/core/stats/period-stats.ts)) the per-transaction exclusion checks run in this order:

```
inRange → isSavingsMovement (savings += …; continue) → transferId → nullified
```

Because the savings check runs **before** the nullified check, a transaction the user has nullified whose counterparty is an own savings IBAN still adds to `savings` — and therefore inflates `savingsRate` (`savings / income`). That contradicts both TICKET-TXN-04's acceptance criteria ("excluded from income, expense, net cash flow, **savings rate**") and this function's own docblock ("A `nullified` transaction is skipped outright regardless of which path above would otherwise apply").

`computeCategoryBreakdown` ([category-breakdown.ts:100-105](../../src/app/core/stats/category-breakdown.ts)) checks the same predicates in a *different* order (`transferId → nullified → isSavingsMovement`) — harmless there because every branch is a bare `continue`, but the inconsistency is exactly the kind of drift §2.1 is about.

**Fix:** hoist `if (transaction.nullified) continue;` above the `isSavingsMovement` branch in `computePeriodStats` (a linked-transfer savings leg must keep counting toward `savings`, so `transferId` must stay *below* the savings check — only `nullified` moves up). One spec: a nullified deposit to a savings account contributes 0 to `savings`.

---

## 2. Complexity & duplication (Fallow `health` + `dupes`, verified)

Fallow found 10 clone groups and 107 functions above thresholds (26 critical / 37 high / 44 moderate out of 1,106 analyzed). The ones below are the consequential subset.

### 2.1 The joint/override classification branch exists three times — and two of the three are accelerating hotspots

The two worst complexity findings in the app are the same algorithm written twice:

| Function | Cyclomatic | Cognitive | Hotspot trend |
|---|---|---|---|
| `computeCategoryBreakdown` ([category-breakdown.ts:84](../../src/app/core/stats/category-breakdown.ts)) | 29 | 45 | **accelerating** (22.9) |
| `computePeriodStats` ([period-stats.ts:59](../../src/app/core/stats/period-stats.ts)) | 27 | 45 | **accelerating** (19.2) |
| `computeWeekdayWeekendSplit` ([weekday-weekend-split.ts:46](../../src/app/core/stats/weekday-weekend-split.ts)) | 21 | 37 | — |

All three run the same per-transaction pipeline: range/transfer/nullified/savings exclusions, then the joint-account / `attributionOverride` routing through `resolveContribution` with its two special cases (`personal`-mode netting by category kind; the untagged positive-amount-on-expense-category refund rule), then bucketing. Fallow's dupes pass fingerprints the overlap directly (`dup:a29a2c00` — category-breakdown 109-120 ≡ period-stats 88-100; `dup:edea22f4` — the exclusion preamble shared by period-stats, spending-rate, and weekday-weekend-split). `weekday-weekend-split.ts`'s docblock even says it "mirrors `computePeriodStats` exactly … so this can't drift into a fourth definition of expense" — a manual mirror is precisely how drift happens, and §1.1 shows the first two copies have *already* drifted on check order.

`computeSpendingRate` ([spending-rate.ts:31](../../src/app/core/stats/spending-rate.ts)) shows the right shape: it delegates to `computePeriodStats` instead of mirroring it.

**Fix:** extract one shared per-transaction classifier in `core/stats` — something like `classifyForStats(transaction, ctx): { skip } | { bucket: 'income'|'expense'|'savings', amount }` — and have all three aggregations consume it (weekday-weekend-split simply ignores non-expense results). This resolves the two critical complexity findings, both accelerating stats hotspots, both dupe groups, and makes §1.1-style ordering divergence structurally impossible. Do it while the churn trend says these files are about to be edited again anyway.

### 2.2 `transaction-edit-form` is the app's most complex component

Fallow's component rollup puts [transaction-edit-form.component.ts](../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.ts) at cyclomatic 30 (template 16 + worst method `resetForm` 14), with the [template](../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.html) itself a critical finding (cognitive 23, 127 lines). The class is actually in decent shape — small computeds, validation errors surfaced as signals — the weight is the *attribution override* sub-feature (mode select, joint-account picker, reimbursement picker, three visibility computeds, `buildAttributionOverride`) living inline. Extracting an `attribution-override-fieldset` child component (form group in, `Transaction['attributionOverride']` out) would roughly halve both the class and the template. Same medicine, lower urgency, for `rule-form` (27/26) and `import-map-step` (24/37).

While in there, a micro-fix: `transferAmount`/`transferDate` ([transaction-edit-form.component.ts:163-175](../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.ts)) each run `.find()` over the whole transactions array *per template call, per candidate row*. A `transactionsById` computed (the component already builds that map twice elsewhere) makes them O(1) lookups.

### 2.3 The two history charts duplicate their entire reactive scaffolding

`dup:db831d48` (109 tokens, the largest clone in the app): [account-balance-chart.component.ts:74-115](../../src/app/feature-accounts/components/account-balance-chart/account-balance-chart.component.ts) and [net-worth-history-chart.component.ts:83-124](../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts) wire identical `range` / `granularity` / `jointLegContext` / `computeAccountBalanceTrends` / `zoomWindow` computed chains — they differ only in "one account vs. active accounts" and the final option builder. A shared helper (e.g. `balanceTrendSignals(accounts: Signal<Account[]>)` returning `{ granularity, points/series, zoomWindow }`) collapses ~40 duplicated lines per component and gives TICKET-STAT-15's granularity-default rule a single home.

### 2.4 `confirm-dialog` still hand-rolls the effect that `mm-modal` was extracted for

`dup:42bf7346`: [confirm-dialog.component.ts:30-39](../../src/app/shared/ui/confirm-dialog/confirm-dialog.component.ts) contains the exact `showModal()`/`close()` open-effect that TICKET-NG-01 (first review) extracted into [mm-modal.component.ts](../../src/app/shared/ui/modal/mm-modal.component.ts). Rebuilding `ConfirmDialogComponent`'s template on top of `<mm-modal [(open)]>` finishes that ticket's job and deletes the last copy of the pattern.

### 2.5 Residual small clones — mostly already ticketed, one new

- `dup:99b7c535` / `dup:dc1fd0b3`: the "collect ids → `cleanupTransfersForRemovedTransactions` → `bulkRemove`" orchestration appears in [account-deletion.service.ts:53](../../src/app/core/accounts/account-deletion.service.ts), [import.service.ts:168](../../src/app/core/import/import.service.ts), and [transaction-deletion.service.ts:21](../../src/app/core/transactions/transaction-deletion.service.ts). This is the residue *after* TICKET-SOLID-03 extracted the cascade core — seven lines of glue per site around a shared service. Acceptable as-is; if touched again, a `removeTransactionsWithTransferCleanup(transactions)` helper on `TransferCleanupService` would absorb all three.
- `dup:edd1ec44` (accounts-overview vs. categories-overview delete-confirm scaffolding): already backlogged as CR2-6.3 (`createConfirmState<T>()`) — still open, still valid.
- `dup:f868aa89` (rule-filters vs. transaction-filters): the debounced-text part was already unified via `debouncedTextSignal`; what remains duplicated is the `structuralFilters` `toSignal` + `distinctUntilChanged` block. Could fold into the same shared utility family; low value, low risk.
- `dup:d9247208` (suggestions-table vs. transactions-overview category-select handler) and `dup:fbfaad2e` (date-buckets vs. period-window month arithmetic): noted, both under 15 lines, fine to leave.

### 2.6 Explicit non-findings (leave these alone)

`matchesTransactionFilters` ([transaction-filters.ts:20](../../src/app/feature-transactions/transaction-filters.ts)) scores cyclomatic 24, but it's a flat guard-clause list, extracted from the component precisely to be testable, and specced. Restructuring it to appease the metric would make it worse. Same reasoning for `mapRow`/`parseDate`/`resolveAmount` in [csv-row-mapper.ts](../../src/app/core/import/csv-row-mapper.ts) — format-dispatch functions are naturally branchy and each branch is spec-covered. Suppression comments (`// fallow-ignore-next-line complexity`) are the right tool if these keep showing up in gated runs.

---

## 3. Circular dependencies — 20 cycles, one root cause

Fallow reports 20 circular import chains (86.2 per 1k files — the only vital sign in the red). Every one of them is a walk around the same loop:

- feature-**categories** components import `AccountsStore` from the `@/feature-accounts` barrel ([rules-overview.component.ts:13](../../src/app/feature-categories/components/rules-overview/rules-overview.component.ts), [rule-form.component.ts:20](../../src/app/feature-categories/components/rule-form/rule-form.component.ts))
- feature-**accounts** components import `CategoriesStore` from the `@/feature-categories` barrel ([account-balance-chart.component.ts:18](../../src/app/feature-accounts/components/account-balance-chart/account-balance-chart.component.ts), [net-worth-history-chart.component.ts:17](../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts))
- both barrels also re-export their routes and component indexes, so the two feature graphs each pull the other in whole.

Each component is individually following the CLAUDE.md rule ("cross-feature imports go through the feature's `index.ts` barrel") — the rule produces the cycle once two features need each other's *stores*. The consequences are the known ones: both lazy route chunks transitively reference each other (weakening the lazy boundary) and module-initialization order becomes load-path-dependent (the same class of risk that already forced the documented `app.routes.ts` deep-import exception, and the deep-import workaround at [transfer-matching.ts:2-4](../../src/app/core/transfers/transfer-matching.ts)).

**Fix — and it's already on the backlog:** CR-6.1 / CR2-4.1 ("move the entity stores to `core/state` before the next cross-store feature"). These 20 cycles are the evidence that the *next cross-store feature has already shipped*. Moving the four widely-shared entity stores (`AccountsStore`, `CategoriesStore`, `TransactionsStore`, `TransfersStore`) under `core/` makes every one of the 20 cycles disappear without any component changing what it consumes, and no new convention is needed — `core` is already below every feature. Until then, don't add suppressions; the count is a useful regression signal.

---

## 4. Security (Fallow `security` + manual pass)

One candidate, total (CWE-1333, low): the user-authored rule pattern compiled per evaluation at [rule-matching.ts:38](../../src/app/core/categorisation/rule-matching.ts) — `new RegExp(String(condition.value), 'i')`. In a local-first app with no backend, the only "attacker" is the user ReDoS-ing their own browser tab, so this is a robustness issue, not a vulnerability: a catastrophically-backtracking pattern in one rule, run across thousands of transactions ("run rules" pass), freezes the UI thread. The already-open CR-3.2 (compile each rule's regex **once per run-rules pass**, not per transaction) shrinks the blast radius and is a perf win independently; a length cap on the pattern input would finish the job. The existing `try/catch` already handles invalid patterns.

Context for the rest of the report: `client-server-leak` is structurally N/A (no server), there are no secrets to hardcode, and the app's only injection surfaces (CSV cells, `rawRow` display) render through Angular interpolation, which escapes by default. Nothing else warranted a finding.

---

## 5. Fallow findings verified as false positives / test-only surface — do **not** "clean" these

This section exists so the raw Fallow numbers don't get turned into a deletion PR. Every item below was manually traced.

### 5.1 The 19 "unused exports" + 1 "unused type" are in-file-used or test-only

Spot-check proof (pattern holds for the whole list): `conditionMatches` is called by `matchesRule` in the same file ([rule-matching.ts:55](../../src/app/core/categorisation/rule-matching.ts)) and by its spec; `mapRow` by `mapRows` ([csv-row-mapper.ts:170](../../src/app/core/import/csv-row-mapper.ts)); `createCategoryModelWorkerHandler` self-registers at [category-model.worker.ts:304](../../src/app/core/ml/category-model.worker.ts); `needsPartnerContributionSeed` guards the `.version(6)` upgrade ([app-db.ts:619](../../src/app/core/data-access/app-db.ts)); `trainingWindowCutoffDate`, `jointLegStakeDelta`, `matchTemplateForHeaders`, `normalizeDescription`, `compareBySortOrder`, `DEFAULT_COMPARISON_PERIOD_COUNT` — all used in-file plus imported by specs. Fallow doesn't count same-file usage or spec-file usage toward an export's liveness, which is defensible for a library but noise here: these are exported *so the specs can import them*. The only genuinely spec-only export found is `getTensorCount` ([category-model.worker.ts:301](../../src/app/core/ml/category-model.worker.ts)) — a deliberate leak-detection observability hook for the worker specs. Keep all of them.

### 5.2 All 23 "unused class members" are DI false positives

Every flagged member is a repository arrow-function property (`RulesRepository.add`, `AccountsRepository.update`, `TransferSettingsRepository.get`, …) invoked through an injected instance in a feature store (e.g. [rules.store.ts:37-48](../../src/app/feature-categories/rules.store.ts), [accounts.store.ts:166](../../src/app/feature-accounts/accounts.store.ts)). Fallow's syntactic pass can't follow `inject(RulesRepository)` → field → call. All 23 verified in use. (The first review's CR-6.2 already went through one round of "flagged repo member turned out to be used" — TICKET-CLEANUP-01 documents that history.)

### 5.3 `tailwindcss` as "dev dependency in production" is correct as-is

Fallow flags the `tailwindcss` import reachable from production styles. Tailwind 4 is consumed at build time by the Angular/Vite pipeline; the app is an application (always built, never `npm install --prod`-and-run), so `devDependencies` is the right home. Ignore, and codify the ignore (§6).

### 5.4 CSS: zero findings

No token drift, no duplicate blocks, no dead surface, no broken references — the Tailwind 4 + daisyUI setup is doing its job. Worth stating because styling drift is where vibe-built UIs usually rot first.

---

## 6. Codify the false-positive knowledge (finishes CR2-6.5)

CR2-6.5 ("a minimal `.fallowrc.json` covering the known false-positive families plus an identity baseline") is still open, and §5 now supplies its exact contents:

```jsonc
// .fallowrc.json
{
  "$schema": "https://raw.githubusercontent.com/fallow-rs/fallow/main/schema.json",
  "ignoreExportsUsedInFile": true,          // clears ~18 of the 19 unused-export FPs (§5.1)
  "ignoreDependencies": ["tailwindcss"],    // §5.3
  "rules": {
    "unused-class-members": "off"           // DI-invoked repository members, all 23 verified (§5.2)
  }
}
```

plus one `/** @expected-unused */` on `getTensorCount` (tracked-for-staleness, unlike a bare ignore) and an identity baseline (`fallow dead-code --save-baseline`) so CI can gate on *new* findings only. After that, a fallow run on this repo reports: 20 circular deps, the real dupes, and the real complexity peaks — all signal.

---

## 7. Hard-rules & conventions audit (CLAUDE.md)

Checked mechanically, all clean:

- **`appDb` isolation** — every non-spec `appDb` reference lives in `core/` (repositories, plus `appDb.transaction('rw', …)` atomicity scopes in the deletion/import/linking services), `dev-seed`, and `app.config.ts`. No component or feature store touches a table. The services' direct `appDb.transaction()` use is the sanctioned pattern for multi-table atomicity (CR-1.1 lineage), not a violation.
- **`categoryManual` protection** — rule application skips manual rows (specced in [rules.store.spec.ts:172-195](../../src/app/feature-categories/rules.store.spec.ts) and the rules-engine specs); every user-initiated categorisation sets `categoryManual: true`; transfer-linking clears it deliberately per TICKET-TRF-01.
- **Barrel imports** — followed everywhere (§3's cycles are the rule's cost, not a violation); the two documented deep-import exceptions (`app.routes.ts`, `transfer-matching.ts`) carry their justifying comments.
- **Bundle budgets** — untouched in `angular.json`.
- **Dexie versioning** — version blocks are append-only through `.version(10)`; the TXN-04 nullified flag correctly shipped without a version bump (non-indexed optional field).
- The previously known savings-rate/IBAN-normalization bug is confirmed **fixed**: [transfer-matching.ts](../../src/app/core/transfers/transfer-matching.ts) normalizes on every comparison path, with the normalization contract documented on each set-builder.

---

## Appendix — Fallow vital signs (2026-07-14, v3.3.0)

| Metric | Value | Read |
|---|---|---|
| Files / LOC | 232 / 16,077 | — |
| Avg cyclomatic / p90 | 2.1 / 4 | excellent |
| Maintainability avg / % low | 91.9 / 0.5% | excellent |
| Unused files / deps | 0 / 0 | clean |
| Functions over thresholds | 107 of 1,106 (26 critical) | concentrated in §2's files |
| Clone groups | 10 | §2.1, §2.3–2.5 |
| Circular dependencies | **20** | one root cause, §3 |
| CSS findings | 0 | §5.4 |
| Security candidates | 1 (low) | §4 |

Top churn×complexity hotspots: `dashboard-overview.component.ts` (36.1, accelerating — churn-driven; the file itself reads clean), `transactions-overview.component.ts` (34.9, cooling), `transactions.repository.ts` (29.5), `import-wizard.component.ts` (28.6), `transaction-edit-form.component.ts` (27.9 — §2.2), `category-breakdown.ts` (22.9, accelerating — §2.1), `period-stats.ts` (19.2, accelerating — §2.1).
