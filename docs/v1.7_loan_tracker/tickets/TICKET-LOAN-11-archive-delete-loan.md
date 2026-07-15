# TICKET-LOAN-11 — Archive/delete a loan

- **Area:** Loans
- **Type:** Feature
- **Traceability:** adds FR-LOAN-11 (new)

## User story

As a user, I want to archive a paid-off loan or delete one I created by mistake, so my Loans page only
shows what I'm actively tracking — regardless of whether it's a mortgage or another loan type.

## Description

Wire up archive/unarchive and delete for a loan, reusing the exact `withArchivable` + confirm-dialog
pattern already used for accounts and categories.

## Current situation (as-is)

- [accounts-detail.component.ts](../../../src/app/feature-accounts/components/accounts-detail/accounts-detail.component.ts)
  has the precedent: a `toggleArchive()` method calling `archiveAccount`/`unarchiveAccount`, plus a
  `ConfirmDialogComponent`-gated `deleteConfirmed()` calling `removeAccount`.
- `LoansStore` (LOAN-02) already exposes `archiveLoan`/`unarchiveLoan` via `withArchivable`, and
  `removeLoan` via `LoansRepository`, but nothing in the UI calls them yet.
- Archiving a loan's linked category independently (in Categories) is unrelated and unaffected by this
  ticket — see LOAN-03's Notes.

## Desired result (to-be)

- Loan detail page (LOAN-07's shell) gets an archive/unarchive toggle and a delete button, gated by
  `ConfirmDialogComponent`, matching `AccountsDetailComponent`'s layout and copy style — copy reads "this
  loan," never "this mortgage," so it reads correctly for every type.
- Deleting a loan removes only the `Loan` row — it does **not** touch the linked category or any
  transactions (they simply stop being associated with a loan; the category remains usable for ordinary
  expense tracking).
- An archived loan is excluded from `LoansOverviewComponent` (LOAN-06) but still reachable via a direct
  `/loans/:id` link and from an "archived loans" toggle/section if the overview already distinguishes
  archived items (mirror whatever `AccountsOverviewComponent`/`CategoriesOverviewComponent` do for their
  archived lists).

## Acceptance criteria

- [ ] Archive/unarchive toggle persists via `LoansStore.archiveLoan`/`unarchiveLoan`, never a direct `appDb` write.
- [ ] Delete is gated behind `ConfirmDialogComponent` and calls `LoansStore.removeLoan`.
- [ ] Deleting a loan does not delete or modify its linked category or any transactions.
- [ ] Archived loans are excluded from the default overview list, consistent with accounts/categories.
- [ ] Behaviour and copy are identical across `loanType` values — no mortgage-specific branch.
- [ ] Unit tests cover: archive/unarchive round-trip, delete removing the entity without touching category/transaction data, for at least two different loan types.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: archive a loan, confirm it disappears from the overview; delete a different loan, confirm its linked category's transactions are untouched.

## Notes

- Independent of the chart/schedule tickets (LOAN-07/08/09/10) — can be built any time after LOAN-01 and
  LOAN-03 exist, since it only needs a loan to act on.
