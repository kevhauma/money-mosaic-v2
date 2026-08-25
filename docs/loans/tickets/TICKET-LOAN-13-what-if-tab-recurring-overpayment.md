# TICKET-LOAN-13 — "What-if" tab on loan detail, with a recurring-overpayment simulator

- **Area:** Loans
- **Released in:** [v1.7 Loan tracker](../../releases/v1.7_loan_tracker/overview.md)
- **Type:** Feature
- **Traceability:** adds FR-LOAN-13 (new)

## User story

As a user, I want to type "€200 extra per month" on a loan and immediately see when I'd pay it off and how
much interest I'd save, so I can decide whether overpaying is worth it before I actually commit the money.

## Description

Turns the loan detail page into a tabbed page and adds the second tab: a what-if simulator driven by
LOAN-12's engine, with one control (extra monthly amount), a headline answer, and a baseline-vs-scenario
balance chart.

## Current situation (as-is)

- [loan-detail.component.html](../../../src/app/feature-loans/components/loan-detail/loan-detail.component.html)
  stacks every panel vertically in one scroll — status badge, `app-loan-balance-chart`,
  `app-loan-amortization-table`, `app-loan-payments-list` — with no tabs at all.
- The page's only forward-looking number today is `loanScheduleStatusFor`'s
  [projected payoff date](../../../src/app/feature-loans/loan-schedule-status.ts), which extrapolates the
  user's *past* pace (LOAN-10). Nothing lets the user pose a hypothetical.
- [tabs.component.ts](../../../src/app/shared/ui/tabs/tabs.component.ts) already supports the value-driven
  mode this needs (caller owns `selected`, click updates it); every current call site
  (Categories/Rules) uses the route-driven mode instead, and
  [forecast-controls.component.html](../../../src/app/feature-future/components/forecast-controls/forecast-controls.component.html)
  is the precedent for the value-driven one.
- [forecast-controls.component.ts](../../../src/app/feature-future/components/forecast-controls/forecast-controls.component.ts)
  is also the precedent for a "scenario knobs" panel (`mm-fieldset` + `mm-label` + `mm-input`, reactive
  form controls, a hint line under each control).

## Desired result (to-be)

- `loan-detail.component.html` wraps its existing panels in an `mm-tabs` (value-driven, `variant="lift"`)
  with two tabs:
  - **Overview** — everything the page shows today, in the same order, unchanged.
  - **What-if** — the new simulator.
  The page header, its action buttons, and the ahead/behind-schedule badge stay **above** the tab bar:
  they describe the loan, not one view of it. The selected tab is component state (`signal`), not a route
  param — deep-linking a tab is not worth a route change here.
- New `feature-loans/components/loan-what-if/loan-what-if.component.ts`, exported from the feature's
  [components barrel](../../../src/app/feature-loans/components/index.ts):
  - One control: **extra monthly payment** (`mm-input type="number"`, `min="0"`, € prefix), plus quick
    presets (€50 / €100 / €200) that just set the control's value — the loan-detail equivalent of
    `forecast-controls`' preset selects.
  - Reads the same `payments()` the rest of the page uses, derives `computeLoanProgress`, and calls
    LOAN-12's `projectLoanWhatIf(loan, progress, { extraMonthlyPayment, lumpSums: [] }, today)`.
  - **Headline answer** in plain language: "Paid off in March 2039 — 2 years 4 months earlier, saving
    ~€8,120 in interest." Zero extra reads as a neutral "No change — this is your current schedule," not
    an empty state.
  - **Chart**: a two-series ECharts line (baseline vs. scenario balance) built by a pure
    `buildLoanWhatIfChartOption` kept out of the component, mirroring
    [loan-balance-chart.component.ts](../../../src/app/feature-loans/components/loan-balance-chart/loan-balance-chart.component.ts).
  - Every monetary figure wrapped in `mm-privacy-blur` bound to `AppSettingsStore.privacyModeEnabled`, the
    same way [loan-payments-list](../../../src/app/feature-loans/components/loan-payments-list/loan-payments-list.component.html)
    already does (TICKET-PRIV-01/PRIV-02).
