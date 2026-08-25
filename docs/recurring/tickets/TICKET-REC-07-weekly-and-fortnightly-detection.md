# TICKET-REC-07 — Weekly rhythms survive real data, and fortnightly becomes a cadence

- **Area:** Recurring
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Bug fix
- **Traceability:** revises **FR-REC-1** (detection), surfaces through **FR-REC-2/3** (the panel's
  cadence column and the bills calendar's projection). From feedback on the shipped panel: "it
  seems like it's just monthly and quarterly".

## User story

As someone with weekly and every-two-weeks payments, I want them detected as recurring alongside
my monthly bills, so the recurring list reflects all my rhythms — not only the ones that happen
to be calendar-month shaped.

## Description

Weekly detection exists on paper but rarely survives contact with real data, and fortnightly
detection deliberately doesn't exist at all — together they make the panel read as "monthly and
quarterly only". This ticket makes a weekly series tolerate a skipped occurrence instead of
un-detecting itself, and adds `fortnightly` as a first-class cadence.

## Current situation (as-is)

- The model and specs already cover weekly:
  [recurring-payments.ts](../../../src/app/core/stats/recurring-payments.ts) has a
  `weekly` entry in `CADENCE_BANDS` (5–10 day window) and
  [recurring-payments.spec.ts](../../../src/app/core/stats/recurring-payments.spec.ts) asserts
  *"detects a weekly rhythm and its monthly equivalent"*. The user-visible absence has two real
  mechanisms behind it:
- **Root cause 1 — one skipped occurrence un-detects the whole series.** `recogniseCadence`
  requires *every* gap to fit the chosen band's window, not just the median (the
  `gaps.some(...)` rejection). That rule exists to refuse "three payments in one week and one a
  year later", but at weekly scale it means a single skipped week — a 14-day gap in an otherwise
  perfect weekly series — rejects the series entirely. Monthly rhythms never hit this: their
  ordinary jitter (weekend shifts, month lengths) fits comfortably inside 24–38 days, and a
  skipped *month* is genuinely rare, while a skipped week (holiday, delivery pause) is routine.
- **Root cause 2 — fortnightly is a deliberate hole.** `CADENCE_BANDS`' doc comment records that
  the gaps between windows (11–23 days among them) "produce no series at all" — so a payment
  every two weeks, which users read as "weekly-ish", is invisible by design.

## Desired result (to-be)

