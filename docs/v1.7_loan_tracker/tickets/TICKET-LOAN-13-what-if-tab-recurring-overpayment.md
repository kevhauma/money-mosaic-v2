# TICKET-LOAN-13 — "What-if" tab on loan detail, with a recurring-overpayment simulator

- **Area:** Loans
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

- [ ] The loan detail page renders an Overview tab and a What-if tab; switching tabs swaps the panels without navigating, and the header + schedule badge remain visible on both.
- [ ] The Overview tab contains exactly the panels the page showed before this ticket, in the same order — no panel is dropped, reordered, or restyled by the tab migration.
- [ ] Entering `200` as the extra monthly payment shows an earlier payoff date, a "N years M months earlier" delta, and a positive interest-saved figure, all derived from `projectLoanWhatIf` (no math re-implemented in the component).
- [ ] An empty/zero extra payment shows the unchanged-schedule message and a chart whose two series coincide — no crash, no NaN, no "Infinity months earlier".
- [ ] Negative or non-numeric input is rejected by the control (`min="0"`, invalid state styled like `loan-form`'s numeric fields) and never reaches the engine.
- [ ] The chart draws both a baseline and a scenario series with a legend distinguishing them, for any `loanType`, and the chart's serialized option never mentions the loan type.
- [ ] Monetary figures blur when "Hide amounts" is on, and stay legible when it is off.
- [ ] A loan with no payments yet, and an already-paid-off loan, both render the tab without error.
- [ ] No Dexie/store writes: the scenario lives in component signals only, and nothing about the loan entity changes when the user plays with the simulator.
- [ ] Unit tests cover: the pure `buildLoanWhatIfChartOption` builder (both series present, type-agnostic), the headline-text derivation for zero / positive / already-paid-off cases, and the tab switch showing the right panel.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: on a real loan, typing €200 extra per month updates the headline and both chart series, and switching back to Overview leaves the existing panels intact.

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
