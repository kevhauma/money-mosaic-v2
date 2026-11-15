# Money Mosaic — Code Review 5 (CR5)

**Date:** 2026-11-08 · **Baseline:** `d1c51612` on `feature/v3-server-accounts` (v3 server + accounts built, SRV-01..13, branch not yet merged) · **Method:** a whole-codebase quality review focused on correctness, safety, behaviour under the expected load, missing tests, speed and leanness. The whole `server/` workspace was read line by line. The browser code was read in three slices: import / transfers / categorisation; stats / dates / loans; and data-access / auth / state / ML. The main claims behind each finding were re-read against the code.

Per the `docs/README.md` naming rule this is CR5, named `v3_code_review` because it is the first review of the v3 server codebase. Sibling to [CR4](../v2_code_review/code-review.md).

**Assumed load:** a household on a home LAN: a few accounts on one server, each with up to about 50,000 transactions, using a phone and a desktop at the same time.

Every finding has the same four parts: **what this is**, **the problem** (with a concrete case), **the fix** (the smallest change that works), and **if we skip it**. Findings marked _likely_ are confirmed in the code path, but the outcome depends on timing or memory that was not run. Ticketing (as-is / to-be / acceptance criteria) is a separate follow-up step.

**Verdict:** fix CR5-1..12 first. Start with CR5-1, CR5-2, CR5-3 and CR5-6, because they lose or move user data. The lean findings add up to about −120 lines.

---

## Must fix

### CR5-1 — Restoring a backup into another account takes the rows away from their owner

- **Where:** `server/src/routes/data.ts:186-211` (`upsertRow`).
- **What this is:** Restoring a backup keeps each row's id. When that id already belongs to another account, the server writes the importer's `userId` onto it, so the row changes owner (TICKET-SRV-12).
- **Problem:** SRV-12 accepted this for an *accidental* cross-account restore. It does not record that any signed-in non-admin can do it *on purpose*: they upload a hand-written document listing ids 1..N, and every other account's rows are overwritten and become theirs. This also breaks the CLAUDE.md hard rule that every query is limited to the session's user. The Data Management dialog says "Add imported rows alongside what you already have", which suggests the opposite. The QR "send to another device" panel leads straight into this case, because on v3 both of a user's own devices already share data, so the realistic target is *another person's* account.
- **Fix:** bring back the pre-SRV-12 409 when `existing.userId !== userId`, or allow the takeover only for an admin caller. About one line.
- **If we skip it:** one household member can empty another's account, on purpose or just by choosing "Merge".

### CR5-2 — Deleting a category a loan tracks wipes its hand-set categories, then the delete is refused

- **Where:** `src/app/core/state/categories.store.ts:93-104`; caller `feature-categories/components/categories-overview/categories-overview.component.ts:184`.
- **What this is:** `removeCategory` first saves `bulkClearCategory(affectedIds)`, which sets `categoryId` to empty and `categoryManual: false`, and only then calls `categoriesRepository.remove(id)`.
- **Problem:** the server's `DELETE /api/categories/:id` (`server/src/routes/categories.ts:74-95`) already clears those transactions itself, inside one transaction. It also refuses with a 409 when a loan tracks the category. So: delete "Mortgage", which a loan tracks and which holds 300 hand-set payments. The clear is saved, the delete is refused, the category and the loan survive, and all 300 payments are uncategorised with the manual flag gone. The caller uses `void`, so no message appears.
- **Fix:** drop the `bulkClearCategory` call. After `remove` succeeds, patch the local store. Catch the error in the component and show the server's 409 message. `categories.store.spec.ts:137` currently asserts the clear-before-delete order and must change too.
- **If we skip it:** hand-set categories are lost for good, with no message.

### CR5-3 — Every import re-links transfers the user unlinked, and clears their hand-set category

