# TICKET-REC-09 — Recurring detection sees joint-account payments, at their full amount

- **Area:** Recurring
- **Type:** Bug fix
- **Traceability:** revises **FR-REC-1** (detection), surfaces through **FR-REC-2/3**. Same feedback
  as [TICKET-REC-08](./TICKET-REC-08-fuzzy-description-clustering.md): real monthly and weekly
  payments are not being detected.

## User story

As someone who pays the household bills from a joint account, I want those payments detected as
recurring at the amount that actually leaves the account, so the list of what repeats is the list of
what repeats — not just the part of it that happens to sit on a personal account.

## Description

Recurring detection delegates every per-transaction decision to `classifyForStats`, which applies the
app's joint-account attribution rules: a co-owner's leg is excluded outright, and everything else is
scaled down to your `ownershipShare`. Both are right for "what did *I* spend" reporting and wrong for
"what repeats" — a €90 joint utility bill is one €90 rhythm, not a €45 one, and a leg attributed to a
co-owner is still a payment that happens every month. This ticket makes detection read joint
transactions **raw**.

## Current situation (as-is)

- `candidatesByCounterparty`
  ([recurring-payments.ts](../../../src/app/core/stats/recurring-payments.ts)) calls
  `classifyForStats` ([classify-for-stats.ts](../../../src/app/core/stats/classify-for-stats.ts))
  and keeps only `kind: 'expense'` results with a positive amount.
