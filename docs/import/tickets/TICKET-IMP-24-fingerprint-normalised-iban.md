# TICKET-IMP-24 — The duplicate fingerprint uses the normalised IBAN

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-18, fingerprint part ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-IMP-6 (deterministic fingerprint, de-duplication); TICKET-IMP-05 (IBAN from the description), TICKET-TRF-04 (normalised IBAN comparisons)

## User story

As someone importing overlapping bank exports, I want a row to count as a duplicate whether its IBAN was written with spaces or without, so that switching to a preset with an IBAN column doesn't import every overlapping row again and double my balances.

## Description

The duplicate fingerprint hashes the counterparty IBAN exactly as it came out of the file. The same transaction imported once with `BE12 3456 …` (taken from the description) and once with `BE123456…` (from an IBAN column) gets two fingerprints, so it lands twice. The fingerprint should use the normalised IBAN, and rows already stored under the old hash must still be recognised.

## Current situation (as-is)

- [`computeFingerprint`](../../../src/app/shared/utils/fingerprint.ts) (line 36) puts `input.counterpartyIban ?? ''` into the key unchanged.
- [`ImportService.fingerprintCandidates`](../../../src/app/core/import/import.service.ts) (line 154) passes `row.transaction.counterpartyIban` as mapped. [`csv-row-mapper.ts`](../../../src/app/core/import/csv-row-mapper.ts) (lines 143-146) takes it trimmed from the mapped column, or, when there is none, from `extractIbanFromDescription`, whose pattern allows single spaces between groups (TICKET-IMP-05).
- `previewImport` and `commitImport` compare those hashes against the **stored** `fingerprint` of the account's rows (`<hash>|<occurrence>`, `occurrenceKey` line 80).
- **Root cause:** the key isn't normalised, unlike every other IBAN comparison in the app ([`normalizeIban`](../../../src/app/shared/utils/iban.ts), TICKET-TRF-04). The first import's profile has no IBAN column, so the IBAN comes from the description with its spaces. A later import uses a preset whose column gives it without spaces. Every overlapping row gets a different hash, is partitioned as new, and imports again.
- `dev-seed.ts` also calls `computeFingerprint`.

## Desired result (to-be)

- `computeFingerprint` hashes `normalizeIban(counterpartyIban)`. Spacing and case no longer change the fingerprint.
- Rows stored before this ticket (hashed with the raw IBAN) are still recognised: the partition compares incoming rows against fingerprints **recomputed from the existing rows' stored columns** (`accountId`, `bookingDate`, `amount`, `rawDescription`, `counterpartyIban`) with the new rule, with occurrences counted over those existing rows, instead of against the stored `fingerprint` column.
- Newly imported rows store the normalised fingerprint. No schema change and no data rewrite.

## Acceptance criteria

- [ ] `computeFingerprint` gives the same hash for `BE12 3456 7890 1234`, `be12345678901234` and `BE12345678901234`, all else equal. A missing IBAN hashes as today.
- [ ] Importing the same rows first with a description-derived spaced IBAN, then with an unspaced IBAN column, reports every overlapping row as a duplicate (preview and commit agree).
- [ ] A row stored before this change (raw-IBAN hash in `fingerprint`) is recognised as a duplicate by the next import of the same file.
- [ ] Import-anyway (TICKET-IMP-14) still walks past every existing occurrence, and two genuinely identical rows in one file still both import.
- [ ] The rawLine/rawRow backfill for legacy duplicates (TICKET-TXN-06) still finds its existing row.
- [ ] No Drizzle migration. If the implementation does move the schema, it goes in a new migration and never edits a shipped one.
- [ ] Unit tests cover: `fingerprint.spec.ts` normalisation cases; `import.service.spec.ts` › spaced-then-unspaced overlap is all duplicates, legacy stored hash still matched, import-anyway occurrence numbering, backfill against a recomputed match.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why recompute rather than migrate:** the stored value is a 64-bit FNV-1a hash. A Drizzle migration is SQL and can't recompute it, and a one-off TypeScript backfill would need the fingerprint code on the server. Recomputing from the stored columns at comparison time costs one pass over rows `getByAccount` already returns, and fixes old rows and new ones alike. A dual-key check on the incoming side alone wouldn't work: the old row was hashed with _its_ raw IBAN, which an incoming row can't reproduce.
- Recomputing assumes the stored `rawDescription` / `counterpartyIban` / `amount` / `bookingDate` match what was hashed at import. Nothing edits them today. If an edit path for these fields ever appears, keep the stored fingerprint as the fallback key.
- `normalizeIban` lives in `src/app/shared/utils/iban.ts`, next to `fingerprint.ts`. If TICKET-CAT-14 moves it to root `shared/`, import it from there.
- The server-side skip of fingerprints already present on commit (two tabs, a resent commit) is TICKET-SRV-21, which builds on this one. It compares the client-sent fingerprint, so it needs both sides on the new rule first.
