# TICKET-ACC-13 — Show when each account was last imported

- **Area:** Accounts
- **Released in:** [v2.3 UX review](../../releases/v2.3_ux_review/overview.md)
- **Type:** Feature
- **Traceability:** UX review (UXR-12); extends FR-ACC-* — nothing in the app says how current an account's data is

## User story

As someone importing from several banks at different times, I want each account to show when it was last updated, so that I know which balances I can trust today.

## Current situation (as-is)

No surface in the app states when an account last received data. Not the account cards on `/accounts`, not account detail, not the shell. Import batches are recorded ([import-batches.store.ts](../../../src/app/feature-import/import-batches.store.ts)) but never surfaced — the same gap [TICKET-IMP-13](../../import/tickets/TICKET-IMP-13-import-history-with-undo.md) addresses from the import side.

With three accounts imported on different days, every balance is presented with identical confidence, and the user cannot tell that one is a month stale.

A review also found account detail to be a dead end for this workflow: `/accounts/:id` shows a current balance and a balance history chart but **no transaction list** and no in/out totals for the period, so the obvious follow-up to "this balance looks wrong" has no answer on the page.

## Desired result (to-be)

- Each account card and the account detail header state when that account last received imported data.
- A stale account is visually distinguishable from a current one, so the difference is noticed rather than looked up.
- The date derives from recorded import batches rather than a new field maintained in parallel.

## Acceptance criteria

### Implementation note, 2026-08-24 — derived from the batches, with a hydration guard

`ImportBatchesStore` gained a `lastImportedAtByAccountId` computed (newest `importedAt` per
account) and **moved from `feature-import/` to `core/state/`**, which is where the conventions put
a store two features read. It was moved rather than imported through `@/feature-import`, because
that barrel re-exports `./components` and would have dragged the whole import wizard into the
accounts chunk; a production build confirms the move itself costs nothing — initial bundle
unchanged at 851.17 kB before and after.

No schema change: `ImportBatch` already carries `accountId` and `importedAt`, so the date is a
read over records that already exist. That is also what makes undo correct for free — undo removes
the batch entity and the computed falls back to the one before it, which no mirrored column on the
account could do without knowing the history.

**Staleness threshold: 30 days**, recorded in `STALE_AFTER_DAYS` with its reasoning — banks publish
statements monthly, so a file older than about a month means at least one statement has been
published and not loaded. Shorter would nag anyone importing on a monthly rhythm, which is the
normal rhythm.

Convention review caught the one real bug in the first cut, and it was this backlog's own recent
lesson: `hydrate()` is async, so on first paint the map is empty and every card claimed "Never
imported" about accounts imported yesterday — exactly what TICKET-TRF-06 fixed on the transfers
panel two commits earlier. The store now carries the `hydrated` flag `TransactionsStore` keeps, and
both surfaces render nothing at all until it flips.

- [x] Each account card on `/accounts` shows the date that account last received imported transactions. (Live on :4210 with a crafted three-batch fixture: `Everyday Checking` — two batches, 2 and 90 days old — read `Last import 22/08/2026`, i.e. the newest one. `accounts-overview.component.ts` joins it onto `AccountCardVm.lastImport`; rendered by [account-card.component.html](../../../src/app/feature-accounts/components/account-card/account-card.component.html).)
- [x] Account detail shows the same date in its header. (`/accounts/2` read `Current balance · +€9.206,42 · IBAN ···· 6769 · Last import 10/07/2026 — 45 days ago`, from the same `lastImportStatus` helper. It sits with the balance rather than inside `mm-page-header`, which takes no subtitle by design (TICKET-UI-22) — noted on the computed.)
- [x] An account that has never been imported into shows a clear "never" state rather than a blank or an epoch date. ("Never imported", marked. Observed live on both accounts before and after the fixture was inserted and removed; pinned by `last-import-status.spec.ts` → *"says 'Never imported' for an account with no batches, not a blank or an epoch date"*.)
- [x] The date is derived from existing import-batch records — no duplicate field maintained separately from them. (`lastImportedAtByAccountId` is a `computed()` over the store's own entities; nothing is written anywhere. `git diff` touches no repository write path and no entity type.)
- [x] Reads go through the store/repository layer in `core/data-access/`. (Components inject `ImportBatchesStore` from `@/core/state`, which reads `ImportBatchesRepository`; no component touches `appDb`.)
- [x] Any schema change is additive per CLAUDE.md; no shipped `.version(n)` block is edited. (There is no schema change at all — `app-db.ts` is untouched.)
- [x] Unit tests cover: an account with several batches shows the most recent; an account with none shows the never state; an account whose only batch was undone reflects that correctly. (All in `core/state/import-batches.store.spec.ts` → *"lastImportedAtByAccountId (TICKET-ACC-13)"*: most-recent-of-several, per-account isolation, absent-means-never, **falls back to the previous batch when the newest is undone**, and **drops the account entirely once its only batch is undone**. Plus the un-hydrated case, and `last-import-status.spec.ts`'s five threshold cases. IMP-13 has not landed; undo here is the existing `undoImport`.)
- [x] Verified live in the browser with at least two accounts imported on different dates. (dev server :4210, 2026-08-24. Three batches were written straight into the `importBatches` object store — 2 days old and 90 days old on account 1, 45 days old on account 2 — because the dev seed creates none. Result: Checking `Last import 22/08/2026` unmarked, Savings `Last import 10/07/2026 — 45 days ago` with the warning badge, and the detail page agreeing. The three rows were then deleted and the table confirmed empty again, with both cards back to "Never imported" — the database is exactly as it was found.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow CI gates exit 0. `conventions-reviewer` returned eight findings, all applied: the hydration bug above, an orphaned doc comment on the detail component, `text-sm text-base-content/60` in a feature template where `mm-text variant="caption"` exists — which had the two surfaces printing one helper's output in two type styles, three duplicated `@/core/state` import statements, a spec reaching through its own barrel, and two half-stale project-map rows. `ng lint` clean, `ng build --configuration development` compiles.)

## Notes

- "Stale" needs a defined threshold before it can be styled. Pick one deliberately and record it, rather than leaving it to a magic number in a template.
- Adding a transaction list to account detail is the larger half of this finding and is deliberately **not** scoped here — it wants its own ticket once this lands.
- Ordering: cheapest of the three import-safety tickets and independent of both, so it can ship first.
