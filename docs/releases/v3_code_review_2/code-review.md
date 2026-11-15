# Money Mosaic — Code Review 6 (CR6)

**Date:** 2026-11-15 · **Baseline:** `4ddddc5d` on `feature/v3-server-accounts` (v3 server + accounts, SRV-01..14, MCP-01..05) · **Method:** a whole-codebase review focused on correctness, pitfalls, side effects and architecture. **Security was out of scope by request.** The code was read in six parallel slices: server + `shared/`; core data-access / state / import / transfers; core stats / categorisation / ML / loans; the import, transactions, accounts, categories and recurring features; the dashboard, income, loans, future, settings, data-management and auth features; and `src/app/shared` plus the cross-cutting client↔server contract. The top findings were re-read against the code. No test suite was run.

Per the `docs/README.md` naming rule this is CR6. It is the second review of the v3 server codebase, so it is named `v3_code_review_2`; sibling to [CR5](../v3_code_review/code-review.md). The ticket backlog derived from it is [./overview.md](./overview.md).

Every finding has: **where**, **problem** (with a concrete failure), and **fix** (the smallest change that works). Findings marked _likely_ are confirmed in the code path but were not reproduced.

**CR5 carry-overs:** CR5-3, 5, 6, 7, 8, 9, 11, 15, 17, 23, 24 and 25 were re-confirmed open in the current code and are ticketed from this backlog (see the overview). CR5-1 was closed by TICKET-SRV-14. CR5-2, 4, 10, 12, 13, 14, 16, 18–22 were **not** re-checked by this review.

---

## High

### CR6-1 — Restoring a backup is refused when an orphan transfer's leg ids belong to another user

- **Where:** `server/src/routes/data.ts:243` (`pruneOrphanTransfer`).
- **Problem:** the orphan check uses `rowExists(tx, transactions, leg)`, which looks across all users, instead of asking whether the leg belongs to the importer (`ownsRow`). This is the same mistake 0317fe74 fixed for soft references. A pre-v3 Dexie backup (ids from 1) restored into a server that already has a second user: the orphan transfer's leg ids are held by the other user's transactions, so it is not pruned; `assertReferencesOwned` (line 324) then refuses the whole restore with "references a row that is not in the backup… Nothing was imported." The existing spec uses ids 999_998/999_999, which no one holds.
- **Fix:** test `ownsRow(tx, transactions, leg, userId)` (or "not in the document") in the orphan check. Add a spec whose leg ids another user holds.

### CR6-2 — One failed parse or duplicate scan kills the import wizard until the page is left

- **Where:** `src/app/feature-import/import-wizard-session.ts:175-196` (parse pipeline) and `:249-264` (duplicate scan).
- **Problem:** both are `toSignal(toObservable(...).pipe(switchMap(...)))` with no `catchError`. When the inner promise rejects (the duplicate scan's `GET /transactions?accountId=` fails on a server restart or expired session; the worker's `onerror`; `file.arrayBuffer()` throws `NotReadableError` because the file changed on disk), the observable errors and completes for good, and every later read of `parseState()` / `duplicateScanState()` throws. Step 2 stops rendering, no further parse ever runs, and no error is shown.
- **Fix:** `catchError(() => of({ status: 'error', ... }))` inside each inner `switchMap`; add an error state to the duplicate scan and surface it.

### CR6-3 — Loan progress counts every transaction in the loan's category as a repayment

- **Where:** `src/app/feature-loans/loans.store.ts:57-60`; the same filter in `components/loan-detail/loan-detail.component.ts:96-100` and `loan-payments-list.component.ts:39`; core `src/app/core/loans/loan-progress.ts:52-62, 152-158`.
- **Problem:** payments are filtered by `categoryId` only — no direction, no `nullified`, no date — and the core takes `Math.abs(amount)` and starts interest from `loan.startDate`. A +€15,000 payout tagged with the loan category counts as a €15,000 payment (100% repaid). A bounced −€1,200 debit plus its +€1,200 reversal counts as €2,400 paid. Rows dated before `startDate` give negative elapsed days, so negative interest and principal larger than the payment. The loan form's duplicate check looks only at active loans (`loan-form.component.ts:71`), so a new loan in an archived loan's category inherits all the old payments.
- **Fix:** filter once in the store — `amount < 0`, `!nullified`, `bookingDate >= loan.startDate` — and pass that list to all three views.

## Medium

### CR6-4 — A cross-account restore leaves `attributionOverride.jointAccountId` pointing at the old account id

