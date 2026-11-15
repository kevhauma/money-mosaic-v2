# TICKET-IMP-23 — "0,00" in the unused debit/credit column is treated as empty

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR5-15 ([code review 5](../../releases/v3_code_review/code-review.md), re-confirmed by [CR6](../../releases/v3_code_review_2/code-review.md)); FR-IMP-3 (amount as one column or separate debit/credit columns), FR-IMP-8 (malformed rows reported)

## User story

As someone whose bank writes "0,00" in the debit or credit column a row doesn't use, I want those rows to import with the right amount, so that every row of my export isn't rejected as "unparseable or ambiguous amount".

## Description

With separate debit and credit columns, a row is valid only when exactly one of the two is filled. "Filled" today means "not blank", so a bank that writes `0,00` in the unused column has both filled on every row, and the whole file fails. A cell that parses to zero should count as empty.

## Current situation (as-is)

- [`resolveAmount`](../../../src/app/core/import/csv-row-mapper.ts) (lines 90-118): `debitFilled` / `creditFilled` (lines 101-102) are `raw.trim() !== ''`, and `debitFilled === creditFilled` returns `null` (line 104). `mapRow` turns that into the "unparseable or ambiguous amount" error.
- **Root cause:** the filled check looks at the text, not the value. Debit `0,00` with Credit `12,50` counts as both filled, so the row is rejected.
- [`column-guess.ts`](../../../src/app/core/import/column-guess.ts) (lines 300-301) still scores two always-full amount columns as a debit/credit pair (1 point each), so the guided mapper suggests exactly the mapping that then fails every row.
- [csv-row-mapper.spec.ts](../../../src/app/core/import/csv-row-mapper.spec.ts) covers "is invalid when both debit and credit are filled" and "is invalid when neither…", both with blank or non-zero cells only.

## Desired result (to-be)

- A debit or credit cell that parses to 0 (`0`, `0,00`, `0.00`, `-0,00`) counts as empty in `resolveAmount`.
- Debit `0,00` + Credit `12,50` → +12.50; Debit `12,50` + Credit `0,00` → −12.50 (default sign convention; `credit-negative` flips as today).
- Both cells non-zero → still invalid (ambiguous). Both blank or both zero → still invalid, so a zero-amount row isn't invented.

## Acceptance criteria

- [ ] Rows with `0,00` in the unused column import with the other column's signed amount, under both sign conventions.
- [ ] Both non-zero, both blank and both zero still give "unparseable or ambiguous amount".
- [ ] An unparseable cell (for example `abc`) in the unused column still invalidates the row rather than counting as empty.
- [ ] Unit tests in `csv-row-mapper.spec.ts` cover: debit zero + credit filled; debit filled + credit zero; both zero; zero written as `0`, `0,00` and `0.00` per decimal separator; `credit-negative` with a zero column.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Reuse `parseAmount` (same file) to decide "zero", so the decimal separator and thousands handling match the amount itself.
- The reading step and column guess need no change once the mapper accepts these rows. `column-guess.ts` only suggests the pair; it was never the cause.
