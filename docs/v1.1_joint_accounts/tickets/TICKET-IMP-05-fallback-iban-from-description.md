# TICKET-IMP-05 — Fall back to extracting counterparty IBAN from the description

- **Area:** CSV Import
- **Type:** Bug fix
- **Traceability:** fixes FR-IMP-3; also breaks FR-TRF-1/3/5 and FR-STAT-2 downstream the same way TICKET-TRF-04 does (savings/transfer detection has nothing to compare against)

## User story

As a user whose bank leaves the counterparty-IBAN column blank for certain transaction types (e.g. automatic savings sweeps), I want the app to fall back to reading the IBAN out of the free-text description, so those transactions are still detected as savings/transfers instead of silently reading as neither.

## Description

Some banks (confirmed: KBC) leave the mapped counterparty-IBAN column empty specifically for automated sweep-type transactions (e.g. a recurring "AUTOMATISCH SPAREN" checking→savings transfer), even though the IBAN is present as plain text in the description. Today the importer takes the mapped column at face value and stores `counterpartyIban: undefined` for these rows, with no fallback — so savings/transfer detection has nothing to match against no matter how well-formatted or normalized (TICKET-TRF-04) that comparison is.

## Current situation (as-is)

- [csv-row-mapper.ts:130-132](../../../src/app/core/import/csv-row-mapper.ts) computes `counterpartyIban` purely from the mapped column: `mapping.counterpartyIban ? rawRow[mapping.counterpartyIban]?.trim() || undefined : undefined`. If that cell is blank, `counterpartyIban` is `undefined` — full stop, no fallback to the row's own description text.
- **Confirmed against a real case:** two KBC-format mapping profiles (`KBC`, `Custom mapping`) both correctly map a `counterpartyIban` column, yet every "AUTOMATISCH SPAREN" row (an automatic checking→savings sweep) on both legs of the transfer stores `counterpartyIban: undefined`. The IBAN is nonetheless right there in `rawDescription`, e.g. `"AUTOMATISCH SPAREN   01-07 VAN BE55 7310 2888 3844"` (savings-side leg) and `"AUTOMATISCH SPAREN   01-07 NAAR BE92 7430 9521 6123"` (checking-side leg) — `VAN`/`NAAR` being Dutch for "from"/"to".
- Because `transferId` still gets set (the pair is linked via [findMediumConfidenceMatches](../../../src/app/core/transfers/transfer-matching.ts)'s amount/date fallback, same as the TRF-04 scenario), the transfer *looks* linked in the UI — but [isSavingsMovement](../../../src/app/core/transfers/transfer-matching.ts) and [isLikelyTransfer](../../../src/app/core/transfers/transfer-matching.ts) both require a non-empty `counterpartyIban` up front (`!!counterpartyIban && ...`), so these rows are never classified as savings: `computePeriodStats` falls through to `if (transaction.transferId != null) continue`, and the movement is excluded from expense but never added to `savings` either — `savingsRate` reads 0% or understates the true figure, the same symptom TICKET-TRF-04 fixed for a different root cause (formatting) rather than this one (field never populated).
- This is distinct from TICKET-TRF-04: that ticket normalizes an *already-populated* `counterpartyIban` before comparing; this bug is about the field being *entirely absent* at import time for specific transaction types, which no amount of comparison-time normalization can fix.

## Desired result (to-be)

- When `mapRow` resolves a blank/absent `counterpartyIban` from the mapped column, it falls back to extracting an IBAN-shaped token from `rawDescription` (a reasonably permissive pattern: 2 letters + 2 digits + up to ~30 further alphanumeric characters, tolerant of internal spaces) and uses that as `counterpartyIban` if one is found.
- The fallback only fires when the mapped column's value is blank — a populated (even if malformed/differently-formatted) column value is never overridden by a description-derived guess.
- No mapping-profile or Dexie schema change: this is parsing logic only, inside the existing `counterpartyIban` derivation in `csv-row-mapper.ts`.
- Existing imports are unaffected unless re-imported; this ticket does not migrate previously-imported rows (no backfill), consistent with TICKET-TRF-04's own no-migration stance.

## Acceptance criteria

- [x] `mapRow` in `csv-row-mapper.ts` falls back to extracting an IBAN from `rawDescription` when the mapped `counterpartyIban` column is blank or the column isn't mapped at all, and leaves a populated column value untouched.
- [x] The extraction pattern tolerates internal spaces (e.g. `"BE55 7310 2888 3844"`) and mixed case, returning a value that (after existing `normalizeIban` comparison-time handling) matches the corresponding account's stored IBAN.
- [x] When no IBAN-shaped token is found anywhere in the description, `counterpartyIban` stays `undefined` — no false positives from unrelated numeric text.
- [x] No Dexie schema change; no migration of previously-imported transactions.
- [x] Unit tests cover: blank mapped column + IBAN present in description (extracted); populated mapped column (fallback not used, column value wins); blank mapped column + no IBAN-shaped text in description (`undefined`, no false match); the real "AUTOMATISCH SPAREN VAN/NAAR <iban>" shape from this ticket's as-is section.
- [x] Verified live in the browser: importing a CSV whose counterparty-IBAN column is blank for a savings-sweep row, but whose description embeds the IBAN, results in that row's savings/transfer detection working (dashboard savings figure and savings rate reflect it) without any manual edit.

## Notes

- Directly downstream of [TICKET-TRF-04](./TICKET-TRF-04-normalize-iban-matching.md) — found while verifying that ticket's fix against a real user dataset; TRF-04's normalization is necessary but not sufficient when the field is missing rather than malformed.
- Scope stays inside `csv-row-mapper.ts`; no change to `transfer-matching.ts` is expected, since once `counterpartyIban` is populated at import time, TRF-04's normalized comparisons already handle the rest.