- **Where:** `src/app/core/transfers/transfer-matching.ts:336-338` (the auto-link pool); `server/src/routes/transfers.ts:75` (linking sets `categoryId: null, categoryManual: null`); triggered from `src/app/core/state/import-batches.store.ts:157` after every file.
- **What this is:** after each imported file, the auto-linker scans the whole dataset and links every pair that looks like a transfer. Only rows that already have a `transferId`, or a neutral category, are left out.
- **Problem:** nothing records that the user rejected a pair. Example: the user unlinks A↔B and sets A to "Rent" by hand. The next import into *any* account finds A↔B again with high confidence, links it again, and the server clears A's manual category. This breaks the rule that a category set by hand always wins, through the transfer path instead of the rules path.
- **Fix:** leave `categoryManual` rows out of the auto-link pool (they can still show up as `ambiguous`). If that is too broad, store rejected pairs when the user unlinks.
- **If we skip it:** user corrections are quietly undone on every import.

### CR5-4 — A new account's opening balance is off by its first transaction

- **Where:** `src/app/feature-import/import-wizard-session.ts:67-76` (`earliestBalanceSeed`), used at `:382`; the balance is computed at `src/app/core/state/accounts.store.ts:73`.
- **What this is:** when an import creates an account, its opening balance is taken from the running-balance cell of the earliest row. The app then shows `openingBalance + sum of all amounts`.
- **Problem:** banks write that cell as the balance *after* the row, and the sum adds the same row again. With rows −5 → 500, −10 → 490, +20 → 510, the opening balance becomes 500 and the app shows 505, where the bank says 510. A smaller second issue: when several rows share the earliest date, the strict `<` keeps the first one in file order, which in a newest-first export is the last transaction of that day.
- **Fix:** `amount: earliest.balance! - earliest.transaction.amount`. Update `import-wizard.component.spec.ts:620-658`, which asserts the wrong value.
- **If we skip it:** every account created by an import shows the wrong balance and net worth from day one.

### CR5-5 — A line break inside a quoted CSV field makes the whole file unreadable

- **Where:** `src/app/core/import/csv-parse.ts:23-50`.
- **What this is:** if PapaParse returns fewer rows than there are non-empty physical lines, the file is parsed again with quote handling off. The second result is kept when it has more rows.
- **Problem:** a quoted field containing a line break always gives fewer rows than lines, so it always triggers the re-parse. Reproduced with the project's own PapaParse: headers come out as `"\"Date\""`, and the file is blocked with a misleading header-mismatch error. When only some fields are quoted, the row is split in two and descriptions keep their quote marks, so fingerprints change and duplicates get through. No spec covers this case.
- **Fix:** only re-parse on a PapaParse `Quotes` error, or when a row's column count differs from the header's. Add this case as a spec.
- **If we skip it:** exports from banks that allow multi-line notes cannot be imported.

### CR5-6 — A failed import commit shows no error, or leaves rows saved but half-processed

- **Where:** `src/app/feature-import/import-wizard-session.ts:336-340` (`void this.runCommit()`) and `:419-488` (`try/finally`, no `catch`); `src/app/core/state/import-batches.store.ts:128-170`.
- **What this is:** confirming an import saves the rows on the server, then runs the rules engine, co-owner contributions and auto-link, and only at the end patches the store.
- **Problem:** if `/import/commit` returns a 5xx, nothing is shown. The rejection is unhandled, and in batch auto-advance the file sits in "batch-waiting" forever. If the commit succeeds and a later step fails (a network blip, say), the rows are in SQLite but missing from the screen, uncategorised and unlinked. Clicking Confirm again treats every row as a duplicate, so a 0-row batch is created and the real rows never get rules applied. No spec covers a `commitImport` rejection.
- **Fix:** add a `catch` in `runCommit` that sets an error signal (like `accountCreationError`). Put `result.batch` and `result.addedTransactions` into the store right after the server commit, before the follow-up steps.
- **If we skip it:** imports fail silently, and rows stay half-processed until someone notices.

### CR5-7 — Signing out does not stop work already running, so user A's data can land in user B's account (_likely_)

