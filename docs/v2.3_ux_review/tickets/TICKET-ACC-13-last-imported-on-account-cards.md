# TICKET-ACC-13 — Show when each account was last imported

- **Area:** Accounts
- **Type:** Feature
- **Traceability:** UX review (UXR-12); extends FR-ACC-* — nothing in the app says how current an account's data is

## User story

As someone importing from several banks at different times, I want each account to show when it was last updated, so that I know which balances I can trust today.

## Current situation (as-is)

No surface in the app states when an account last received data. Not the account cards on `/accounts`, not account detail, not the shell. Import batches are recorded ([import-batches.store.ts](../../../src/app/feature-import/import-batches.store.ts)) but never surfaced — the same gap [TICKET-IMP-13](./TICKET-IMP-13-import-history-with-undo.md) addresses from the import side.

With three accounts imported on different days, every balance is presented with identical confidence, and the user cannot tell that one is a month stale.

A review also found account detail to be a dead end for this workflow: `/accounts/:id` shows a current balance and a balance history chart but **no transaction list** and no in/out totals for the period, so the obvious follow-up to "this balance looks wrong" has no answer on the page.

## Desired result (to-be)

- Each account card and the account detail header state when that account last received imported data.
- A stale account is visually distinguishable from a current one, so the difference is noticed rather than looked up.
- The date derives from recorded import batches rather than a new field maintained in parallel.

## Acceptance criteria

- [ ] Each account card on `/accounts` shows the date that account last received imported transactions.
- [ ] Account detail shows the same date in its header.
- [ ] An account that has never been imported into shows a clear "never" state rather than a blank or an epoch date.
- [ ] The date is derived from existing import-batch records — no duplicate field maintained separately from them.
- [ ] Reads go through the store/repository layer in `core/data-access/`.
- [ ] Any schema change is additive per CLAUDE.md; no shipped `.version(n)` block is edited.
- [ ] Unit tests cover: an account with several batches shows the most recent; an account with none shows the never state; an account whose only batch was undone reflects that correctly (coordinate with IMP-13 if it lands first).
- [ ] Verified live in the browser with at least two accounts imported on different dates.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- "Stale" needs a defined threshold before it can be styled. Pick one deliberately and record it, rather than leaving it to a magic number in a template.
- Adding a transaction list to account detail is the larger half of this finding and is deliberately **not** scoped here — it wants its own ticket once this lands.
- Ordering: cheapest of the three import-safety tickets and independent of both, so it can ship first.
