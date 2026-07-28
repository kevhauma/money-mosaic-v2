# TICKET-ACC-06 — Accounts-detail micro-cleanups + shared `account-balance-block`

- **Area:** Accounts
- **Type:** Refactor
- **Traceability:** CR4-1 §4 Options A+B ([solution doc](../solutions/CR4-01-template-complexity.md))

## User story

As a developer maintaining the accounts pages, I want the detail page's small template derivations precomputed and the balance/share block shared with the overview card, so the two pages render account balances from one component instead of duplicated fragments.

## Description

The mildest CR4-1 finding — the chosen scope is the two micro-cleanups (precomputed `shareDisplay`, precomputed archive label/icon pair) plus the balance-block extraction shared with TICKET-ACC-05's card.

## Current situation (as-is)

- [accounts-detail.component.html](../../../src/app/feature-accounts/components/accounts-detail/accounts-detail.component.html) (cognitive 25): `share()!` assertion; `account.archived ? 'Unarchive' : 'Archive'` label/icon derivations (shape-identical to the overview card's dropdown item).
- The `dataReady() ? balance : skeleton` + "Your share" fragment appears both here and in the overview card.

## Desired result (to-be)

- `shareDisplay` and the archive toggle VM (`{ label, icon }`) precomputed in the class; assertions and inline ternaries gone.
- A small `account-balance-block` presentational component (in `feature-accounts/components/`) renders the balance/skeleton + share fragment for both the detail page and TICKET-ACC-05's card.

## Acceptance criteria

- [ ] No `!` assertion and no archive-label ternary remain in the detail template.
- [ ] Both consumers render through `account-balance-block`; the fragment exists once (grep the skeleton/share markup).
- [ ] Detail page states still render: normal, archived, joint contributor breakdown, not-found (live browser check).
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs TICKET-ACC-05 (the card side of the shared block).
- Per the review's calibration note: this file is evidence a future template-complexity threshold (TICKET-CLEANUP-06) should sit **above** ~25.