- **Where:** `src/app/core/store-reset/with-hydration.ts:243-265`, `store-reset.service.ts:61-63`, `core/auth/session.store.ts:378-382, 458`; the worst trigger is `feature-categories/category-model.store.ts:226-254`.
- **What this is:** `reset` clears each store's cached hydration promise and puts the initial state back. Nothing stops a `load()`, or a store action, that is already running from writing to the store afterwards. `UiPreferencesService` has a generation guard for exactly this case (lines 57, 82-85); the stores do not.
- **Problem:** A clicks Train, which runs for minutes, signs out, and B signs in on the same tab. When training finishes, `repository.save(artifact)` sends a PUT with B's cookie, so A's model is stored in B's account, and B sees suggestions built from A's category ids. A slow 50k-row `getAll()` can also land after the reset and refill B's stores. Separately, `forget` sets `hydration = null` unconditionally, so a stale failure can clear a newer attempt's cached promise.
- **Fix:** on sign-out or a change of user, do a full page load (`location.assign('/login')`). That cancels requests, kills the worker and empties every store at once. The alternative is a generation counter in `createHydration` that is checked before every patch.
- **If we skip it:** on a shared browser, one user's data or model can end up in another user's account.

### CR5-8 — "Previous" on a fiscal year jumps to calendar years

- **Where:** `src/app/shared/utils/date-buckets.ts:165-169` (the `year` case); the entry is `quick-ranges.ts:175-181`; callers are `core/state/range-state.store.ts:253-255` and `core/stats/period-window.ts:58-60`.
- **What this is:** the prev/next arrows and the comparison window shift a range by whole years.
- **Problem:** the `year` case always returns 1 Jan–31 Dec and ignores the start month. With a fiscal year starting in April, the range 2025-04-01..2026-03-31 steps back to 2024-01-01..2024-12-31. `computeComparisonWindow` builds calendar years that never match the selection, so `category-period-comparison.ts:66` falls back to the partial current year and labels it "selected". No spec covers a fiscal range.
- **Fix:** step from the start month, as the `quarter` case right above it already does: `Date.UTC(year - count, startMonth, 1)` .. `Date.UTC(year - count, startMonth + 12, 0)`.
- **If we skip it:** everyone using a fiscal year gets the wrong comparison bars and lands on the wrong year.

### CR5-9 — Loan what-if applies extra payments twice, or never, near the end of a month

- **Where:** `src/app/core/loans/amortization.ts:31-36` (`addMonths`), used by `what-if.ts:131-144`.
- **What this is:** `addMonths` lets a day past the end of a short month roll into the next month. The what-if walk matches each extra payment to a month by `yyyy-mm`.
- **Problem:** starting from 2026-10-31, month 1 is 2026-12-01 and month 2 is 2026-12-31. An extra payment for 2026-12 is applied twice (fee charged twice, `interestSaved` overstated), and one for 2026-11 or 2027-02 is never applied. A loan starting on the 31st gets two March rows and no February row. No spec uses a start date on the 29th–31st.
- **Fix:** clamp the day to the length of the target month, as `recurring-projection.ts:58-72` already does.
- **If we skip it:** what-if results are wrong for about 3 days of every month.

### CR5-10 — "Per month" and "per week" averages divide by buckets touched, not time passed

- **Where:** `src/app/core/stats/periodized-rate.ts:21-30`, shown by `dashboard-overview.component.ts:194-205`.
- **What this is:** the week and month divisors count the calendar weeks and months the range touches, however little of each.
- **Problem:** "Last 30 days" with €3000 of spending touches 2 months, so it shows €1,500/month next to €100/day (which is about €3,044/month). "Last 90 days" divides by 4 instead of about 2.96, a 26% understatement. `periodized-rate.spec.ts` asserts the current behaviour.
- **Fix:** `figure / (dayCount / 7)` and `figure / (dayCount / (365.25 / 12))`, keeping the existing gating. Update the spec.
- **If we skip it:** headline income, expense and savings rates are off by up to 2× on rolling ranges.

### CR5-11 — "Today" is the UTC date, copied about 20 times

- **Where:** `new Date().toISOString().slice(0, 10)` in `feature-dashboard/stats.store.ts:26`, `feature-future/forecast.store.ts:22`, `feature-income/income.store.ts:28`, `core/state/range-state.store.ts:46`, `loan-what-if.component.ts:170` and about 15 more. `recurring-series.store.ts:59` also captures `today` once, in a root store.
- **What this is:** each of these code paths takes the UTC date as today's date.
- **Problem:** in Belgium (UTC+1/+2) at 00:30 on 1 November, "today" is still 2026-10-31. "This month" shows October, the forecast's last complete month is September, and the what-if starts on the 31st, which triggers CR5-9. A tab left open for days also keeps its recurring "overdue"/"stopped" flags pinned to the day the store was built.
- **Fix:** one exported `todayIso()` in `date-buckets.ts`, built from local `getFullYear/getMonth/getDate`, replacing every copy.
- **If we skip it:** ranges are wrong for 1–2 hours every night.

