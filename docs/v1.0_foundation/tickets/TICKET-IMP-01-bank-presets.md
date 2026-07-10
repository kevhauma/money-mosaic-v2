# TICKET-IMP-01 — Bank presets for BNP Paribas Fortis, ING & Argenta

- **Area:** CSV Import
- **Traceability:** FR-IMP §"v1 preset targets", Open Decision #5

## User story

As a developer, I want bank presets for KBC, Belfius, BNP Paribas Fortis, ING, and Argenta, prioritised by what the user actually uses.

## Description

Ship built-in mapping profiles (column mapping + parsing options) for the three deferred Belgian banks so their CSV exports auto-detect and pre-fill the mapping wizard, exactly as KBC and Belfius do today. Also revisit the existing KBC/Belfius signatures, which were shipped best-effort and never verified against a real export.

## Current situation (as-is)

- `DEFAULT_MAPPING_PROFILE_TEMPLATES` in [app-db.ts](../../../src/app/core/data-access/app-db.ts) seeds **only** `KBC` and `Belfius` profiles (seeded via `bulkAdd` on fresh install; `ownIban` backfilled onto existing DBs by a later `.version().upgrade()`).
- Per the story, even the KBC/Belfius column signatures are "unverified against a real export, best-effort only".
- BNP Paribas Fortis, ING, and Argenta users get **no** preset: auto-detection can't match them, so every import falls through to the manual mapping wizard and must be re-mapped (unless the user saves their own profile per FR-IMP-5).

## Desired result (to-be)

- Verified preset mapping profiles for **BNP Paribas Fortis**, **ING**, and **Argenta**, seeded on fresh install and backfilled onto existing databases.
- Auto-detection recognises each bank's header signature and pre-selects the matching profile in the map step.
- KBC/Belfius signatures re-verified (or explicitly flagged as still unverified with a tracking note).

## Acceptance criteria

- [ ] A `MappingProfile` template exists for BNP Paribas Fortis, ING, and Argenta, each specifying: column indices/names for date, amount (or debit+credit), description, counterparty name, counterparty IBAN, running balance; plus delimiter, decimal separator, date format, encoding, header-row count, sign convention, and `ownIban` source — all derived from a **real** export sample.
- [ ] New templates are added to `DEFAULT_MAPPING_PROFILE_TEMPLATES` so a fresh install seeds them.
- [ ] Existing databases receive the new templates via an **additive** `.version(n + 1).stores(...).upgrade(...)` block — no shipped version block is edited (per Hard rules).
- [ ] Auto-detection (see `account-detection` / format-detection path exercised by [account-detection.spec.ts](../../../src/app/core/import/account-detection.spec.ts)) matches each bank's header signature and pre-selects its profile in `import-map-step`.
- [ ] Importing a real sample export from each of the three banks yields correct date, signed amount, description, counterparty name/IBAN, and running balance in the live preview (FR-IMP-4) with **zero** manual mapping.
- [ ] Sign convention is correct: debits are negative and credits positive after mapping, for each bank's convention.
- [ ] KBC and Belfius signatures are re-checked against a real export; any that cannot be verified are annotated in code/docs as best-effort.
- [ ] Unit tests cover detection + row mapping for each new bank signature (mirroring existing import specs).
- [ ] No duplicate seeded profiles are created when the upgrade runs on a DB that already has KBC/Belfius.

## Notes / risks

- Real anonymised export samples for all three banks are a prerequisite; without them this cannot be truly "verified" and should not be closed.
- Keep profiles data-only (no logic) so they round-trip through the same mapper as user-created profiles.