- **Where:** `server/src/operations/import-ids.ts:126-142` (the `EMBEDDED` entry for `transactions`); field defined at `shared/entities.ts:65`.
- **Problem:** only `attributionOverride.reimbursementTransferId` is renumbered. A restore that renumbers joint account 3 to 812 leaves shared-mode overrides saying `jointAccountId: 3`. In `src/app/core/stats/classify-joint-leg.ts:121-125` the lookup misses, `share` falls back to 1, and a 50/50 shared expense counts at 100% in income/expense/savings stats. Editing that transaction fails with "The selected joint account no longer exists" (`attribution-override.ts:40`). TICKET-SRV-14's notes already warn that every new id-carrying JSON field must be added to `EMBEDDED` by hand.
- **Fix:** add the `jointAccountId → accounts` rewrite next to the `reimbursementTransferId` one, plus a spec that walks the entity types for every id-bearing field and fails when one has no remap.

### CR6-5 — Other dangling hard references from pre-v3 backups refuse the whole restore (_likely_)

- **Where:** `server/src/routes/data.ts:320-330`.
- **Problem:** pruning exists only for transfers. Main's client never deleted `recurringOverrides` on import undo or account delete (checked with `git grep` on main), so a pre-v3 backup can hold an override whose `anchorTransactionId` points at a deleted transaction — a hard FK the importer doesn't own → 400. Same for loans whose category was deleted, an orphan path `schema/loans.ts` itself documents.
- **Fix:** prune overrides whose anchor is gone, the way transfers are pruned; decide explicitly for orphan loans (refuse with a specific message, or drop them).

### CR6-6 — Merging the same backup into another account twice duplicates every renumbered row

- **Where:** `server/src/operations/import-ids.ts:36-58`.
- **Problem:** each run gives a colliding row a brand-new id (`highest + 1 + index`) and never matches it to the copy the previous run wrote. Before SRV-14, `merge` meant `bulkPut` and repeating it was a no-op.
- **Fix:** refuse `merge` when the plan renumbers anything (cross-account restores become replace-only), or document it.

### CR6-7 — Deleting transactions leaves expenses pointing at the deleted reimbursement transfer

- **Where:** `server/src/operations/transfer-cleanup.ts:91-107`; contrast `server/src/routes/transfers.ts:98` (`clearDanglingOverrides`).
- **Problem:** import undo, account delete/clear and `POST /transactions/delete` delete the transfers of removed transactions but leave any `attributionOverride.reimbursementTransferId` that named them. Unlink does clear these, because TICKET-TXN-03 says a dangling one silently un-suppresses a leg. Joint expense T reimbursed by transfer R whose legs came from batch 7: undo batch 7, R is gone, T still names R — stats treat T as not reimbursed and editing T fails. The response has no `clearedAttributionOverrides`, so the client store is stale too.
- **Fix:** move `clearDanglingOverrides` into `cleanupTransfersForRemovedTransactions`, add its result to `TransferCleanupResult`, and mirror it client-side.

### CR6-8 — "Always categorise this merchant" and accepted ML proposals create the rule at the lowest precedence

- **Where:** `src/app/feature-categories/rules.store.ts:115-119`; `src/app/feature-categories/category-model.store.ts:279`; ordering at `shared/rule-matching.ts:106` (ascending priority, first match wins).
- **Problem:** the new rule gets `max + 10`, so it runs last. An existing "description contains POS → Shopping" keeps filing every Albert Heijn POS row under Shopping after the user ticks "always categorise as Groceries".
- **Fix:** insert merchant-equals rules at the highest precedence (`min - 10`).

### CR6-9 — "Make rule from filter" builds a narrower rule than the filter shows

- **Where:** `src/app/feature-transactions/transaction-filters.ts:104-106` vs `:149-166`; `shared/rule-matching.ts:13`.
- **Problem:** the text filter searches `rawDescription + counterpartyName`; the rule is `description contains`, which matches `rawDescription` only. A filter for "albert" showing 30 rows (name in the counterparty column) produces a rule matching 0 of them. A single amount bound becomes strict, so "min 100" (expense) gives `amount < -100` and leaves out exactly €100.00.
- **Fix:** emit a `counterpartyName` condition too with `conditionMatch: 'any'` (or narrow the filter); use inclusive bounds.

### CR6-10 — The transfer settings form is filled before the settings load, and Save writes the defaults back