- Wording is loan-type-neutral throughout ("this loan," never "this mortgage"), and every saving figure
  carries a `~` and an "estimate" caption.

## Acceptance criteria

**Implementation notes (2026-08-22)** — two departures from the to-be section above, recorded here
rather than left to be discovered:

1. **No `€` prefix on the field.** `mm-input` has no prefix/adornment slot, and the currency symbol
   is a user setting (TICKET-SET-04) rather than always `€` — a hardcoded one would be wrong for
   anyone running `$`. The field follows `loan-form`'s own numeric fields instead: an `mm-fieldset`
   legend ("Extra payment per month") plus a hint line, no symbol adornment.
2. **The headline is a two-line readout, not one run-on sentence.** The example wording
   ("Paid off in March 2039 — 2 years 4 months earlier, saving ~€8,120 in interest.") interleaves
   `@if` blocks with punctuation, which renders with stray spaces before the comma and the full stop
   (observed live). It says the same three things as a headline figure with its deltas beneath —
   "Paid off in September 2039" / "1 year 11 months earlier · ~€9,686 saved in interest" — and puts
   the amount in an element of its own, so `mm-privacy-blur` wraps exactly the money and nothing else.


- [x] The loan detail page renders an Overview tab and a What-if tab; switching tabs swaps the panels without navigating, and the header + schedule badge remain visible on both. (`loan-detail.component.html` — a value-driven `mm-tabs variant="lift"` below the header/badge, with an `@if` over `activeTab()`. `loan-detail.component.spec.ts` → "LoanDetailComponent tabs" → "renders an Overview and a What-if tab, opening on Overview" and "swaps to the What-if panel on click, without navigating, keeping the header and badge" — the latter asserts `mm-page-header` and `mm-badge` both survive the switch. Live on `/loans/2`: clicking What-if left the URL unchanged and the badge reading "30 months behind schedule".)
- [x] The Overview tab contains exactly the panels the page showed before this ticket, in the same order — no panel is dropped, reordered, or restyled by the tab migration. (`loan-detail.component.spec.ts` → "keeps the Overview tab's panels in their pre-tab order, none dropped" asserts `[balance-chart, amortization-table, payments-list]` in DOM order. Verified live too: after switching to What-if and back, the same three panels are present in that order.)
- [x] Entering `200` as the extra monthly payment shows an earlier payoff date, a "N years M months earlier" delta, and a positive interest-saved figure, all derived from `projectLoanWhatIf` (no math re-implemented in the component). (`loan-what-if.component.ts` calls `projectLoanWhatIf` and nothing else — every figure comes off that one `WhatIfProjection`. `loan-what-if.component.spec.ts` → "reports an earlier payoff and an interest saving once an extra amount is entered". Live on `/loans/2`: "Paid off in September 2039 / 1 year 11 months earlier / ~€9,686 saved in interest", down from an August 2041 baseline.)
- [x] An empty/zero extra payment shows the unchanged-schedule message and a chart whose two series coincide — no crash, no NaN, no "Infinity months earlier". (`loan-what-if.component.spec.ts` → "opens on the unchanged-schedule message, not an empty state"; the builder spec → "coincides exactly when the scenario is empty" (`series[1].data` deep-equals `series[0].data`). Live: the tab opens on "Paid off in August 2041 / No change — this is your current schedule.")
- [x] Negative or non-numeric input is rejected by the control (`min="0"`, invalid state styled like `loan-form`'s numeric fields) and never reaches the engine. (`extraControl` carries `Validators.min(0)`, the input is `min="0"` + `[ariaInvalid]`, and the error line uses `mm-label variant="error"` — `loan-form`'s own shape. A second guard sits in `extraMonthlyPayment`, which resolves anything not a finite positive number to `0`, so a mid-edit value cannot reach the engine either. `loan-what-if.component.spec.ts` → "falls back to the unchanged message for a negative entry, which never reaches the engine" also asserts no `Infinity`/`NaN` in the rendered text.)
- [x] The chart draws both a baseline and a scenario series with a legend distinguishing them, for any `loanType`, and the chart's serialized option never mentions the loan type. (Builder spec → "draws a baseline and a scenario series, both named in the legend" (`Current plan` / `With extra payments`, both in `legend.data`) and "never mentions the loan type" — which also asserts `buildLoanWhatIfChartOption.length === 1`: the builder takes the *projection*, so the loan is not even in scope. Live: a real echarts instance renders an 896×288 canvas in the tab with no console errors.)
- [x] Monetary figures blur when "Hide amounts" is on, and stay legible when it is off. (Verified live in both directions on `/loans/2` → What-if with a €200 scenario: with Hide amounts **on** the `~€9,686` figure computes to `filter: blur(4.8px)` and carries `mm-privacy-blurred`; toggled **off** the same element computes to `filter: none`. Only the amount is wrapped — the payoff date and the months-earlier delta stay legible, since neither is an amount.)
- [x] A loan with no payments yet, and an already-paid-off loan, both render the tab without error. (`loan-what-if.component.spec.ts` → "renders a loan with no payments yet without error" and "renders an already-paid-off loan as nothing left to simulate" — the latter feeds a single payment covering the whole principal and asserts the `paid-off` copy renders.)
- [x] No Dexie/store writes: the scenario lives in component signals only, and nothing about the loan entity changes when the user plays with the simulator. (`loan-what-if.component.ts` injects only `AppSettingsStore` — and only to *read* `privacyModeEnabled`. There is no `LoansStore`, no repository, and no `appDb` reference in the component; the scenario is one `FormControl` bridged to a signal via `toSignal`.)
- [x] Unit tests cover: the pure `buildLoanWhatIfChartOption` builder (both series present, type-agnostic), the headline-text derivation for zero / positive / already-paid-off cases, and the tab switch showing the right panel. (Builder: 4 cases in `loan-what-if.component.spec.ts`. Headline: `loan-what-if-vm.spec.ts` covers `unchanged`/`improved`/`paid-off` plus a two-`loanType` parity check and `describeMonthSpan`'s singular/plural/whole-year forms. Tab switch: 4 cases in `loan-detail.component.spec.ts`. Suite: 284 files / 3292 tests green.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both CI gates exit `0`: `fallow dead-code --baseline .fallow-baseline.json --fail-on-issues` and `fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues`. The baseline's temporary `projectLoanWhatIf` entry from LOAN-12 is now dropped — the export has a consumer. Conventions: one folder per component, pure option builder exported beside its component (the `buildLoanBalanceChartOption` precedent), the display view-model in `feature-loans/loan-what-if-vm.ts` beside `loan-card-vm.ts`, both barrels updated, and the parent spec stubs the echarts child rather than mounting it.)
- [x] Verified live in the browser: on a real loan, typing €200 extra per month updates the headline and both chart series, and switching back to Overview leaves the existing panels intact. (`/loans/2` "Refinanced mortgage", dev server on :4210. Tab opened on "Paid off in August 2041 / No change"; the `+200` preset changed it to "Paid off in September 2039 / 1 year 11 months earlier / ~€9,686 saved in interest" with the chart canvas re-rendering and zero console errors. Switching back to Overview showed `app-loan-balance-chart`, `app-loan-amortization-table`, `app-loan-payments-list` in that order with the What-if panel gone.)

## Notes

- **Why ephemeral, not persisted:** unlike `ForecastSettingsStore` (which persists because a silently reset
  forecast window is misleading), a what-if scenario is a question the user asks and gets an answer to.
  Persisting it would imply the app believes the scenario is happening — which would be wrong on every
  other surface (the overview cards, the ahead/behind badge) that reports *real* progress. Saving named
  scenarios is a plausible follow-up, and would be its own ticket plus its own additive schema version.
- The tab migration is deliberately folded into this ticket rather than split out: a tab shell with one tab
  ships no user-visible capability, and the restructure is a dozen lines of template.
- Needs LOAN-12. LOAN-14 extends this same component with lump sums; keep the panel's layout ready for a
  second block of controls (a `mm-fieldset` per scenario input, not one flat row).
