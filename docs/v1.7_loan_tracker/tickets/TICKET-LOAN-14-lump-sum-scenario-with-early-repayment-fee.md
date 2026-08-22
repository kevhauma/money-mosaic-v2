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

**Implementation notes (2026-08-22)** — three decisions worth recording:

1. **`projectLoanWhatIf`'s fee model is a defaulted 5th parameter** (`{ kind: 'none' }`), not a
   required one. A caller with no fee question to ask then gets LOAN-12's gross figures and a
   `netInterestSaved` equal to `interestSaved`, rather than a silently invented penalty — and
   LOAN-12's own specs keep exercising the un-priced path.
2. **The fee is charged on what a lump sum could actually repay, not on what was offered.**
   `runProjection` records each applied lump sum clamped to the outstanding balance
   (`Math.min(amount, balance)`), so a €500,000 lump sum against a €5,000 balance is charged on the
   €5,000. The ticket only required ignored lump sums to be free; this is the same principle applied
   to the partially-used case.
3. **`month` was added to `shared/ui`'s `InputType` union** so `<mm-input type="month">` works. That
   is the Open/Closed move the coding-conventions skill calls for (extend the typed union, don't
   special-case at the call site) rather than dropping to a raw `<input>` in this one template.


- [x] `estimateEarlyRepaymentFee` returns `months × monthlyRate × repaidAmount` for `monthsOfInterest`, `percent/100 × repaidAmount` for `percentOfAmount`, and `0` for `none` — reusing `monthlyRateOf`, not a second rate derivation. (`core/loans/what-if.ts` — a three-arm `switch`, calling `monthlyRateOf(loan.interestRate)` for the first arm and nothing rate-related for the others. `what-if.spec.ts` → "estimateEarlyRepaymentFee" describe: 3 months on €20,000 at 6% = €300, 1% of €20,000 = €200, `none` = exactly `0`, plus "reads the rate off the loan" proving a 0% loan owes no months-of-interest fee.)
- [x] A lump sum of €20,000 dated in a future year shortens the payoff, and the tab reports gross interest saved, the estimated fee, and the net figure as three distinct numbers. (`what-if.spec.ts` → "reports gross saving, fee, and net as three distinct figures for a lump sum"; `loan-what-if.component.spec.ts` → "reports gross, fee, and net as three figures for a lump sum in a future year". Live on a €250,000 / 3.5% / 240-month loan: "~€16,334 saved in interest / minus an estimated ~€175 early-repayment fee / Net: ~€16,159", payoff moving August 2046 → July 2044.)
- [x] A lump sum ignored by the engine (dated past the projected payoff, or before the projection start) is charged no fee and contributes nothing to `feesTotal`. (`what-if.spec.ts` → "charges no fee for a lump sum the walk ignored" — a 2019 and a 2099 lump sum together give `feesTotal === 0` and `netInterestSaved === 0`. Mechanism: `runProjection` only pushes onto `appliedLumpSums` inside the month loop, so a lump sum that matches no projected month is never seen by the fee sum.)
- [x] Multiple lump sums are supported: each is applied in its own month, each is charged its own fee, and `feesTotal` is their sum. (`what-if.spec.ts` → "charges each of several lump sums its own fee, summing them into feesTotal": €10,000 in 2027-03 and €20,000 in 2028-06 give €150 + €300. UI: `loan-what-if.component.spec.ts` → "supports several rows at once" — a `FormArray` of rows, each with its own amount and month.)
- [x] Removing a lump-sum row re-derives every figure immediately; removing the last one returns the tab to LOAN-13's recurring-only behaviour. (`loan-what-if.component.spec.ts` → "re-derives immediately on removing a row, returning to recurring-only behaviour". Verified live: clicking Remove on the €20,000 row dropped the month field and returned the readout to "Paid off in August 2046 / No change — this is your current schedule.")
- [x] A fee larger than the interest saved yields a negative net figure, rendered as a warning with plain wording — never suppressed, never clamped to zero. (`what-if.spec.ts` → "reports a negative net when the fee outweighs the saving" (a 0% loan, where early repayment saves nothing, so a 1% fee is pure cost: net `-100`); `loan-what-if-vm.spec.ts` → "flags a net that came out negative rather than clamping or hiding it" and "still reports a charged scenario as improved, not 'no change', when the fee bought nothing". Live with a 200% fee model: "minus an estimated ~€40,000 early-repayment fee / **Costs more than it saves: ~-€23,666**", both elements carrying `text-warning`.)
- [x] Lump sums combine with a recurring extra payment in the same projection (both applied, one payoff date). (`what-if.spec.ts` → "applies a lump sum and a recurring extra together, in one projection" — the combined scenario pays off sooner and saves more than recurring-only, while `feesTotal` stays €300, i.e. the recurring extra is charged nothing (this ticket's Notes). `loan-what-if.component.spec.ts` → "combines a lump sum with a recurring extra in one projection".)
- [x] Invalid rows (blank/zero/negative amount, missing or unparseable month) are rejected by the controls and never reach the engine. (Each row carries `Validators.min(0.01)` on the amount and `Validators.pattern(/^\d{4}-\d{2}$/)` on the month, with `[ariaInvalid]` bound per field; the `lumpSums` computed then filters to rows that are a finite positive number *and* a matching `yyyy-mm` before building the scenario. `loan-what-if.component.spec.ts` → "ignores a row until it has both an amount and a month" — an amount with no month leaves the readout on "No change" with no fee line at all.)
- [x] Identical results for two different `loanType` values with the same numbers — the fee model is a user-chosen input, never inferred from the loan type. (`what-if.spec.ts` → "produces identical fee figures for two loanTypes" — `toEqual` on the whole `WhatIfProjection` for `mortgage` vs `auto`. `estimateEarlyRepaymentFee` reads only `loan.interestRate`; the model comes in as a parameter, and the UI's default (`3 months' interest`) is a constant, not a lookup on `loanType`.)
- [x] No Dexie/store writes and no schema change: the scenario and the fee model stay component state, same as LOAN-13. (`loan-what-if.component.ts` still injects only `AppSettingsStore`, read-only for `privacyModeEnabled`. The lump-sum `FormArray` and both fee controls are plain component fields; no repository, no `appDb`, and `app-db.ts` is untouched by this ticket.)
- [x] Unit tests cover: each of the three fee models, the ignored-lump-sum-no-fee case, multiple lump sums, the negative-net case, and lump sum + recurring extra combined. (`what-if.spec.ts` adds 12 cases across two describes — including a clamp case proving a lump sum bigger than the balance is charged only on what it could actually repay, and a default case proving an omitted model means no fee rather than an invented one. `loan-what-if-vm.spec.ts` adds 4, `loan-what-if.component.spec.ts` adds 8. Suite: 284 files / 3316 tests green.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both CI gates exit `0`: `fallow dead-code --baseline .fallow-baseline.json --fail-on-issues` and `fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues`. Conventions: the fee estimator is a pure function in `core/loans/` with a TestBed-free co-located spec; `month` was added to `shared/ui`'s `InputType` union rather than special-cased at the call site (the Open/Closed rule the skill states); the headline stayed in `loan-what-if-vm.ts` and the component gained no math.)
- [x] Verified live in the browser: adding a €20,000 lump sum in 2028 to a real loan updates the payoff date, the chart's scenario series (visible step down in that month), and all three money figures. (Dev server on :4210, a €250,000 / 3.5% / 240-month mortgage created through the real form and linked to Housing. Adding €20,000 dated `2028-06` moved the payoff from August 2046 to July 2044 and produced the three figures above. The **live chart option**, read back off the mounted echarts instance, shows the scenario series dropping **€20,768 in 2028-06** against €766 the month before and €829 the month after — the step down — with the baseline reaching 0 at `2046-08-22`, the scenario at `2044-07-22`, and the scenario series never going below `0`. Switching the fee model live gave ~€175 (3 months' interest), ~€200 (1%), and no fee line at all for `No fee`, with the number field re-seeding 3 → 1 on the switch. No console errors throughout.)

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
