# TICKET-REC-01 — Detect recurring payments: same counterparty, similar amount, regular rhythm

- **Area:** Recurring
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

- [ ] `core/stats/recurring-payments.ts` exports `detectRecurringPayments` as a pure function (no
      DI, no store, no Dexie, no `Date.now()` — `todayIso` is a parameter), exported from
      `core/stats/index.ts`.
- [ ] Every per-transaction decision routes through `classifyForStats()`; the detector re-checks
      none of `transferId`, `nullified`, savings-IBAN membership or joint weighting itself.
- [ ] A monthly subscription with jittered dates (e.g. the 11th, 13th, 12th) and near-identical
      amounts is detected as one `monthly` series with the right `typicalAmount`,
      `nextExpectedDate` and `monthlyEquivalent`.
- [ ] Weekly, quarterly and yearly rhythms are each detected and labelled with their cadence, and
      `monthlyEquivalent` is right for each (a €120/year series ≈ €10/month).
- [ ] Two distinct price points at the same counterparty produce two series (or one series and one
      rejected irregular band), never one blended series — asserted with a fixture holding a fixed
      subscription plus variable spending at the same merchant.
- [ ] Fewer than `MIN_OCCURRENCES` occurrences, or irregular intervals at a regular counterparty,
      produce no series.
- [ ] A refund at a recurring counterparty is not an occurrence and does not break the series'
      rhythm; linked transfers and `nullified` rows produce no series.
- [ ] Counterparties are clustered by normalized IBAN first, name second, description fallback
      last — asserted with a fixture where the same IBAN appears under two spellings of the name.
- [ ] Unit tests cover: the monthly-with-jitter case; weekly/quarterly/yearly cases; the
      two-price-points split; the below-minimum and irregular rejections; the refund case; the
      IBAN-over-name clustering case; an empty history returning an empty result.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

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
- Prerequisite for [TICKET-REC-02](./TICKET-REC-02-recurring-payments-panel.md),
  [TICKET-REC-03](./TICKET-REC-03-upcoming-bills-calendar.md) and
  [TICKET-REC-04](./TICKET-REC-04-recurring-change-flags.md). Independent of every EXP/STAT ticket.