- **Where:** `src/app/feature-transactions/components/transfer-review/transfer-review.component.ts:58-61`.
- **Problem:** `settingsForm` is built once in a field initialiser from `TransferSettingsStore`, which starts on `DEFAULT_TRANSFER_SETTINGS` until its HTTP load lands. Opening `/transactions` directly (or after sign-in) shows the defaults; toggling the checkbox and pressing Save overwrites the stored match window with the default.
- **Fix:** patch the form when the store hydrates, or build it after hydration.

### CR6-11 — The transaction selection survives filter changes and deletions

- **Where:** `src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts:157, 364-378`.
- **Problem:** "Select all 40" under one filter, change the filter, tick 2 visible rows, Delete → "Delete 42", 40 of them off screen. Deleting a selected row from its edit dialog leaves it in the selection ("2 selected", "Link as transfer" silently does nothing).
- **Fix:** intersect the selection with `filteredIds` on filter change (or show "N selected, M hidden"), and drop deleted ids.

### CR6-12 — Merging recurring series in two steps loses one series' payments

- **Where:** `src/app/feature-recurring/recurring-overrides.ts:97`.
- **Problem:** `mergeRecurringSeries(byKey.get(primary.key) ?? primary, duplicate)` merges the raw `duplicate`, not its already-merged form. Series A (Jan), C (Feb), B (Mar): merge B into C, then the result into A. Re-applying overrides, A absorbs raw C while B is marked absorbed — B's payments vanish from the list and the monthly total.
- **Fix:** `mergeRecurringSeries(byKey.get(primary.key) ?? primary, byKey.get(duplicate.key) ?? duplicate)`.

### CR6-13 — Goals past the chart horizon silently drop off the "required saving" line

- **Where:** `src/app/feature-future/forecast.store.ts:162-168` (`projectionHorizonMonths`) and `:238-262`.
- **Problem:** the horizon comes only from the measured-rate dates (latest + 3 months, min 12). The required-rate line reuses it; `computeNetWorthProjection` drops purchases past the end and the "omitted goals" count doesn't include them. Goal €30k by 2030-01, €10k saved, saving €2k/month → 13-month chart, the line never steps down, caption says nothing is missing.
- **Fix:** in required-rate mode, extend the horizon to the latest wanted-by date.

### CR6-14 — Pages don't wait for their data; a failed settings load turns the next toggle into a wipe

- **Where:** `src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts:107` (gates only on transactions + accounts); `/loans` (`loans-overview.component.html:8`), `/loans/:id` (`loan-detail.component.html:67`), `/future`.
- **Problem:** if the dashboard layout load fails, the default layout shows; hiding one row then sends `setHiddenRowIds([X])`, which replaces the saved list on the server. Category-comparison exclusions, heatmap exclusions and forecast account scope behave the same. `/loans/5` on reload flashes (or, on a failed load, keeps) "Loan not found"; a failed `/loans` load looks like "no loans"; loan cards flash "0% paid, behind schedule" before transactions arrive.
- **Fix:** wrap these pages in `mm-hydration-boundary` / `hydrationOf`, and add `DashboardLayoutSettingsStore`, `CategoryComparisonSettingsStore` and `AppSettingsStore` to the dashboard's gate.

### CR6-15 — Goal ETA and required saving count months on different grids

- **Where:** `src/app/core/stats/goal-affordability.ts:274-281` vs `src/app/core/stats/required-saving-rate.ts:51-58`.
- **Problem:** the ETA's "month 1" is the end of next month; the required-rate count includes the end of the current month. Today 2026-08-09, shortfall €300, saving €100/month, goal 2026-10-31: required-rate says on track (gap 0), the ETA says affordable 2026-11-30 (not on track). The doc claims they can never disagree.
- **Fix:** one grid — e.g. `monthsAvailableUntil` counts from next month.

### CR6-16 — Year-over-year compares against a prior year the data only partly covers

- **Where:** `src/app/core/stats/year-over-year.ts:101`.
- **Problem:** a prior year is dropped only when it ends before the first transaction. History from 2025-06-10, range = this year → the 2025 figure covers ~6.5 months and income shows ~+80%. `income-growth.ts` promises YoY "hides, doesn't lie".
- **Fix:** also require `shifted.from >= earliest`.

### CR6-17 — Recurring "next expected" date drifts by days

