# TICKET-TXN-07 — Accessible name for the transaction row-selection checkboxes

- **Area:** Transactions (a11y)
- **Type:** Bug fix
- **Traceability:** CR-8 (carried over from the first review; the header "select all" checkbox was fixed, the per-row one was not)

## User story

As a screen-reader user selecting transactions for bulk categorisation, I want each row checkbox announced with which transaction it selects, so I'm not choosing between anonymous "checkbox, not checked" stops.

## Description

The header select-all checkbox gained `aria-label="Select all filtered transactions"`, but each row's checkbox still has no accessible name — a screen reader announces only its role and state. One bound `attr.aria-label` per row fixes it.

## Current situation (as-is)

- [transactions-overview.component.html:72-77](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html) — the row checkbox has `[checked]`/`(change)` but no `aria-label`/`aria-labelledby` (compare line 54's header checkbox, which has one).

## Desired result (to-be)

- Each row checkbox carries a distinguishing accessible name built from row data already on the view model, e.g. `[attr.aria-label]="'Select transaction ' + row.transaction.bookingDate + ' ' + (row.transaction.counterpartyName ?? row.transaction.rawDescription)"` (exact wording per implementer; date + counterparty/description is enough to disambiguate).

## Acceptance criteria

- [ ] Every row checkbox has a non-empty, row-specific accessible name (assert in the component spec via `getAttribute('aria-label')` on two rows differing in content).
- [ ] Selection behaviour unchanged (toggle, select-all interplay) — existing specs pass.
- [ ] Live browser check: inspect the accessibility tree (DevTools) for a row checkbox and confirm the computed name.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- If TICKET-SOLID-01 (coding-review-2, open) lands first and moves the row rendering, apply the same fix in its new home — coordinate, trivial either way.
