# TICKET-LOAN-14 — Lump-sum what-if scenarios, with an estimated early-repayment fee

- **Area:** Loans
- **Type:** Feature
- **Traceability:** adds FR-LOAN-14 (new)

## User story

As a user, I want to ask "what if I put €20,000 into this loan in 2028," and see the answer **after** the
early-repayment fee my lender would charge, so I can judge whether a big one-off payment is actually worth
it rather than only how good it looks before costs.

## Description

Extends the What-if tab (LOAN-13) with one-off lump sums — an amount and the month it lands in — and prices
the early-repayment penalty that a real lender charges on such a payment, so the tab reports a **net**
benefit (interest saved minus fee), not just a gross one.

## Current situation (as-is)

- LOAN-12's `WhatIfScenario` already carries a `lumpSums: WhatIfLumpSum[]` field and the engine already
  applies them, but nothing produces one: LOAN-13's UI always passes `lumpSums: []`.
- Nothing anywhere in [core/loans](../../../src/app/core/loans/) models a cost of repaying early. LOAN-10's
  `interestSavedEstimate` is gross, and the
  [v1.7 overview](../overview.md)'s "Considered, not ticketed yet" list explicitly parks refinancing as out
  of scope — a fee estimate on a hypothetical lump sum is the narrow, self-contained slice of that which is
  worth having, and this ticket is it.
- Presenting a gross saving alone would be actively misleading for exactly the case this feature exists
  for: a large lump sum is precisely where the penalty is biggest.

## Desired result (to-be)

- `core/loans/what-if.ts` gains a pure, separately-testable fee estimator, deliberately **not** folded into
  the amortization walk:

  ```ts
  export type EarlyRepaymentFeeModel =
    /** Default. N months of interest on the repaid amount at the loan's own rate — the common European mortgage rule (3 months). */
    | { kind: 'monthsOfInterest'; months: number }
    /** A flat percentage of the repaid amount, for lenders that price it that way. */
    | { kind: 'percentOfAmount'; percent: number }
    | { kind: 'none' };

  export function estimateEarlyRepaymentFee(loan: Loan, repaidAmount: number, model: EarlyRepaymentFeeModel): number;
  ```

- `projectLoanWhatIf` accepts the fee model alongside the scenario and returns two more fields:
  `feesTotal` (the sum of the fee on every applied lump sum) and `netInterestSaved`
  (`interestSaved − feesTotal`). A lump sum that is ignored (dated past payoff — LOAN-12) is charged **no**
  fee, because it was never repaid.
- The What-if tab (LOAN-13) grows a second control block:
  - A repeatable list of lump-sum rows — **amount** (`mm-input type="number"`, € ) and **month**
    (`mm-input type="month"`, e.g. `2028-06`) — with add/remove buttons, empty by default.
  - A fee control: a select for the model (`3 months' interest` default / `% of amount` / `No fee`) plus
    the accompanying number field, with a hint line reading that this is an **estimate** and that the real
    figure comes from the loan contract.
  - The headline gains the net line: "Paid off in Feb 2036 — 3 years 1 month earlier. ~€14,300 interest
    saved, minus an estimated ~€1,020 early-repayment fee → **~€13,280 net**."
- When the fee exceeds the interest saved, the net figure is shown as a negative, styled as a warning, with
  wording that says so plainly rather than hiding it.
- Lump-sum amounts and every derived figure honour `mm-privacy-blur`, as in LOAN-13.

## Acceptance criteria

- [ ] `estimateEarlyRepaymentFee` returns `months × monthlyRate × repaidAmount` for `monthsOfInterest`, `percent/100 × repaidAmount` for `percentOfAmount`, and `0` for `none` — reusing `monthlyRateOf`, not a second rate derivation.
- [ ] A lump sum of €20,000 dated in a future year shortens the payoff, and the tab reports gross interest saved, the estimated fee, and the net figure as three distinct numbers.
- [ ] A lump sum ignored by the engine (dated past the projected payoff, or before the projection start) is charged no fee and contributes nothing to `feesTotal`.
- [ ] Multiple lump sums are supported: each is applied in its own month, each is charged its own fee, and `feesTotal` is their sum.
- [ ] Removing a lump-sum row re-derives every figure immediately; removing the last one returns the tab to LOAN-13's recurring-only behaviour.
- [ ] A fee larger than the interest saved yields a negative net figure, rendered as a warning with plain wording — never suppressed, never clamped to zero.
- [ ] Lump sums combine with a recurring extra payment in the same projection (both applied, one payoff date).
- [ ] Invalid rows (blank/zero/negative amount, missing or unparseable month) are rejected by the controls and never reach the engine.
- [ ] Identical results for two different `loanType` values with the same numbers — the fee model is a user-chosen input, never inferred from the loan type.
- [ ] No Dexie/store writes and no schema change: the scenario and the fee model stay component state, same as LOAN-13.
- [ ] Unit tests cover: each of the three fee models, the ignored-lump-sum-no-fee case, multiple lump sums, the negative-net case, and lump sum + recurring extra combined.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: adding a €20,000 lump sum in 2028 to a real loan updates the payoff date, the chart's scenario series (visible step down in that month), and all three money figures.

## Notes

- The default `{ kind: 'monthsOfInterest', months: 3 }` matches the common European mortgage rule (in
  Belgium, the *wederbeleggingsvergoeding*, capped at three months' interest on the repaid amount). It is a
  **default, not a truth** — the model and its number are both user-editable, and the UI never claims to
  know the user's contract. Consumer/auto loans are frequently capped at 0.5–1% instead, which is what the
  `percentOfAmount` model is for.
- Only lump sums are charged a fee, not the recurring extra payment: most contracts allow a modest annual
  overpayment free of charge, and pricing every €200 month would produce a figure more wrong than useful.
  If a user's contract does penalise recurring overpayments, that is a follow-up, not a silent assumption
  here.
- Needs LOAN-12 (engine) and LOAN-13 (the tab and its controls layout). Last of the three, since it is the
  most-derived figure — same position LOAN-10 held in the original set.
