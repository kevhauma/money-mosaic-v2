# TICKET-TRF-04 — Normalize IBAN comparisons for savings/transfer detection

- **Area:** Transfers
- **Type:** Fix
- **Traceability:** fixes FR-TRF-1 / FR-TRF-3 / FR-TRF-5; fixes FR-STAT-2 (savings rate)

## User story

As a saver, I want money I move to my savings account detected as savings even when the IBAN on the transaction and on the account are formatted differently (spaces, case), so my savings rate reflects reality instead of silently reading 0%.

## Description

Savings and transfer detection compare `Transaction.counterpartyIban` against `Account.iban` with strict string equality, but neither value is normalized when stored. A savings account whose IBAN was entered with different whitespace or casing than the bank's CSV counterparty-IBAN format never matches, so its deposits are silently excluded from the savings figure — the user sees a 0% savings rate despite regularly moving money to savings.

## Current situation (as-is)

- `Account.iban` is saved verbatim from the account form ([account-form.component.ts:248](../../../src/app/feature-accounts/components/account-form/account-form.component.ts), `iban: value.iban || undefined`) — no normalization on the stored value, even though the same file imports and uses `normalizeIban` ([shared/utils/iban.ts](../../../src/app/shared/utils/iban.ts)) elsewhere, but only for the co-owner-IBAN-uniqueness *validator* (lines 57, 64), not for what actually gets persisted.
- `Transaction.counterpartyIban` is stored from the CSV import trimmed only ([csv-row-mapper.ts:130-131](../../../src/app/core/import/csv-row-mapper.ts), `rawRow[mapping.counterpartyIban]?.trim() || undefined`) — no case-folding or whitespace-stripping.
- Every IBAN comparison that drives transfer/savings detection in [transfer-matching.ts](../../../src/app/core/transfers/transfer-matching.ts) is a strict `===` with no normalization: `isSavingsMovement` (line 86), `isLikelyTransfer` (line 64), `ibanConfirms` (lines 52-53), and the set built by `savingsAccountIbans` (lines 67-73).
- **Confirmed against a real case:** the transaction's `counterpartyIban` has spaces; the corresponding savings account's `iban` does not. The transfer still gets *linked* (via `findMediumConfidenceMatches`'s amount/date fallback, since the IBAN-confirmed high-confidence path silently fails), which is why linking "looks fine" — but `isSavingsMovement` never matches, so `computePeriodStats` falls through to `if (transaction.transferId != null) continue`: the movement is correctly excluded from expense, but it's never added to `savings` either. `savingsRate` (`savings / income`) reads 0% even though real money moved to savings every month.
- `normalizeIban` already exists and is used correctly elsewhere (e.g. [joint-owner-lookup.ts:13](../../../src/app/core/accounts/joint-owner-lookup.ts)) — it's simply not applied at these comparison points.

## Desired result (to-be)

- `isSavingsMovement`, `isLikelyTransfer`, `ibanConfirms`, and `savingsAccountIbans` in `transfer-matching.ts` all normalize both sides via the existing `normalizeIban` before comparing.
- Fix is comparison-time only — no rewriting of stored `Account.iban`/`Transaction.counterpartyIban` values, so it corrects both existing and future data with no backfill or migration.
- As a side effect, high-confidence IBAN-based transfer matching (`findHighConfidenceMatches`) also becomes more reliable for differently-formatted IBAN pairs, instead of silently falling through to the medium-confidence amount/date fallback (or missing a match entirely when amounts/dates don't happen to line up).

## Acceptance criteria

- [x] `isSavingsMovement`, `isLikelyTransfer`, `ibanConfirms`, and `savingsAccountIbans` normalize IBANs (via `normalizeIban`) before comparing, so differing whitespace/case between a stored `Account.iban` and a transaction's `counterpartyIban` no longer breaks matching.
- [x] High-confidence transfer matching (`findHighConfidenceMatches`/`ibanConfirms`) benefits from the same fix — a differently-formatted IBAN pair now matches at high confidence instead of falling through to the medium-confidence fallback or missing entirely.
- [x] No Dexie schema change; no migration of existing stored `iban`/`counterpartyIban` values — normalization happens at comparison time only.
- [x] Unit tests cover: a savings movement whose transaction `counterpartyIban` differs in spacing/case from the savings account's stored `iban` is still detected as savings (reported in the savings figure, excluded from expense); the equivalent case for `isLikelyTransfer` and `ibanConfirms`.
- [x] Regression check: existing exact-match cases (already-consistent formatting) behave identically — no change in classification for data that was already matching.
- [x] Verified live in the browser: with a savings account whose stored IBAN differs in formatting from the counterparty IBAN on an existing savings transfer, the dashboard's savings figure and savings rate reflect that transfer after the fix.

## Notes

- This is the confirmed root cause of the reported "savings rate stuck at 0%" bug.
- Worth a quick check on whether `account-form.component.ts` should also normalize `Account.iban` on save (line 248) as belt-and-braces, even though comparison-time normalization alone is sufficient to fix this bug — leaving both un-normalized-at-rest stays consistent with today's `Transaction.counterpartyIban` handling and avoids a false sense that normalization only needs to happen in one place.
