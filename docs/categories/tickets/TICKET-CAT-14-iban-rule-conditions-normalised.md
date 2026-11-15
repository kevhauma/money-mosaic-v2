# TICKET-CAT-14 — IBAN rule conditions ignore spacing and case

- **Area:** Categories
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-29, CR6-A4 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-CAT-2 (counterparty IBAN conditions), FR-CAT-3 (re-run on demand)

## User story

As someone writing a rule on a counterparty IBAN, I want it to match however the bank spaced the IBAN, so `BE68 5390 0754 7034` and `BE68539007547034` count as the same account.

## Description

Every other IBAN comparison in the app strips spaces and upper-cases first. Rule conditions compare the raw strings, so a rule typed with the spacing a bank statement shows never matches a row the bank exported without spaces (or the other way round). The fix normalises both sides inside the shared matcher, and moves `normalizeIban` into the root `shared/` workspace so the server's `run_rules` matches the same way.

## Current situation (as-is)

- [`fieldValue`](../../../shared/rule-matching.ts) (lines 17–18) returns `transaction.counterpartyIban` as stored, and `evaluateCondition` (lines 55–60) compares it lower-cased but with its spaces intact for `contains` and `equals`.
- [`normalizeIban`](../../../src/app/shared/utils/iban.ts) (strip whitespace, upper-case) lives in the Angular app only. Joint-owner lookup, transfer matching, account detection, recurring detection, saving velocity and money flow all use it. The root `shared/` rule matcher can't import it, because `shared/` may import nothing from `src/`.
- The CSV mapper stores the IBAN with whatever spacing the bank exported. A rule `counterpartyIban equals "BE68 5390 0754 7034"` never matches `BE68539007547034`, both in "Run rules" and in the MCP `run_rules` tool (both call `applyRules`).

## Desired result (to-be)

- `normalizeIban` moves to a new root module `shared/iban.ts`. [`src/app/shared/utils/iban.ts`](../../../src/app/shared/utils/iban.ts) re-exports it from there, so every `@/shared/utils` import stays unchanged (the `core/categorisation/rule-matching.ts` re-export pattern).
- For a `counterpartyIban` condition with `contains` or `equals`, the matcher normalises both the row's IBAN and the condition value before comparing.
- `regex` conditions keep matching the raw stored value, so an existing pattern that relies on spaces doesn't change meaning.
- Stored rules and stored transactions are not rewritten; this is a comparison-time fix, so no migration is needed.

## Acceptance criteria

- [ ] `counterpartyIban equals "BE68 5390 0754 7034"` matches a row with `BE68539007547034`. `equals "be68539007547034"` matches a row with `BE68 5390 0754 7034`.
- [ ] `counterpartyIban contains "5390 0754"` matches `BE68539007547034`.
- [ ] A `regex` condition on `counterpartyIban` behaves exactly as before.
- [ ] `description` and `counterpartyName` conditions are unaffected: `description contains "a b"` still does not match `"ab"`.
- [ ] `normalizeIban` is defined once, in `shared/iban.ts`. No copy remains in `src/` or `server/`, and `server/src/shared-module.spec.ts` passes (the module imports nothing).
- [ ] The MCP `run_rules` tool applies an IBAN rule typed with spaces to a row stored without spaces (server spec).
- [ ] Rows with `categoryManual: true` keep their category when the newly matching rule runs.
- [ ] Unit tests in `rule-matching.spec.ts` cover the equals, contains, regex and non-IBAN cases above.
- [ ] `ng lint`, `ng test`, `ng build --configuration development`, `npm --prefix server run lint`, `npm --prefix server run typecheck` and `npm run test:server` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: a rule on `BE68 5390 0754 7034` categorises a row whose IBAN column shows `BE68539007547034` when "Run rules" is pressed.

## Notes

- TICKET-IMP-24 (fingerprint on the normalised IBAN) builds on `shared/iban.ts` once this lands, so the server can share the same helper.
- Normalising the value in the rule form when it's saved would leave existing rules broken. Comparing normalised values fixes old and new rules alike, which is also how the 2026-07 savings-rate IBAN bug was fixed.
