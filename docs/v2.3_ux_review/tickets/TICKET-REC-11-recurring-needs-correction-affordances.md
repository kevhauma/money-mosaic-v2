# TICKET-REC-11 — Recurring detection can't be corrected, and over-claims

- **Area:** Recurring
- **Type:** Bug fix
- **Traceability:** UX review (UXR-15); FR-REC-* — detection is presented as fact, with no confidence, merge, or dismiss

## User story

As someone reviewing my recurring payments, I want to tell the app when it has guessed wrong, so that a detection I disagree with stops being presented as a fact about my finances.

## Current situation (as-is)

On the seeded dataset `/recurring` reports **"7 recurring payments ≈ €1,202.04/month"** — a figure identical to the month's entire expense total. It has classified 100% of spending as recurring, including a one-off dinner out and a train ticket.

It also lists **"FreshMarket" twice** as two separate monthly payments (€73.15 and €58.40) — same counterparty, same category, two entries.

The page offers no confidence indicator, no way to merge two detections of the same payment, and no way to dismiss one. Detection is presented as settled fact.

This is the clearest breach of the product's own stated principle of **reversible automation** — "helpful defaults the user can always see, inspect, and override" ([PRODUCT.md](../../../PRODUCT.md)). Categorisation honours that principle via `categoryManual`; recurring detection has no equivalent.

The page's copy is otherwise a strength — "Detected across your whole transaction history — a rhythm can't be read from a single month, so this page has no date range" is a genuinely good explanation of why a control is absent. The problem is not that the page fails to explain itself; it is that it gives the user nothing to do when it is wrong.

## Desired result (to-be)

- Each detection shows how confident the app is, so a weak match is not presented like a strong one.
- The user can dismiss a detection that is not really recurring, and that dismissal sticks across re-detection.
- The user can merge two detections that are the same real-world payment.
- The headline total reflects only detections the user has not dismissed.

## Acceptance criteria

### Implementation note, 2026-08-24 — anchored on a transaction, not on the series key

The whole difficulty is identity. `RecurringPaymentSeries.key` is `<cluster>|<median amount>` and its
own doc forbids hanging an override off it, because a price change moves the median. Detection is a
pure derivation that re-runs on every transaction change, so an override that could only be
expressed as "edit the detected row" would be wiped every time.