- **Where:** `src/app/core/stats/recurring-payments.ts:597, 678`.
- **Problem:** for monthly/quarterly/yearly series the next date is `lastDate + median gap in days`; projections then step by calendar month from that wrong anchor. Last paid 2026-02-25, median 31 days → 03-28, and every later projection lands on the 28th. Paid Jan 31 with a 30-day median → expected Mar 2.
- **Fix:** step calendar cadences with the same calendar stepping as `stepBy` (`recurring-projection.ts`).

### CR6-18 — The duplicate fingerprint uses the raw counterparty IBAN, and the server doesn't guard double commits

- **Where:** `src/app/core/import/import.service.ts:154`; `src/app/shared/utils/fingerprint.ts:36`; `server/src/routes/import.ts:146`.
- **Problem:** the first import's profile has no IBAN column, so the IBAN is pulled from the description (`BE12 3456 …`, spaced); a later import uses a preset whose column gives `BE123456…`. Every overlapping row gets a different fingerprint and imports again — balances double. Separately, `/import/commit` and `transactions_userId_fingerprint_idx` enforce no uniqueness, so a commit sent twice (two tabs) inserts duplicates (_likely_).
- **Fix:** normalise the IBAN inside `computeFingerprint` with a migration or dual-key check for existing fingerprints; skip already-present fingerprints server-side on commit.

### CR6-19 — Failed saves are swallowed; dialogs close before the save runs

- **Where:** e.g. `src/app/feature-future/components/goals-panel/goals-panel.component.ts:125`, `loans-overview` `saveLoan`, `loan-detail.component.ts:140`, every `void store.setX()` call.
- **Problem:** the goal and loan forms close before the save; the store updates only after the server answers; there is no global `ErrorHandler`. Server down or 400 on "Add goal": the dialog closes, nothing appears, no message.
- **Fix:** close only on success, or show the error (shared helper or an `ErrorHandler`).

## Low