- **A skipped occurrence reads as a missed beat, not a broken rhythm.** A gap that is (within
  the band's own jitter window) a whole-number multiple of the cadence's nominal period counts
  as skipped occurrence(s) rather than disqualifying the series. Bounded by a named,
  doc-commented constant (e.g. `MAX_SKIPPED_INTERVALS`) so a series that is mostly holes still
  produces nothing. The median-gap rule still chooses the band, so a skip can never *reclassify*
  a series — only be forgiven inside one. Applies uniformly to all cadences (it simply matters
  most at weekly scale).
- **`fortnightly` joins `RecurringCadence`** with its own band between weekly and monthly
  (nominal 14 days, jitter window sized like its neighbours', e.g. 12–17 days, leaving a
  rejection gap on both sides), `perMonth = 365.25 / 14 / 12`, a "Fortnightly" label in the
  panel's cadence column, and projection on its own rhythm in the bills calendar.
- The deliberate rejections that remain, stay: a four-monthly rhythm still produces no series,
  and wildly irregular date sets are still refused rather than averaged into a plausible cadence.
- REC-04's flags keep working in the rhythm's own intervals: a weekly series with one forgiven
  skip in its history is neither `overdue` nor `stopped` today, and the overdue/stopped
  thresholds are unchanged.

## Acceptance criteria

- [x] A weekly series with one skipped week (…7, 7, 14, 7… day gaps) is detected as `weekly`,
      keeps all its real occurrences, and reports the weekly monthly-equivalent.
      (`fitsBand` in [recurring-payments.ts](../../../src/app/core/stats/recurring-payments.ts)
      accepts whole multiples of the band's period; spec *"forgives a skipped week rather than
      un-detecting the whole series"* — cadence `weekly`, `intervalDays` 7, all five dates kept,
      monthly equivalent 34.79.)
- [x] A series exceeding the skip allowance (e.g. more skipped beats than
      `MAX_SKIPPED_INTERVALS` permits) still produces no series — the constant is named and
      doc-commented, per the aggregate's convention.
      (`MAX_SKIPPED_INTERVALS = 2` with its own doc block in `recurring-payments.ts`; spec
      *"produces no series once a gap skips more beats than the allowance permits"* — a 28-day gap
      in a weekly series, three skipped beats, returns `[]`.)
- [x] A payment every 14 days is detected with `cadence: 'fortnightly'`, monthly equivalent
      ≈ amount × 365.25 / 14 / 12; the panel's cadence column says "Fortnightly".
      (New `fortnightly` band, nominal 14, window 12–17; specs *"detects a fortnightly rhythm and
      its monthly equivalent"* — €20 → €43.48/month — and
      *"names an every-two-weeks rhythm «Fortnightly» in the cadence column"* in
      [recurring-payments-panel.component.spec.ts](../../../src/app/feature-explore/components/recurring-payments-panel/recurring-payments-panel.component.spec.ts),
      asserting cell 3 is `Fortnightly` and cell 7 `€15.22`.)
- [x] A four-monthly rhythm still produces no series (the hole-between-bands behaviour is
      narrowed, not removed), and the existing *"three payments in one week and one a year
      later"* rejection still holds.
      (Specs *"produces no series for a four-monthly rhythm, which is still no cadence at all"*
      (gaps 123/122/120) and *"produces no series for three payments in one week and one a year
      later"* (median gap 2 days matches no band); the pre-existing
      *"regular counterparty pays on irregular intervals"* spec still passes unchanged.)
- [x] The bills calendar projects a fortnightly series on its own rhythm, and REC-04's flag
      specs (overdue grace, two-interval stop, interval-relative lateness) still pass unchanged.
      (`DAYS_PER_STEP` in [recurring-projection.ts](../../../src/app/core/stats/recurring-projection.ts);
      spec *"lands a fortnightly series on its own 14-day beat, not twice a month"* — 5/19 Aug then
      2/16/30 Sep. All three REC-04 flag specs pass untouched, and the new spec
      *"does not spend the merge's gap allowance on a skip forgiven inside a level"* confirms the
      `PRICE_CHANGE_MAX_GAP_INTERVALS` interaction the Notes flagged: `intervalDays` is a *median*,
      so a forgiven skip never stretches it.)
- [x] The aggregate stays pure and clock-free (`todayIso` parameter only); no Dexie change, no
      store or repository touched — detection remains stateless inference.
      (`git diff --stat`: only `core/stats/recurring-payments.ts`, `recurring-projection.ts`, their
      specs, and the panel component + spec. No `db.ts`, no `core/data-access/`, no store; `fitsBand`
      and `perMonthOf` are pure functions of their arguments.)
- [x] Unit tests cover: the skipped-week weekly detection; the skip-allowance rejection; a
      fortnightly detection with its monthly equivalent; a fortnightly rhythm not being
      misread as weekly-with-skips (median chooses the band); the four-monthly non-detection;
      panel rendering of the "Fortnightly" label.
      (All six, plus *"reads a jittery fortnightly rhythm as fortnightly, not as weekly with skips"*
      (gaps 13/15/14 → `fortnightly`, `intervalDays` 14) and the projection and price-merge specs
      above — 9 new specs across three files.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass.
      (`verifier` subagent: lint "All files pass linting", 2608 tests over 243 files with 0
      failures, dev build emitted with no budget or worker-bundling errors.)
- [x] Verified via the fallow skill and coding-conventions skill.
      (`fallow audit --base HEAD`: verdict `pass`, `dead_code_introduced: 0`,
      `complexity_introduced: 0`, `duplication_introduced: 0` — all 10 complexity findings inherited.
      `conventions-reviewer` subagent reported no violations in the REC-07 code; its two doc-comment
      findings — `stepBy`'s "by the calendar" claim and the `CADENCE_BANDS` "deliberate gaps"
      paragraph now being median-scoped — were both applied.)
- [x] Verified live in the browser: a weekly or fortnightly series (real or crafted import)
      appears in the panel on `/explore` with the right cadence and monthly equivalent.
      (Two crafted series added to the dev database on 2026-08-09 and removed again afterwards.
      *Wasserij Bloem* — €9.75 on 5/12/26 Jul + 2/9 Aug, i.e. the skipped 19 July — listed as
      **Weekly**, €42.40/month, its expanded row showing "5 payments detected" with 19 July
      genuinely absent rather than invented. *Groenten Gilde* — €18.50 every 14 days — listed as
      **Fortnightly**, €40.22/month. The bills calendar projected Groenten Gilde on 11 and 25 August
      (its own 14-day beat, not the same date twice a month) and Wasserij Bloem on 2/9/16/23/30
      August. Before this change neither series existed at all.)

## Notes

- **Not in scope: variable-amount weekly spending.** Weekly groceries that swing more than
  `AMOUNT_BAND_TOLERANCE` are refused by the *amount* banding, not the cadence logic — and
  rightly so: variable card spending at a supermarket is not a commitment. This ticket is about
  fixed-amount rhythms that the *date* rules currently drop.
- The skip-forgiveness interacts with REC-04's `priceChange` merge (`PRICE_CHANGE_MAX_GAP_INTERVALS`
  measures holes in intervals) — implementation should confirm a forgiven skip inside one band
  doesn't double-count against the merge's gap allowance.
- Watch the band edges when adding fortnightly: weekly's window ends at 10 days and monthly's
  starts at 24, so a 12–17 fortnightly window keeps a rejection gap on both sides (11, 18–23) —
  preserving the "never silently rounded into a neighbour" principle the bands document.
- Needs [TICKET-REC-01](./TICKET-REC-01-recurring-payment-detection.md) (shipped). Independent
  of every open ticket in this version; touches the same aggregate as
  [TICKET-REC-05](./TICKET-REC-05-recurring-honours-category-range.md) without overlapping it.
