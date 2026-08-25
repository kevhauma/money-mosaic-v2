# TICKET-REC-01 — Detect recurring payments: same counterparty, similar amount, regular rhythm

- **Area:** Recurring
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Feature
- **Traceability:** new capability, adds **FR-REC-1**. Graduated from gap #3 of
  [competitive-analysis.md](../../v9999_ideas/competitive-analysis.md) ("Recurring & subscription
  detection + bill calendar" — "pure inference over existing transactions — cadence + amount +
  counterparty clustering"). Consumes the classification contract of FR-STAT-* via
  `classifyForStats`.

## User story

As someone whose subscriptions and fixed costs hide inside hundreds of ordinary transactions, I
want the app to automatically find the payments that repeat — same counterparty, similar amount,
similar interval — so my recurring commitments become a fact the app knows instead of a list I
keep in my head.

## Description

Adds the detection half of the recurring-payments story: a pure aggregate in `core/stats/` that
clusters expense transactions by counterparty, splits each cluster into similar-amount bands, and
promotes a band to a *recurring series* when its occurrences arrive at a regular weekly, monthly,
quarterly or yearly rhythm. No UI in this ticket ([TICKET-REC-02](./TICKET-REC-02-recurring-payments-panel.md)
renders it), and no schema change — like every aggregate in this version it is inference over
existing data.

## Current situation (as-is)

- Nothing in the app models "this payment repeats". The only cadence-shaped code is on the income
  side: [income-gap-detection.ts](../../../src/app/core/stats/income-gap-detection.ts) judges
  whether an income *category* pays in ≥75% of months (with a trailing exclusion window so the
  silence being detected doesn't hide itself), and
  [wage-change-detection.ts](../../../src/app/core/stats/wage-change-detection.ts) finds step
  changes in a monthly series. Both work at category/month granularity — neither clusters by
  counterparty nor recognises weekly/quarterly/yearly rhythms.
- `Transaction` already carries everything a detector needs
  ([app-db.ts:48-103](../../../src/app/core/data-access/app-db.ts)): `counterpartyIban`,
  `counterpartyName`, `rawDescription`, `amount`, `bookingDate`, `categoryId`.
- [classify-for-stats.ts](../../../src/app/core/stats/classify-for-stats.ts) is the single
  classification pipeline: it already excludes linked transfers, `nullified` rows, `neutral`
  categories and co-owner/`notMine` joint legs, and returns a signed `amount` (a refund is a
  negative expense delta).
- `normalizeIban` ([shared/utils](../../../src/app/shared/utils/index.ts), used throughout
  [transfer-matching.ts](../../../src/app/core/transfers/transfer-matching.ts)) is the established
  way to compare IBANs.

## Desired result (to-be)

- New pure `core/stats/recurring-payments.ts`:
  ```ts
  detectRecurringPayments(
    transactions, categoriesById, accountsById, todayIso,
  ): RecurringPaymentsResult   // { series: RecurringPaymentSeries[] }
  ```
  `RecurringPaymentSeries = { key: string; label: string; counterpartyIban?: string; categoryId:
  number | null; cadence: 'weekly' | 'monthly' | 'quarterly' | 'yearly'; occurrences:
  { transactionId: number; date: string; amount: number }[]; typicalAmount: number;
  lastDate: string; nextExpectedDate: string; monthlyEquivalent: number }`.
  `todayIso` is a parameter (the aggregate never reads the clock), the
  `income-gap-detection` precedent.
- **Detection runs over the full transaction history, not a display range.** A one-month range
  cannot contain three monthly occurrences; cadence is only visible across time. Range-scoping the
  *display* is the UI's business (REC-02/REC-03), never the detector's.
- **Candidates come from `classifyForStats` alone**: only results of `kind: 'expense'` with a
  positive amount become occurrences. Refunds (negative deltas) are not occurrences and must not
  reset a series' rhythm; transfers, savings movements, `nullified` and `notMine` rows never reach
  the detector's logic because the classifier already skips them.
- **Counterparty clustering**, strongest key first: `normalizeIban(counterpartyIban)` when
  present; else `counterpartyName` normalised (lowercased, whitespace collapsed); else a
  normalised `rawDescription` fallback. The chosen `label` prefers the human-readable
  `counterpartyName`.
- **Similar-amount banding within a cluster**: occurrences whose amounts sit within a relative
  tolerance (named constant, ~±15%) of the band's median belong together, so one counterparty can
  host both a fixed €9.99 subscription and variable card spending, and a utility bill that wobbles
  a few euros still coheres. `typicalAmount` is the band median.
- **Cadence recognition**: with ≥3 occurrences (a named `MIN_OCCURRENCES` constant), the median
  gap between consecutive dates maps to weekly / monthly / quarterly / yearly bands, each with a
  documented jitter tolerance (a salary-day wobble or a weekend-shifted debit must not break a
  series); a band whose intervals are too irregular is rejected. `nextExpectedDate` = last
  occurrence + median interval. `monthlyEquivalent` converts any cadence to a per-month cost so
  the UI can sum across cadences.
- All thresholds are named, doc-commented constants in the style of
  [income-gap-detection.ts:13-26](../../../src/app/core/stats/income-gap-detection.ts) — each
  saying *why* its value, so later tuning against real data is an edit, not an excavation.
- Exported from [core/stats/index.ts](../../../src/app/core/stats/index.ts). No Dexie change, no
  new dependency, nothing persisted.

## Acceptance criteria

**Implementation note, 2026-08-07 — the signature gained a fifth parameter.** The to-be section's
signature omits `ownSavingsIbans`, but `classifyForStats` requires it: without it, `isSavingsMovement`
never fires and every monthly standing order into a savings account would be detected as a recurring
*expense*. It is therefore a trailing `ownSavingsIbans: ReadonlySet<string> = new Set()`, the same
shape and position every sibling aggregate uses (`period-stats.ts`, `category-breakdown.ts`,
`top-transactions.ts`). Nothing else about the contract changed.

- [x] `core/stats/recurring-payments.ts` exports `detectRecurringPayments` as a pure function (no
      DI, no store, no Dexie, no `Date.now()` — `todayIso` is a parameter), exported from
      `core/stats/index.ts`. (`recurring-payments.ts` imports only `type` entities, `normalizeIban`
      and `classifyForStats`; barrel line added to `core/stats/index.ts`. The `todayIso` bound is
      itself asserted by *"stops the history at todayIso, so a future-booked row is not yet evidence
      of a rhythm"*.)
- [x] Every per-transaction decision routes through `classifyForStats()`; the detector re-checks
      none of `transferId`, `nullified`, savings-IBAN membership or joint weighting itself. (Sole
      per-transaction call site is `candidatesByCounterparty`; the only test the detector applies to
      the result is `kind !== 'expense' || amount <= 0`. Spec: *"produces no series from linked
      transfers, nullified rows or savings movements"*.)
- [x] A monthly subscription with jittered dates (e.g. the 11th, 13th, 12th) and near-identical
      amounts is detected as one `monthly` series with the right `typicalAmount`,
      `nextExpectedDate` and `monthlyEquivalent`. (Spec: *"detects a monthly subscription whose
      dates jitter around the 11th"* — gaps of 33/27/30 days, `typicalAmount` 12.99,
      `nextExpectedDate` 2026-05-11.)
- [x] Weekly, quarterly and yearly rhythms are each detected and labelled with their cadence, and
      `monthlyEquivalent` is right for each (a €120/year series ≈ €10/month). (Specs: *"detects a
      weekly rhythm…"* (€8/wk → €34.79/mo), *"…a quarterly rhythm…"* (€60/qtr → €20/mo), *"…a yearly
      rhythm, so a €120/year series reads as €10/month"*.)
- [x] Two distinct price points at the same counterparty produce two series (or one series and one
      rejected irregular band), never one blended series — asserted with a fixture holding a fixed
      subscription plus variable spending at the same merchant. (Spec: *"splits two price points at
      the same counterparty instead of blending them into one average"* — a €9.99 monthly
      subscription alongside €41.20/€58.75/€24.30 card spending at the same merchant yields one
      series at `typicalAmount` 9.99, the variable band rejected.)
- [x] Fewer than `MIN_OCCURRENCES` occurrences, or irregular intervals at a regular counterparty,
      produce no series. (Specs: *"produces no series below the minimum occurrence count"* and
      *"produces no series when a regular counterparty pays on irregular intervals"* — gaps of
      15/72/28 days whose median is monthly-shaped but whose members are not.)
- [x] A refund at a recurring counterparty is not an occurrence and does not break the series'
      rhythm; linked transfers and `nullified` rows produce no series. (Specs: *"ignores a refund at
      a recurring counterparty without breaking the rhythm"* — a +€15 row on an expense category
      classifies as a negative expense delta and is dropped, leaving 4 occurrences — and *"produces
      no series from linked transfers, nullified rows or savings movements"*.)
- [x] Counterparties are clustered by normalized IBAN first, name second, description fallback
      last — asserted with a fixture where the same IBAN appears under two spellings of the name.
      (Specs: *"clusters on the normalized IBAN even when the counterparty name is spelled
      differently"* — `BE68 5390 0754 7034` / `be6853900754 7034` under "ACME UTILITIES" and "Acme
      Utilities NV" → one series — and *"falls back to the counterparty name, then the raw
      description, when no IBAN is present"*.)
- [x] Unit tests cover: the monthly-with-jitter case; weekly/quarterly/yearly cases; the
      two-price-points split; the below-minimum and irregular rejections; the refund case; the
      IBAN-over-name clustering case; an empty history returning an empty result.
      (`recurring-payments.spec.ts`, 13 cases, all green — the listed eleven plus the `todayIso`
      bound and the name/description clustering fallback.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (2026-08-07: "All
      files pass linting"; 238 spec files / 2476 tests passed; "Application bundle generation
      complete", no budget warning.)
- [x] Verified via the fallow skill and coding-conventions skill. (`conventions-reviewer`: "No
      convention violations"; its perf finding — a redundant re-sort per candidate in `bandByAmount`
      — is fixed via `medianOfSorted`, and its untested-`todayIso`-bound finding is now a spec case.
      `fallow audit --base HEAD` after the fix: 0 duplication, 0 boundary/circular findings, no
      CRITICAL function; the remaining reports are the two expected consequences of an aggregate
      with no consumer until REC-02 — one `unused-export`, and CRAP scores that fallow itself labels
      "estimated from export references" because `@vitest/coverage-v8` is not installed to give it
      real coverage. Left unsuppressed on purpose: a suppression would go stale the moment REC-02
      imports this.)

## Notes

- **Expenses only, on purpose.** Recurring *income* cadence is already FR-INC territory
  ([income-gap-detection.ts](../../../src/app/core/stats/income-gap-detection.ts) and friends own
  it at category level); duplicating it here at counterparty level would give two disagreeing
  answers to "did my salary arrive". If counterparty-level income detection is ever wanted, it is
  an FR-INC extension, not part of this series model.
- **Detection is stateless and re-derived on every read** — no `recurringSeries` table, no cached
  result. The competitive analysis' PocketSmith lesson (events a projection can consume) is
  honoured by the *shape* of the output (dated occurrences + a next expected date), not by
  persistence. If profiling ever shows the derivation matters at real transaction volumes, memoise
  in the consuming component the way every chart aggregate already is.
- **User overrides ("this is not recurring" / "these two are the same bill") are deliberately out
  of scope** — they would need persistence (a Dexie table) and this version ships no schema
  change. Recorded in the version overview's "Considered, not ticketed yet".
- Detection quality thresholds will need tuning against real imported data; the constants-block
  convention exists precisely so that tuning is cheap.
- **Update, 2026-08-08 — TICKET-REC-04 shipped and resolved two of the three below.** (2) is fixed:
  `mergePriceChanges` folds the two bands a repricing creates back into one series carrying a
  `priceChange` flag, so a price change now *announces* itself instead of splitting the series.
  (3) is enforced rather than merely warned about: nothing persists `key`, and REC-04's flags are
  computed on every read. **(1) still stands** — one out-of-window gap still rejects a whole band,
  so a subscription that skipped a single month mid-history is still not detected at all. REC-04's
  `stopped`/`overdue` only cover *trailing* silence, which is a different thing; a skip-aware gap
  test remains unbuilt and unticketed.
- **Three consequences of the shipped model that TICKET-REC-04 should start from, not rediscover**
  (surfaced by the conventions review, deliberately not built here — each changes what REC-02
  renders and deserves its own decision):
  1. **One out-of-window gap rejects the whole band.** `recogniseCadence` requires *every* gap to
     fit the median's cadence window, so a 24-month subscription with one skipped month is not a
     series at all — which is exactly the "missed payment" REC-04 wants to flag. If tolerance is
     wanted, the natural shape is a skip-aware gap test (a gap that is a whole multiple of the
     nominal period is a *missed occurrence*, not irregularity), gated by another named constant.
  2. **A price change can make a series disappear.** Banding is amount-only, so €9.99 → €12.99
     (>`AMOUNT_BAND_TOLERANCE` apart) splits into two bands, each of which can fall below
     `MIN_OCCURRENCES` right at the change. REC-04's "price increase" flag therefore cannot be built
     on top of the current bands without addressing this first.
  3. **`key` is stable for a given history, not across price changes.** It is
     `clusterKey|typicalAmount`, so it moves when the band median moves. Fine as a render key;
     nothing downstream should persist it or hang a user override off it (which is also why user
     overrides are out of scope above).
- Prerequisite for [TICKET-REC-02](./TICKET-REC-02-recurring-payments-panel.md),
  [TICKET-REC-03](./TICKET-REC-03-upcoming-bills-calendar.md) and
  [TICKET-REC-04](./TICKET-REC-04-recurring-change-flags.md). Independent of every EXP/STAT ticket.