### CR5-12 — The auto-categoriser's worker runs out of memory at about 50k transactions (_likely_)

- **Where:** `src/app/core/ml/category-model.worker.ts:180-183` (train) and `:250-257` (predict); callers are `feature-categories/category-model.store.ts` `train()` (no row limit) and `refreshSuggestions` (sends the whole uncategorised backlog).
- **What this is:** each row becomes a dense `Float32Array(8192)`. The rows are kept in `featureRows`, copied again into one flat array by `stackFeatures`, and tfjs makes more copies for `validationSplit`.
- **Problem:** 50,000 × 8,192 × 4 bytes is about 1.6 GB per copy, with at least two copies before tfjs starts. The best case is a `RangeError` shown as a bare `error` status. If the worker is killed instead, `CategoryModelService`'s promise never settles: its queue blocks every later predict, and the status stays `training`.
- **Fix:** predict in slices of about 2,000 rows. Train on the newest N rows only (for example 10,000), or build tensors per batch.
- **If we skip it:** the auto-categoriser breaks at the dataset size this app is meant for.

---

## Should fix

### CR5-13 — Three server delete endpoints break transfer links, and nothing in the app calls them

- **Where:** `server/src/routes/transactions.ts:183-198` (`DELETE /api/transactions/bulk`), the generic `DELETE /api/transactions/:id` and `DELETE /api/transfers/:id` from `entity-router.ts`.
- **What this is:** the client says in `transactions.repository.ts:12-16` and `transfers.repository.ts:12` that these were dropped on purpose, because they skip the transfer cleanup. `api.spec.ts:116` records the same.
- **Problem:** the routes still answer. Deleting one leg leaves the other leg holding a `transferId` for a transfer that cascaded away. Deleting a transfer leaves both legs pointing at nothing.
- **Fix:** delete `DELETE /bulk`. Refuse the two generic deletes, or send them through `removeTransactionsWithTransferCleanup` and the unlink path.
- **If we skip it:** the next caller, whether a script, a future client method or a test helper, corrupts transfer data.

### CR5-14 — The server lets one transaction belong to two transfers

- **Where:** `server/src/routes/transfers.ts:58-84` (`linkTransfer`).
- **What this is:** linking inserts a transfer row and stamps both legs with its id.
- **Problem:** it never checks whether a leg already has a `transferId`, or whether `fromTransactionId === toTransactionId`. Example: the phone links A↔B, then the desktop, with a stale store, auto-links A↔C. A now points at the second transfer while the first still names A. Unlinking A↔B later clears A's `transferId`, even though A is still in A↔C.
- **Fix:** answer 409 when either leg already has a `transferId`, or when from equals to. About three lines.
- **If we skip it:** using two devices at once can corrupt transfer links.

### CR5-15 — Banks that write "0,00" in the unused debit or credit column fail on every row

- **Where:** `src/app/core/import/csv-row-mapper.ts:101-104`; `src/app/core/import/column-guess.ts:300-301` suggests such columns as a debit/credit pair.
- **Problem:** "filled" means "not blank", so Debit `0,00` with Credit `12,50` counts as both filled, and the row is rejected as "unparseable or ambiguous amount". With that export style, every row fails.
- **Fix:** treat a cell that parses to 0 as empty. Add a spec.

### CR5-16 — The reading step says "-84,12 EUR" reads fine, then the import rejects it

- **Where:** `src/app/feature-import/reading-statements.ts:304-325` vs `src/app/core/import/csv-row-mapper.ts:24-34`.
- **Problem:** the reading step strips currency marks (`amountCore`) before calling `parseAmount`; the import calls `parseAmount` on the raw cell. The preview shows "reads as −€84.12" as "sure", then `Number("-84.12 EUR")` is NaN at import, so every row is invalid. This breaks the promise in `parseAmount`'s own comment, which says it is exported so the reading step reads values exactly as the import will.
- **Fix:** strip currency marks inside `parseAmount` itself, using the same regex.