- Inside `classifyForStats`, an account of type `joint` (or any transaction carrying an
  `attributionOverride`) routes through `resolveContribution`, which has two effects this ticket
  cares about:
  - **Exclusion** — a leg resolved as `excluded` (co-owner's share, `notMine`) returns
    `{ kind: 'skip' }` and never becomes an occurrence at all.
  - **Scaling** — the surviving weight is the account's `ownershipShare` of the transaction, so the
    amount that reaches `bandByAmount` is a fraction of the real payment.
- Scaling has a second-order effect beyond the displayed figure: `AMOUNT_BAND_TOLERANCE` bands on the
  scaled amount, and a share that changes over the history (or differs between two joint accounts
  paying the same bill) splits one rhythm across bands.
- This is deliberate for every *other* consumer of `classifyForStats` — `computePeriodStats`,
  `computeCategoryBreakdown`, the Dashboard — and stays that way. `TICKET-EXP-06` already set the
  precedent of a consumer stepping outside the shared weighting when the question being asked is not
  "what was my share".

## Desired result (to-be)

- **Recurring detection uses the raw transaction amount, for every account type.** No
  `ownershipShare` scaling, no co-owner/`notMine` exclusion.
- **Every other guard `classifyForStats` applies still applies**: out-of-range, `nullified`, zero
  amount, savings movement, linked transfer (`transferId`), `neutral`-kind category, income-kind
  category, and a positive-amount refund on an expense category all keep excluding the transaction
  exactly as today.
- **The departure is expressed in the shared pipeline, not forked around it.** `classifyForStats`
  gains an explicit, documented joint-handling mode (e.g. `'share' | 'raw'`) defaulting to today's
  behaviour, and recurring detection is the one caller that asks for `'raw'`. A second, parallel
  classifier is the thing to avoid — CR3-2.1 centralised this precisely so two aggregates cannot
  drift on `nullified`-before-savings ordering.
- **The panel says whose money it is showing.** With raw amounts, "Typical" and "Per month" are the
  *whole* bill, which will not reconcile with the Dashboard's ownership-weighted figures. The
  recurring panel's caption states this, in the same spirit as its existing "not filtered by the
  range above" line.

## Acceptance criteria

- [x] A monthly payment on a `joint` account with `ownershipShare: 0.5` is detected, with
      `typicalAmount` and `monthlyEquivalent` equal to the **full** transaction amount.
      (`recurring-payments.spec.ts` → "detects a half-owned joint bill at the full amount that left
      the account": €90, not €45, and the occurrence amounts are €90 each too.)
- [x] A leg that `resolveContribution` would exclude (co-owner share, `notMine`) still becomes an
      occurrence for detection purposes. (`recurring-payments.spec.ts` → "keeps a leg attribution
      would have excluded". **Read narrowly, and deliberately:** `notMine` is the only excludable
      case tested, because `classifyJointLeg` only ever returns `coOwnerIn` for a *positive* amount —
      an inflow, which under `'raw'` nets an expense category down and is filtered by the aggregate's
      existing `amount <= 0` guard rather than becoming an occurrence. A co-owner's share is not a
      cost leaving the account, so nothing here changes that; `notMine` is the exclusion that could
      be an expense, and it is.)
- [x] A transaction carrying an `attributionOverride` is read raw too — the override changes
      attribution, and attribution is what this ticket is disregarding.
      (`recurring-payments.spec.ts` → "reads a transaction carrying an attributionOverride raw too":
      a `shared` override pointing at the half-owned account, on a plain checking account, is
      detected at €90 where the default mode weights it to €45.)
- [x] Every non-attribution guard still excludes: a `nullified` row, a zero amount, a savings
      movement, a row with a `transferId`, a `neutral`-kind category, an income-kind category, and a
      refund (positive amount on an expense category) each produce no occurrence.
      (`recurring-payments.spec.ts` → "still applies every guard that is not about attribution" —
      all seven asserted, each on the same joint account the case above detects.)
- [x] `classifyForStats`' default behaviour is unchanged: every existing spec of
      `computePeriodStats`, `computeCategoryBreakdown`, `computeWeekdayWeekendSplit` and the
      `classify-for-stats` decision table passes untouched. (`jointMode` is a trailing parameter
      defaulting to `'share'`, so no call site changed but recurring detection's. All 243 spec files
      pass; none of those four specs were edited.)
- [x] The recurring panel's caption states that joint payments are shown at their full amount, so the
      mismatch against the Dashboard reads as a stated choice rather than a bug.
      (`recurring-payments-panel.component.html` caption + the panel spec's "states that joint
      payments are shown whole, so the Dashboard mismatch reads as a choice".)
- [x] No Dexie change, no store or repository touched; detection remains stateless inference.
      (This change's diff: `classify-for-stats.ts`, `recurring-payments.ts`, the panel template, and
      three spec files.)
- [x] Unit tests cover: the joint 50%-share detection at full amount; the excluded-leg inclusion; the
      `attributionOverride` case; at least two of the still-excluded guards on a joint account
      (proving the mode changes attribution only); and a `classify-for-stats` case asserting the
      default mode is untouched. (Four specs under `describe('detectRecurringPayments: joint
      accounts, read raw (TICKET-REC-09)')` — seven guards, not two — plus
      `classify-for-stats.spec.ts` → "applies the share weighting when no joint mode is passed",
      which asserts the omitted argument, the explicit `'share'`, and that `'raw'` really differs.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (Lint clean; 2620
      tests in 243 files pass; dev build completes.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` →
      verdict `pass`, 0 introduced findings.)
- [ ] Verified live in the browser: a joint-account bill on the reporter's dataset appears in the
      panel on `/explore` at its full amount. — **not done: the live browser check was waived by the
      user for this ticket.**

## Notes

- **The reconciliation break is intended and is the main trade-off.** The recurring panel's monthly
  total will exceed the sum a joint-account user sees elsewhere in the app. That is what "disregard
  the ownership share, just raw values" asks for; the caption is what keeps it honest. If it later
  reads as wrong, the fix is a per-panel toggle, not a silent re-weighting.
- Detection *clusters* on counterparty, so the same bill paid from two accounts you both own already
  merges into one series — raw amounts make that merge arithmetically sensible where scaled amounts
  did not.
- Income cadence stays out of scope (FR-INC territory), unchanged by this ticket.
- Independent of [TICKET-REC-08](./TICKET-REC-08-fuzzy-description-clustering.md) and
  [TICKET-REC-10](./TICKET-REC-10-recurring-table-fits-without-scrolling.md); the three can ship in
  any order.