So an override names a **transaction id** — one the series contains — and is re-matched to whichever
freshly-detected series still contains it. That survives a price change (which moves the key), new
payments arriving, and older history being imported (which moves the series' first occurrence).
It is the same guarantee `categoryManual` gives categorisation, by the same means: the automation
recomputes everything and is not free to overwrite what the user said about it.

Three things beyond the criteria, each because leaving them out would have re-created the problem
in another place:

- **A merge is undoable too.** "Undo merge" sits beside the dismiss control in the expanded row.
  Reversible automation that the user cannot reverse is just a different trap.
- **A merged series' monthly figure is measured, not extrapolated.** `typicalAmount × cadence rate`
  is right for a steady series and badly wrong for a merged one: on the dev seed the two FreshMarket
  rows merge into a *weekly* rhythm, and the median amount times a weekly rate claimed **€253.94/month**
  for groceries that had never come to more than about €130. `observedMonthlyEquivalent` divides what
  was actually spent by the span it covers, which gave €151.10 — and the panel's total then moved
  *down* after a dismissal and a merge, which is the only direction it should ever move.
- **The panel says nothing until the corrections have loaded.** An un-hydrated store looks exactly
  like "no dismissals", so the uncorrected rows would flash back on every visit — TICKET-TRF-06's
  bug in a new place. Caught in convention review.

The dismissed list is its own component (`recurring-dismissed-list`) because adding it inline
pushed the payments panel's template past the complexity gate — that template already carries two
row groups, a repeating-row `ng-template` and the evidence expansion. The seam is natural: nothing
in the dismissed list touches the table.

**Deliberately out of scope, per the ticket's own Notes:** the detector is not tightened. It still
finds seven series on the seed data; what changed is that the user can now say which of them are
wrong, and each row says how sure it is.

- [x] Each detected payment shows a confidence indicator derived from the existing detection signals. (`scoreConfidence` in [recurring-payments.ts](../../../src/app/core/stats/recurring-payments.ts) reads three signals detection already computed — occurrence count against `CONFIDENT_OCCURRENCES`, gap jitter against `STEADY_JITTER_RATIO`, amount spread against `STEADY_AMOUNT_RATIO` — and names the first doubt it finds. Three levels, not a percentage: the inputs are uncalibrated heuristics and "71% confident" would claim a precision they do not have. Rendered as a `Strong match` / `Fair match` / `Weak match` badge on **every** row, with the reason as its tooltip — a marker that appeared only on bad rows would teach the reader that its absence means nothing. Live: all seven seed rows read `Fair match — seen 4 times so far`.)
- [x] A detection can be dismissed, and stays dismissed when detection re-runs. (Live on :4210: dismissing *Trattoria Bella* dropped the page from `7 recurring payments ≈ €1.202,04/month` to `6 ≈ €1.174,54/month`, and a full page reload came back with the same six rows and the same total. Pinned by `recurring-overrides.spec.ts` → *"stays dismissed when re-detection moves the series key"* and *"…when older history arrives and moves the first occurrence"*, the two ways an identity based on the key or on the first occurrence would have broken.)
- [x] Two detections of the same payment can be merged, and the merge survives re-detection. (Live: the seed's two FreshMarket rows — the review's own example, at €58,40 and €73,15 — merged into one row on request, and the suggestion disappeared with them. Pinned by *"folds the duplicate into the primary and lists one row"* and *"stays merged when re-detection moves either key"*.)
- [x] The summary total and count exclude dismissed detections. (The panel's count and total both read `RecurringSeriesStore.activeSeries()`, which is the corrected series minus stopped ones — the dismissal never reaches them. Measured live above; pinned by the panel spec's *"drops a dismissed series out of the list, the count and the total"*.)
- [x] User dismissals and merges are never silently discarded by re-detection — the same guarantee `categoryManual` gives categorisation. (`applyRecurringOverrides` runs on top of every detection pass, matching by transaction id. Its spec covers the two moving identities above, a stale override whose series no longer exists — skipped, never an error, since a correction outliving what it corrected is the normal end of its life — and the ordering rule that a merge may not resurrect a row the user has since dismissed.)
- [x] Persistence goes through the store/repository layer in `core/data-access/`; any schema change is additive per CLAUDE.md. (New `recurringOverrides` table on a **new** `.version(16)` block — brand-new and empty, so no `.upgrade()`, same as `loans` at v15; no shipped block edited. `RecurringOverridesRepository` is a thin three-method wrapper; the store calls it and patches state, and no component touches `appDb`. `app-db.spec.ts` pins v16, the full table list, and the new table's two indexes.)
- [x] Unit tests cover: a dismissed detection stays dismissed after re-detection; a merged pair stays merged; the total excludes dismissals; two same-counterparty same-category detections are offered as merge candidates; an undismissed detection is unaffected. (All five, plus the stale-override and merge-ordering cases, in `recurring-overrides.spec.ts`; the total/count and the controls in `recurring-payments-panel.component.spec.ts` → *"corrections (TICKET-REC-11)"*; the confidence scoring and `mergeRecurringSeries` in `recurring-payments.spec.ts`. 77/77 pass across `feature-recurring` + the schema spec.)
- [x] Verified live in the browser: dismiss a detection, reload, confirm it is still dismissed and the total dropped. (dev server :4210, 2026-08-24, exactly as written above — 7 → 6 payments, €1.202,04 → €1.174,54, surviving a reload, with a `Dismissed (1)` disclosure offering it back. The merge, the undo-merge and the restore were exercised too, and the database was left with zero overrides and the original `7 recurring payments ≈ €1.202,04/month`.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow CI gates exit 0. `conventions-reviewer` returned eight findings, all applied: the schema tripwire spec still pinned v15 — a genuine red test; the merge suggestion baked two amounts into prose, leaking them past privacy mode; the empty state claimed "nothing repeating found yet" while the corrections were still loading; `[title]` was bound on `mm-badge`, which had no such input, so it landed on the unstyled host — `BadgeComponent` now takes one; plus the stale data-model version line, a dead placeholder, and formatting. `ng lint` clean, `ng build --configuration development` compiles.)

## Notes

- Whether the detector itself is too loose is a separate question from whether the user can correct it. This ticket delivers the correction affordances; **tightening detection is deliberately out of scope** and wants its own ticket informed by what users actually dismiss.
- A UX review also found `/recurring`'s calendar rendering September's trailing days with full event styling, so a payment appears twice under an "August 2026" heading. Small and separate — worth fixing while the file is open, not required here.
- Related: [TICKET-INC-23](./TICKET-INC-23-replace-the-income-onboarding-wall.md) — same theme of inference the user cannot reach.
