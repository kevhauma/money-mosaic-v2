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

- `parseCsvText` captures each data row's original CSV data alongside its parsed fields: `rawRow` (header name → cell value, in column order — already built internally as `rawRows[index]`, just no longer discarded) and `rawLine` (the flat physical line text, reusing the same line-split already done for swallowed-quote detection). Both thread through `ParsedRowResult` on the `valid: true` branch.
- `ImportService.commitImport` copies `rawLine`/`rawRow` onto the `Transaction` being persisted.
- When a candidate row's fingerprint matches an existing transaction (the normal duplicate path — `partitionByFingerprint`), and that existing transaction is missing `rawLine` and/or `rawRow`, `commitImport` backfills whichever is missing onto it in place instead of just dropping the row — each field independently, never overwriting one that's already there. This turns re-importing an old file into the de facto backfill path for legacy transactions, without ever creating a duplicate `Transaction` row or touching `category`/`categoryManual`.
- `Transaction` gains two optional, non-indexed fields — `rawLine?: string` and `rawRow?: Record<string, string>` — additive, no Dexie version bump. Manually-added or pre-existing transactions simply have neither.
- The existing edit-form popup ([transaction-edit-form.component](../../../src/app/feature-transactions/components/transaction-edit-form/)) gains a read-only "Original CSV row" section — a scrollable two-column table (CSV header label on the left, cell value on the right, in original column order) when `rawRow` is present; falling back to the old flat monospace block for legacy transactions that only have `rawLine`; omitted entirely when neither is present. This reuses the one popup the row already has rather than introducing a second modal.

## Acceptance criteria

- [x] `Transaction` gains optional `rawLine?: string` and `rawRow?: Record<string, string>` fields (no Dexie schema version bump).
- [x] `parseCsvText`/`mapRows` capture each row's original physical line text and header→value pairs, surfacing them as `rawLine`/`rawRow` on valid `ParsedRowResult`s.
- [x] `ImportService.commitImport` persists `rawLine` and `rawRow` on every imported `Transaction`.
- [x] The transaction edit-form popup shows a read-only, scrollable "Original CSV row" table (label | value, column order preserved) when `rawRow` is present; falls back to the old flat monospace block when only `rawLine` is present (legacy transactions); shows nothing extra when neither is present.
- [x] A row whose original line contained an embedded newline inside a quoted field (the same edge case `parseCsvText`'s swallowed-quote detection already flags via `warnings`) is allowed to show a partial `rawLine` — not a new failure mode, just an acknowledged limit consistent with the existing physical-line assumption. `rawRow` is unaffected by this, since it derives from the already-split data rows rather than a re-split physical line.
- [x] Re-importing a file that produces a duplicate fingerprint against a *legacy* transaction backfills whichever of `rawLine`/`rawRow` it's missing onto that existing transaction — no new `Transaction` is created, and the existing transaction's `category`/`categoryManual` and every other field are left untouched. A field the matched existing transaction already has is left as-is (not overwritten), independently of the other.
- [x] Unit tests cover: `rawLine`/`rawRow` capture in `csv-parse` for a normal file, persistence through `ImportService.commitImport`, the duplicate-row backfill onto a legacy transaction (both fields missing, only one missing, neither missing), and the edit-form popup rendering the table, the legacy fallback block, or nothing, correctly.
- [x] `angular.json` bundle budgets are not raised.
- [x] Verified live in the browser: importing a CSV, then opening a transaction's edit popup, shows a labeled table with every CSV column and its value, in original order.

## Notes

- Deliberately reuses the existing edit-form popup rather than adding a second "view" modal — matches the source story's "just like the edit" framing and avoids a second near-duplicate component.
- `rawLine`/`rawRow` are captured **once, at import time** — a point-in-time record of what the bank sent, not re-derived later, so it stays accurate even if the account's mapping profile changes afterward.
- Existing transactions (imported before this ticket shipped) simply have neither field — no upfront backfill migration is run; the section just doesn't render for them until a re-import backfills it.
- If the user later re-imports the same source file (e.g. re-downloading a full history export), the duplicate-fingerprint path in `commitImport` opportunistically backfills whichever of `rawLine`/`rawRow` is missing onto those legacy transactions in place rather than silently dropping the now-redundant row's data — this is the only backfill mechanism, there is no batch/migration job.
- **Revision:** the original implementation stored only `rawLine` and rendered it as a flat monospace block. Based on user feedback that the flat block was hard to read, `rawRow` (header→value pairs) was added as the preferred, structured source for a labeled table — `csv-parse.ts` already built this exact map per row internally before mapping; it just wasn't being kept. `rawLine` was kept alongside it, now serving only as the fallback for transactions that predate `rawRow` capture.
