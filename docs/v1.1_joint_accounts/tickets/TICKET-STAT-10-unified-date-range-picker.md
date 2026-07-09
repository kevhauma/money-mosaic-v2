# TICKET-STAT-10 — Unified from/to date-range field

- **Area:** Statistics & Dashboard / shared UI
- **Type:** Feature
- **Traceability:** extends FR-STAT-7; also touches FR-TXN-3 (transaction filters date range)
- **Source story:** user-stories.md §6 — *"As a user, I want the from/to date fields to be a single range control, so picking a custom period takes one interaction instead of juggling two separate date inputs — in both the topbar range switcher and the transaction filters."*

## Description

Replace the app's two separate `from`/`to` date inputs, wherever they appear, with a single shared range control. Today there's no shared date-range component at all — each consumer rolled its own pair of raw date inputs.

## Current situation (as-is)

Three separate two-input implementations exist, and `shared/ui` has no date-range component to extend:

- [range-grouping-switcher.component.html:22-38](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.html) — two native `<input type="date">` elements ("Range start"/"Range end"), bound to `RangeStore` ([core/stats/range-state.store.ts](../../../src/app/core/stats/range-state.store.ts)) via `onFromChange`/`onToChange`, disabled unless the preset is `custom`. This is the app-shell topbar switcher (wired in [app.ts](../../../src/app/app.ts)), driving the dashboard/global range and the net-worth chart's zoom window.
- [transaction-filters.component.html:15-23](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.html) — two `mm-input type="date"` elements (`formControlName="dateFrom"`/`"dateTo"`) in the transaction filters reactive form.
- No separate income-page range control exists — the income page reuses `RangeStore`/the topbar switcher.

## Desired result (to-be)

- A new `shared/ui` component (e.g. `mm-date-range-input`) exposing a single `{ from, to }` value, following the existing `mm-`-prefixed wrapper-primitive convention (variant-driven, no raw daisyUI classes exposed to consumers).
- `range-grouping-switcher.component` uses the new component in place of its two raw date inputs; the existing `RangeStore` wiring (`onFromChange`/`onToChange` or equivalent) and the "disabled unless preset is custom" rule are preserved.
- `transaction-filters.component` uses the same shared component in place of its two `mm-input` date fields, wired to the existing `dateFrom`/`dateTo` form controls (or a single range form control, whichever is the cleaner fit).
- No change to existing validation behaviour (e.g. `from` ≤ `to`) beyond the interaction model itself.

## Acceptance criteria

- [ ] A new `shared/ui` date-range component exists, taking/emitting a single `{ from, to }` value, following the `mm-` wrapper-primitive convention.
- [ ] `range-grouping-switcher.component` uses the new component instead of two separate `<input type="date">` elements; `RangeStore` wiring is preserved.
- [ ] `transaction-filters.component` uses the same shared component instead of its two `mm-input` date fields.
- [ ] The "custom range only editable when preset is custom" disable behaviour is preserved.
- [ ] The component has a spec covering rendering and value emission, consistent with `shared/ui` testing conventions.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: picking a custom range in the topbar and in the transaction filters both work through the new single control, at desktop and mobile widths.

## Notes

- This is a `shared/ui` primitive, not a feature-specific one — both consumers should end up calling the exact same component rather than two similar-looking ones.
- The exact interaction (two linked native date inputs presented as one compact control vs. a calendar popover) is an implementation-time UI call; the contract above — one component, one value, same two call sites — is what matters.