### CR5-17 — The money-flow diagram counts a one-sided linked transfer twice

- **Where:** `src/app/core/stats/money-flow-graph.ts:240-264` (`classifyMovement`).
- **Problem:** a transfer is recognised only by `counterpartyIban`; `transferId` is never read. Transfer matching does link one-sided pairs (`transfer-matching.ts:57-80`). Example: checking −250 names the savings IBAN, and savings +250 has no counterparty IBAN. Savings then shows 500 arriving: a checking→savings ribbon plus "Uncategorised income → savings". Specs only cover the case where both legs carry IBANs.
- **Fix:** when the IBAN lookup misses and `transferId != null`, use the other leg. `saving-velocity.ts:103-125` already builds that `legsByTransfer` map.

### CR5-18 — Restore errors are hidden behind the modal, and "Later" keeps showing old data

- **Where:** `src/app/feature-data-management/components/data-management-overview/data-management-overview.component.ts:192-200` and its template (`:6-8` vs `:122-194`).
- **Problem:** a refused restore (newer `schemaVersion`, file too large, `Row 12 of "transactions" has no id`) sets `errorMessage`, but it renders on the page behind the modal backdrop, so the user sees only the button come back. After a successful restore, choosing "Later" keeps every store on the pre-import data: rows deleted by Replace stay on screen, editing one fails with a 404, and Merge's new rows are invisible.
- **Fix:** render the error inside `mm-modal`. On success, call `StoreResetService.resetAll()` then `rehydrateAll()`, as login already does, and drop the prompt.

### CR5-19 — A 401 from `PATCH /api/auth/me` is not treated as an expired session

- **Where:** `src/app/core/auth/auth.interceptor.ts:22, 41-45`.
- **Problem:** `ANSWERS_401_NORMALLY` matches the URL for every method, so the rename `PATCH` is exempt as well as `GET /me`. Change your password on device 1, which ends device 2's session, then save a new display name on device 2: you get an inline error and are not sent to `/login`.
- **Fix:** exempt `/me` only for `GET`.

### CR5-20 — Every imported file downloads every transaction again

- **Where:** `src/app/core/transfers/transfer-matching.service.ts:23-27`; `src/app/core/import/import.service.ts:176, 189`.
- **Problem:** `runAutoLink` calls `transactionsRepository.getAll()`, raw CSV text included, after each file, although `TransactionsStore` already holds the same data. `previewImport` also runs `getByAccount` after every settled mapping change, and `commitImport` runs it again. At 50k rows, a 5-file batch downloads everything five times, plus each account's history two or more times per file.
- **Fix:** pass `transactionsStore.transactions()` (plus the accounts and categories already in their stores) into `resolveTransferMatches`. Do the same for the per-account fingerprint set.

### CR5-21 — Year-over-year drops 29 February from the earlier year

- **Where:** `src/app/core/stats/year-over-year.ts:31-36`.
- **Problem:** the shift clamps 29 Feb to 28 Feb but never extends 28 Feb to 29 Feb. February 2025 is compared with 2024-02-01..2024-02-28, so spending on 29 February 2024 is missing. Only the leap-to-non-leap direction is tested.
- **Fix:** when `to` is the last day of its month, move it to the last day of the target month.

### CR5-22 — Bonus smoothing can turn a year's income into NaN

- **Where:** `src/app/core/stats/embedded-bonus-smoothing.ts:45-47, 112-117`.
- **Problem:** `removableBonuses` caps the bonus at the bucket total, so a negative total (a salary reversal) gives a negative bonus. That ends in `−100 × 0 / 0 = NaN`, which spreads through `removedPerYear` into that year's bonus band and every income total read from it.
- **Fix:** `Math.max(0, Math.min(bonus, total))`.

### CR5-23 — Lean: duplicate helpers