- **CR6-20 — Reorder arrows can stop working.** `src/app/shared/utils/sortable.ts:39-46`: an item without `sortOrder` gets its list index, which after a delete can equal a neighbour's stored order — the swap writes the same value to both and the item never moves (A=0, C=1, B=2; delete A, add D → up on D writes B=2, D=2 forever). `accounts.store.ts:256`, `categories.store.ts:114`, `rules.store.ts:78` swap with archived neighbours the list hides, so clicks look dead; equal hand-typed rule priorities swap to no effect. `addAccount`/`addCategory` never set `sortOrder` (goals/loans do: `highest + 1`). Also `accounts.store.ts:49`: `withPersistedCrud` exposes a public `remove()` that skips `removeAccount`'s cascade mirror (unused, a trap), and `moveAccount`/`moveCategory` send two independent PATCHes via `Promise.all`, so one failure leaves duplicate `sortOrder`s (goals uses an atomic `bulkUpdateSortOrder`).
- **CR6-21 — Import wizard batch mode.** `import-wizard-session.ts:316-320`: `step2View` only checks header mismatch, so a hard parse error (or all rows invalid) leaves a later batch file on "imports automatically once parsed" forever with Confirm disabled. `:351, 360-362`: Back after a partial batch keeps `commitResults` but Next resets `currentFileIndex` to 0, so committed files commit again (empty batches, duplicate "What changed" entries).
- **CR6-22 — Rows in an archived category show "Uncategorised".** `transactions-overview.component.ts:211-231`, `transaction-edit-form.component.ts:152-171`: option lists and the keep-assigned fallback use `activeCategories()` only; the table's select falls back to the first option ("Uncategorised", and choosing it fires no change), the edit form shows blank. Use `categoriesById()` like the "(ended)" case.
- **CR6-23 — Double-click on recurring Dismiss/Merge.** `recurring-payments-panel.component.ts:298-316`: no in-flight guard, two overrides recorded; Restore/Undo removes one and the other re-applies, so they look broken.
- **CR6-24 — "All time" is frozen absolute dates and survives sign-out.** `src/app/core/state/range-state.store.ts:194`, `page-range-control.ts:128`: captured once (older imported history excluded; before transactions load it resolves to today–today); `RangeStore` is exempt from the sign-out reset although it holds data-derived dates (user B inherits A's earliest date).
- **CR6-25 — Sign-in doesn't wait for UI preferences.** `src/app/core/auth/session.store.ts:200`: `void rehydrateAll()`; the login page navigates immediately → default theme flashes, `markVisitedGuard` PATCHes every login, `returnUrl=/` lands a returning user on the landing page, the backup reminder can flash.
- **CR6-26 — ApiClient strips the HTTP status.** `src/app/core/data-access/api-client.ts:227` (`asRejection`) turns 4xx/5xx into plain `Error`s, so `reportIfUnexpected` (`with-hydration.ts:62`, `ui-preferences.service.ts:130`) logs every server answer as unexpected. `api-client.ts:185` (`absent()`) uses `instanceof HttpErrorResponse`, which the file's own docs warn against.
- **CR6-27 — Settings fields and list toggles lose input.** `src/app/shared/utils/link-control-to-setting.ts:22-29` saves on every keystroke and writes the reply back into the focused field (drops characters when the server is slower than typing). List toggles (`toggleRowHidden`, income toggles, exclusion lists) read-modify-write the whole list from client state; two clicks within one round trip lose the first.
- **CR6-28 — "Copy token" fails over plain HTTP.** `settings-mcp-tokens-section.component.ts:114`: `navigator.clipboard` is undefined outside a secure context (the LAN deployment), so the button throws a TypeError.
- **CR6-29 — IBAN rule conditions skip normalisation.** `shared/rule-matching.ts:16-17, 53-58` compares raw strings; every other IBAN comparison runs `normalizeIban` (`src/app/shared/utils/iban.ts`), and the CSV mapper stores the bank's spacing. A rule typed `BE68 5390 0754 7034` never matches `BE68539007547034`, in "Run rules" and in MCP `run_rules`.
- **CR6-30 — A category end date creates a phantom final payment.** `recurring-payments.ts:825`: a `nextExpectedDate` past `activeUntil` is clamped to it instead of dropped.
- **CR6-31 — ML rule proposals group mixed predictions.** `src/app/core/ml/rule-proposal-mining.ts:63`: support and average confidence include members predicted as other categories (2 Groceries + 2 Fuel at 0.95 → a Groceries rule for all 4).
- **CR6-32 — Stats classification gaps.** `classify-for-stats.ts:137-145`: a positive amount on an expense category with `attributionOverride.mode === 'shared'` counts as income (personal/untagged joint refunds reduce expense) — inflates income, expense and the savings-rate denominator. `top-transactions.ts:38-43` doesn't skip `nullified` rows.
- **CR6-33 — "Run rules" can relabel the co-owner Partner-contribution tag.** `shared/rule-matching.ts:160`: the tagger only wins over rules during import (`import-batches.store.ts:132-138`); totals stay right (`classifyJointLeg` excludes by IBAN), only the label/precedence is lost.
- **CR6-34 — Restore's fresh ids can reuse deleted ids.** `server/src/operations/import-ids.ts:50-57`: floor is `max(id)`, not `sqlite_sequence`; soft references that outlive a deleted parent assume ids are never reused.
- **CR6-35 — Garbled screen-reader label.** `trend-chart-panel.component.ts:196`: double-encoded file, the aria-label reads `fromâ€“to`; same mojibake in comments there and in `category-breakdown-panel`.
- **CR6-36 — Out-of-date copy.** `data-management-overview.component.html` says the browser keeps "per-browser preferences like your theme" (per-account since SRV-10); `loans-overview.component.html:10` says "Loan tracking is on its way".

## Architecture

- **CR6-A1 — Two month-stepping rules and ~25 copies of "today".** `addMonths` (`core/loans/amortization.ts:31`) lets the day spill over; `stepBy`/month-end helpers clamp. That split is the root of CR5-9 and CR6-17 and part of CR6-15. "Today" is `new Date().toISOString().slice(0, 10)` (UTC) in ~25 places (CR5-11), and private `parseIsoDate`/`formatIsoDate`/`MS_PER_DAY`/`shiftRangeByDayCount` copies remain (CR5-23). One shared date module removes the class.
- **CR6-A2 — Whole-list settings writes built from client state** cause lost clicks and wipe-from-defaults (CR6-14, CR6-27). Toggle on the server, or block writes until loaded.
- **CR6-A3 — Client-orchestrated follow-ups after one transactional server write** (import commit → rules → co-owner tagging → auto-link as separate requests; CR5-6). The commit should be the point of no return.
- **CR6-A4 — Logic only the client enforces, or copied on both sides:** duplicate detection (CR6-18), IBAN normalisation outside root `shared/` (CR6-29), the balance formula copied into MCP `read-tools.ts:74-101` from `AccountsStore.balancesById`, four private `percentDelta` copies.
- **CR6-A5 — Every new id-bearing field needs hand registration in the restore remap** (CR6-4). A spec walking the entity types for `*Id` fields catches the next one.
