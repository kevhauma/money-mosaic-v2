# TICKET-SRV-18 — A repeated cross-account merge doesn't duplicate rows

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-DAT-2 (import a backup, with a clear replace-vs-merge choice); CR6-6 ([code review](../../releases/v3_code_review_2/code-review.md)); follows [TICKET-SRV-14](./TICKET-SRV-14-import-renumbers-colliding-ids.md)

## User story

As someone importing a backup into my account, I want importing the same file twice to leave me with one copy of my data, so a retry or a double click never doubles my transactions and balances.

## Description

Since SRV-14, a backup restored into an account other than its own gets fresh ids for every row whose id another account holds. In `merge` mode, a second run hands out a second set of fresh ids and never recognises the copies the first run wrote, so every renumbered row is duplicated. Merge is the default choice on the Data management page.

## Current situation (as-is)

- `freshIdsFor` in [`import-ids.ts`](../../../server/src/operations/import-ids.ts) (lines 31–59) gives each colliding id `highest + 1 + index`. It doesn't record where a row came from, so it can't match the row to the importer's copy from an earlier run.
- `merge` writes each row over the importer's row with the same id (`upsertRow` in [`data.ts`](../../../server/src/routes/data.ts)). A renumbered row lands on a brand-new id every time, so run two inserts where run one did.
- Before SRV-14, `merge` was a `bulkPut` keyed on the backup's ids, and repeating it changed nothing.
- [`data-management-overview.component.ts`](../../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.ts) line 68 defaults `importMode` to `'merge'`. The page describes it as "Add imported rows alongside what you already have."

## Desired result (to-be)

- `POST /api/data/import` with `mode: 'merge'` is refused with a 409 when `planImportIds` renumbers **any** row, before anything is written. The message says why and what to do instead, e.g. `This backup's ids belong to another account on this server, so it can only be imported with Replace. Nothing was imported.`
- `replace` is unchanged. It clears the importer's rows first, so repeating it gives the same result.
- A same-account `merge`, where nothing is renumbered, is unchanged and stays idempotent.
- The Data management page shows the server's message as it does for any other refused import. No client change is needed beyond checking that.

## Acceptance criteria

- [ ] A `merge` of another account's backup answers 409 with the message above and writes nothing. (`data.spec.ts` → new case "refuses a merge that would renumber rows, and writes nothing".)
- [ ] The same backup imported with `replace` twice leaves exactly one copy of each row. (`data.spec.ts` → new case "a repeated cross-account replace leaves one copy of each row".)
- [ ] A same-account `merge` run twice still leaves one copy of each row. (Existing merge cases still pass.)
- [ ] `server/README.md`'s import paragraph says a cross-account restore is replace-only.
- [ ] `npm run test:server`, `npm --prefix server run lint` and `npm --prefix server run typecheck` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: merging a backup taken from another account shows the refusal on the Data management page, and Replace then works.

## Notes

- **This also blocks a first-time cross-account merge**, for example adding an old pre-v3 backup on top of data already imported into a second account. Its ids from 1 almost always collide. That's the price of the smallest fix, and the review offered "or document it" as the only other option.
- The alternative that keeps such merges is to remember where each renumbered row came from (backup id → stored id per table) and reuse that on the next run. That means a new table, so a new Drizzle migration, plus rules for when a mapping goes stale. **Confirm the refuse-merge choice with the user before building.**
- [TICKET-SRV-20](./TICKET-SRV-20-restore-fresh-ids-from-sqlite-sequence.md) changes how the fresh ids are picked and is sequenced after this one.