- **Date helpers.** Private copies of `parseIsoDate` / `formatIsoDate` / `MS_PER_DAY` sit in `core/stats/period-window.ts:10-12`, `recurring-payments.ts:213-217`, `calendar-cycles.ts:94,99,116`, `weekday-weekend-split.ts:21`, `granularity-for-span.ts:3-8`, `date-format.ts:4` and `loans/loan-progress.ts:23`. `daysBetween` is copied in `core/transactions/attribution-override.ts:5-8` and `core/transfers/transfer-matching.ts:20-23`. `shiftRangeByDayCount` exists twice (`period-window.ts:14-25` and `date-buckets.ts:179-191`). "Month-end N months after today" exists three times (`goal-affordability.ts:30-37`, `required-saving-rate.ts:37-42`, `net-worth-projection.ts:38-44`). Three month-step helpers disagree about day overflow, and that disagreement is the root of CR5-9. The canonical helpers are in `shared/utils/date-buckets.ts`, whose own doc warns against private copies.
- **`percentDelta`** exists four times: `year-over-year.ts:53`, `income-growth.ts:59`, `category-period-comparison.ts:35`, `gross-net-growth.ts:20`.
- **Rule matching.** `core/categorisation/rule-matching.ts:77-84` (`matchesRule`) re-implements `matchesPreparedRule` (107-118), and only `core/ml/rule-proposal-mining.ts` uses it. `conditionMatches` (74-75) and `resolveCategoryForTransaction` (143-146) are used only by specs.
- **Server `idOf`.** The same 4-line helper is in `entity-router.ts`, `transfers.ts:42`, `import.ts:68` (`batchIdOf`), `accounts.ts:36` and `categories.ts:31`. Export the one in `entity-router.ts`.
- **Empty write.** `core/categorisation/co-owner-contribution.service.ts:46-48` sends `bulkUpdate` with no updates on every import. `rules-engine.service.ts:39` already guards with `updates.length > 0`.
- **Dead comment.** `core/state/app-settings.store.ts:124` is a doc comment with no method under it.

---

## Nice to have

### CR5-24 — A float leftover shows as a red "-€0.00"

- **Where:** `src/app/shared/utils/currency-format.ts:7-31`, `money-color.ts:24-25`.
- **Problem:** €10.10 + €20.20 − €30.30 is −3.55e-15 in floating point. Intl prints the minus sign and `moneyColor` uses `< 0`, so the card shows "-€0,00" in the loss colour.
- **Fix:** `signDisplay: 'negative'` on the decimal and whole formatters, `'exceptZero'` on the signed one, and treat `amount > -0.005` as zero in `moneyColor`.

### CR5-25 — An admin renaming themselves in the admin panel keeps the old name in the shell

- **Where:** `src/app/feature-auth/components/admin-users-page/admin-users-page.component.ts:126-135`.
- **Fix:** after a successful rename, `if (saved && row.isSelf) await this.session.refresh();`, as `toggleRole` already does.

---

## Checked and found fine

- **Server auth.** scrypt hashing with per-user salts and `timingSafeEqual`. Unknown identifiers cost the same as known ones. Session tokens are 32 random bytes. Cookies are `HttpOnly`/`SameSite=Lax`. Every entity query is limited to the session's `userId`, and foreign references are checked for ownership (`http/ownership.ts`). The admin endpoints guard against losing the last admin and against acting on yourself. The 10 MB body limit is applied before auth, and the 256 MB staged upload is streamed and swept.
- **Multi-row writes** each run inside one SQLite transaction: import commit and undo, transfer link and unlink, account and category deletes, user delete, backup replace.
- **Loan maths.** The annuity formula, the final-month clamp, day-based accrual, and the ahead/behind sign.
- **Required-saving-rate maths.** Taking the maximum rather than the sum is correct.
- **Divide-by-zero guards** in the income, step-change, wage and joint figures.
- **Transfer and savings routing** in `classifyForStats`.
- **Scale.** Every stats aggregate is a single linear pass. Recurring description clustering took 278 ms on 30k synthetic rows.

## Not checked

- **Not read in detail:** the component classes and templates (beyond the files cited above), the QR frame, codec and renderer files, `spending-mosaic.ts`, `category-composition-trend.ts`, `income-events.ts`, `classify-joint-leg.ts`, `range-expression.ts` beyond its month step, `page-range-control.ts` and `chart-options-control.ts`.
- **Not exercised:** no test suite was run as part of this review. CR5-7 and CR5-12 were not run under real timing or memory.
- **Open question:** whether `RangeStore` can produce `from > to`, which would make `avgPerDay` show Infinity or NaN.
