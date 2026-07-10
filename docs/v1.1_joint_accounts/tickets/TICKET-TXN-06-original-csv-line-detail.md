# TICKET-TXN-06 — Keep the original CSV line and show it in a transaction detail view

- **Area:** Transactions / Import
- **Type:** Feature
- **Traceability:** extends FR-TXN-1, FR-IMP-1

## User story

As a user, I want to see the original CSV line a transaction came from, so I can check what the bank actually sent when a mapped field looks wrong.

## Description

Bank CSV exports get mapped down to a handful of `Transaction` fields (date, amount, description, counterparty...) and the original row is discarded. When a mapping looks off (a truncated description, a counterparty IBAN that landed in the wrong field, a sign that seems flipped), there's currently no way to check what the bank's file actually contained without re-opening the CSV file itself. Capture the original line at import time and make it viewable from a transaction detail popup.

## Current situation (as-is)

- CSV parsing ([csv-parse.ts](../../../src/app/core/import/csv-parse.ts)) uses `Papa.parse<string[]>` (array mode, no header), then builds a `rawRow: Record<string, string>` (header → cell) per row (`csv-parse.ts:66-72`) purely to feed [`mapRows`](../../../src/app/core/import/csv-row-mapper.ts). Nothing about the original line text is kept once mapping succeeds — `csv-row-mapper.ts`'s `ParsedRowResult` only carries `rawRow` on the `valid: false` branch (line 15), for surfacing parse errors; the `valid: true` branch only carries `transaction` (the mapped fields).
- `parseCsvText` ([csv-parse.ts:22-25](../../../src/app/core/import/csv-parse.ts)) already splits `request.fileText` into physical lines (`request.fileText.split(/\r\n|\r|\n/)`) to detect quote-swallowing — the same split gives us each row's original line text essentially for free, but it isn't threaded through today.
- `ImportService.commitImport` ([import.service.ts:108-114](../../../src/app/core/import/import.service.ts)) builds `Transaction` objects from `row.transaction` only — nothing raw is passed through to what gets persisted.
- `Transaction` ([app-db.ts:39-57](../../../src/app/core/data-access/app-db.ts)) has no field for the source line.
- Row-level transaction interaction today is edit-only: clicking the pencil icon opens `app-transaction-edit-form` ([transaction-edit-form.component.html](../../../src/app/feature-transactions/components/transaction-edit-form/)), the only popup a row currently has.

## Desired result (to-be)

- `parseCsvText` captures each data row's original physical line text alongside its parsed fields (reusing the same line-split it already does for swallowed-quote detection) and threads it through `ParsedRowResult` as `rawLine: string` on the `valid: true` branch.
- `ImportService.commitImport` copies `rawLine` onto the `Transaction` being persisted.
- When a candidate row's fingerprint matches an existing transaction (the normal duplicate path — `partitionByFingerprint`), and that existing transaction has no `rawLine` yet, `commitImport` backfills `rawLine` onto it in place instead of just dropping the row. This turns re-importing an old file into the de facto backfill path for legacy transactions, without ever creating a duplicate `Transaction` row or touching `category`/`categoryManual`.
- `Transaction` gains an optional, non-indexed `rawLine?: string` field — additive, no Dexie version bump. Manually-added or pre-existing transactions simply have no `rawLine`.
- The existing edit-form popup ([transaction-edit-form.component](../../../src/app/feature-transactions/components/transaction-edit-form/)) gains a read-only "Original CSV row" section (monospace, scrollable if long) showing `transaction.rawLine` when present, and is hidden/omitted when it isn't — this reuses the one popup the row already has rather than introducing a second modal.

## Acceptance criteria

- [ ] `Transaction` gains an optional `rawLine?: string` field (no Dexie schema version bump).
- [ ] `parseCsvText`/`mapRows` capture each row's original physical line text and surface it as `rawLine` on valid `ParsedRowResult`s.
- [ ] `ImportService.commitImport` persists `rawLine` on every imported `Transaction`.
- [ ] The transaction edit-form popup shows a read-only, monospace "Original CSV row" section when `rawLine` is present, and shows nothing extra when it isn't (manually-added transactions, or transactions imported before this ticket).
- [ ] A row whose original line contained an embedded newline inside a quoted field (the same edge case `parseCsvText`'s swallowed-quote detection already flags via `warnings`) is allowed to show a partial line — not a new failure mode, just an acknowledged limit consistent with the existing physical-line assumption.
- [ ] Re-importing a file that produces a duplicate fingerprint against a *legacy* transaction (one with no `rawLine`) backfills `rawLine` onto that existing transaction — no new `Transaction` is created, and the existing transaction's `category`/`categoryManual` and every other field are left untouched. If the matched existing transaction already has a `rawLine`, it is left as-is (not overwritten).
- [ ] Unit tests cover: `rawLine` capture in `csv-parse`/`csv-row-mapper` for a normal file, persistence through `ImportService.commitImport`, the duplicate-row backfill onto a legacy transaction described above, and the edit-form popup rendering (or omitting) the section correctly.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: importing a CSV, then opening a transaction's edit popup, shows the exact original line for that row.

## Notes

- Deliberately reuses the existing edit-form popup rather than adding a second "view" modal — matches the source story's "just like the edit" framing and avoids a second near-duplicate component.
- `rawLine` is captured **once, at import time** — it's a point-in-time record of what the bank sent, not re-derived later, so it stays accurate even if the account's mapping profile changes afterward.
- Existing transactions (imported before this ticket ships) simply have no `rawLine` — no upfront backfill migration is run; the section just doesn't render for them until then.
- If the user later re-imports the same source file (e.g. re-downloading a full history export), the duplicate-fingerprint path in `commitImport` opportunistically backfills `rawLine` onto those legacy transactions in place rather than silently dropping the now-redundant row's line text — this is the only backfill mechanism, there is no batch/migration job.
